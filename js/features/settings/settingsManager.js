// Settings Manager - handles settings screen initialization and loading
import { toggleTheme, syncThemeToggle } from '../../ui/navigation.js';

let _callbacks = {};

export function initSettingsModule(callbacks) {
    _callbacks = callbacks;
}

export async function initSettings() {
    const saveSettings = _callbacks.saveSettings;

    // Theme toggles - sync with sidebar toggle
    const themeToggles = document.querySelectorAll('.toggle-btn[data-theme]');
    themeToggles.forEach(btn => {
        btn.addEventListener('click', async () => {
            const theme = btn.dataset.theme;
            const isDark = document.body.classList.contains('dark');

            // Only toggle if different from current
            if ((theme === 'dark' && !isDark) || (theme === 'light' && isDark)) {
                toggleTheme();
            }
            await saveSettings('theme', theme);
        });
    });

    // Sync theme toggles on load
    syncThemeToggle();

    // Profile name
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput) {
        profileNameInput.addEventListener('change', async (e) => {
            await saveSettings('profileName', e.target.value);
            updateSidebarProfile();
        });
    }

    // Gender identity with custom support
    const genderIdentity = document.getElementById('genderIdentity');
    const genderIdentityCustom = document.getElementById('genderIdentityCustom');
    if (genderIdentity) {
        genderIdentity.addEventListener('change', async (e) => {
            if (genderIdentityCustom) {
                genderIdentityCustom.classList.toggle('hidden', e.target.value !== 'custom');
                if (e.target.value === 'custom') {
                    genderIdentityCustom.focus();
                    return;
                }
            }
            await saveSettings('genderIdentity', e.target.value);
        });
    }
    if (genderIdentityCustom) {
        genderIdentityCustom.addEventListener('change', async (e) => {
            if (e.target.value.trim()) {
                await saveSettings('genderIdentity', e.target.value.trim());
            }
        });
    }

    // Pronouns with custom support
    const pronouns = document.getElementById('pronouns');
    const pronounsCustom = document.getElementById('pronounsCustom');
    if (pronouns) {
        pronouns.addEventListener('change', async (e) => {
            if (pronounsCustom) {
                pronounsCustom.classList.toggle('hidden', e.target.value !== 'custom');
                if (e.target.value === 'custom') {
                    pronounsCustom.focus();
                    return;
                }
            }
            await saveSettings('pronouns', e.target.value);
            updateSidebarProfile();
        });
    }
    if (pronounsCustom) {
        pronounsCustom.addEventListener('change', async (e) => {
            if (e.target.value.trim()) {
                await saveSettings('pronouns', e.target.value.trim());
                updateSidebarProfile();
            }
        });
    }

    // Target pitch range
    const state = _callbacks.state;
    const targetMinInput = document.getElementById('targetMin');
    const targetMaxInput = document.getElementById('targetMax');
    if (targetMinInput) {
        targetMinInput.addEventListener('change', async (e) => {
            state.targetMin = parseInt(e.target.value) || 140;
            await saveSettings('targetMin', state.targetMin);
            updateRangeVisualization();
            updateSidebarProfile();
        });
    }
    if (targetMaxInput) {
        targetMaxInput.addEventListener('change', async (e) => {
            state.targetMax = parseInt(e.target.value) || 200;
            await saveSettings('targetMax', state.targetMax);
            updateRangeVisualization();
            updateSidebarProfile();
        });
    }

    // Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const min = parseInt(btn.dataset.min);
            const max = parseInt(btn.dataset.max);
            state.targetMin = min;
            state.targetMax = max;
            if (targetMinInput) targetMinInput.value = min;
            if (targetMaxInput) targetMaxInput.value = max;
            await saveSettings('targetMin', min);
            await saveSettings('targetMax', max);
            updateRangeVisualization();
            updateSidebarProfile();
        });
    });

    // Notification toggles
    const dailyReminders = document.getElementById('dailyReminders');
    const strainAlerts = document.getElementById('strainAlerts');
    if (dailyReminders) {
        dailyReminders.addEventListener('change', async (e) => {
            await saveSettings('dailyReminders', e.target.checked);
        });
    }
    if (strainAlerts) {
        strainAlerts.addEventListener('change', async (e) => {
            await saveSettings('strainAlerts', e.target.checked);
        });
    }

    // Pitch alert settings
    const pitchAlertState = _callbacks.pitchAlertState;
    const pitchAlertEnabled = document.getElementById('pitchAlertEnabled');
    const pitchAlertDelay = document.getElementById('pitchAlertDelay');
    const pitchAlertVolume = document.getElementById('pitchAlertVolume');
    const pitchAlertVolumeValue = document.getElementById('pitchAlertVolumeValue');
    const testPitchAlertBtn = document.getElementById('testPitchAlertBtn');

    if (pitchAlertEnabled) {
        pitchAlertEnabled.addEventListener('change', async (e) => {
            pitchAlertState.enabled = e.target.checked;
            await saveSettings('pitchAlertEnabled', e.target.checked);
        });
    }
    if (pitchAlertDelay) {
        pitchAlertDelay.addEventListener('change', async (e) => {
            const delay = Math.max(1, Math.min(30, parseInt(e.target.value) || 5));
            e.target.value = delay;
            pitchAlertState.delaySeconds = delay;
            await saveSettings('pitchAlertDelay', delay);
        });
    }
    if (pitchAlertVolume) {
        pitchAlertVolume.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            pitchAlertState.volume = volume;
            if (pitchAlertVolumeValue) {
                pitchAlertVolumeValue.textContent = `${volume}%`;
            }
        });
        pitchAlertVolume.addEventListener('change', async (e) => {
            const volume = parseInt(e.target.value);
            await saveSettings('pitchAlertVolume', volume);
        });
    }
    if (testPitchAlertBtn) {
        testPitchAlertBtn.addEventListener('click', () => {
            _callbacks.playBeep?.(pitchAlertState.volume);
        });
    }

    // Data export/import - wire buttons to dataManager
    const { exportAllData, importData, clearAllData } = await import('./dataManager.js');
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importFileInput');
    const clearBtn = document.getElementById('clearAllDataBtn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportAllData);
    }
    if (importBtn) {
        importBtn.addEventListener('click', () => importInput?.click());
    }
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            if (e.target.files?.[0]) {
                importData(e.target.files[0]);
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllData);
    }
}

