// Aria Voice Studio - Onboarding UI (Dynamic DOM Rendering)

// SVG icon templates used throughout onboarding
const ICONS = {
    waveform: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <rect class="waveform-bar" x="8" y="20" width="8" height="40" rx="4"/>
        <rect class="waveform-bar" x="22" y="10" width="8" height="60" rx="4"/>
        <rect class="waveform-bar" x="36" y="5" width="8" height="70" rx="4"/>
        <rect class="waveform-bar" x="50" y="12" width="8" height="56" rx="4"/>
        <rect class="waveform-bar" x="64" y="22" width="8" height="36" rx="4"/>
    </svg>`,

    checkmark: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <circle class="check-circle" cx="40" cy="40" r="36"/>
        <polyline class="check-mark" points="24,42 34,52 56,30"/>
    </svg>`,

    microphone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,

    music: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,

    chart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,

    heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,

    arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,

    arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,

    sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,

    voiceLow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>`,

    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,

    lock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,

    compass: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
};

const STEP_LABELS = ['Welcome', 'Voice Goal', 'Profile', 'Ready'];

const GOAL_PRESETS = [
    { preset: 'higher', min: 165, max: 255, label: 'Higher Range', range: '165-255 Hz', icon: 'arrowUp' },
    { preset: 'lower', min: 85, max: 165, label: 'Lower Range', range: '85-165 Hz', icon: 'arrowDown' },
    { preset: 'mid-high', min: 145, max: 220, label: 'Mid-Higher Range', range: '145-220 Hz', icon: 'sparkles' },
    { preset: 'mid-low', min: 100, max: 200, label: 'Mid-Lower Range', range: '100-200 Hz', icon: 'voiceLow' },
    { preset: 'custom', min: 140, max: 200, label: 'Custom', range: 'Set your own range', icon: 'settings' }
];

/**
 * Render the complete onboarding DOM into the mount point.
 * @param {HTMLElement} mountEl - The element to render into
 */
export function renderOnboarding(mountEl) {
    mountEl.innerHTML = '';
    mountEl.className = 'onboarding-overlay';

    // Background orb (third one via DOM, two more via ::before/::after)
    const orb = document.createElement('div');
    orb.className = 'onboarding-bg-orb';
    mountEl.appendChild(orb);

    const container = document.createElement('div');
    container.className = 'onboarding-container';

    // Progress bar
    container.appendChild(createProgressBar());

    // Steps
    container.appendChild(createStep1());
    container.appendChild(createStep2());
    container.appendChild(createStep3());
    container.appendChild(createStep4());

    // Navigation
    container.appendChild(createNav());

    mountEl.appendChild(container);
}

function createProgressBar() {
    const wrap = document.createElement('div');
    wrap.className = 'onboarding-progress';
    wrap.id = 'onboardingProgress';

    STEP_LABELS.forEach((label, i) => {
        const seg = document.createElement('div');
        seg.className = 'onboarding-progress-segment' + (i === 0 ? ' active' : '');
        seg.dataset.step = i + 1;
        seg.innerHTML = `
            <div class="onboarding-progress-bar">
                <div class="onboarding-progress-fill"></div>
            </div>
            <span class="onboarding-progress-label">${label}</span>
        `;
        wrap.appendChild(seg);
    });

    return wrap;
}

function createStep1() {
    const step = document.createElement('div');
    step.className = 'onboarding-step active';
    step.id = 'step1';
    step.innerHTML = `
        <div class="welcome-icon-svg">${ICONS.waveform}</div>
        <h1>Welcome to Aria</h1>
        <p class="welcome-subtitle">Your voice, your journey</p>
        <p>Aria is a privacy-first voice training companion that helps you understand, practice, and shape your voice — at your own pace.</p>
        <div class="features-card">
            <div class="feature-row">
                <div class="feature-icon-wrap">${ICONS.microphone}</div>
                <div class="feature-text">
                    <strong>Real-time Pitch Monitoring</strong>
                    <span>Track your voice live with instant visual feedback</span>
                </div>
            </div>
            <div class="feature-row">
                <div class="feature-icon-wrap">${ICONS.music}</div>
                <div class="feature-text">
                    <strong>Guided Voice Exercises</strong>
                    <span>Structured warmups and training routines</span>
                </div>
            </div>
            <div class="feature-row">
                <div class="feature-icon-wrap">${ICONS.chart}</div>
                <div class="feature-text">
                    <strong>Progress Tracking</strong>
                    <span>Monitor your improvement over time</span>
                </div>
            </div>
            <div class="feature-row">
                <div class="feature-icon-wrap">${ICONS.heart}</div>
                <div class="feature-text">
                    <strong>Safety Monitoring</strong>
                    <span>Alerts to prevent vocal strain</span>
                </div>
            </div>
        </div>
    `;
    return step;
}

function createStep2() {
    const step = document.createElement('div');
    step.className = 'onboarding-step';
    step.id = 'step2';

    let cardsHtml = GOAL_PRESETS.map(g => {
        const pitchMin = ((g.min - 50) / 350) * 100;
        const pitchWidth = ((g.max - g.min) / 350) * 100;
        return `
            <button class="goal-card" data-preset="${g.preset}" data-min="${g.min}" data-max="${g.max}">
                <div class="goal-icon-wrap">${ICONS[g.icon]}</div>
                <strong>${g.label}</strong>
                <span class="goal-range">${g.range}</span>
                <div class="goal-pitch-indicator">
                    <div class="goal-pitch-indicator-fill" style="margin-left:${pitchMin}%;width:${pitchWidth}%"></div>
                </div>
            </button>
        `;
    }).join('');

    step.innerHTML = `
        <h2>Choose Your Voice Goal</h2>
        <p>Select the training path that matches your goals</p>
        <div class="goal-cards">${cardsHtml}</div>
        <div class="custom-range-inputs hidden" id="customRangeInputs">
            <div class="custom-range-row">
                <div class="form-group">
                    <label>Min Pitch (Hz)</label>
                    <input type="number" id="customMinPitch" class="setting-input small" min="50" max="400" value="140" placeholder="140">
                </div>
                <div class="form-group">
                    <label>Max Pitch (Hz)</label>
                    <input type="number" id="customMaxPitch" class="setting-input small" min="50" max="400" value="200" placeholder="200">
                </div>
            </div>
        </div>
        <div class="goal-name-group">
            <label>Goal Name (optional)</label>
            <input type="text" id="voiceGoalName" class="setting-input" placeholder="e.g., My reading voice" maxlength="30">
        </div>
    `;
    return step;
}

function createStep3() {
    const step = document.createElement('div');
    step.className = 'onboarding-step';
    step.id = 'step3';
    step.innerHTML = `
        <h2>Set Up Your Profile</h2>
        <p>Tell us a bit about yourself</p>
        <div class="profile-setup">
            <div class="form-group">
                <label>Display Name <span class="required">*</span></label>
                <input type="text" id="onboardingName" class="setting-input" placeholder="Your name" required>
                <span class="error-message hidden" id="nameError">Please enter a display name</span>
            </div>
            <div class="form-group">
                <label>Gender Identity</label>
                <select id="onboardingGender" class="setting-select">
                    <option value="" selected disabled>Pick an option</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="genderfluid">Genderfluid</option>
                    <option value="agender">Agender</option>
                    <option value="prefer-not">Prefer not to say</option>
                    <option value="custom">Custom...</option>
                </select>
                <input type="text" id="onboardingGenderCustom" class="setting-input custom-input hidden" placeholder="Enter your gender identity">
            </div>
            <div class="form-group">
                <label>Pronouns</label>
                <select id="onboardingPronouns" class="setting-select">
                    <option value="" selected disabled>Pick an option</option>
                    <option value="she/her">she/her</option>
                    <option value="he/him">he/him</option>
                    <option value="they/them">they/them</option>
                    <option value="she/they">she/they</option>
                    <option value="he/they">he/they</option>
                    <option value="any">any pronouns</option>
                    <option value="custom">Custom...</option>
                </select>
                <input type="text" id="onboardingPronounsCustom" class="setting-input custom-input hidden" placeholder="Enter your pronouns">
            </div>
        </div>
    `;
    return step;
}

function createStep4() {
    const step = document.createElement('div');
    step.className = 'onboarding-step';
    step.id = 'step4';
    step.innerHTML = `
        <div class="ready-icon-svg">${ICONS.checkmark}</div>
        <h2>You're All Set!</h2>
        <p>Your privacy-first voice training journey begins now.</p>
        <div class="summary-card" id="onboardingSummary"></div>
        <label class="tour-prompt" id="tourPrompt">
            <span class="tour-toggle" id="tourToggle"></span>
            <span class="tour-prompt-text"><strong>Take a quick tour after setup</strong><br>Learn where everything is in 30 seconds.</span>
        </label>
        <div class="privacy-note">
            ${ICONS.lock}
            <span>All data stays on your device. No cloud, no tracking.</span>
        </div>
    `;
    return step;
}

function createNav() {
    const nav = document.createElement('div');
    nav.className = 'onboarding-nav';
    nav.innerHTML = `
        <button class="btn btn-secondary btn-back" id="onboardingBack">Back</button>
        <button class="btn btn-gradient" id="onboardingNext">Continue</button>
    `;
    return nav;
}

/**
 * Update the summary card on step 4 with collected data.
 */
export function updateSummaryCard({ name, goal, goalName }) {
    const card = document.getElementById('onboardingSummary');
    if (!card) return;

    const greeting = name ? `Hi ${name}!` : 'Hi there!';
    const goalText = goal ? `${goal.min}–${goal.max} Hz` : '140–200 Hz';
    const goalLabel = goalName || (goal?.preset === 'custom' ? 'Custom range' : goal?.preset || 'Higher Range');

    card.innerHTML = `
        <div class="summary-card-row">
            <span class="summary-card-label">Name</span>
            <span class="summary-card-value">${greeting}</span>
        </div>
        <div class="summary-card-row">
            <span class="summary-card-label">Goal</span>
            <span class="summary-card-value">${goalLabel}</span>
        </div>
        <div class="summary-card-row">
            <span class="summary-card-label">Target Range</span>
            <span class="summary-card-value">${goalText}</span>
        </div>
    `;
}

/**
 * Update progress bar to reflect the current step.
 * @param {number} step - 1-based step number
 */
export function updateProgressBar(step) {
    const segments = document.querySelectorAll('.onboarding-progress-segment');
    segments.forEach((seg, i) => {
        seg.classList.remove('active', 'completed');
        const stepNum = i + 1;
        if (stepNum === step) {
            seg.classList.add('active');
        } else if (stepNum < step) {
            seg.classList.add('completed');
        }
    });
}

/**
 * Show a specific step with a slide animation.
 * @param {number} newStep - 1-based step number
 * @param {'forward'|'backward'} direction
 */
export function showStepUI(newStep, direction) {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach((el, i) => {
        if (i + 1 === newStep) {
            el.classList.add('active');
            el.classList.remove('slide-in-left', 'slide-in-right');
            // Trigger reflow for re-animation
            void el.offsetWidth;
            el.classList.add(direction === 'forward' ? 'slide-in-right' : 'slide-in-left');
        } else {
            el.classList.remove('active', 'slide-in-left', 'slide-in-right');
        }
    });
}

/**
 * Update navigation button states.
 * @param {number} step - 1-based step number
 * @param {number} totalSteps
 */
export function updateNavButtons(step, totalSteps) {
    const backBtn = document.getElementById('onboardingBack');
    const nextBtn = document.getElementById('onboardingNext');

    if (backBtn) {
        backBtn.classList.toggle('visible', step > 1);
    }
    if (nextBtn) {
        nextBtn.textContent = step === totalSteps ? "Let's Go!" : 'Continue';
    }
}
