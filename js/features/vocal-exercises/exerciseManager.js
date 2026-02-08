// Aria Voice Studio - Exercise Manager
// Orchestrates exercise sessions, progress tracking, and recommendations

import { eventBus, EventTypes } from '../../core/events.js';
import { put, get, getAll, STORES } from '../../core/storage.js';
import { getExercises, getExerciseById, getExercisesByCategory } from './exerciseDefinitions.js';
import { ExerciseRunner } from './exerciseRunner.js';
import { VoiceGoals, ExerciseCategories, SkillFocus } from './exerciseTypes.js';

/**
 * ExerciseManager - Manages exercise library, progress, and recommendations
 */
class ExerciseManager {
    constructor() {
        this.currentRunner = null;
        this.userProgress = new Map();
        this.sessionHistory = [];
        this.initialized = false;
    }
    
    /**
     * Initialize the exercise manager
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Load user progress from storage
            const progress = await get(STORES.METADATA, 'exerciseProgress');
            if (progress?.data) {
                this.userProgress = new Map(Object.entries(progress.data));
            }
            
            // Load recent session history
            const history = await get(STORES.METADATA, 'exerciseHistory');
            if (history?.data) {
                this.sessionHistory = history.data;
            }
            
            this.initialized = true;
        } catch (err) {
            console.error('[ExerciseManager] Failed to initialize:', err);
            this.initialized = true;
        }
    }
    
    /**
     * Get all available exercises for a user's goal
     */
    getAvailableExercises(userGoal = VoiceGoals.NEUTRAL, userStats = {}) {
        const exercises = getExercises({ goal: userGoal });
        
        return exercises.map(exercise => {
            const progress = this.userProgress.get(exercise.id) || {
                completedCount: 0,
                successRate: 0,
                lastAttempt: null,
                bestScore: 0
            };
            
            return {
                ...exercise,
                progress,
                recommended: this.isRecommended(exercise, userStats, progress)
            };
        });
    }
    
    /**
     * Get exercises organized by category
     */
    getExercisesByCategory(userGoal = VoiceGoals.NEUTRAL) {
        const byCategory = getExercisesByCategory(userGoal);
        const result = {};
        
        for (const [categoryId, exercises] of Object.entries(byCategory)) {
            result[categoryId] = exercises.map(ex => ({
                ...ex,
                progress: this.userProgress.get(ex.id) || { completedCount: 0, successRate: 0 }
            }));
        }
        
        return result;
    }
    
