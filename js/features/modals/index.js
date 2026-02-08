// Modals module - barrel exports
import { initStreakModal, openStreakModal, closeStreakModal } from './streakModal.js';
import { initHelpModal, openHelpModal, closeHelpModal } from './helpModal.js';

export { openStreakModal, closeStreakModal };
export { openHelpModal, closeHelpModal };

// Single init entry point for app.js
export function initModals(callbacks) {
    initStreakModal(callbacks);
    initHelpModal(callbacks);
}
