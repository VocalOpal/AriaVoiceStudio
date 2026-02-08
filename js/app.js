// Aria Voice Studio - Main Application
import { EventTypes, on, emit } from './core/events.js';
import { openDB, put, get, getAll, STORES, onDatabaseBlocked } from './core/storage.js';
import { getStateManager } from './state/stateManager.js';
import { classifyPitch, getSessionRecorder, AUDIO_CONFIG } from './audio/index.js';
import { exerciseDefinitions } from './features/vocal-exercises/exerciseDefinitions.js';
import { 
    initExerciseUI, 
    startExercise, 
    getCurrentExercise,
    isInExerciseMode,
    onTrainingStart as exerciseOnTrainingStart,
    onTrainingStop as exerciseOnTrainingStop,
    getExerciseTitle,
    getExerciseSubtitle
} from './features/vocal-exercises/exerciseUI.js';

import { ErrorBoundary } from './utils/errorBoundary.js';
import { initThemeManager } from './themeManager.js';
import { initCustomCssEditor } from './customCssEditor.js';
import { registerServiceWorker } from './services/serviceWorkerManager.js';
import { showToast } from './ui/toast.js';
import { formatDuration } from './utils/formatters.js';

import { initNavigation, navigateToScreen, initTheme } from './ui/navigation.js';
import { checkOnboarding, startTutorial } from './features/onboarding/index.js';
import { checkAchievements, loadJourneyScreen } from './features/achievements/index.js';
import {
    initSnapshots, loadSnapshots, deleteSnapshot,
    openSnapshotModal, closeSnapshotModal,
    startSnapshotRecording, saveSnapshot
} from './features/snapshots/index.js';
import { loadVocalHealth } from './features/vocal-health/index.js';
import { loadProgressScreen } from './features/progress/index.js';
import { initModals, openStreakModal, closeStreakModal, openHelpModal, closeHelpModal } from './features/modals/index.js';
import {
    initProfile, openProfileModal, closeProfileModal,
    updateModalPitchRange, updateSensitivityMeter,
    saveProfileSettings, handleAvatarUpload, loadProfileImage
} from './features/profile/index.js';
import {
    initSettingsFeature, initSettings, loadSavedSettings,
    updateRangeVisualization, updateSidebarProfile
} from './features/settings/index.js';

import { debugLog } from './utils/debug.js';

const stateManager = getStateManager();
const state = stateManager.state;

// Pitch alert state
let pitchAlertState = {
    belowRangeStartTime: null,
    lastBeepTime: 0,
    enabled: true,
    delaySeconds: 5,
    volume: 50
};

// Audio context for beep sounds (separate from pitch detection)
let beepAudioContext = null;

function playBeep(volume = 50) {
    try {
        if (!beepAudioContext) {
            beepAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (beepAudioContext.state === 'suspended') {
            beepAudioContext.resume();
        }
        
        const oscillator = beepAudioContext.createOscillator();
        const gainNode = beepAudioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(beepAudioContext.destination);
        
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        
        const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
        gainNode.gain.setValueAtTime(normalizedVolume * 0.3, beepAudioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, beepAudioContext.currentTime + 0.3);
        
        oscillator.start(beepAudioContext.currentTime);
        oscillator.stop(beepAudioContext.currentTime + 0.3);
        
        debugLog('PitchAlert', 'Beep played at volume:', volume);
    } catch (err) {
        console.warn('[PitchAlert] Failed to play beep:', err);
    }
}

function checkPitchAlert(currentPitch, targetMin) {
    if (!pitchAlertState.enabled || !stateManager.get('isTraining')) {
        pitchAlertState.belowRangeStartTime = null;
        return;
    }
    
    const now = Date.now();
    
    if (currentPitch > 0 && currentPitch < targetMin) {
        if (pitchAlertState.belowRangeStartTime === null) {
            pitchAlertState.belowRangeStartTime = now;
        }
        
        const timeBelow = (now - pitchAlertState.belowRangeStartTime) / 1000;
        
        if (timeBelow >= pitchAlertState.delaySeconds) {
            if (now - pitchAlertState.lastBeepTime >= 2000) {
                playBeep(pitchAlertState.volume);
                pitchAlertState.lastBeepTime = now;
            }
        }
    } else {
        pitchAlertState.belowRangeStartTime = null;
    }
}

const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    screens: document.querySelectorAll('.screen'),
    themeToggle: document.getElementById('themeToggle'),
    
    // Training
    startTrainingBtn: document.getElementById('startTrainingBtn'),
    stopRestBtn: document.getElementById('stopRestBtn'),
    snapshotBtn: document.getElementById('snapshotBtn'),
    statusIcon: document.getElementById('statusIcon'),
    trainingTitle: document.getElementById('trainingTitle'),
    trainingSubtitle: document.getElementById('trainingSubtitle'),
    
    // Stats
    currentPitch: document.getElementById('currentPitch'),
    livePitch: document.getElementById('livePitch'),
    avgPitch: document.getElementById('avgPitch'),
    minPitch: document.getElementById('minPitch'),
    maxPitch: document.getElementById('maxPitch'),
    stability: document.getElementById('stability'),
    duration: document.getElementById('duration'),
    sampleCount: document.getElementById('sampleCount'),
    statsBar: document.getElementById('statsBar'),
    
    // Visualizer
    pitchCanvas: document.getElementById('pitchCanvas'),
    goalProgress: document.getElementById('goalProgress'),
    
    // Safety
    safetyStatus: document.getElementById('safetyStatus')
};


