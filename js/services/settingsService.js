// Aria Voice Studio - Settings Persistence Service
// Extracted from app.js for modular architecture

import { put, get, getAll, STORES } from '../core/storage.js';

/**
 * SettingsService - Centralized settings management
 * Handles loading, saving, and syncing user preferences
 */
class SettingsService {
    constructor() {
        this.cache = new Map();
        this.listeners = new Map();
        this.defaults = {
            theme: 'dark',
            profileName: 'User',
            genderIdentity: 'prefer-not',
            pronouns: 'they/them',
            targetMin: 140,
            targetMax: 200,
            dailyReminders: true,
            strainAlerts: true,
            pitchAlertEnabled: true,
            pitchAlertDelay: 5,
            pitchAlertVolume: 50,
            sensitivity: 50,
            showAdvancedMetrics: false,
            autoStartSession: false,
            soundEnabled: true,
            hapticFeedback: true
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize settings service and load cached values
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            const allSettings = await getAll(STORES.SETTINGS);
            allSettings.forEach(setting => {
                this.cache.set(setting.key, setting.value);
            });
            this.initialized = true;
        } catch (err) {
            console.error('[SettingsService] Failed to initialize:', err);
            this.initialized = true; // Continue with defaults
        }
    }
    
    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @param {*} [defaultValue] - Default if not found
     * @returns {Promise<*>} Setting value
     */
    async get(key, defaultValue) {
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        // Try loading from storage
        try {
            const result = await get(STORES.SETTINGS, key);
            if (result) {
                this.cache.set(key, result.value);
                return result.value;
            }
        } catch (err) {
            console.error(`[SettingsService] Failed to load ${key}:`, err);
        }
        
        // Return default
        return defaultValue ?? this.defaults[key] ?? null;
    }
    
    /**
     * Get a setting synchronously from cache
     * @param {string} key - Setting key
     * @param {*} [defaultValue] - Default if not in cache
     * @returns {*} Cached value or default
     */
    getCached(key, defaultValue) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        return defaultValue ?? this.defaults[key] ?? null;
    }
    
    /**
     * Save a setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    async set(key, value) {
        try {
            await put(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
            const oldValue = this.cache.get(key);
            this.cache.set(key, value);
            this.notifyListeners(key, value, oldValue);
        } catch (err) {
            console.error(`[SettingsService] Failed to save ${key}:`, err);
            throw err;
        }
    }
    
    /**
     * Save multiple settings at once
     * @param {Object} settings - Key-value pairs
     */
    async setMultiple(settings) {
        const promises = Object.entries(settings).map(([key, value]) => 
            this.set(key, value)
        );
        await Promise.all(promises);
    }
    
    /**
     * Subscribe to setting changes
     * @param {string} key - Setting key to watch, or '*' for all
     * @param {Function} callback - Called with (newValue, oldValue, key)
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }
    
    /**
     * Notify listeners of setting changes
     * @private
     */
    notifyListeners(key, newValue, oldValue) {
        // Notify key-specific listeners
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (err) {
                    console.error(`[SettingsService] Listener error for ${key}:`, err);
                }
            });
        }
        
        // Notify global listeners
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
            globalListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (err) {
                    console.error('[SettingsService] Global listener error:', err);
                }
            });
        }
    }
    
    /**
     * Get all settings as an object
     * @returns {Promise<Object>} All settings
     */
    async getAll() {
        const allSettings = {};
        for (const [key, defaultValue] of Object.entries(this.defaults)) {
            allSettings[key] = await this.get(key, defaultValue);
        }
        return allSettings;
    }
    
    /**
     * Reset a setting to default
     * @param {string} key - Setting key
     */
    async reset(key) {
        if (key in this.defaults) {
            await this.set(key, this.defaults[key]);
        }
    }
    
    /**
     * Reset all settings to defaults
     */
    async resetAll() {
        await this.setMultiple(this.defaults);
    }
    
    /**
     * Export settings for backup
     * @returns {Promise<Object>} Exportable settings object
     */
    async export() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: await this.getAll()
        };
    }
    
    /**
     * Import settings from backup
     * @param {Object} data - Imported settings object
     */
    async import(data) {
        if (!data.settings) {
            throw new Error('Invalid settings format');
        }
        
        await this.setMultiple(data.settings);
    }
}

// Singleton instance
let settingsServiceInstance = null;

/**
 * Get or create the settings service instance
 * @returns {SettingsService}
 */
export function getSettingsService() {
    if (!settingsServiceInstance) {
        settingsServiceInstance = new SettingsService();
    }
    return settingsServiceInstance;
}

/**
 * Initialize and return the settings service
 * @returns {Promise<SettingsService>}
 */
export async function initSettingsService() {
    const service = getSettingsService();
    await service.initialize();
    return service;
}

// Convenience functions for common settings operations
export async function saveSettings(key, value) {
    const service = getSettingsService();
    await service.set(key, value);
}

export async function loadSettings(key, defaultValue = null) {
    const service = getSettingsService();
    return service.get(key, defaultValue);
}

export default SettingsService;
