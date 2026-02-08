// Aria Voice Studio - Exercise UI Module
// Handles exercise mode UI, panel display, and user interaction

import { emit, EventTypes } from '../../core/events.js';

/**
 * Exercise UI State
 */
let currentExercise = null;
let exerciseStartTime = null;
let exerciseProgressInterval = null;

// Callbacks for integration with main app
let onTrainingToggle = null;
let onShowToast = null;
let onNavigate = null;

/**
 * Initialize exercise UI with app callbacks
 * @param {Object} callbacks - Callback functions from main app
 */
export function initExerciseUI(callbacks = {}) {
    onTrainingToggle = callbacks.toggleTraining || (() => {});
    onShowToast = callbacks.showToast || ((msg) => console.log(msg));
    onNavigate = callbacks.navigate || (() => {});
    
    // Attach exit button listener
    const exitBtn = document.getElementById('exitExerciseBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', exitExerciseMode);
    }
}

/**
 * Get current exercise (for external access)
 */
export function getCurrentExercise() {
    return currentExercise;
}

/**
 * Check if in exercise mode
 */
export function isInExerciseMode() {
    return currentExercise !== null;
}

/**
 * Start an exercise - shows training screen with exercise context panel
 * @param {Object} exercise - Exercise definition object
 */
export function startExercise(exercise) {
    currentExercise = exercise;
    
    // Navigate to training screen
    if (onNavigate) {
        onNavigate('training');
    }
    
    // Update training header with exercise info
    const trainingTitle = document.getElementById('trainingTitle');
    const trainingSubtitle = document.getElementById('trainingSubtitle');
    
    if (trainingTitle) {
        trainingTitle.textContent = exercise.title;
    }
    if (trainingSubtitle) {
        trainingSubtitle.textContent = 'Exercise Mode - Follow the instructions below';
    }
    
    // Show and populate exercise mode panel
    showExerciseModePanel(exercise);
    
    // Update target range based on exercise
    updateExerciseTargets(exercise);
    
    // Show toast notification
    if (onShowToast) {
        onShowToast(`Starting exercise: ${exercise.title}`, 'info');
    }
}

/**
 * Show the exercise mode panel with exercise details
 */
function showExerciseModePanel(exercise) {
    const panel = document.getElementById('exerciseModePanel');
    if (!panel) return;
    
    // Show panel
    panel.classList.remove('hidden');
    
    // Populate exercise info
    const titleEl = document.getElementById('exerciseTitle');
    const descEl = document.getElementById('exerciseDescription');
    const targetRangeEl = document.getElementById('exerciseTargetRange');
    const durationEl = document.getElementById('exerciseDuration');
    const difficultyEl = document.getElementById('exerciseDifficulty');
    
    if (titleEl) titleEl.textContent = exercise.title;
    if (descEl) descEl.textContent = exercise.description;
    if (targetRangeEl) {
        const targetMin = exercise.targetMin || 140;
        const targetMax = exercise.targetMax || 200;
        targetRangeEl.textContent = `${targetMin} - ${targetMax} Hz`;
    }
    if (durationEl) durationEl.textContent = exercise.duration || '2 mins';
    if (difficultyEl) difficultyEl.textContent = exercise.difficulty?.label || 'Beginner';
    
    // Update instruction steps based on exercise type
    updateExerciseInstructions(exercise);
    
    // Reset progress bar
    const progressFill = document.getElementById('exerciseProgressFill');
    if (progressFill) progressFill.style.width = '0%';
}

/**
 * Update exercise instructions based on exercise type
 */
function updateExerciseInstructions(exercise) {
    const step1 = document.getElementById('exerciseStep1');
    const step2 = document.getElementById('exerciseStep2');
    const step3 = document.getElementById('exerciseStep3');
    
    // Default instructions
    let instructions = [
        'Speak or hum into your microphone',
        'Keep your pitch within the pink target zone',
        'Maintain steady pitch for best results'
    ];
    
    // Customize based on exercise type/id
    const title = exercise.title?.toLowerCase() || '';
    
    if (title.includes('breath')) {
        instructions = [
            'Take a deep breath and exhale slowly',
            'Focus on controlled, steady breathing',
            'Match the rhythm shown on screen'
        ];
    } else if (title.includes('warm')) {
        instructions = [
            'Start with gentle humming',
            'Gradually increase your pitch range',
            'Keep relaxed and comfortable'
        ];
    } else if (title.includes('resonance')) {
        instructions = [
            'Focus on where you feel vibration',
            'Try different vowel sounds (ah, ee, oo)',
            'Notice chest vs head resonance'
        ];
    } else if (title.includes('pitch') || title.includes('glide')) {
        instructions = [
            'Match your voice to the target pitch',
            'Slide smoothly between notes',
            'Stay relaxed - don\'t strain'
        ];
    } else if (title.includes('sustain') || title.includes('hold')) {
        instructions = [
            'Hold a steady note at the target pitch',
            'Focus on breath control',
            'Keep the tone consistent'
        ];
    }
    
    if (step1) step1.textContent = instructions[0];
    if (step2) step2.textContent = instructions[1];
    if (step3) step3.textContent = instructions[2];
}