const safeStartAudioCapture = ErrorBoundary.wrapAsyncFunction(startAudioCapture, 'Audio Capture');
const safeStopAudioCapture = ErrorBoundary.wrapAsyncFunction(stopAudioCapture, 'Audio Stop');
const safeSaveSession = ErrorBoundary.wrapAsyncFunction(saveSession, 'Session Save');
const safeUpdateStreak = ErrorBoundary.wrapAsyncFunction(updateStreak, 'Streak Update');
const safeLoadProgressStats = ErrorBoundary.wrapAsyncFunction(loadProgressScreen, 'Progress Stats');

let audioWorkletLoaded = false;

async function startAudioCapture() {
    try {
        // Clean up any existing audio resources first
        stopAudioCapture();
        
        // Check for microphone support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia is not supported in this browser');
        }
        
        state.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Check audio context state
        if (state.audioContext.state === 'suspended') {
            await state.audioContext.resume();
        }
        
        const source = state.audioContext.createMediaStreamSource(state.mediaStream);
        
        await setupAudioWorklet(source);
        debugLog('Audio', 'Using AudioWorkletNode');
        
        return true;
    } catch (err) {
        console.error('Failed to start audio:', err);
        throw err; // Re-throw to be handled by ErrorBoundary
    }
}

async function setupAudioWorklet(source) {
    if (!audioWorkletLoaded) {
        // Try different paths for GitHub Pages compatibility
        const possiblePaths = [
            '/AriaVoiceStudio/js/audio/pitch-processor.js',
            '/js/audio/pitch-processor.js',
            './js/audio/pitch-processor.js',
            new URL('/js/audio/pitch-processor.js', window.location.origin).href
        ];
        
        let workletAdded = false;
        let lastError = null;

        for (const workletUrl of possiblePaths) {
            try {
                await state.audioContext.audioWorklet.addModule(workletUrl);
                debugLog('Audio', 'AudioWorklet module loaded from:', workletUrl);
                audioWorkletLoaded = true;
                workletAdded = true;
                break;
            } catch (err) {
                lastError = err;
                debugLog('Audio', `Failed to load worklet from ${workletUrl}:`, err.message);
                continue;
            }
        }

        if (!workletAdded && lastError) {
            throw new Error(`Failed to load audio worklet module. Last error: ${lastError.message}`);
        }
    }
    
    state.processor = new AudioWorkletNode(state.audioContext, 'pitch-processor');
    
    state.processor.port.onmessage = (event) => {
        if (event.data.type === 'pitch') {
            handlePitchResult(event.data);
        }
    };
    
    state.processor.port.postMessage({
        type: 'config',
        minFreq: AUDIO_CONFIG.minFrequency,
        maxFreq: AUDIO_CONFIG.maxFrequency,
        minRMS: AUDIO_CONFIG.minRMS,
        confidenceThreshold: AUDIO_CONFIG.confidenceThreshold
    });
    
    source.connect(state.processor);
    state.processor.connect(state.audioContext.destination);
}

function handlePitchResult(result) {
    if (!stateManager.get('isTraining')) return;
    
    // Record pitch data to session recorder
    const sessionRecorder = getSessionRecorder();
    if (sessionRecorder.isRecording) {
        sessionRecorder.addData({
            frequency: result.pitch,
            confidence: result.confidence,
            rms: result.rms || 0
        });
    }
    
    if (result.pitch > 0 && result.confidence > 0.5) {
        const currentPitchHistory = stateManager.get('pitchHistory') || [];
        const newPitchHistory = [...currentPitchHistory, result.pitch];
        
        if (newPitchHistory.length > 100) {
            newPitchHistory.shift();
        }
        
        const avgPitch = newPitchHistory.reduce((a, b) => a + b, 0) / newPitchHistory.length;
        const minPitch = Math.min(...newPitchHistory);
        const maxPitch = Math.max(...newPitchHistory);
        
        const variance = newPitchHistory.reduce((sum, p) => sum + (p - avgPitch) ** 2, 0) / newPitchHistory.length;
        const stdDev = Math.sqrt(variance);
        const stability = Math.round(Math.max(0, Math.min(100, 100 - (stdDev / avgPitch) * 100)));
        
        const targetMin = stateManager.get('targetMin');
        const targetMax = stateManager.get('targetMax');
        const totalTime = stateManager.get('totalTime') + 1;
        const timeInRange = result.pitch >= targetMin && result.pitch <= targetMax 
            ? stateManager.get('timeInRange') + 1 
            : stateManager.get('timeInRange');
        
        // Voice range classification
        const voiceRange = classifyPitch(result.pitch);
        
        checkPitchAlert(result.pitch, targetMin);
        
        stateManager.set({
            currentPitch: result.pitch,
            pitchHistory: newPitchHistory,
            avgPitch,
            minPitch,
            maxPitch,
            stability,
            sampleCount: stateManager.get('sampleCount') + 1,
            totalTime,
            timeInRange,
            voiceRange: voiceRange.range,
            voiceRangeProgress: voiceRange.progress
        });
        
        updateUI();
    }
}

