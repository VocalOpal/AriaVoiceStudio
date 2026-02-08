import { eventBus, EventTypes } from '../../core/events.js';
import { getExerciseById } from './exerciseDefinitions.js';
import { DefaultThresholds, FeedbackRules } from './exerciseTypes.js';

export class ExerciseRunner {
    constructor(exerciseId, userSettings = {}) {
        this.exercise = getExerciseById(exerciseId);
        if (!this.exercise) {
            throw new Error(`Exercise not found: ${exerciseId}`);
        }
        
        this.userSettings = {
            targetMin: 140,
            targetMax: 200,
            ...userSettings
        };
        
        this.state = {
            status: 'idle',
            currentRep: 0,
            totalReps: this.exercise.repetitions,
            elapsedTime: 0,
            repStartTime: 0,
            repElapsedTime: 0,
            
            successfulReps: 0,
            failedReps: 0,
            consecutiveSuccess: 0,
            consecutiveFail: 0,
            
            pitchSamples: [],
            inRangeSamples: 0,
            totalSamples: 0,
            currentFeedback: null,
            
            adaptedThresholds: { ...this.exercise.thresholds }
        };
        
        this.computeThresholds();
        
        this.tickInterval = null;
        this.restTimeout = null;
        
        this.onStateChange = null;
        this.onFeedback = null;
        this.onComplete = null;
        
        this.unsubscribers = [];
    }
    
    computeThresholds() {
        const thresholds = this.state.adaptedThresholds;
        
        if (thresholds.pitchTarget === 'userTargetRange') {
            thresholds.pitchMin = this.userSettings.targetMin;
            thresholds.pitchMax = this.userSettings.targetMax;
            thresholds.pitchCenter = (this.userSettings.targetMin + this.userSettings.targetMax) / 2;
        } else if (Array.isArray(thresholds.pitchTarget)) {
            thresholds.pitchMin = thresholds.pitchTarget[0];
            thresholds.pitchMax = thresholds.pitchTarget[1];
            thresholds.pitchCenter = (thresholds.pitchTarget[0] + thresholds.pitchTarget[1]) / 2;
        } else if (typeof thresholds.pitchTarget === 'number') {
            const tolerance = thresholds.pitchTolerance || DefaultThresholds.pitchTolerance;
            thresholds.pitchMin = thresholds.pitchTarget - tolerance;
            thresholds.pitchMax = thresholds.pitchTarget + tolerance;
            thresholds.pitchCenter = thresholds.pitchTarget;
        }
    }
    
    start() {
        if (this.state.status !== 'idle') return;
        
        this.state.status = 'preparing';
        this.emitStateChange();
        
        const unsub = eventBus.on(EventTypes.ANALYSIS_RESULT, (data) => {
            this.handleAnalysisResult(data);
        });
        this.unsubscribers.push(unsub);
        
        setTimeout(() => {
            this.startRep();
        }, 2000);
    }
    
    startRep() {
        this.state.status = 'active';
        this.state.currentRep++;
        this.state.repStartTime = Date.now();
        this.state.repElapsedTime = 0;
        this.state.pitchSamples = [];
        this.state.inRangeSamples = 0;
        this.state.totalSamples = 0;
        this.state.currentFeedback = null;
        
        this.emitStateChange();
        
        this.tickInterval = setInterval(() => {
            this.tick();
        }, 100);
    }
    
    tick() {
        if (this.state.status !== 'active') return;
        
        this.state.repElapsedTime = (Date.now() - this.state.repStartTime) / 1000;
        this.state.elapsedTime += 0.1;
        
        if (this.state.repElapsedTime >= this.exercise.duration) {
            this.endRep();
        } else {
            this.emitStateChange();
        }
    }
    