/**
 * Update target range for the exercise
 */
function updateExerciseTargets(exercise) {
    // Emit event for state manager to update targets
    if (exercise.targetMin && exercise.targetMax) {
        emit(EventTypes.PITCH_RANGE_CHANGED, {
            min: exercise.targetMin,
            max: exercise.targetMax
        });
        
        // Update target range display
        const targetRangeDisplay = document.getElementById('targetRange');
        if (targetRangeDisplay) {
            targetRangeDisplay.textContent = `${exercise.targetMin}-${exercise.targetMax} Hz`;
        }
    }
}

/**
 * Clear exercise mode state without navigating or toggling training.
 * Used when navigating away from the training screen to clean up exercise context.
 */
export function clearExerciseMode() {
    currentExercise = null;
    const panel = document.getElementById('exerciseModePanel');
    if (panel) panel.classList.add('hidden');
    if (exerciseProgressInterval) {
        clearInterval(exerciseProgressInterval);
        exerciseProgressInterval = null;
    }
    exerciseStartTime = null;
}

/**
 * Hide exercise mode panel and return to exercises list
 */
export function exitExerciseMode() {
    const wasInExercise = currentExercise !== null;
    currentExercise = null;
    
    // Hide panel
    const panel = document.getElementById('exerciseModePanel');
    if (panel) panel.classList.add('hidden');
    
    // Clear progress interval
    if (exerciseProgressInterval) {
        clearInterval(exerciseProgressInterval);
        exerciseProgressInterval = null;
    }
    exerciseStartTime = null;
    
    // Stop training if running
    if (onTrainingToggle) {
        // Check if training is active before toggling
        const statusIcon = document.getElementById('statusIcon');
        if (statusIcon?.classList.contains('active')) {
            onTrainingToggle();
        }
    }
    
    // Reset training header
    const trainingTitle = document.getElementById('trainingTitle');
    const trainingSubtitle = document.getElementById('trainingSubtitle');
    if (trainingTitle) trainingTitle.textContent = 'Ready to Train';
    if (trainingSubtitle) trainingSubtitle.textContent = 'Start a session to begin';
    
    // Navigate back to exercises screen
    if (onNavigate) {
        onNavigate('exercises');
    }
    
    if (wasInExercise && onShowToast) {
        onShowToast('Exercise ended', 'info');
    }
}

/**
 * Called when training starts - sets up exercise progress tracking
 */
export function onTrainingStart() {
    if (!currentExercise) return;
    
    exerciseStartTime = Date.now();
    exerciseProgressInterval = setInterval(updateExerciseProgress, 500);
}

/**
 * Called when training stops - cleans up exercise progress tracking
 */
export function onTrainingStop() {
    if (exerciseProgressInterval) {
        clearInterval(exerciseProgressInterval);
        exerciseProgressInterval = null;
    }
    exerciseStartTime = null;
}

/**
 * Update exercise progress during training
 */
function updateExerciseProgress() {
    if (!currentExercise || !exerciseStartTime) return;
    
    const elapsed = Date.now() - exerciseStartTime;
    const durationMs = parseExerciseDuration(currentExercise.duration) * 1000;
    const progress = Math.min(100, (elapsed / durationMs) * 100);
    
    const progressFill = document.getElementById('exerciseProgressFill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    // Check if exercise is complete
    if (progress >= 100) {
        completeExercise();
    }
}

/**
 * Parse duration string to seconds (e.g., "2 mins" -> 120)
 */
function parseExerciseDuration(duration) {
    if (!duration) return 120; // Default 2 minutes
    
    const match = duration.match(/(\d+)\s*(min|sec|s|m)/i);
    if (!match) return 120;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('s')) return value;
    return value * 60;
}

/**
 * Called when exercise duration is complete
 */
function completeExercise() {
    if (exerciseProgressInterval) {
        clearInterval(exerciseProgressInterval);
        exerciseProgressInterval = null;
    }
    
    // Stop training
    if (onTrainingToggle) {
        const statusIcon = document.getElementById('statusIcon');
        if (statusIcon?.classList.contains('active')) {
            onTrainingToggle();
        }
    }
    
    if (onShowToast) {
        onShowToast(`Exercise "${currentExercise?.title}" completed!`, 'success');
    }
    
    // Emit completion event for progress tracking
    emit(EventTypes.EXERCISE_COMPLETED, {
        exerciseId: currentExercise?.id,
        title: currentExercise?.title,
        completedAt: Date.now()
    });
}

/**
 * Get exercise title text for training header
 */
export function getExerciseTitle() {
    return currentExercise?.title || null;
}

/**
 * Get subtitle text based on exercise state
 */
export function getExerciseSubtitle(isTraining) {
    if (!currentExercise) return null;
    
    if (isTraining) {
        return 'Exercise in progress...';
    }
    return 'Exercise paused - Press Start to continue';
}