function stopAudioCapture() {
    // Clean up processor
    if (state.processor) {
        try {
            state.processor.disconnect();
            // Only set onaudioprocess for ScriptProcessorNode (AudioWorkletNode doesn't have it)
            if (state.processor.onaudioprocess !== undefined) {
                state.processor.onaudioprocess = null;
            }
            // Clean up AudioWorkletNode port
            if (state.processor.port) {
                state.processor.port.onmessage = null;
            }
        } catch (err) {
            console.warn('[Audio] Error disconnecting processor:', err);
        } finally {
            state.processor = null;
        }
    }
    
    // Clean up audio context
    if (state.audioContext) {
        try {
            if (state.audioContext.state !== 'closed') {
                state.audioContext.close();
            }
        } catch (err) {
            console.warn('[Audio] Error closing audio context:', err);
        } finally {
            state.audioContext = null;
            audioWorkletLoaded = false;
        }
    }

    // Clean up media stream
    if (state.mediaStream) {
        try {
            state.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
        } catch (err) {
            console.warn('[Audio] Error stopping media stream:', err);
        } finally {
            state.mediaStream = null;
        }
    }
}

let lastUIUpdate = 0;
const UI_UPDATE_INTERVAL = 100;
let lastLiveRegionUpdate = 0;
const LIVE_REGION_INTERVAL = 2000; // Update screen reader every 2s

function updateUI() {
    const now = Date.now();
    if (now - lastUIUpdate < UI_UPDATE_INTERVAL) {
        return; // Skip this update
    }
    lastUIUpdate = now;

    elements.currentPitch.textContent = state.currentPitch ? state.currentPitch.toFixed(1) : '--';
    elements.livePitch.textContent = state.currentPitch ? state.currentPitch.toFixed(1) : '--';
    elements.avgPitch.textContent = state.avgPitch ? `${state.avgPitch.toFixed(1)} Hz` : '-- Hz';
    elements.minPitch.textContent = state.minPitch ? `${state.minPitch.toFixed(1)} Hz` : '-- Hz';
    elements.maxPitch.textContent = state.maxPitch ? `${state.maxPitch.toFixed(1)} Hz` : '-- Hz';
    elements.stability.textContent = `${state.stability}%`;
    elements.sampleCount.textContent = state.sampleCount;

    // Goal progress
    const goalPercent = state.totalTime > 0
        ? Math.round((state.timeInRange / state.totalTime) * 100)
        : 0;
    updateGoalProgress(goalPercent);

    // Update ARIA live region for screen readers (throttled)
    if (now - lastLiveRegionUpdate >= LIVE_REGION_INTERVAL) {
        lastLiveRegionUpdate = now;
        const liveRegion = document.getElementById('pitchLiveRegion');
        if (liveRegion && state.currentPitch) {
            liveRegion.textContent = `Current pitch: ${state.currentPitch.toFixed(0)} hertz. Stability: ${state.stability}%. Goal progress: ${goalPercent}%.`;
        }
    }

    // Draw pitch on canvas
    drawPitchVisualization();
}

function updateGoalProgress(percent) {
    const circle = elements.goalProgress.querySelector('.progress');
    const text = elements.goalProgress.querySelector('.progress-text');
    const circumference = 283; // 2 * PI * 45
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    text.textContent = `${percent}%`;
}


const pitchBuffer = [];
const MAX_BUFFER = 200;
const MIN_PITCH = 80;
const MAX_PITCH = 300;
const PADDING = 50;

