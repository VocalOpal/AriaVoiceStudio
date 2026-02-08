// Aria Voice Studio - Tutorial Spotlight Tour Engine

import { TUTORIAL_STEPS } from './tutorialSteps.js';
import { saveSettings, loadSettings } from '../../services/settingsService.js';
import { EventTypes, emit } from '../../core/events.js';

let currentStep = 0;
let overlayEl = null;
let spotlightEl = null;
let tooltipEl = null;
let resizeHandler = null;

/**
 * Start (or restart) the guided tutorial tour.
 */
export async function startTutorial() {
    currentStep = 0;
    createOverlay();
    showStep(currentStep);
}

/**
 * Check if the tutorial has been completed.
 * @returns {Promise<boolean>}
 */
export async function isTutorialCompleted() {
    return await loadSettings('tutorialCompleted', false);
}

function createOverlay() {
    // Remove existing overlay if any
    cleanup();

    overlayEl = document.createElement('div');
    overlayEl.className = 'tutorial-overlay active';
    overlayEl.id = 'tutorialOverlay';

    spotlightEl = document.createElement('div');
    spotlightEl.className = 'tutorial-spotlight';

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tutorial-tooltip';

    overlayEl.appendChild(spotlightEl);
    overlayEl.appendChild(tooltipEl);
    document.body.appendChild(overlayEl);

    // Click overlay background to advance
    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) {
            nextStep();
        }
    });

    // Keyboard handling
    document.addEventListener('keydown', onKeyDown);

    // Reposition on resize
    resizeHandler = () => {
        if (currentStep < TUTORIAL_STEPS.length) {
            positionSpotlight(TUTORIAL_STEPS[currentStep]);
        }
    };
    window.addEventListener('resize', resizeHandler);
}

function onKeyDown(e) {
    if (!overlayEl) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        completeTutorial();
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
    }
}

function showStep(index) {
    if (index < 0 || index >= TUTORIAL_STEPS.length) {
        completeTutorial();
        return;
    }

    const step = TUTORIAL_STEPS[index];
    const target = document.querySelector(step.selector);

    if (!target) {
        // Skip steps whose target element doesn't exist
        if (index < TUTORIAL_STEPS.length - 1) {
            currentStep++;
            showStep(currentStep);
        } else {
            completeTutorial();
        }
        return;
    }

    // Ensure element is visible (scroll into view)
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Small delay for scroll to settle
    requestAnimationFrame(() => {
        positionSpotlight(step);
        renderTooltip(step, index);
    });
}

function positionSpotlight(step) {
    const target = document.querySelector(step.selector);
    if (!target || !spotlightEl) return;

    const rect = target.getBoundingClientRect();
    const padding = 8;

    spotlightEl.style.top = `${rect.top - padding}px`;
    spotlightEl.style.left = `${rect.left - padding}px`;
    spotlightEl.style.width = `${rect.width + padding * 2}px`;
    spotlightEl.style.height = `${rect.height + padding * 2}px`;
}

function renderTooltip(step, index) {
    if (!tooltipEl) return;

    const target = document.querySelector(step.selector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const total = TUTORIAL_STEPS.length;
    const isLast = index === total - 1;

    // Remove arrow classes
    tooltipEl.className = 'tutorial-tooltip';

    tooltipEl.innerHTML = `
        <div class="tutorial-step-counter">Step ${index + 1} of ${total}</div>
        <div class="tutorial-tooltip-title">${step.title}</div>
        <div class="tutorial-tooltip-desc">${step.description}</div>
        <div class="tutorial-tooltip-actions">
            <button class="tutorial-btn-skip" data-action="skip">Skip tour</button>
            <button class="tutorial-btn-next" data-action="next">${isLast ? 'Finish' : 'Next'}</button>
        </div>
    `;

    // Event listeners for buttons
    tooltipEl.querySelector('[data-action="skip"]').addEventListener('click', (e) => {
        e.stopPropagation();
        completeTutorial();
    });
    tooltipEl.querySelector('[data-action="next"]').addEventListener('click', (e) => {
        e.stopPropagation();
        nextStep();
    });

    // Position tooltip based on step.position
    positionTooltip(step.position, rect);
}

function positionTooltip(position, targetRect) {
    if (!tooltipEl) return;

    const gap = 16;
    const tooltipWidth = 300;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;

    switch (position) {
        case 'right':
            top = targetRect.top;
            left = targetRect.right + gap;
            tooltipEl.classList.add('arrow-left');
            break;
        case 'left':
            top = targetRect.top;
            left = targetRect.left - tooltipWidth - gap;
            tooltipEl.classList.add('arrow-right');
            break;
        case 'bottom':
            top = targetRect.bottom + gap;
            left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
            tooltipEl.classList.add('arrow-top');
            break;
        case 'top':
            top = targetRect.top - gap;
            left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
            tooltipEl.classList.add('arrow-bottom');
            // Position above — measure tooltip height after render
            requestAnimationFrame(() => {
                if (tooltipEl) {
                    const h = tooltipEl.getBoundingClientRect().height;
                    tooltipEl.style.top = `${targetRect.top - h - gap}px`;
                }
            });
            break;
        default:
            top = targetRect.bottom + gap;
            left = targetRect.left;
            tooltipEl.classList.add('arrow-top');
    }

    // Clamp to viewport
    if (left + tooltipWidth > vw - 16) left = vw - tooltipWidth - 16;
    if (left < 16) left = 16;
    if (top < 16) top = 16;
    if (top > vh - 200) top = vh - 200;

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
}

function nextStep() {
    currentStep++;
    if (currentStep >= TUTORIAL_STEPS.length) {
        completeTutorial();
    } else {
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
}

async function completeTutorial() {
    await saveSettings('tutorialCompleted', true);
    emit(EventTypes.TUTORIAL_COMPLETED);
    cleanup();
}

function cleanup() {
    if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
        spotlightEl = null;
        tooltipEl = null;
    }
    document.removeEventListener('keydown', onKeyDown);
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
}
