// Aria Voice Studio - Exercises Screen UI
// Modular screen component for vocal exercises

import { eventBus } from '../../core/events.js';
import { 
    getExerciseManager, 
    initExerciseManager,
    ExerciseCategories,
    VoiceGoals 
} from '../../features/vocal-exercises/index.js';
import { getSettingsService } from '../../services/settingsService.js';
import { throttle } from '../../utils/performanceMonitor.js';

/**
 * ExercisesScreen - Manages the exercises screen UI
 */
class ExercisesScreen {
    constructor() {
        this.container = null;
        this.exerciseManager = null;
        this.settingsService = null;
        this.currentView = 'categories'; // categories, exercises, running, results
        this.selectedCategory = null;
        this.userGoal = VoiceGoals.NEUTRAL;
        this.unsubscribers = [];
    }
    
    /**
     * Initialize the screen
     */
    async initialize(container) {
        this.container = container;
        this.exerciseManager = await initExerciseManager();
        this.settingsService = getSettingsService();
        
        // Load user goal from settings
        const preset = await this.settingsService.get('voicePreset', 'neutral');
        this.userGoal = this.presetToGoal(preset);
        
        // Subscribe to exercise events
        this.subscribeToEvents();
        
        // Initial render
        this.render();
    }
    
    /**
     * Convert preset string to VoiceGoal
     */
    presetToGoal(preset) {
        const mapping = {
            // Current terminology
            'higher': VoiceGoals.HIGHER,
            'lower': VoiceGoals.LOWER,
            'mid-high': VoiceGoals.MID,
            'mid-low': VoiceGoals.MID,
            'custom': VoiceGoals.CUSTOM,
            // Backward compatibility with saved data
            'feminine': VoiceGoals.HIGHER,
            'masculine': VoiceGoals.LOWER,
            'androgynous-high': VoiceGoals.MID,
            'androgynous-low': VoiceGoals.MID
        };
        return mapping[preset] || VoiceGoals.NEUTRAL;
    }
    
    /**
     * Subscribe to exercise-related events
     */
    subscribeToEvents() {
        const unsub1 = eventBus.on('EXERCISE_STATE_CHANGE', throttle((state) => {
            this.handleExerciseStateChange(state);
        }, 100));
        
        const unsub2 = eventBus.on('EXERCISE_FEEDBACK', (feedback) => {
            this.handleExerciseFeedback(feedback);
        });
        
        const unsub3 = eventBus.on('EXERCISE_COMPLETE', (data) => {
            this.handleExerciseComplete(data);
        });
        
        this.unsubscribers.push(unsub1, unsub2, unsub3);
    }
    
    /**
     * Cleanup subscriptions
     */
    cleanup() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    
    /**
     * Main render method
     */
    render() {
        if (!this.container) return;
        
        switch (this.currentView) {
            case 'categories':
                this.renderCategories();
                break;
            case 'exercises':
                this.renderCategoryExercises();
                break;
            case 'running':
                this.renderRunningExercise();
                break;
            case 'results':
                this.renderResults();
                break;
        }
    }
    
    /**
     * Render the category overview — the main landing screen
     */
    renderCategories() {
        const exercisesByCategory = this.exerciseManager.getExercisesByCategory(this.userGoal);
        const progressStats = this.exerciseManager.getProgressStats();
        const categories = Object.values(ExerciseCategories);
        
        this.container.innerHTML = `
            <div class="exercises-screen">
                <!-- Progress Header -->
                <div class="exercises-header glass-card">
                    <div class="progress-summary">
                        <div class="stat-item">
                            <span class="stat-value">${progressStats.totalExercisesCompleted}</span>
                            <span class="stat-label">Exercises Done</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${Math.round(progressStats.averageSuccessRate * 100)}%</span>
                            <span class="stat-label">Success Rate</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${progressStats.weeklyGoalProgress.completed}/${progressStats.weeklyGoalProgress.goal}</span>
                            <span class="stat-label">Weekly Goal</span>
                        </div>
                    </div>
                    <div class="weekly-progress-bar">
                        <div class="progress-fill" style="width: ${progressStats.weeklyGoalProgress.percentage}%"></div>
                    </div>
                </div>
                
                <h3 class="section-heading">Choose a Category</h3>
                
                <!-- Category Cards -->
                <div class="category-cards">
                    ${categories.map(cat => {
                        const exercises = exercisesByCategory[cat.id] || [];
                        const completedCount = exercises.reduce((sum, ex) => 
                            sum + (ex.progress?.completedCount > 0 ? 1 : 0), 0);
                        return this.renderCategoryCard(cat, exercises.length, completedCount);
                    }).join('')}
                </div>
            </div>
        `;
        
        this.attachCategoryEventListeners();
    }
    