function drawPitchVisualization() {
    const canvas = elements.pitchCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Add current pitch to buffer
    if (state.currentPitch > 0) {
        pitchBuffer.push(state.currentPitch);
        if (pitchBuffer.length > MAX_BUFFER) {
            pitchBuffer.shift();
        }
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate Y positions for target range
    const rangeTop = height - PADDING - ((state.targetMax - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)) * (height - PADDING * 2);
    const rangeBottom = height - PADDING - ((state.targetMin - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)) * (height - PADDING * 2);
    
    // Draw target range gradient background
    const rangeGradient = ctx.createLinearGradient(0, rangeTop, 0, rangeBottom);
    rangeGradient.addColorStop(0, 'rgba(245, 169, 184, 0.15)'); // Trans pink
    rangeGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)'); // White
    rangeGradient.addColorStop(1, 'rgba(91, 206, 250, 0.15)'); // Trans blue
    ctx.fillStyle = rangeGradient;
    ctx.fillRect(0, rangeTop, width, rangeBottom - rangeTop);
    
    // Draw range boundary lines (dashed)
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    
    ctx.strokeStyle = 'rgba(245, 169, 184, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, rangeTop);
    ctx.lineTo(width, rangeTop);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(91, 206, 250, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, rangeBottom);
    ctx.lineTo(width, rangeBottom);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw pitch line with gradient
    if (pitchBuffer.length > 1) {
        // Create gradient for line
        const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
        lineGradient.addColorStop(0, '#5BCEFA'); // Trans blue
        lineGradient.addColorStop(0.5, '#FFFFFF'); // White
        lineGradient.addColorStop(1, '#F5A9B8'); // Trans pink
        
        // Draw glow effect first
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 169, 184, 0.3)';
        ctx.lineWidth = 8;
        ctx.filter = 'blur(4px)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 0; i < pitchBuffer.length; i++) {
            const x = (i / pitchBuffer.length) * width;
            const normalizedPitch = (pitchBuffer[i] - MIN_PITCH) / (MAX_PITCH - MIN_PITCH);
            const y = height - PADDING - normalizedPitch * (height - PADDING * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.filter = 'none';
        
        // Draw main line
        ctx.beginPath();
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 0; i < pitchBuffer.length; i++) {
            const x = (i / pitchBuffer.length) * width;
            const normalizedPitch = (pitchBuffer[i] - MIN_PITCH) / (MAX_PITCH - MIN_PITCH);
            const y = height - PADDING - normalizedPitch * (height - PADDING * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Draw pitch scale labels
    ctx.fillStyle = 'rgba(100, 100, 120, 0.6)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    
    const pitchMarkers = [100, 150, 200, 250];
    pitchMarkers.forEach(pitch => {
        const y = height - PADDING - ((pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)) * (height - PADDING * 2);
        ctx.fillText(`${pitch} Hz`, 45, y + 4);
    });
}

async function startTraining() {
    const success = await safeStartAudioCapture();
    if (!success) return;
    
    state.isTraining = true;
    state.duration = 0;
    state.sampleCount = 0;
    state.pitchHistory = [];
    state.timeInRange = 0;
    state.totalTime = 0;
    pitchBuffer.length = 0;
    
    // Start session recording
    const sessionRecorder = getSessionRecorder();
    sessionRecorder.startSession();
    
    elements.statusIcon.classList.add('active');
    
    // Set appropriate title based on whether in exercise mode or free training
    const exerciseTitle = getExerciseTitle();
    const exerciseSubtitle = getExerciseSubtitle(true);
    
    if (exerciseTitle) {
        elements.trainingTitle.textContent = exerciseTitle;
        elements.trainingSubtitle.textContent = exerciseSubtitle || 'Exercise in progress...';
        
        // Start exercise progress tracking via module
        exerciseOnTrainingStart();
    } else {
        elements.trainingTitle.textContent = 'Training Active';
        elements.trainingSubtitle.textContent = '00:00:00';
    }
    
    elements.startTrainingBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="6" height="16" x="4" y="4"/><rect width="6" height="16" x="14" y="4"/></svg>
        Stop Training
    `;
    elements.startTrainingBtn.classList.remove('btn-primary');
    elements.startTrainingBtn.classList.add('btn-danger');
    elements.stopRestBtn.classList.remove('hidden');
    elements.statsBar.classList.remove('hidden');
    
    state.durationInterval = setInterval(() => {
        state.duration++;
        elements.duration.textContent = formatDuration(state.duration);
        // Only update subtitle with duration if not in exercise mode
        if (!isInExerciseMode()) {
            elements.trainingSubtitle.textContent = formatDuration(state.duration);
        }
    }, 1000);
    
    emit(EventTypes.TRAINING_START, { timestamp: Date.now() });
}

async function stopTraining() {
    state.isTraining = false;
    safeStopAudioCapture();
    
    // Stop session recording and get stats
    const sessionRecorder = getSessionRecorder();
    sessionRecorder.stopSession();
    const sessionStats = sessionRecorder.getSessionStats();
    
    // Reset pitch alert state
    pitchAlertState.belowRangeStartTime = null;
    pitchAlertState.lastBeepTime = 0;
    
    if (state.durationInterval) {
        clearInterval(state.durationInterval);
        state.durationInterval = null;
    }
    
    // Clean up exercise progress tracking via module
    exerciseOnTrainingStop();
    
    // Get current exercise info for session save
    const currentEx = getCurrentExercise();
    
    if (state.duration > 0) {
        await safeSaveSession({
            id: `session-${Date.now()}`,
            startTime: Date.now() - (state.duration * 1000),
            endTime: Date.now(),
            duration: state.duration,
            avgPitch: state.avgPitch,
            minPitch: state.minPitch,
            maxPitch: state.maxPitch,
            stability: state.stability,
            sampleCount: state.sampleCount,
            timeInRange: state.timeInRange,
            totalTime: state.totalTime,
            exerciseId: currentEx?.id || null,
            // Enhanced session statistics
            enhancedStats: sessionStats ? {
                median: sessionStats.median,
                p10: sessionStats.p10,
                p90: sessionStats.p90,
                stdDev: sessionStats.stdDev,
                rangeTime: sessionStats.rangeTime,
                validSampleCount: sessionStats.validSampleCount
            } : null
        });
        
        await safeUpdateStreak();
        await safeLoadProgressStats();

        // Check achievements after progress update (was previously inside loadProgressStats)
        try {
            const sessions = await getAll(STORES.SESSIONS);
            const streakData = await get(STORES.METADATA, 'streak') || { currentStreak: 0, longestStreak: 0 };
            const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            await checkAchievements(sessions, streakData, totalSeconds);
        } catch (err) {
            debugLog('Achievements', 'Post-session check failed:', err);
        }
    }

    elements.statusIcon.classList.remove('active');
    
    // Update UI based on whether still in exercise mode
    const exerciseTitle = getExerciseTitle();
    const exerciseSubtitle = getExerciseSubtitle(false);
    
    if (exerciseTitle) {
        elements.trainingTitle.textContent = exerciseTitle;
        elements.trainingSubtitle.textContent = exerciseSubtitle || 'Exercise paused - Press Start to continue';
    } else {
        elements.trainingTitle.textContent = 'Ready to Train';
        elements.trainingSubtitle.textContent = 'Start a session to begin';
    }
    
    elements.startTrainingBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Start Training
    `;
    elements.startTrainingBtn.classList.add('btn-primary');
    elements.startTrainingBtn.classList.remove('btn-danger');
    elements.stopRestBtn.classList.add('hidden');
    
    emit(EventTypes.TRAINING_STOP, { 
        duration: state.duration,
        avgPitch: state.avgPitch,
        samples: state.sampleCount
    });
}

function toggleTraining() {
    if (state.isTraining) {
        stopTraining();
    } else {
        startTraining();
    }
}

async function saveSession(sessionData) {
    try {
        await put(STORES.SESSIONS, sessionData);
        debugLog('Session', 'Saved session:', sessionData.id);
    } catch (err) {
        console.error('[Session] Failed to save:', err);
    }
}

async function updateStreak() {
    try {
        const today = new Date().toDateString();
        const streakData = await get(STORES.METADATA, 'streak') || { 
            key: 'streak',
            currentStreak: 0,
            lastPracticeDate: null,
            longestStreak: 0
        };
        
        if (streakData.lastPracticeDate === today) {
            return;
        }
        
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (streakData.lastPracticeDate === yesterday) {
            streakData.currentStreak++;
        } else if (streakData.lastPracticeDate !== today) {
            streakData.currentStreak = 1;
        }
        
        streakData.lastPracticeDate = today;
        streakData.longestStreak = Math.max(streakData.longestStreak, streakData.currentStreak);
        
        await put(STORES.METADATA, streakData);
        debugLog('Streak', 'Updated:', streakData.currentStreak, 'days');
        
        const streakValue = document.getElementById('streakValue');
        if (streakValue) streakValue.textContent = streakData.currentStreak;
    } catch (err) {
        console.error('[Streak] Failed to update:', err);
    }
}

const eventListeners = new Map();

function addEventListenerWithCleanup(element, event, handler, options = {}) {
    if (!element) return null;
    
    element.addEventListener(event, handler, options);
    
    const listenerId = `${event}_${Date.now()}_${Math.random()}`;
    eventListeners.set(listenerId, { element, event, handler, options });
    
    return listenerId;
}

function removeAllEventListeners() {
    eventListeners.forEach((listener, id) => {
        try {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        } catch (err) {
            console.warn('[Events] Error removing listener:', err);
        }
    });
    eventListeners.clear();
}

function initEventListeners() {
    removeAllEventListeners();
    
    // Training controls
    addEventListenerWithCleanup(elements.startTrainingBtn, 'click', toggleTraining);
    addEventListenerWithCleanup(elements.stopRestBtn, 'click', stopTraining);

    // Refresh Journey screen data when navigating to it
    const journeyNav = document.querySelector('.nav-item[data-screen="journey"]');
    if (journeyNav) {
        addEventListenerWithCleanup(journeyNav, 'click', () => loadJourneyScreen());
    }

    // Refresh Vocal Health screen data when navigating to it
    const healthNav = document.querySelector('.nav-item[data-screen="health"]');
    if (healthNav) {
        addEventListenerWithCleanup(healthNav, 'click', () => loadVocalHealth());
    }

    // Refresh Progress screen data when navigating to it
    const progressNav = document.querySelector('.nav-item[data-screen="progress"]');
    if (progressNav) {
        addEventListenerWithCleanup(progressNav, 'click', () => loadProgressScreen());
    }

    // Refresh Snapshots screen data when navigating to it
    const snapshotsNav = document.querySelector('.nav-item[data-screen="snapshots"]');
    if (snapshotsNav) {
        addEventListenerWithCleanup(snapshotsNav, 'click', () => loadSnapshots());
    }

    // Snapshot modal - training screen button
    addEventListenerWithCleanup(elements.snapshotBtn, 'click', openSnapshotModal);
    
    // Snapshot modal - snapshots screen button
    const newSnapshotBtn = document.getElementById('newSnapshotBtn');
    if (newSnapshotBtn) {
        addEventListenerWithCleanup(newSnapshotBtn, 'click', openSnapshotModal);
    }
    
    // Profile card - opens profile modal
    const profileCardBtn = document.getElementById('profileCardBtn');
    if (profileCardBtn) {
        addEventListenerWithCleanup(profileCardBtn, 'click', openProfileModal);
    }
    
    // Profile modal close/save
    addEventListenerWithCleanup(document.getElementById('closeProfileModal'), 'click', closeProfileModal);
    addEventListenerWithCleanup(document.getElementById('cancelProfileBtn'), 'click', closeProfileModal);
    addEventListenerWithCleanup(document.getElementById('saveProfileBtn'), 'click', async () => {
        await saveProfileSettings();
    });
    addEventListenerWithCleanup(document.getElementById('profileModal'), 'click', (e) => {
        if (e.target.id === 'profileModal') closeProfileModal();
    });
    
    // Modal pitch inputs live update
    addEventListenerWithCleanup(document.getElementById('modalTargetMin'), 'input', (e) => {
        const min = parseInt(e.target.value) || 140;
        const max = parseInt(document.getElementById('modalTargetMax')?.value) || 200;
        updateModalPitchRange(min, max);
    });
    addEventListenerWithCleanup(document.getElementById('modalTargetMax'), 'input', (e) => {
        const min = parseInt(document.getElementById('modalTargetMin')?.value) || 140;
        const max = parseInt(e.target.value) || 200;
        updateModalPitchRange(min, max);
    });
    
    // Sensitivity slider
    addEventListenerWithCleanup(document.getElementById('modalSensitivity'), 'input', (e) => {
        updateSensitivityMeter(parseInt(e.target.value));
    });
    
    // Pitch presets in modal
    document.querySelectorAll('.pitch-preset').forEach(btn => {
        addEventListenerWithCleanup(btn, 'click', () => {
            const min = parseInt(btn.dataset.min);
            const max = parseInt(btn.dataset.max);
            
            document.querySelectorAll('.pitch-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (min > 0 && max > 0) {
                document.getElementById('modalTargetMin').value = min;
                document.getElementById('modalTargetMax').value = max;
                updateModalPitchRange(min, max);
            }
        });
    });
    
    // Avatar upload button
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    const avatarFileInput = document.getElementById('avatarFileInput');
    if (avatarEditBtn && avatarFileInput) {
        addEventListenerWithCleanup(avatarEditBtn, 'click', () => {
            avatarFileInput.click();
        });
        addEventListenerWithCleanup(avatarFileInput, 'change', handleAvatarUpload);
    }
    
    // Exercise item clicks - use event delegation since items are rendered later
    const exerciseList = document.getElementById('exerciseList');
    if (exerciseList) {
        addEventListenerWithCleanup(exerciseList, 'click', (e) => {
            const item = e.target.closest('.exercise-item');
            if (!item) return;
            
            const exerciseId = item.dataset.id;
            const exercise = exerciseDefinitions.find(ex => ex.id === exerciseId);
            if (!exercise) return;
            const unlocked = !exercise.unlockRequirements;
            if (unlocked) {
                startExercise(exercise);
            } else {
                showToast('Complete earlier exercises to unlock this one', 'info');
            }
        });
    }
    
    // Note: Exit exercise button is handled by exerciseUI module
    
    // Streak modal
    const streakCardBtn = document.getElementById('streakCardBtn');
    if (streakCardBtn) {
        addEventListenerWithCleanup(streakCardBtn, 'click', openStreakModal);
    }
    
    // Snapshot recording buttons
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const saveSnapshotBtn = document.getElementById('saveSnapshotBtn');
    if (startRecordingBtn) {
        addEventListenerWithCleanup(startRecordingBtn, 'click', startSnapshotRecording);
    }
    if (saveSnapshotBtn) {
        addEventListenerWithCleanup(saveSnapshotBtn, 'click', saveSnapshot);
    }
    
    // Modal close buttons
    addEventListenerWithCleanup(document.getElementById('closeSnapshotModal'), 'click', closeSnapshotModal);
    addEventListenerWithCleanup(document.getElementById('cancelSnapshot'), 'click', closeSnapshotModal);
    addEventListenerWithCleanup(document.getElementById('closeStreakModal'), 'click', closeStreakModal);
    addEventListenerWithCleanup(document.getElementById('closeStreakBtn'), 'click', closeStreakModal);
    
    // Close modals on overlay click
    addEventListenerWithCleanup(document.getElementById('snapshotModal'), 'click', (e) => {
        if (e.target.id === 'snapshotModal') closeSnapshotModal();
    });
    addEventListenerWithCleanup(document.getElementById('streakModal'), 'click', (e) => {
        if (e.target.id === 'streakModal') closeStreakModal();
    });
    
    // Donate button
    const donateBtn = document.querySelector('.donate-btn');
    if (donateBtn) {
        addEventListenerWithCleanup(donateBtn, 'click', (e) => {
            e.preventDefault();
            openHelpModal('support');
        });
    }
    
    // Sparkle button (feature request/feedback)
    const sparkleBtn = document.querySelector('.sparkle-btn');
    if (sparkleBtn) {
        addEventListenerWithCleanup(sparkleBtn, 'click', () => {
            openHelpModal('feedback');
        });
    }
    
    // Help modal close
    addEventListenerWithCleanup(document.getElementById('closeHelpModal'), 'click', closeHelpModal);
    addEventListenerWithCleanup(document.getElementById('helpModal'), 'click', (e) => {
        if (e.target.id === 'helpModal') closeHelpModal();
    });

    // Replay tutorial button in help modal
    addEventListenerWithCleanup(document.getElementById('replayTutorialBtn'), 'click', () => {
        closeHelpModal();
        startTutorial();
    });
    
    // Keyboard shortcuts
    addEventListenerWithCleanup(document, 'keydown', (e) => {
        // Ignore if typing in input
        if (e.target.matches('input, textarea, select')) return;

        if (e.key === '?') {
            openHelpModal('help');
        }
        if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            toggleTraining();
        }
        if (e.key === 'r' || e.key === 'R') {
            if (stateManager.get('isTraining')) {
                toggleTraining(); // Stop
            }
        }
        if (e.key === 'Escape') {
            // Stop training if active
            if (stateManager.get('isTraining')) {
                toggleTraining();
            }
            closeHelpModal();
            closeProfileModal();
            closeSnapshotModal();
            closeStreakModal();
        }
    });
    
    // Remove global function pollution - use proper event handling instead
    const deleteSnapshotHandler = (id) => deleteSnapshot(id);
    window.deleteSnapshot = deleteSnapshotHandler;
}

// --- Focus management utilities ---

// Track the element that triggered a modal so we can restore focus
let _lastFocusedElement = null;

/**
 * Trap focus within a modal for keyboard accessibility
 */
function trapFocusInModal(modal) {
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modal.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable.focus();

    modal._trapFocusHandler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };
    modal.addEventListener('keydown', modal._trapFocusHandler);
}

