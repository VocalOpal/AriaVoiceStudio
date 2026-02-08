// Settings module - barrel exports
import {
    initSettingsModule,
    initSettings, loadSavedSettings,
    updateRangeVisualization, updateSidebarProfile
} from './settingsManager.js';
import { exportAllData, importData, clearAllData } from './dataManager.js';

export {
    initSettings, loadSavedSettings,
    updateRangeVisualization, updateSidebarProfile,
    exportAllData, importData, clearAllData
};

// Single init entry point for app.js
export function initSettingsFeature(callbacks) {
    initSettingsModule(callbacks);
}