    /**
     * Render a single category card
     */
    renderCategoryCard(category, exerciseCount, completedCount) {
        return `
            <button class="category-card-large glass-card" data-category="${category.id}">
                <div class="category-card-icon" style="background: ${category.color}20; color: ${category.color}">
                    ${category.icon}
                </div>
                <div class="category-card-info">
                    <h4>${category.label}</h4>
                    <span class="category-card-count">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}</span>
                </div>
                <div class="category-card-progress">
                    ${completedCount > 0 ? `
                        <span class="category-done-badge">${completedCount}/${exerciseCount} tried</span>
                    ` : ''}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="category-arrow"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>
        `;
    }
    
    /**
     * Render exercises within a selected category
     */
    renderCategoryExercises() {
        const exercisesByCategory = this.exerciseManager.getExercisesByCategory(this.userGoal);
        const exercises = exercisesByCategory[this.selectedCategory] || [];
        const category = Object.values(ExerciseCategories).find(c => c.id === this.selectedCategory);
        
        this.container.innerHTML = `
            <div class="exercises-screen">
                <!-- Category Header -->
                <div class="category-detail-header glass-card">
                    <button class="back-btn" id="backToCategories">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div class="category-detail-icon" style="background: ${category?.color || '#888'}20; color: ${category?.color || '#888'}">
                        ${category?.icon || ''}
                    </div>
                    <div class="category-detail-info">
                        <h2>${category?.label || 'Exercises'}</h2>
                        <span class="category-detail-count">${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <!-- Exercise List -->
                <div class="exercise-cards">
                    ${exercises.map(ex => this.renderExerciseCard(ex)).join('')}
                </div>
                
                ${exercises.length === 0 ? `
                    <div class="empty-category glass-card">
                        <p>No exercises available in this category for your current voice goal.</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.attachExerciseListEventListeners();
    }
    
    /**
     * Render a single exercise card
     */
    renderExerciseCard(exercise) {
        const progress = exercise.progress || { completedCount: 0, successRate: 0 };
        const totalMinutes = Math.ceil((exercise.duration * exercise.repetitions + exercise.restBetweenReps * (exercise.repetitions - 1)) / 60);
        
        return `
            <div class="exercise-card glass-card" data-exercise-id="${exercise.id}">
                <div class="exercise-card-header">
                    <div class="exercise-icon" style="background: ${exercise.category.color}20; color: ${exercise.category.color}">
                        ${exercise.category.icon}
                    </div>
                    <div class="exercise-info">
                        <h4 class="exercise-title">${exercise.title}</h4>
                        <p class="exercise-description">${exercise.description}</p>
                    </div>
                </div>
                
                <div class="exercise-meta">
                    <span class="meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${totalMinutes} min
                    </span>
                    <span class="meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20V10M18 20V4M6 20v-4"/>
                        </svg>
                        ${exercise.difficulty.label}
                    </span>
                    <span class="meta-item">
                        ${exercise.repetitions} reps
                    </span>
                </div>
                
                ${progress.completedCount > 0 ? `
                    <div class="exercise-progress">
                        <div class="progress-info">
                            <span>Completed ${progress.completedCount}x</span>
                            <span>${Math.round(progress.successRate * 100)}% success</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.successRate * 100}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <button class="btn btn-gradient start-exercise-btn" data-exercise-id="${exercise.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Start
                </button>
            </div>
        `;
    }
    
    /**
     * Render the running exercise view
     */
    renderRunningExercise() {
        const state = this.exerciseManager.getCurrentExerciseState();
        if (!state) {
            this.currentView = 'exercises';
            this.render();
            return;
        }
        
        const exercise = state.exercise;
        const repProgress = (state.repElapsedTime / state.repDuration) * 100;
        
        this.container.innerHTML = `
            <div class="exercise-running-screen">
                <div class="exercise-header glass-card">
                    <button class="back-btn" id="cancelExercise">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div class="exercise-title-area">
                        <h2>${exercise.title}</h2>
                        <span class="exercise-category">${exercise.category.icon} ${exercise.category.label}</span>
                    </div>
                </div>
                
                <div class="exercise-main glass-card">
                    <!-- Status indicator -->
                    <div class="status-badge status-${state.status}">
                        ${this.getStatusLabel(state.status)}
                    </div>
                    