    handleAnalysisResult(data) {
        if (this.state.status !== 'active') return;
        
        const { pitch, confidence, stability } = data;
        
        if (confidence < 0.5) return;
        
        this.state.totalSamples++;
        this.state.pitchSamples.push(pitch);
        
        const thresholds = this.state.adaptedThresholds;
        let feedback = null;
        
        if (thresholds.pitchMin && thresholds.pitchMax) {
            if (pitch >= thresholds.pitchMin && pitch <= thresholds.pitchMax) {
                this.state.inRangeSamples++;
                feedback = { type: FeedbackRules.PITCH_IN_RANGE, message: this.exercise.feedback?.onSuccess };
            } else if (pitch > thresholds.pitchMax) {
                feedback = { type: FeedbackRules.PITCH_ABOVE_TARGET, message: this.exercise.feedback?.onPitchHigh };
            } else {
                feedback = { type: FeedbackRules.PITCH_BELOW_TARGET, message: this.exercise.feedback?.onPitchLow };
            }
        }
        
        if (thresholds.stabilityMinimum && stability !== undefined) {
            if (stability < thresholds.stabilityMinimum) {
                feedback = { type: FeedbackRules.STABILITY_POOR, message: this.exercise.feedback?.onUnstable };
            }
        }
        
        if (feedback && (!this.state.currentFeedback || this.state.currentFeedback.type !== feedback.type)) {
            this.state.currentFeedback = feedback;
            this.emitFeedback(feedback);
        }
    }
    
    /**
     * End the current rep and evaluate success
     */
    endRep() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        
        const success = this.evaluateRepSuccess();
        
        if (success) {
            this.state.successfulReps++;
            this.state.consecutiveSuccess++;
            this.state.consecutiveFail = 0;
        } else {
            this.state.failedReps++;
            this.state.consecutiveFail++;
            this.state.consecutiveSuccess = 0;
        }
        
        this.applyAdaptiveRules();
        
