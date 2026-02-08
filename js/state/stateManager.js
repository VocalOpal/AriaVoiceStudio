export class StateManager {
    constructor(initialState = {}) {
        this.state = {
            isTraining: false,
            currentPitch: 0,
            avgPitch: 0,
            minPitch: 0,
            maxPitch: 0,
            stability: 0,
            duration: 0,
            sampleCount: 0,
            pitchHistory: [],
            audioContext: null,
            mediaStream: null,
            processor: null,
            durationInterval: null,
            
            targetMin: 140,
            targetMax: 200,
            timeInRange: 0,
            totalTime: 0,
            
            currentScreen: 'training',
            modalOpen: null,
            
            lastUIUpdate: 0,
            uiUpdateCount: 0,
            startTime: Date.now(),
            
            cleanupTasks: new Set(),
            
            ...initialState
        };
        
        this.subscribers = new Map();
        this.middleware = [];
    }
    
    get(key) {
        return key ? this.state[key] : { ...this.state };
    }
    
    set(updates, silent = false) {
        const prevState = { ...this.state };
        const changes = {};
        
        if (typeof updates === 'object' && updates !== null) {
            Object.keys(updates).forEach(key => {
                if (this.state[key] !== updates[key]) {
                    changes[key] = { prev: this.state[key], next: updates[key] };
                    this.state[key] = updates[key];
                }
            });
        }
        
        this.middleware.forEach(middleware => {
            try {
                middleware(changes, this.state, prevState);
            } catch (err) {
                console.error('[StateManager] Middleware error:', err);
            }
        });
        
        if (!silent && Object.keys(changes).length > 0) {
            this.notifySubscribers(changes, prevState);
        }
        
        return changes;
    }
    
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        return () => {
            const subscribers = this.subscribers.get(key);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }
    
    notifySubscribers(changes, prevState) {
        Object.keys(changes).forEach(key => {
            const subscribers = this.subscribers.get(key);
            if (subscribers) {
                subscribers.forEach(callback => {
                    try {
                        callback(changes[key].next, changes[key].prev, this.state);
                    } catch (err) {
                        console.error(`[StateManager] Subscriber error for ${key}:`, err);
                    }
                });
            }
        });
        
        const globalSubscribers = this.subscribers.get('*');
        if (globalSubscribers) {
            globalSubscribers.forEach(callback => {
                try {
                    callback(changes, prevState, this.state);
                } catch (err) {
                    console.error('[StateManager] Global subscriber error:', err);
                }
            });
        }
    }
    
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    
    reset(partialState = {}) {
        const prevState = { ...this.state };
        this.state = {
            isTraining: false,
            currentPitch: 0,
            avgPitch: 0,
            minPitch: 0,
            maxPitch: 0,
            stability: 0,
            duration: 0,
            sampleCount: 0,
            pitchHistory: [],
            audioContext: null,
            mediaStream: null,
            processor: null,
            durationInterval: null,
            targetMin: this.state.targetMin,
            targetMax: this.state.targetMax,
            timeInRange: 0,
            totalTime: 0,
            currentScreen: this.state.currentScreen,
            modalOpen: null,
            lastUIUpdate: 0,
            uiUpdateCount: 0,
            startTime: Date.now(),
            cleanupTasks: new Set(),
            ...partialState
        };
        this.notifySubscribers({}, prevState);
    }
    
    addCleanupTask(task) {
        const taskId = Symbol('cleanup');
        this.state.cleanupTasks.add({ id: taskId, task });
        return taskId;
    }
    
    removeCleanupTask(taskId) {
        this.state.cleanupTasks.forEach(item => {
            if (item.id === taskId) {
                this.state.cleanupTasks.delete(item);
            }
        });
    }
    
    async cleanup() {
        const cleanupTasks = Array.from(this.state.cleanupTasks);
        this.state.cleanupTasks.clear();
        
        await Promise.allSettled(
            cleanupTasks.map(async ({ task }) => {
                try {
                    await task();
                } catch (err) {
                    console.error('[StateManager] Cleanup task error:', err);
                }
            })
        );
    }
    
    trackUIUpdate() {
        this.state.uiUpdateCount++;
        this.state.lastUIUpdate = Date.now();
    }
    
    getUIUpdateStats() {
        const elapsed = (Date.now() - this.state.startTime) / 1000;
        return {
            totalUpdates: this.state.uiUpdateCount,
            lastUpdate: this.state.lastUIUpdate,
            updatesPerSecond: elapsed > 0 ? this.state.uiUpdateCount / elapsed : 0
        };
    }
}

let globalStateManager = null;

export function getStateManager(initialState = {}) {
    if (!globalStateManager) {
        globalStateManager = new StateManager(initialState);
        
        globalStateManager.addMiddleware((changes) => {
            if (changes.currentPitch) {
                globalStateManager.trackUIUpdate();
            }
        });
    }
    return globalStateManager;
}

/**
 * Reset the global state manager (primarily for testing)
 */
export function resetStateManager() {
    if (globalStateManager) {
        globalStateManager.cleanup();
    }
    globalStateManager = null;
}

export default StateManager;
