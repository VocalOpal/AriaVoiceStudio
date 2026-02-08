// Aria Voice Studio - Achievement UI

import { get, getAll, STORES } from '../../core/storage.js';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_ICONS } from './achievementDefinitions.js';

const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

export function updateAchievementUI(achievementId, unlocked) {
    const el = document.querySelector(`.achievement[data-id="${achievementId}"]`);
    if (el) {
        el.classList.remove('locked');
        el.classList.add('unlocked', 'just-unlocked');
    }
    // Also refresh the counter / progress bar
    refreshAchievementProgress();
}

async function refreshAchievementProgress() {
    try {
        const unlocked = await getAll(STORES.ACHIEVEMENTS);
        const total = ACHIEVEMENT_DEFINITIONS.length;
        const count = unlocked.length;
        const counter = document.getElementById('achievementCounter');
        const bar = document.getElementById('achievementProgressBar');
        if (counter) counter.textContent = `${count} / ${total}`;
        if (bar) bar.style.width = `${Math.round((count / total) * 100)}%`;
    } catch (_) { /* silent */ }
}

export async function loadAchievementsUI() {
    try {
        const unlockedAchievements = await getAll(STORES.ACHIEVEMENTS);
        const unlockedIds = new Set(unlockedAchievements.map(a => a.id));
        const total = ACHIEVEMENT_DEFINITIONS.length;
        const count = unlockedIds.size;

        // Update counter & progress bar
        const counter = document.getElementById('achievementCounter');
        const bar = document.getElementById('achievementProgressBar');
        if (counter) counter.textContent = `${count} / ${total}`;
        if (bar) bar.style.width = `${Math.round((count / total) * 100)}%`;

        // Render achievements grid
        const grid = document.getElementById('achievementsGrid');
        if (grid) {
            grid.innerHTML = ACHIEVEMENT_DEFINITIONS.map(def => {
                const unlocked = unlockedIds.has(def.id);
                const iconSvg = ACHIEVEMENT_ICONS[def.icon] || ACHIEVEMENT_ICONS.fire;
                return `
                    <div class="achievement ${unlocked ? 'unlocked' : 'locked'}" data-id="${def.id}">
                        <div class="achievement-icon">
                            ${iconSvg}
                        </div>
                        <span class="achievement-label">${def.label}</span>
                        <span class="achievement-desc">${def.desc}</span>
                    </div>
                `;
            }).join('');
        }

        debugLog('Achievements', 'UI updated, unlocked:', count, '/', total);
    } catch (err) {
        console.error('[Achievements] Failed to load UI:', err);
    }
}

/**
 * Loads the entire Voice Journey screen in the correct order:
 * 1. Streak / stats hero
 * 2. Achievements grid
 * 3. Milestones timeline
 */
export async function loadJourneyScreen() {
    try {
        const [sessions, achievements, streakData] = await Promise.all([
            getAll(STORES.SESSIONS),
            getAll(STORES.ACHIEVEMENTS),
            get(STORES.METADATA, 'streak').then(d => d || { currentStreak: 0, longestStreak: 0 }),
        ]);

        const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const timeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        // --- Hero stats ---
        const streakNum = document.getElementById('journeyStreakNumber');
        const streakLabel = document.querySelector('.streak-ring-label');
        const ringCircle = document.getElementById('streakRingCircle');
        if (streakNum) streakNum.textContent = streakData.currentStreak;
        if (streakLabel) streakLabel.textContent = streakData.currentStreak === 1 ? 'day streak' : 'day streak';

        // Animate ring — full circle at 30 days (circumference = 2*pi*52 ≈ 327)
        if (ringCircle) {
            const pct = Math.min(streakData.currentStreak / 30, 1);
            ringCircle.style.strokeDashoffset = 327 - (327 * pct);
        }

        const sessionsEl = document.getElementById('journeyTotalSessions');
        const timeEl = document.getElementById('journeyPracticeTime');
        const unlockedEl = document.getElementById('journeyUnlocked');
        const bestStreakEl = document.getElementById('journeyLongestStreak');
        if (sessionsEl) sessionsEl.textContent = sessions.length;
        if (timeEl) timeEl.textContent = timeLabel;
        if (unlockedEl) unlockedEl.textContent = achievements.length;
        if (bestStreakEl) bestStreakEl.textContent = streakData.longestStreak;

        // --- Achievements grid ---
        const unlockedIds = new Set(achievements.map(a => a.id));
        const total = ACHIEVEMENT_DEFINITIONS.length;
        const count = unlockedIds.size;

        const counter = document.getElementById('achievementCounter');
        const bar = document.getElementById('achievementProgressBar');
        if (counter) counter.textContent = `${count} / ${total}`;
        if (bar) bar.style.width = `${Math.round((count / total) * 100)}%`;

        const grid = document.getElementById('achievementsGrid');
        if (grid) {
            grid.innerHTML = ACHIEVEMENT_DEFINITIONS.map(def => {
                const unlocked = unlockedIds.has(def.id);
                const iconSvg = ACHIEVEMENT_ICONS[def.icon] || ACHIEVEMENT_ICONS.fire;
                return `
                    <div class="achievement ${unlocked ? 'unlocked' : 'locked'}" data-id="${def.id}">
                        <div class="achievement-icon">
                            ${iconSvg}
                        </div>
                        <span class="achievement-label">${def.label}</span>
                        <span class="achievement-desc">${def.desc}</span>
                    </div>
                `;
            }).join('');
        }

        // --- Milestones timeline ---
        renderTimeline(sessions, achievements, unlockedIds);

        debugLog('Journey', 'Screen loaded — sessions:', sessions.length,
            'achievements:', count, '/', total, 'streak:', streakData.currentStreak);
    } catch (err) {
        console.error('[Journey] Failed to load screen:', err);
    }
}

function renderTimeline(sessions, achievements, unlockedIds) {
    const timeline = document.getElementById('journeyTimeline');
    const emptyState = document.getElementById('noMilestones');
    if (!timeline) return;

    const milestones = [];

    // First session milestone
    if (sessions.length > 0) {
        const firstSession = sessions.reduce((a, b) => a.startTime < b.startTime ? a : b);
        milestones.push({
            title: 'First Session',
            desc: 'Started your voice training journey',
            date: new Date(firstSession.startTime),
            completed: true
        });
    }

    // Achievement-based milestones
    achievements.forEach(ach => {
        milestones.push({
            title: ach.label,
            desc: ach.desc,
            date: new Date(ach.unlockedAt),
            completed: true
        });
    });

    // Pending milestones (next 3 locked achievements only, to keep it clean)
    let pendingCount = 0;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
        if (!unlockedIds.has(def.id)) {
            milestones.push({
                title: def.label,
                desc: def.desc,
                date: null,
                completed: false
            });
            pendingCount++;
            if (pendingCount >= 3) break;
        }
    }

    // Sort: completed first by date, then pending
    milestones.sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        if (a.completed && b.completed) return a.date - b.date;
        return 0;
    });

    if (milestones.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        timeline.innerHTML = '<div class="timeline-line"></div>';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    timeline.innerHTML = '<div class="timeline-line"></div>' + milestones.map(m => {
        const dateStr = m.date
            ? m.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Up next';
        return `
            <div class="milestone ${m.completed ? 'completed' : 'pending'}">
                <div class="milestone-marker">
                    ${m.completed ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : ''}
                </div>
                <div class="milestone-content">
                    <div class="milestone-header">
                        <h4>${m.title}</h4>
                        <span class="milestone-date">${dateStr}</span>
                    </div>
                    <p>${m.desc}</p>
                </div>
            </div>
        `;
    }).join('');
}