export function updateRangeVisualization() {
    const state = _callbacks.state;
    const rangeSelection = document.getElementById('rangeSelection');
    if (!rangeSelection) return;

    const minPercent = ((state.targetMin - 80) / (300 - 80)) * 100;
    const maxPercent = ((state.targetMax - 80) / (300 - 80)) * 100;
    rangeSelection.style.left = `${minPercent}%`;
    rangeSelection.style.width = `${maxPercent - minPercent}%`;
}

export function updateSidebarProfile() {
    const state = _callbacks.state;
    const nameEl = document.getElementById('sidebarProfileName');
    const pronounsEl = document.getElementById('sidebarPronouns');
    const targetEl = document.getElementById('sidebarTarget');
    const avatarEl = document.getElementById('profileAvatar');

    const profileName = document.getElementById('profileName')?.value || 'User';

    // Get pronouns - check for custom value
    const pronounsSelect = document.getElementById('pronouns');
    const pronounsCustom = document.getElementById('pronounsCustom');
    let pronouns = pronounsSelect?.value || '';
    if (pronouns === 'custom' && pronounsCustom?.value) {
        pronouns = pronounsCustom.value;
    }

    if (nameEl) nameEl.textContent = profileName;
    if (pronounsEl) pronounsEl.textContent = pronouns || 'they/them';
    if (targetEl) targetEl.textContent = `${state.targetMin}-${state.targetMax} Hz`;
    if (avatarEl) avatarEl.textContent = profileName.charAt(0).toUpperCase();
}

