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
    const targetMin = await loadSettings('targetMin', 140);
    const targetMax = await loadSettings('targetMax', 200);
    const sensitivity = await loadSettings('sensitivity', 75);

    // Populate form fields
    const nameInput = document.getElementById('modalProfileName');
    const minInput = document.getElementById('modalTargetMin');
    const maxInput = document.getElementById('modalTargetMax');
    const avatarEl = document.getElementById('modalProfileAvatar');

    if (nameInput) nameInput.value = profileName;
    if (minInput) minInput.value = targetMin;
    if (maxInput) maxInput.value = targetMax;
    if (avatarEl) avatarEl.textContent = profileName.charAt(0).toUpperCase();

    // Set up custom input toggle handlers for modal
    const genderSelect = document.getElementById('modalGenderIdentity');
    const genderCustomInput = document.getElementById('modalGenderIdentityCustom');
    const pronounsSelect = document.getElementById('modalPronouns');
    const pronounsCustomInput = document.getElementById('modalPronounsCustom');

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

    // Populate modal mic selector
    await populateModalAudioDevices();

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

async function populateModalAudioDevices() {
    const select = document.getElementById('modalAudioInputDevice');
    const refreshBtn = document.getElementById('modalRefreshAudioDevices');
    if (!select || !navigator.mediaDevices?.enumerateDevices) return;

    async function populate() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(d => d.kind === 'audioinput');

            while (select.options.length > 1) select.remove(1);

            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`;
                select.appendChild(option);
            });

            const saved = await _callbacks.loadSettings('audioInputDevice', '');
            const exists = Array.from(select.options).some(o => o.value === saved);
            select.value = exists ? saved : '';
        } catch (err) {
            console.error('[Profile] Failed to enumerate audio devices:', err);
        }
    }

    if (refreshBtn) refreshBtn.addEventListener('click', populate);
    await populate();
}

export async function saveProfileSettings() {
    const nameInput = document.getElementById('modalProfileName');
    const minInput = document.getElementById('modalTargetMin');
    const maxInput = document.getElementById('modalTargetMax');
    const sensitivitySlider = document.getElementById('modalSensitivity');
    const modalAudioInput = document.getElementById('modalAudioInputDevice');

    // Collect form data
    const formData = {
        profileName: nameInput?.value || '',
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
        if (modalAudioInput) await saveSettings('audioInputDevice', modalAudioInput.value);

        // Update main settings page with sanitized values
        const mainNameInput = document.getElementById('profileName');
        const mainMinInput = document.getElementById('targetMin');
        const mainMaxInput = document.getElementById('targetMax');

        if (mainNameInput) mainNameInput.value = validation.results.profileName.sanitized;
        if (mainMinInput) mainMinInput.value = validation.results.targetMin.sanitized;
        if (mainMaxInput) mainMaxInput.value = validation.results.targetMax.sanitized;

        // Sync mic selector on settings page
        const mainAudioSelect = document.getElementById('audioInputDevice');
        if (mainAudioSelect && modalAudioInput) mainAudioSelect.value = modalAudioInput.value;

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
