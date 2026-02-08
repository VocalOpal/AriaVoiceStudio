// Profile Modal - manages the voice profile modal
import { validateProfileForm } from '../../utils/validation.js';
import { ErrorBoundary } from '../../utils/errorBoundary.js';

let _callbacks = {};

export function initProfileModal(callbacks) {
    _callbacks = callbacks;
}

export async function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    _callbacks.setLastFocused?.(document.activeElement);
    modal.classList.remove('hidden');

    // Load saved settings into modal
    const loadSettings = _callbacks.loadSettings;
    const profileName = await loadSettings('profileName', 'User');
    const genderIdentity = await loadSettings('genderIdentity', 'prefer-not');
    const pronouns = await loadSettings('pronouns', 'they/them');
    const targetMin = await loadSettings('targetMin', 140);
    const targetMax = await loadSettings('targetMax', 200);
    const intensity = await loadSettings('intensity', 'intermediate');
    const sessionDuration = await loadSettings('sessionDuration', '15');
    const sensitivity = await loadSettings('sensitivity', 75);

    // Populate form fields
    const nameInput = document.getElementById('modalProfileName');
    const genderSelect = document.getElementById('modalGenderIdentity');
    const genderCustomInput = document.getElementById('modalGenderIdentityCustom');
    const pronounsSelect = document.getElementById('modalPronouns');
    const pronounsCustomInput = document.getElementById('modalPronounsCustom');
    const minInput = document.getElementById('modalTargetMin');
    const maxInput = document.getElementById('modalTargetMax');
    const avatarEl = document.getElementById('modalProfileAvatar');

    if (nameInput) nameInput.value = profileName;
    if (minInput) minInput.value = targetMin;
    if (maxInput) maxInput.value = targetMax;
    if (avatarEl) avatarEl.textContent = profileName.charAt(0).toUpperCase();

    // Handle gender identity - check if it's a custom value
    if (genderSelect) {
        const genderOptions = Array.from(genderSelect.options).map(o => o.value);
        if (genderOptions.includes(genderIdentity)) {
            genderSelect.value = genderIdentity;
            if (genderCustomInput) genderCustomInput.classList.add('hidden');
        } else {
            genderSelect.value = 'custom';
            if (genderCustomInput) {
                genderCustomInput.value = genderIdentity;
                genderCustomInput.classList.remove('hidden');
            }
        }
    }

    // Handle pronouns - check if it's a custom value
    if (pronounsSelect) {
        const pronounsOptions = Array.from(pronounsSelect.options).map(o => o.value);
        if (pronounsOptions.includes(pronouns)) {
            pronounsSelect.value = pronouns;
            if (pronounsCustomInput) pronounsCustomInput.classList.add('hidden');
        } else {
            pronounsSelect.value = 'custom';
            if (pronounsCustomInput) {
                pronounsCustomInput.value = pronouns;
                pronounsCustomInput.classList.remove('hidden');
            }
        }
    }

    // Set up custom input toggle handlers for modal
    if (genderSelect && genderCustomInput) {
        genderSelect.onchange = () => {
            genderCustomInput.classList.toggle('hidden', genderSelect.value !== 'custom');
            if (genderSelect.value === 'custom') genderCustomInput.focus();
        };
    }
    if (pronounsSelect && pronounsCustomInput) {
        pronounsSelect.onchange = () => {
            pronounsCustomInput.classList.toggle('hidden', pronounsSelect.value !== 'custom');
            if (pronounsSelect.value === 'custom') pronounsCustomInput.focus();
        };
    }

    // Update pitch range display
    updateModalPitchRange(targetMin, targetMax);

    // Set intensity radio
    const intensityRadio = document.querySelector(`input[name="intensity"][value="${intensity}"]`);
    if (intensityRadio) intensityRadio.checked = true;

    // Set duration radio
    const durationRadio = document.querySelector(`input[name="sessionDuration"][value="${sessionDuration}"]`);
    if (durationRadio) durationRadio.checked = true;

    // Set sensitivity
    const sensitivitySlider = document.getElementById('modalSensitivity');
    if (sensitivitySlider) {
        sensitivitySlider.value = sensitivity;
        updateSensitivityMeter(sensitivity);
    }

    // Initialize tab switching
    initProfileTabs();

    // Focus the close button or first focusable element
    _callbacks.trapFocusInModal?.(modal);
}

export function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('hidden');
    _callbacks.restoreFocus?.();
}

export function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const contents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update tab active states
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content visibility
            contents.forEach(c => {
                c.classList.toggle('active', c.id === `tab-${targetTab}`);
            });
        });
    });
}

export function updateModalPitchRange(min, max) {
    const indicator = document.getElementById('modalPitchIndicator');
    const valueEl = document.getElementById('modalPitchValue');

    if (indicator) {
        const leftPercent = ((min - 60) / 220) * 100;
        const widthPercent = ((max - min) / 220) * 100;
        indicator.style.left = `${leftPercent}%`;
        indicator.style.width = `${widthPercent}%`;
    }

    if (valueEl) {
        valueEl.textContent = `${min} - ${max} Hz`;
    }
}