    /**
     * Check if an exercise is recommended based on user's performance
     */
    isRecommended(exercise, userStats = {}, progress = {}) {
        // Recommend warmups at start of session
        if (exercise.category.id === 'warmup' && !userStats.hasWarmup) {
            return true;
        }
        
        // Recommend exercises not done recently
        if (!progress.lastAttempt) {
            return true;
        }
        
        const daysSinceAttempt = (Date.now() - new Date(progress.lastAttempt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAttempt > 3) {
            return true;
        }
        
        // Recommend exercises with low success rate for improvement
        if (progress.completedCount > 0 && progress.successRate < 0.6) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get smart recommendations based on user performance
     */
    getRecommendations(userGoal = VoiceGoals.NEUTRAL, userStats = {}) {
        const recommendations = [];
        const allExercises = this.getAvailableExercises(userGoal, userStats);
        
        // 1. Recommend warmup if not done today
        if (!userStats.hasWarmup) {
            const warmups = allExercises.filter(ex => 
                ex.category.id === 'warmup'
            );
            if (warmups.length > 0) {
                recommendations.push({
                    type: 'warmup',
                    reason: 'Start with a warmup to protect your voice',
                    exercises: warmups.slice(0, 2)
                });
            }
        }
        
        // 2. Recommend based on weak skills
        const weakSkills = this.identifyWeakSkills(userStats);
        for (const skill of weakSkills.slice(0, 2)) {
            const skillExercises = allExercises.filter(ex => 
                ex.skills.includes(skill) && ex.category.id !== 'warmup'
            );
            if (skillExercises.length > 0) {
                recommendations.push({
                    type: 'improvement',
                    skill,
                    reason: `Work on ${this.getSkillLabel(skill)}`,
                    exercises: skillExercises.slice(0, 2)
                });
            }
        }
        
        // 3. Recommend exercises for progression
        const progressExercises = allExercises.filter(ex => 
            !ex.progress.lastAttempt &&
            ex.category.id !== 'warmup' &&
            ex.category.id !== 'cooldown'
        );
        if (progressExercises.length > 0) {
            recommendations.push({
                type: 'new',
                reason: 'Try something new',
                exercises: progressExercises.slice(0, 2)
            });
        }
        
        // 4. Recommend cooldown if session is ending
        if (userStats.sessionDuration > 10) {
            const cooldowns = allExercises.filter(ex => 
                ex.category.id === 'cooldown'
            );
            if (cooldowns.length > 0) {
                recommendations.push({
                    type: 'cooldown',
                    reason: 'Wind down your session',
                    exercises: cooldowns.slice(0, 2)
                });
            }
        }
        
        return recommendations;
    }
    
    /**
     * Identify skills that need work based on performance
     */
    identifyWeakSkills(userStats = {}) {
        const skillScores = {};
        
        // Analyze session history for skill performance
        for (const session of this.sessionHistory.slice(-20)) {
            const exercise = getExerciseById(session.exerciseId);
            if (exercise) {
                for (const skill of exercise.skills) {
                    if (!skillScores[skill]) {
                        skillScores[skill] = { total: 0, success: 0 };
                    }
                    skillScores[skill].total++;
                    skillScores[skill].success += session.successRate;
                }
            }
        }
        
        // Calculate average success per skill
        const skillRatings = Object.entries(skillScores)
            .map(([skill, data]) => ({
                skill,
                avgSuccess: data.total > 0 ? data.success / data.total : 0.5
            }))
            .sort((a, b) => a.avgSuccess - b.avgSuccess);
        
        // Return weakest skills
        return skillRatings.slice(0, 3).map(s => s.skill);
    }
    
    /**
     * Get human-readable skill label
     */
    getSkillLabel(skill) {
        const labels = {
            [SkillFocus.PITCH_STABILITY]: 'Pitch Stability',
            [SkillFocus.PITCH_RANGE]: 'Pitch Range',
            [SkillFocus.RESONANCE]: 'Resonance',
            [SkillFocus.BREATH_CONTROL]: 'Breath Control',
            [SkillFocus.INTONATION]: 'Intonation',
            [SkillFocus.REGISTER_CONTROL]: 'Register Control',
            [SkillFocus.VOCAL_WEIGHT]: 'Vocal Weight',
            [SkillFocus.FORMANT_SHAPING]: 'Formant Shaping'
        };
        return labels[skill] || skill;
    }
    
    /**
     * Start an exercise
     */
    startExercise(exerciseId, userSettings = {}) {
        // Cancel any running exercise
        if (this.currentRunner) {
            this.currentRunner.cancel();
        }
        
        try {
            this.currentRunner = new ExerciseRunner(exerciseId, userSettings);
            
            // Set up callbacks
            this.currentRunner.onStateChange = (state) => {
                eventBus.emit('EXERCISE_STATE_CHANGE', state);
            };
            
            this.currentRunner.onFeedback = (feedback) => {
                eventBus.emit('EXERCISE_FEEDBACK', feedback);
            };
            
            this.currentRunner.onComplete = async (results) => {
                await this.recordExerciseResult(results);
            };
            
            this.currentRunner.start();
            
            return this.currentRunner;
        } catch (err) {
            console.error('[ExerciseManager] Failed to start exercise:', err);
            throw err;
        }
    }
    
    /**
     * Pause current exercise
     */
    pauseExercise() {
        if (this.currentRunner) {
            this.currentRunner.pause();
        }
    }
    
    /**
     * Resume current exercise
     */
    resumeExercise() {
        if (this.currentRunner) {
            this.currentRunner.resume();
        }
    }
    
    /**
     * Cancel current exercise
     */
    cancelExercise() {
        if (this.currentRunner) {
            this.currentRunner.cancel();
            this.currentRunner = null;
        }
    }
    
    /**
     * Get current exercise state
     */
    getCurrentExerciseState() {
        if (this.currentRunner) {
            return this.currentRunner.getState();
        }
        return null;
    }
    
    /**
     * Record exercise result and update progress
     */
    async recordExerciseResult(results) {
        // Update progress for this exercise
        const existing = this.userProgress.get(results.exerciseId) || {
            completedCount: 0,
            successRate: 0,
            lastAttempt: null,
            bestScore: 0
        };
        
        const newCount = existing.completedCount + 1;
        const newSuccessRate = (existing.successRate * existing.completedCount + results.successRate) / newCount;
        
        this.userProgress.set(results.exerciseId, {
            completedCount: newCount,
            successRate: newSuccessRate,
            lastAttempt: results.completedAt,
            bestScore: Math.max(existing.bestScore, results.successRate)
        });
        
        // Add to session history
        this.sessionHistory.push({
            exerciseId: results.exerciseId,
            completedAt: results.completedAt,
            successRate: results.successRate,
            duration: results.totalDuration
        });
        
        // Keep only last 100 sessions
        if (this.sessionHistory.length > 100) {
            this.sessionHistory = this.sessionHistory.slice(-100);
        }
        
        // Persist to storage
        await this.saveProgress();
    }
    
    /**
     * Save progress to storage
     */
    async saveProgress() {
        try {
            await put(STORES.METADATA, {
                key: 'exerciseProgress',
                data: Object.fromEntries(this.userProgress),
                updatedAt: Date.now()
            });
            
            await put(STORES.METADATA, {
                key: 'exerciseHistory',
                data: this.sessionHistory,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error('[ExerciseManager] Failed to save progress:', err);
        }
    }
    
    /**
     * Get overall exercise progress stats
     */
    getProgressStats() {
        let totalCompleted = 0;
        let totalSuccessRate = 0;
        let exercisesWithProgress = 0;
        
        this.userProgress.forEach((progress) => {
            totalCompleted += progress.completedCount;
            if (progress.completedCount > 0) {
                totalSuccessRate += progress.successRate;
                exercisesWithProgress++;
            }
        });
        
        return {
            totalExercisesCompleted: totalCompleted,
            uniqueExercisesAttempted: this.userProgress.size,
            averageSuccessRate: exercisesWithProgress > 0 
                ? totalSuccessRate / exercisesWithProgress 
                : 0,
            recentSessions: this.sessionHistory.slice(-10),
            weeklyGoalProgress: this.calculateWeeklyProgress()
        };
    }
    
    /**
     * Calculate progress towards weekly exercise goals
     */
    calculateWeeklyProgress() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const weekSessions = this.sessionHistory.filter(s => 
            new Date(s.completedAt).getTime() > oneWeekAgo
        );
        
        const weeklyGoal = 20; // Target: 20 exercises per week
        return {
            completed: weekSessions.length,
            goal: weeklyGoal,
            percentage: Math.min(100, (weekSessions.length / weeklyGoal) * 100)
        };
    }
    
    /**
     * Reset progress (for testing or user request)
     */
    async resetProgress() {
        this.userProgress.clear();
        this.sessionHistory = [];
        await this.saveProgress();
    }
}

// Singleton instance
let exerciseManagerInstance = null;

/**
 * Get or create the exercise manager instance
 */
export function getExerciseManager() {
    if (!exerciseManagerInstance) {
        exerciseManagerInstance = new ExerciseManager();
    }
    return exerciseManagerInstance;
}

/**
 * Initialize and return the exercise manager
 */
export async function initExerciseManager() {
    const manager = getExerciseManager();
    await manager.initialize();
    return manager;
}

export default ExerciseManager;
