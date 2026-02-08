// Profile module - barrel exports
import {
    initProfileModal,
    openProfileModal, closeProfileModal,
    initProfileTabs, updateModalPitchRange, updateSensitivityMeter,
    saveProfileSettings
} from './profileModal.js';
import { handleAvatarUpload, loadProfileImage } from './avatarManager.js';

export {
    openProfileModal, closeProfileModal,
    initProfileTabs, updateModalPitchRange, updateSensitivityMeter,
    saveProfileSettings,
    handleAvatarUpload, loadProfileImage
};

// Single init entry point for app.js
export function initProfile(callbacks) {
    initProfileModal(callbacks);
}