                    <!-- Rep counter -->
                    <div class="rep-counter">
                        <span class="current-rep">${state.currentRep}</span>
                        <span class="rep-divider">/</span>
                        <span class="total-reps">${state.totalReps}</span>
                    </div>
                    
                    <!-- Timer ring -->
                    <div class="timer-ring-container">
                        <svg class="timer-ring" viewBox="0 0 120 120">
                            <circle class="timer-ring-bg" cx="60" cy="60" r="54" fill="none" stroke-width="8"/>
                            <circle class="timer-ring-progress" cx="60" cy="60" r="54" fill="none" stroke-width="8"
                                    stroke-dasharray="339.292" 
                                    stroke-dashoffset="${339.292 * (1 - repProgress / 100)}"/>
                        </svg>
                        <div class="timer-display">
                            <span class="timer-seconds">${Math.ceil(state.repDuration - state.repElapsedTime)}</span>
                            <span class="timer-label">seconds</span>
                        </div>
                    </div>
                    
                    <!-- Feedback area -->
                    <div class="feedback-area" id="feedbackArea">
                        ${state.currentFeedback ? `
                            <div class="feedback-message feedback-${state.currentFeedback.type}">
                                ${state.currentFeedback.message || ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- In-range indicator -->
                    <div class="in-range-indicator">
                        <div class="in-range-bar">
                            <div class="in-range-fill" style="width: ${state.inRangePercent}%"></div>
                        </div>
                        <span class="in-range-label">${Math.round(state.inRangePercent)}% in target</span>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div class="exercise-instructions glass-card">
                    <h4>Instructions</h4>
                    <ol class="instruction-list">
                        ${exercise.instructions.map(inst => `<li>${inst}</li>`).join('')}
                    </ol>
                </div>
                
                <!-- Controls -->
                <div class="exercise-controls">
                    ${state.status === 'paused' ? `
                        <button class="btn btn-gradient" id="resumeExercise">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            Resume
                        </button>
                    ` : `
                        <button class="btn btn-secondary" id="pauseExercise">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                            </svg>
                            Pause
                        </button>
                    `}
                    <button class="btn btn-danger" id="stopExercise">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        </svg>
                        Stop
                    </button>
                </div>
            </div>
        `;
        
        this.attachRunningEventListeners();
    }
    
    /**
     * Get human-readable status label
     */
    getStatusLabel(status) {
        const labels = {
            'preparing': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Get Ready...',
            'active': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Go!',
            'resting': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg> Rest',
            'paused': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Paused',
            'completed': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Done!'
        };
        return labels[status] || status;
    }
    
    /**
     * Render exercise results view
     */
    renderResults() {
        const results = this.lastResults;
        if (!results) {
            this.currentView = 'exercises';
            this.render();
            return;
        }
        
        const passed = results.passed;
        
        this.container.innerHTML = `
            <div class="exercise-results-screen">
                <div class="results-card glass-card">
                    <div class="results-icon ${passed ? 'success' : 'needs-work'}">
                        ${passed ? '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>'}
                    </div>
                    
                    <h2>${passed ? 'Great Job!' : 'Keep Practicing!'}</h2>
                    <p class="results-subtitle">${results.exerciseTitle}</p>
                    
                    <div class="results-stats">
                        <div class="stat-card">
                            <span class="stat-value">${results.repsCompleted}/${results.repsTotal}</span>
                            <span class="stat-label">Reps Completed</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${Math.round(results.successRate * 100)}%</span>
                            <span class="stat-label">Success Rate</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${Math.round(results.totalDuration)}s</span>
                            <span class="stat-label">Total Time</span>
                        </div>
                    </div>
                    
                    <div class="results-breakdown">
                        <div class="breakdown-item success">
                            <span class="breakdown-count">${results.successfulReps}</span>
                            <span class="breakdown-label">Successful</span>
                        </div>
                        <div class="breakdown-item failed">
                            <span class="breakdown-count">${results.failedReps}</span>
                            <span class="breakdown-label">Need Work</span>
                        </div>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="btn btn-gradient" id="retryExercise" data-exercise-id="${results.exerciseId}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                        </svg>
                        Try Again
                    </button>
                    <button class="btn btn-secondary" id="backToLibrary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        Back to Exercises
                    </button>
                </div>
            </div>
        `;
        
        this.attachResultsEventListeners();
    }
    
