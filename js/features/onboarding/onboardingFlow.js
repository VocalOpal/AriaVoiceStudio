// Aria Voice Studio - Onboarding Flow Logic

import { saveSettings, loadSettings } from '../../services/settingsService.js';
import { EventTypes, emit } from '../../core/events.js';
import {
    renderOnboarding,
    updateProgressBar,
    showStepUI,
    updateNavButtons,
    updateSummaryCard
} from './onboardingUI.js';
import { startTutorial } from './tutorial.js';

const TOTAL_STEPS = 4;

let currentStep = 1;
let selectedGoal = null;
let wantsTour = false;

/**
 * Check if onboarding has been completed. If not, show it.
 */
export async function checkOnboarding() {
    const completed = await loadSettings('onboardingCompleted', false);
    const overlay = document.getElementById('onboardingOverlay');

    if (completed) {
        if (overlay) overlay.classList.add('hidden');
        return;
    }

    if (overlay) {
        overlay.classList.remove('hidden');
        renderOnboarding(overlay);
        initOnboarding();
    }
}

/**
 * Initialize all onboarding event listeners.
 */
export function initOnboarding() {
    currentStep = 1;
    selectedGoal = null;
    wantsTour = false;

    const nextBtn = document.getElementById('onboardingNext');
    const backBtn = document.getElementById('onboardingBack');

    // Goal card selection
    bindGoalCards();

    // Gender & pronoun custom toggles
    bindCustomSelects();

    // Select first goal by default
    const firstGoal = document.querySelector('.goal-card');
    if (firstGoal) firstGoal.click();

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (backBtn) backBtn.addEventListener('click', prevStep);

    // Tour prompt toggle
    const tourPrompt = document.getElementById('tourPrompt');
    if (tourPrompt) {
        tourPrompt.addEventListener('click', () => {
            wantsTour = !wantsTour;
            tourPrompt.classList.toggle('active', wantsTour);
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', onOnboardingKeyDown);

    updateProgressBar(1);
    updateNavButtons(1, TOTAL_STEPS);
}

function onOnboardingKeyDown(e) {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;

    if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
        e.preventDefault();
        nextStep();
    }
}

function bindGoalCards() {
    const customRangeInputs = document.getElementById('customRangeInputs');
    const customMinPitch = document.getElementById('customMinPitch');
    const customMaxPitch = document.getElementById('customMaxPitch');

    document.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const isCustom = card.dataset.preset === 'custom';
            if (customRangeInputs) {
                customRangeInputs.classList.toggle('hidden', !isCustom);
            }

            if (isCustom) {
                selectedGoal = {
                    preset: 'custom',
                    min: parseInt(customMinPitch?.value) || 140,
                    max: parseInt(customMaxPitch?.value) || 200
                };
            } else {
                selectedGoal = {
                    preset: card.dataset.preset,
                    min: parseInt(card.dataset.min),
                    max: parseInt(card.dataset.max)
                };
            }
        });
    });

    if (customMinPitch) {
        customMinPitch.addEventListener('input', () => {
            if (selectedGoal?.preset === 'custom') {
                selectedGoal.min = parseInt(customMinPitch.value) || 140;
            }
        });
    }
    if (customMaxPitch) {
        customMaxPitch.addEventListener('input', () => {
            if (selectedGoal?.preset === 'custom') {
                selectedGoal.max = parseInt(customMaxPitch.value) || 200;
            }
        });
    }
}

function bindCustomSelects() {
    const genderSelect = document.getElementById('onboardingGender');
    const genderCustomInput = document.getElementById('onboardingGenderCustom');
    if (genderSelect && genderCustomInput) {
        genderSelect.addEventListener('change', () => {
            genderCustomInput.classList.toggle('hidden', genderSelect.value !== 'custom');
            if (genderSelect.value === 'custom') genderCustomInput.focus();
        });
    }

    const pronounsSelect = document.getElementById('onboardingPronouns');
    const pronounsCustomInput = document.getElementById('onboardingPronounsCustom');
    if (pronounsSelect && pronounsCustomInput) {
        pronounsSelect.addEventListener('change', () => {
            pronounsCustomInput.classList.toggle('hidden', pronounsSelect.value !== 'custom');
            if (pronounsSelect.value === 'custom') pronounsCustomInput.focus();
        });
    }
}

