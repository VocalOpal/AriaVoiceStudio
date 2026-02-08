// Aria Voice Studio - DOM Element Registry
// Extracted from app.js for modular architecture

/**
 * Cached DOM element references
 * Must be initialized after DOMContentLoaded
 */
let elements = null;

/**
 * Initialize DOM element references
 * @returns {Object} Elements object with all cached references
 */
export function initElements() {
    elements = {
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
    
    return elements;
}

/**
 * Get the elements object
 * @returns {Object|null} Elements object or null if not initialized
 */
export function getElements() {
    return elements;
}

/**
 * Get a specific element by key
 * @param {string} key - Element key
 * @returns {Element|NodeList|null} DOM element or null
 */
export function getElement(key) {
    return elements?.[key] || null;
}

export default {
    initElements,
    getElements,
    getElement
};