    /**
     * Attach event listeners for category overview
     */
    attachCategoryEventListeners() {
        this.container.querySelectorAll('.category-card-large').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedCategory = card.dataset.category;
                this.currentView = 'exercises';
                this.render();
            });
        });
    }
    
    /**
     * Attach event listeners for exercise list within a category
     */
    attachExerciseListEventListeners() {
        this.container.querySelector('#backToCategories')?.addEventListener('click', () => {
            this.selectedCategory = null;
            this.currentView = 'categories';
            this.render();
        });
        
        this.container.querySelectorAll('.start-exercise-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const exerciseId = btn.dataset.exerciseId;
                this.startExercise(exerciseId);
            });
        });
    }
    
    /**
     * Attach event listeners for running exercise view
     */
    attachRunningEventListeners() {
        this.container.querySelector('#cancelExercise')?.addEventListener('click', () => {
            this.exerciseManager.cancelExercise();
            this.currentView = 'exercises';
            this.render();
        });
        
        this.container.querySelector('#pauseExercise')?.addEventListener('click', () => {
            this.exerciseManager.pauseExercise();
        });
        
        this.container.querySelector('#resumeExercise')?.addEventListener('click', () => {
            this.exerciseManager.resumeExercise();
        });
        
        this.container.querySelector('#stopExercise')?.addEventListener('click', () => {
            this.exerciseManager.cancelExercise();
            this.currentView = 'exercises';
            this.render();
        });
    }
    
    /**
     * Attach event listeners for results view
     */
    attachResultsEventListeners() {
        this.container.querySelector('#retryExercise')?.addEventListener('click', (e) => {
            const exerciseId = e.target.dataset.exerciseId;
            this.startExercise(exerciseId);
        });
        
        this.container.querySelector('#backToLibrary')?.addEventListener('click', () => {
            this.currentView = 'exercises';
            this.render();
        });
    }
    
    /**
     * Start an exercise
     */
    async startExercise(exerciseId) {
        try {
            const targetMin = await this.settingsService.get('targetMin', 140);
            const targetMax = await this.settingsService.get('targetMax', 200);
            
            this.exerciseManager.startExercise(exerciseId, {
                targetMin,
                targetMax
            });
            
            this.currentView = 'running';
            this.render();
        } catch (err) {
            console.error('[ExercisesScreen] Failed to start exercise:', err);
        }
    }
    
    /**
     * Handle exercise state changes
     */
    handleExerciseStateChange(state) {
        if (this.currentView !== 'running') return;
        
        // Update the running UI efficiently
        this.updateRunningUI(state);
    }
    
    /**
     * Update running UI without full re-render
     */
    updateRunningUI(state) {
        // Update timer
        const timerEl = this.container.querySelector('.timer-seconds');
        if (timerEl) {
            timerEl.textContent = Math.ceil(state.repDuration - state.repElapsedTime);
        }
        
        // Update progress ring
        const progressRing = this.container.querySelector('.timer-ring-progress');
        if (progressRing) {
            const repProgress = (state.repElapsedTime / state.repDuration) * 100;
            progressRing.style.strokeDashoffset = 339.292 * (1 - repProgress / 100);
        }
        
        // Update rep counter
        const currentRep = this.container.querySelector('.current-rep');
        if (currentRep) {
            currentRep.textContent = state.currentRep;
        }
        
        // Update in-range indicator
        const inRangeFill = this.container.querySelector('.in-range-fill');
        const inRangeLabel = this.container.querySelector('.in-range-label');
        if (inRangeFill) {
            inRangeFill.style.width = `${state.inRangePercent}%`;
        }
        if (inRangeLabel) {
            inRangeLabel.textContent = `${Math.round(state.inRangePercent)}% in target`;
        }
        
        // Update status badge
        const statusBadge = this.container.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge status-${state.status}`;
            statusBadge.textContent = this.getStatusLabel(state.status);
        }
    }
    
    /**
     * Handle exercise feedback
     */
    handleExerciseFeedback(feedback) {
        const feedbackArea = this.container.querySelector('#feedbackArea');
        if (feedbackArea && feedback.message) {
            feedbackArea.innerHTML = `
                <div class="feedback-message feedback-${feedback.type}">
                    ${feedback.message}
                </div>
            `;
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleExerciseComplete(data) {
        this.lastResults = data.results;
        this.currentView = 'results';
        this.render();
    }
}

// Singleton instance
let exercisesScreenInstance = null;

/**
 * Get or create the exercises screen instance
 */
export function getExercisesScreen() {
    if (!exercisesScreenInstance) {
        exercisesScreenInstance = new ExercisesScreen();
    }
    return exercisesScreenInstance;
}

export default ExercisesScreen;