/**
 * Restore focus to the element that opened the modal
 */
function restoreFocus() {
    if (_lastFocusedElement && typeof _lastFocusedElement.focus === 'function') {
        _lastFocusedElement.focus();
        _lastFocusedElement = null;
    }
}

function renderExercises() {
    const container = document.getElementById('exerciseList');
    if (!container) return;
    
    container.innerHTML = exerciseDefinitions.map(ex => {
        const unlocked = !ex.unlockRequirements;
        const difficulty = ex.difficulty?.label || 'Beginner';
        const category = ex.category?.label || '';
        const duration = `${Math.round((ex.duration * ex.repetitions + ex.restBetweenReps * (ex.repetitions - 1)) / 60)} min`;
        
        return `
        <div class="glass-card exercise-item ${!unlocked ? 'locked' : ''}" data-id="${ex.id}">
            <div class="exercise-icon ${!unlocked ? 'locked' : ''}">
                ${unlocked 
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                }
            </div>
            <div class="exercise-info">
                <h4>${ex.title}</h4>
                <p>${ex.description}</p>
                <div class="exercise-meta">
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${duration}
                    </span>
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        ${difficulty}
                    </span>
                    <span>${category}</span>
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
    `;
    }).join('');
}

async function saveSettings(key, value) {
    try {
        await put(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
        debugLog('Settings', `Saved ${key}`);
    } catch (err) {
        console.error(`[Settings] Failed to save ${key}:`, err);
    }
}

async function loadSettings(key, defaultValue = null) {
    try {
        const result = await get(STORES.SETTINGS, key);
        return result ? result.value : defaultValue;
    } catch (err) {
        console.error(`[Settings] Failed to load ${key}:`, err);
        return defaultValue;
    }
}

// Listen for onboarding completion from the onboarding module
on(EventTypes.ONBOARDING_COMPLETED, async (data) => {
    if (data?.goal) {
        state.targetMin = data.goal.min;
        state.targetMax = data.goal.max;
    }
    await loadSavedSettings();
    updateSidebarProfile();
    updateRangeVisualization();
    debugLog('Onboarding', 'Completed');
});

/**
 * Show database blocked notification to user
 * Called when IndexedDB upgrade is blocked by another tab
 */
function showDatabaseBlockedNotification({ isBlocked, retryCount, maxRetries }) {
    const existingNotification = document.getElementById('dbBlockedNotification');
    
    if (!isBlocked) {
        // Clear notification on success
        if (existingNotification) {
            existingNotification.remove();
        }
        return;
    }
    
    // Create or update notification
    let notification = existingNotification;
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'dbBlockedNotification';
        notification.className = 'db-blocked-notification';
        notification.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            padding: 20px;
        `;
        document.body.appendChild(notification);
    }
    
    const retryText = retryCount < maxRetries 
        ? `Retrying... (${retryCount + 1}/${maxRetries})`
        : 'Please close other tabs and refresh this page.';
    
    notification.innerHTML = `
        <div style="background: var(--surface, #1a1a2e); border-radius: 16px; padding: 32px; max-width: 400px; text-align: center; color: var(--text, #fff);">
            <div style="margin-bottom: 16px;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
            <h2 style="margin: 0 0 12px; font-size: 20px;">Database Busy</h2>
            <p style="margin: 0 0 20px; opacity: 0.8; line-height: 1.5;">
                Another tab is using Aria's database. ${retryText}
            </p>
            <p style="margin: 0; font-size: 13px; opacity: 0.6;">
                Your data is safe. Close other Aria tabs to continue.
            </p>
            ${retryCount >= maxRetries ? `
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #5bcefa, #f5a9b8);
                    border: none;
                    border-radius: 8px;
                    color: #000;
                    font-weight: 600;
                    cursor: pointer;
                ">Refresh Page</button>
            ` : ''}
        </div>
    `;
}

/**
 * Wire up the "Check for Updates" button in settings
 */
function initUpdateButton(registration) {
    const checkUpdateBtn = document.getElementById('checkUpdateBtn');
    if (!checkUpdateBtn) return;

    checkUpdateBtn.addEventListener('click', async () => {
        checkUpdateBtn.disabled = true;
        checkUpdateBtn.textContent = 'Checking...';

        try {
            if (registration) {
                await registration.update();
                // If there's a waiting worker, the serviceWorkerManager will show the notification
                if (registration.waiting) {
                    showToast('Update available! Click "Update Now" in the notification below.', 'info');
                } else {
                    showToast('You are running the latest version.', 'success');
                }
            } else {
                showToast('Service worker not available.', 'warning');
            }
        } catch (err) {
            debugLog('SW', 'Update check failed:', err);
            showToast('Could not check for updates. Try again later.', 'error');
        }

        checkUpdateBtn.disabled = false;
        checkUpdateBtn.textContent = 'Check for Updates';
    });
}

async function init() {
    debugLog('Aria', 'Initializing...');
    
    // Register database blocked handler early
    onDatabaseBlocked(showDatabaseBlockedNotification);
    
    // Shared callbacks for extracted modules
    const moduleCallbacks = {
        trapFocusInModal,
        restoreFocus,
        setLastFocused: (el) => { _lastFocusedElement = el; },
        saveSettings,
        loadSettings,
        stateManager,
        state,
        pitchAlertState,
        playBeep,
        debugLog,
        updateSidebarProfile,
        updateRangeVisualization,
    };
    
    // Initialize extracted feature modules
    initModals(moduleCallbacks);
    initProfile(moduleCallbacks);
    initSettingsFeature(moduleCallbacks);
    
    initTheme(elements);
    initNavigation(elements);
    initThemeManager();
    initCustomCssEditor();
    initEventListeners();
    renderExercises();
    
    // Initialize exercise UI module with callbacks
    initExerciseUI({
        toggleTraining: toggleTraining,
        showToast: showToast,
        navigate: navigateToScreen
    });

    // Initialize snapshot module with app-level callbacks
    initSnapshots({
        toggleTraining,
        trapFocusInModal,
        restoreFocus,
        setLastFocused: (el) => { _lastFocusedElement = el; },
    });
    
    // Initialize storage
    try {
        await openDB();
        debugLog('Aria', 'Storage ready');
        
        // Load saved settings after DB is ready
        await initSettings();
        await loadSavedSettings();
        await loadProgressScreen();
        await loadJourneyScreen();
        await loadSnapshots();
        await loadVocalHealth();
        await loadProfileImage();
    } catch (err) {
        debugLog('Aria', 'Storage error:', err);
        
        // Show persistent error if database blocked
        if (err.code === 'DB_BLOCKED') {
            showDatabaseBlockedNotification({ isBlocked: true, retryCount: 3, maxRetries: 3 });
        }
    }
    
    // Check onboarding
    await checkOnboarding();
    
    // Register service worker and wire up update button
    const swRegistration = await registerServiceWorker();
    initUpdateButton(swRegistration);
    debugLog('Aria', 'Ready!');
}

init();
