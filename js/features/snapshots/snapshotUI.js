// Aria Voice Studio - Snapshot UI (modal, recording, waveform)

import { getStateManager } from '../../state/stateManager.js';
import { showToast } from '../../ui/toast.js';
import { loadSnapshots, saveSnapshotData } from './snapshotManager.js';

const state = getStateManager().state;

let _callbacks = {
    toggleTraining: null,
    trapFocusInModal: null,
    restoreFocus: null,
    setLastFocused: null,
};

/**
 * Must be called once during app init to provide app-level callbacks.
 * @param {{ toggleTraining: Function, trapFocusInModal: Function, restoreFocus: Function, setLastFocused: Function }} cbs
 */
export function initSnapshots(cbs) {
    _callbacks = { ..._callbacks, ...cbs };
}

// --- Recording state ---

let snapshotRecording = {
    isRecording: false,
    startTime: 0,
    pitchSamples: [],
    interval: null
};

// --- Modal ---

export function openSnapshotModal() {
    const modal = document.getElementById('snapshotModal');
    if (modal) {
        if (_callbacks.setLastFocused) _callbacks.setLastFocused(document.activeElement);
        modal.classList.remove('hidden');
        initWaveformBars();
        if (_callbacks.trapFocusInModal) _callbacks.trapFocusInModal(modal);
    }
}

export function closeSnapshotModal() {
    const modal = document.getElementById('snapshotModal');
    if (modal) modal.classList.add('hidden');
    stopSnapshotRecording();
    if (_callbacks.restoreFocus) _callbacks.restoreFocus();
}

// --- Recording ---

export function startSnapshotRecording() {
    const startBtn = document.getElementById('startRecordingBtn');
    const saveBtn = document.getElementById('saveSnapshotBtn');

    if (snapshotRecording.isRecording) {
        // Stop recording
        stopSnapshotRecording();
        if (startBtn) {
            startBtn.innerHTML = '<span class="record-dot"></span> Start Recording';
            startBtn.classList.remove('btn-danger');
            startBtn.classList.add('btn-record');
        }
        if (saveBtn && snapshotRecording.pitchSamples.length > 0) {
            saveBtn.classList.remove('hidden');
        }
    } else {
        // Start recording
        snapshotRecording.isRecording = true;
        snapshotRecording.startTime = Date.now();
        snapshotRecording.pitchSamples = [];

        if (startBtn) {
            startBtn.innerHTML = '<span class="record-dot"></span> Stop Recording';
            startBtn.classList.add('btn-danger');
            startBtn.classList.remove('btn-record');
        }
        if (saveBtn) saveBtn.classList.add('hidden');

        // Start collecting pitch data
        snapshotRecording.interval = setInterval(() => {
            if (state.currentPitch > 0) {
                snapshotRecording.pitchSamples.push(state.currentPitch);
            }
            updateSnapshotStats();
            updateSnapshotTime();
        }, 100);

        // Ensure training is active
        if (!state.isTraining && _callbacks.toggleTraining) {
            _callbacks.toggleTraining();
        }
    }
}

export function stopSnapshotRecording() {
    snapshotRecording.isRecording = false;
    if (snapshotRecording.interval) {
        clearInterval(snapshotRecording.interval);
        snapshotRecording.interval = null;
    }
}

function updateSnapshotTime() {
    const timeEl = document.getElementById('waveformTime');
    if (!timeEl) return;

    const elapsed = Math.floor((Date.now() - snapshotRecording.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateSnapshotStats() {
    const samples = snapshotRecording.pitchSamples;
    if (samples.length === 0) return;

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);

    // Calculate stability (inverse of std deviation normalized)
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);
    const stability = Math.max(0, Math.min(100, 100 - (stdDev / avg) * 200));

    const avgEl = document.getElementById('snapAvgPitch');
    const stabEl = document.getElementById('snapStability');
    const rangeEl = document.getElementById('snapRange');
    if (avgEl) avgEl.textContent = `${Math.round(avg)} Hz`;
    if (stabEl) stabEl.textContent = `${Math.round(stability)}%`;
    if (rangeEl) rangeEl.textContent = `${Math.round(min)}-${Math.round(max)} Hz`;
}

export async function saveSnapshot() {
    const samples = snapshotRecording.pitchSamples;
    if (samples.length === 0) {
        showToast('No recording to save', 'error');
        return;
    }

    const nameInput = document.getElementById('snapshotName');
    const name = nameInput?.value || `Snapshot ${new Date().toLocaleDateString()}`;

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / samples.length;
    const stability = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avg) * 200));

    const snapshot = {
        id: `snapshot-${Date.now()}`,
        name,
        timestamp: Date.now(),
        avgPitch: Math.round(avg),
        minPitch: Math.round(min),
        maxPitch: Math.round(max),
        stability: Math.round(stability),
        duration: Math.floor((Date.now() - snapshotRecording.startTime) / 1000),
        sampleCount: samples.length
    };

    try {
        await saveSnapshotData(snapshot);
        showToast('Snapshot saved!', 'success');
        closeSnapshotModal();
        await loadSnapshots();

        // Reset state
        snapshotRecording.pitchSamples = [];
        if (nameInput) nameInput.value = '';

    } catch (err) {
        console.error('[Snapshot] Save failed:', err);
        showToast('Failed to save snapshot', 'error');
    }
}

// --- Waveform ---

export function initWaveformBars() {
    const container = document.getElementById('waveformBars');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        bar.style.height = '10px';
        container.appendChild(bar);
    }
}