function nextStep() {
    // Validate step 3 (profile)
    if (currentStep === 3) {
        const nameInput = document.getElementById('onboardingName');
        const nameError = document.getElementById('nameError');

        if (!nameInput?.value?.trim()) {
            if (nameError) nameError.classList.remove('hidden');
            if (nameInput) {
                nameInput.classList.add('error');
                nameInput.focus();
            }
            return;
        } else {
            if (nameError) nameError.classList.add('hidden');
            if (nameInput) nameInput.classList.remove('error');
        }
    }

    // Before showing step 4, update summary
    if (currentStep === 3) {
        const nameInput = document.getElementById('onboardingName');
        const goalName = document.getElementById('voiceGoalName')?.value?.trim();
        updateSummaryCard({
            name: nameInput?.value?.trim(),
            goal: selectedGoal,
            goalName: goalName
        });
    }

    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        showStepUI(currentStep, 'forward');
        updateProgressBar(currentStep);
        updateNavButtons(currentStep, TOTAL_STEPS);
    } else {
        completeOnboarding();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStepUI(currentStep, 'backward');
        updateProgressBar(currentStep);
        updateNavButtons(currentStep, TOTAL_STEPS);
    }
}

async function completeOnboarding() {
    // Save voice goal
    if (selectedGoal) {
        await saveSettings('targetMin', selectedGoal.min);
        await saveSettings('targetMax', selectedGoal.max);
        await saveSettings('voicePreset', selectedGoal.preset);
    }

    // Save goal name if provided
    const goalName = document.getElementById('voiceGoalName')?.value?.trim();
    if (goalName) {
        await saveSettings('voiceGoalName', goalName);
    }

    // Save profile
    const nameInput = document.getElementById('onboardingName');
    const genderSelect = document.getElementById('onboardingGender');
    const genderCustomInput = document.getElementById('onboardingGenderCustom');
    const pronounsSelect = document.getElementById('onboardingPronouns');
    const pronounsCustomInput = document.getElementById('onboardingPronounsCustom');

    if (nameInput?.value?.trim()) {
        await saveSettings('profileName', nameInput.value.trim());
    }

    if (genderSelect) {
        if (genderSelect.value === 'custom' && genderCustomInput?.value.trim()) {
            await saveSettings('genderIdentity', genderCustomInput.value.trim());
        } else if (genderSelect.value && genderSelect.value !== 'custom') {
            await saveSettings('genderIdentity', genderSelect.value);
        }
    }

    if (pronounsSelect) {
        if (pronounsSelect.value === 'custom' && pronounsCustomInput?.value.trim()) {
            await saveSettings('pronouns', pronounsCustomInput.value.trim());
        } else if (pronounsSelect.value && pronounsSelect.value !== 'custom') {
            await saveSettings('pronouns', pronounsSelect.value);
        }
    }

    // Mark onboarding as complete
    await saveSettings('onboardingCompleted', true);

    // Hide overlay
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.add('hidden');

    // Clean up keyboard listener
    document.removeEventListener('keydown', onOnboardingKeyDown);

    // Notify app.js via event bus
    emit(EventTypes.ONBOARDING_COMPLETED, {
        goal: selectedGoal,
        profileName: nameInput?.value?.trim(),
        wantsTour
    });

    // Launch tutorial if user opted in
    if (wantsTour) {
        // Small delay so the app UI is fully visible before spotlight
        setTimeout(() => startTutorial(), 500);
    }
}