export function updateSensitivityMeter(value) {
    const meter = document.getElementById('sensitivityMeter');
    const valueEl = document.getElementById('sensitivityValue');

    if (valueEl) valueEl.textContent = `${value}%`;

    if (meter) {
        meter.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'sensitivity-bar';
            const threshold = (i / 20) * 100;
            if (threshold < value) {
                if (i < 14) bar.classList.add('active-low');
                else if (i < 17) bar.classList.add('active-mid');
                else bar.classList.add('active-high');
            }
            meter.appendChild(bar);
        }
    }
}

export async function saveProfileSettings() {
    const nameInput = document.getElementById('modalProfileName');
    const genderSelect = document.getElementById('modalGenderIdentity');
    const genderCustomInput = document.getElementById('modalGenderIdentityCustom');
    const pronounsSelect = document.getElementById('modalPronouns');
    const pronounsCustomInput = document.getElementById('modalPronounsCustom');
    const minInput = document.getElementById('modalTargetMin');
    const maxInput = document.getElementById('modalTargetMax');
    const sensitivitySlider = document.getElementById('modalSensitivity');
    const intensityRadio = document.querySelector('input[name="intensity"]:checked');
    const durationRadio = document.querySelector('input[name="sessionDuration"]:checked');

    // Get actual gender/pronouns values (custom or selected)
    let genderValue = genderSelect?.value || '';
    if (genderValue === 'custom' && genderCustomInput?.value.trim()) {
        genderValue = genderCustomInput.value.trim();
    }

    let pronounsValue = pronounsSelect?.value || '';
    if (pronounsValue === 'custom' && pronounsCustomInput?.value.trim()) {
        pronounsValue = pronounsCustomInput.value.trim();
    }

    // Collect form data
    const formData = {
        profileName: nameInput?.value || '',
        genderIdentity: genderValue,
        pronouns: pronounsValue,
        targetMin: minInput?.value || '',
        targetMax: maxInput?.value || '',
        sensitivity: sensitivitySlider?.value || ''
    };

    // Validate form data
    const validation = validateProfileForm(formData);
    if (!validation.isValid) {
        // Show validation errors
        const errorMessage = validation.errors.join('\n');
        ErrorBoundary.showErrorNotification('Profile Settings', `Validation failed:\n${errorMessage}`);
        return;
    }

    const saveSettings = _callbacks.saveSettings;
    const stateManager = _callbacks.stateManager;

    try {
        // Save validated settings
        if (nameInput) await saveSettings('profileName', validation.results.profileName.sanitized);
        await saveSettings('genderIdentity', genderValue || validation.results.genderIdentity.sanitized);
        await saveSettings('pronouns', pronounsValue || validation.results.pronouns.sanitized);

        if (validation.results.targetMin.isValid) {
            const minVal = validation.results.targetMin.sanitized;
            stateManager.set({ targetMin: minVal });
            await saveSettings('targetMin', minVal);
        }

        if (validation.results.targetMax.isValid) {
            const maxVal = validation.results.targetMax.sanitized;
            stateManager.set({ targetMax: maxVal });
            await saveSettings('targetMax', maxVal);
        }

        if (sensitivitySlider) await saveSettings('sensitivity', parseInt(validation.results.sensitivity.sanitized));
        if (intensityRadio) await saveSettings('intensity', intensityRadio.value);
        if (durationRadio) await saveSettings('sessionDuration', durationRadio.value);

        // Update main settings page with sanitized values
        const mainNameInput = document.getElementById('profileName');
        const mainGenderSelect = document.getElementById('genderIdentity');
        const mainPronounsSelect = document.getElementById('pronouns');
        const mainMinInput = document.getElementById('targetMin');
        const mainMaxInput = document.getElementById('targetMax');

        if (mainNameInput) mainNameInput.value = validation.results.profileName.sanitized;
        if (mainGenderSelect) mainGenderSelect.value = validation.results.genderIdentity.sanitized;
        if (mainPronounsSelect) mainPronounsSelect.value = validation.results.pronouns.sanitized;
        if (mainMinInput) mainMinInput.value = validation.results.targetMin.sanitized;
        if (mainMaxInput) mainMaxInput.value = validation.results.targetMax.sanitized;

        // Update sidebar and visualizations
        _callbacks.updateSidebarProfile?.();
        _callbacks.updateRangeVisualization?.();

        // Show save indicator
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            setTimeout(() => indicator.classList.add('hidden'), 2000);
        }

        _callbacks.debugLog?.('Profile', 'Settings saved successfully');
    } catch (err) {
        console.error('[Profile] Failed to save settings:', err);
        ErrorBoundary.showErrorNotification('Profile Settings', 'Failed to save settings. Please try again.');
    }
}