export async function loadSavedSettings() {
    const loadSettings = _callbacks.loadSettings;
    const state = _callbacks.state;
    const pitchAlertState = _callbacks.pitchAlertState;
    const debugLog = _callbacks.debugLog;

    // Load theme
    const savedTheme = await loadSettings('theme', 'dark');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark');
    }
    const themeToggles = document.querySelectorAll('.toggle-btn[data-theme]');
    themeToggles.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    });

    // Load profile name
    const profileName = await loadSettings('profileName', 'User');
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput) profileNameInput.value = profileName;

    // Load gender identity (handle custom values)
    const genderIdentity = await loadSettings('genderIdentity', '');
    const genderIdentitySelect = document.getElementById('genderIdentity');
    const genderIdentityCustom = document.getElementById('genderIdentityCustom');
    if (genderIdentitySelect) {
        const genderOptions = Array.from(genderIdentitySelect.options).map(o => o.value);
        if (genderOptions.includes(genderIdentity)) {
            genderIdentitySelect.value = genderIdentity;
            if (genderIdentityCustom) genderIdentityCustom.classList.add('hidden');
        } else if (genderIdentity) {
            genderIdentitySelect.value = 'custom';
            if (genderIdentityCustom) {
                genderIdentityCustom.value = genderIdentity;
                genderIdentityCustom.classList.remove('hidden');
            }
        }
    }

    // Load pronouns (handle custom values)
    const pronouns = await loadSettings('pronouns', '');
    const pronounsSelect = document.getElementById('pronouns');
    const pronounsCustom = document.getElementById('pronounsCustom');
    if (pronounsSelect) {
        const pronounsOptions = Array.from(pronounsSelect.options).map(o => o.value);
        if (pronounsOptions.includes(pronouns)) {
            pronounsSelect.value = pronouns;
            if (pronounsCustom) pronounsCustom.classList.add('hidden');
        } else if (pronouns) {
            pronounsSelect.value = 'custom';
            if (pronounsCustom) {
                pronounsCustom.value = pronouns;
                pronounsCustom.classList.remove('hidden');
            }
        }
    }

    // Load target range
    state.targetMin = await loadSettings('targetMin', 140);
    state.targetMax = await loadSettings('targetMax', 200);
    const targetMinInput = document.getElementById('targetMin');
    const targetMaxInput = document.getElementById('targetMax');
    if (targetMinInput) targetMinInput.value = state.targetMin;
    if (targetMaxInput) targetMaxInput.value = state.targetMax;

    // Update target range display
    const targetRangeDisplay = document.getElementById('targetRange');
    if (targetRangeDisplay) {
        targetRangeDisplay.textContent = `${state.targetMin}-${state.targetMax} Hz`;
    }

    // Load notification settings
    const dailyReminders = await loadSettings('dailyReminders', true);
    const strainAlerts = await loadSettings('strainAlerts', true);
    const dailyRemindersCheckbox = document.getElementById('dailyReminders');
    const strainAlertsCheckbox = document.getElementById('strainAlerts');
    if (dailyRemindersCheckbox) dailyRemindersCheckbox.checked = dailyReminders;
    if (strainAlertsCheckbox) strainAlertsCheckbox.checked = strainAlerts;

    // Load pitch alert settings
    const pitchAlertEnabled = await loadSettings('pitchAlertEnabled', true);
    const pitchAlertDelay = await loadSettings('pitchAlertDelay', 5);
    const pitchAlertVolume = await loadSettings('pitchAlertVolume', 50);

    pitchAlertState.enabled = pitchAlertEnabled;
    pitchAlertState.delaySeconds = pitchAlertDelay;
    pitchAlertState.volume = pitchAlertVolume;

    const pitchAlertEnabledCheckbox = document.getElementById('pitchAlertEnabled');
    const pitchAlertDelayInput = document.getElementById('pitchAlertDelay');
    const pitchAlertVolumeSlider = document.getElementById('pitchAlertVolume');
    const pitchAlertVolumeValue = document.getElementById('pitchAlertVolumeValue');

    if (pitchAlertEnabledCheckbox) pitchAlertEnabledCheckbox.checked = pitchAlertEnabled;
    if (pitchAlertDelayInput) pitchAlertDelayInput.value = pitchAlertDelay;
    if (pitchAlertVolumeSlider) pitchAlertVolumeSlider.value = pitchAlertVolume;
    if (pitchAlertVolumeValue) pitchAlertVolumeValue.textContent = `${pitchAlertVolume}%`;

    // Update UI elements
    updateRangeVisualization();
    updateSidebarProfile();

    debugLog?.('Settings', 'Loaded saved settings');
}
