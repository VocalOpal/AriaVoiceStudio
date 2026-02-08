// Event Types

// Debug configuration
const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Debug logging function
function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

export const EventTypes = {
    // Session events
    SESSION_START: 'session:start',
    SESSION_UPDATE: 'session:update',
    SESSION_END: 'session:end',
    SESSION_AUTOSAVE: 'session:autosave',
    SESSION_RECOVERED: 'session:recovered',
    
    // Audio events
    AUDIO_INIT: 'audio:init',
    AUDIO_START: 'audio:start',
    AUDIO_STOP: 'audio:stop',
    AUDIO_FRAME: 'audio:frame',
    AUDIO_ERROR: 'audio:error',
    AUDIO_DEVICE_CHANGE: 'audio:deviceChange',
    
    // Analysis events
    ANALYSIS_RESULT: 'analysis:result',
    ANALYSIS_ERROR: 'analysis:error',
    
    // Training events
    TRAINING_START: 'training:start',
    TRAINING_STOP: 'training:stop',
    TRAINING_PAUSE: 'training:pause',
    TRAINING_RESUME: 'training:resume',
    TRAINING_METRICS: 'training:metrics',
    
    // Achievement events
    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
    STREAK_UPDATE: 'streak:update',
    
    // Safety events
    SAFETY_ALERT: 'safety:alert',
    SAFETY_WARNING: 'safety:warning',
    
    // UI events
    UI_UPDATE: 'ui:update',
    UI_ERROR: 'ui:error',
    UI_NOTIFICATION: 'ui:notification',
    
    // Storage events
    STORAGE_SAVED: 'storage:saved',
    STORAGE_LOADED: 'storage:loaded',
    STORAGE_ERROR: 'storage:error',
    STORAGE_EXPORTED: 'storage:exported',
    STORAGE_IMPORTED: 'storage:imported',

    // Settings events
    SETTINGS_CHANGED: 'settings:changed',

    // Onboarding events
    ONBOARDING_COMPLETED: 'onboarding:completed',
    TUTORIAL_COMPLETED: 'tutorial:completed'
};

// Event Bus Class

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        
        this.listeners.get(eventType).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(eventType);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(eventType);
                }
            }
        };
    }

    /**
     * Subscribe to an event once
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(eventType, callback) {
        const unsubscribe = this.on(eventType, (...args) => {
            unsubscribe();
            callback(...args);
        });
        return unsubscribe;
    }

    /**
     * Emit an event
     * @param {string} eventType - Event type
     * @param {*} data - Event data
     */
    emit(eventType, data) {
        if (this.debugMode) {
            debugLog('EventBus', `${eventType}:`, data);
        }

        // Dispatch CustomEvent for DevTools visibility
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent(eventType, { detail: data });
            window.dispatchEvent(event);
        }

        // Call local listeners
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in ${eventType} listener:`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event type
     * @param {string} eventType - Event type
     */
    off(eventType) {
        this.listeners.delete(eventType);
    }

    /**
     * Remove all listeners
     */
    clear() {
        this.listeners.clear();
    }

    /**
     * Get listener count for an event type
     * @param {string} eventType - Event type
     * @returns {number} Number of listeners
     */
    listenerCount(eventType) {
        return this.listeners.get(eventType)?.size || 0;
    }

    /**
     * Get all event types with listeners
     * @returns {string[]} Array of event types
     */
    eventTypes() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Export convenience functions
export const on = (eventType, callback) => eventBus.on(eventType, callback);
export const once = (eventType, callback) => eventBus.once(eventType, callback);
export const emit = (eventType, data) => eventBus.emit(eventType, data);
export const off = (eventType) => eventBus.off(eventType);
export const clear = () => eventBus.clear();

// Export the event bus and types
export { eventBus };
export default eventBus;