        if (this.state.currentRep >= this.state.totalReps) {
            this.complete();
        } else {
            this.startRest();
        }
    }
    
    /**
     * Evaluate if the rep was successful
     */
    evaluateRepSuccess() {
        const thresholds = this.state.adaptedThresholds;
        
        if (thresholds.durationMinimum && this.state.repElapsedTime < thresholds.durationMinimum) {
            return false;
        }
        
        if (this.state.totalSamples > 0 && thresholds.pitchMin) {
            const successRate = this.state.inRangeSamples / this.state.totalSamples;
            const requiredRate = thresholds.successRate || DefaultThresholds.successRate;
            if (successRate < requiredRate) {
                return false;
            }
        }
        
        if (thresholds.stabilityMinimum && this.state.pitchSamples.length > 1) {
            const stability = this.calculateStability(this.state.pitchSamples);
            if (stability < thresholds.stabilityMinimum) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Calculate pitch stability (0-1) from samples
     */
    calculateStability(samples) {
        if (samples.length < 2) return 1;
        
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        
        return Math.max(0, Math.min(1, 1 - (stdDev / 20)));
    }
    
    /**
     * Apply adaptive difficulty adjustments
     */
    applyAdaptiveRules() {
        if (!this.exercise.adaptiveRules) return;
        
        const rules = this.exercise.adaptiveRules;
        const adjustments = rules.adjustments || {};
        
        let shouldIncrease = false;
        let shouldDecrease = false;
        
        if (rules.increaseOn) {
            if (rules.increaseOn.includes('consecutiveSuccess')) {
                const match = rules.increaseOn.match(/consecutiveSuccess\s*>=?\s*(\d+)/);
                if (match && this.state.consecutiveSuccess >= parseInt(match[1])) {
                    shouldIncrease = true;
                }
            }
        }
        
        if (rules.decreaseOn) {
            if (rules.decreaseOn.includes('consecutiveFail')) {
                const match = rules.decreaseOn.match(/consecutiveFail\s*>=?\s*(\d+)/);
                if (match && this.state.consecutiveFail >= parseInt(match[1])) {
                    shouldDecrease = true;
                }
            }
        }
        
        if (shouldIncrease || shouldDecrease) {
            for (const [key, adj] of Object.entries(adjustments)) {
                if (this.state.adaptedThresholds[key] !== undefined) {
                    const change = shouldIncrease ? adj.increase : adj.decrease;
                    let newValue = this.state.adaptedThresholds[key] + change;
                    
                    if (adj.min !== undefined) newValue = Math.max(adj.min, newValue);
                    if (adj.max !== undefined) newValue = Math.min(adj.max, newValue);
                    
                    this.state.adaptedThresholds[key] = newValue;
                }
            }
            
            this.computeThresholds();
            
            this.state.consecutiveSuccess = 0;
            this.state.consecutiveFail = 0;
        }
    }
    
    /**
     * Start rest period between reps
     */
    startRest() {
        this.state.status = 'resting';
        this.emitStateChange();
        
        const restDuration = this.exercise.restBetweenReps || DefaultThresholds.restBetweenReps;
        
        this.restTimeout = setTimeout(() => {
            this.startRep();
        }, restDuration * 1000);
    }
    
    /**
     * Pause the exercise
     */
    pause() {
        if (this.state.status === 'active' || this.state.status === 'resting') {
            this.state.previousStatus = this.state.status;
            this.state.status = 'paused';
            
            if (this.tickInterval) {
                clearInterval(this.tickInterval);
                this.tickInterval = null;
            }
            
            if (this.restTimeout) {
                clearTimeout(this.restTimeout);
                this.restTimeout = null;
            }
            
            this.emitStateChange();
        }
    }
    
    /**
     * Resume the exercise
     */
    resume() {
        if (this.state.status === 'paused') {
            if (this.state.previousStatus === 'active') {
                this.state.status = 'active';
                this.state.repStartTime = Date.now() - (this.state.repElapsedTime * 1000);
                this.tickInterval = setInterval(() => this.tick(), 100);
            } else if (this.state.previousStatus === 'resting') {
                this.startRest();
            }
            
            this.emitStateChange();
        }
    }
    
    /**
     * Cancel the exercise
     */
    cancel() {
        this.cleanup();
        this.state.status = 'cancelled';
        this.emitStateChange();
    }
    
    /**
     * Complete the exercise
     */
    complete() {
        this.cleanup();
        this.state.status = 'completed';
        
        const results = this.getResults();
        this.emitStateChange();
        
        if (this.onComplete) {
            this.onComplete(results);
        }
        
        eventBus.emit(EventTypes.EXERCISE_COMPLETE, {
            exerciseId: this.exercise.id,
            results
        });
    }
    
    /**
     * Get exercise results
     */
    getResults() {
        const totalReps = this.state.successfulReps + this.state.failedReps;
        const successRate = totalReps > 0 ? this.state.successfulReps / totalReps : 0;
        
        return {
            exerciseId: this.exercise.id,
            exerciseTitle: this.exercise.title,
            completedAt: new Date().toISOString(),
            totalDuration: this.state.elapsedTime,
            repsCompleted: this.state.currentRep,
            repsTotal: this.state.totalReps,
            successfulReps: this.state.successfulReps,
            failedReps: this.state.failedReps,
            successRate,
            passed: successRate >= (this.exercise.thresholds?.successRate || DefaultThresholds.successRate),
            adaptedThresholds: { ...this.state.adaptedThresholds }
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        
        if (this.restTimeout) {
            clearTimeout(this.restTimeout);
            this.restTimeout = null;
        }
        
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    
    /**
     * Emit state change
     */
    emitStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }
    
    /**
     * Emit feedback
     */
    emitFeedback(feedback) {
        if (this.onFeedback) {
            this.onFeedback(feedback);
        }
    }
    
    /**
     * Get current state for UI
     */
    getState() {
        return {
            exercise: this.exercise,
            status: this.state.status,
            currentRep: this.state.currentRep,
            totalReps: this.state.totalReps,
            elapsedTime: this.state.elapsedTime,
            repElapsedTime: this.state.repElapsedTime,
            repDuration: this.exercise.duration,
            successfulReps: this.state.successfulReps,
            failedReps: this.state.failedReps,
            currentFeedback: this.state.currentFeedback,
            inRangePercent: this.state.totalSamples > 0 
                ? (this.state.inRangeSamples / this.state.totalSamples) * 100 
                : 0,
            thresholds: this.state.adaptedThresholds
        };
    }
}

export default ExerciseRunner;
