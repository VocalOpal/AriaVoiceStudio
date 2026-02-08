// Aria Voice Studio - Progress & Statistics Screen

import { getAll, get, STORES } from '../../core/storage.js';

const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ICONS = {
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    flame: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    mic: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="m22 12-4-4v3H3v2h15v3z"/></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
};

/**
 * Get timestamp from a session's startTime (handles both numbers and ISO strings).
 */
function getTime(session) {
    const t = session.startTime;
    if (typeof t === 'number') return t;
    return new Date(t).getTime();
}

/**
 * Single entry point — renders the entire Progress screen into #progressContent.
 */
export async function loadProgressScreen() {
    const container = document.getElementById('progressContent');
    if (!container) return;

    try {
        const sessions = await getAll(STORES.SESSIONS);
        const streakData = await get(STORES.METADATA, 'streak') || { currentStreak: 0, longestStreak: 0 };
        const achievements = await getAll(STORES.ACHIEVEMENTS);

        // Overall stats
        const totalSessions = sessions.length;
        const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        // Update sidebar streak display
        const streakValueEl = document.getElementById('streakValue');
        if (streakValueEl) streakValueEl.textContent = streakData.currentStreak;

        // Weekly data
        const now = Date.now();
        const weekAgo = now - SEVEN_DAYS_MS;
        const thisWeekSessions = sessions.filter(s => getTime(s) > weekAgo);
        const twoWeeksAgo = now - 2 * SEVEN_DAYS_MS;
        const lastWeekSessions = sessions.filter(s => getTime(s) > twoWeeksAgo && getTime(s) <= weekAgo);

        // Voice quality trends
        const voiceTrends = computeVoiceTrends(thisWeekSessions, lastWeekSessions);

        // Weekly chart data
        const chartData = computeWeeklyChart(sessions);

        // Goal progress
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
        const monthlySessions = sessions.filter(s => getTime(s) > monthAgo);
        const weeklyGoal = 5;
        const monthlyGoal = 20;
        const weeklyPercent = Math.min(100, Math.round((thisWeekSessions.length / weeklyGoal) * 100));
        const monthlyPercent = Math.min(100, Math.round((monthlySessions.length / monthlyGoal) * 100));

        // Best session this week
        const bestSession = findBestSession(thisWeekSessions);

        container.innerHTML = renderStatsHero(totalSessions, hours, minutes, streakData, achievements.length)
            + renderWeeklyChart(chartData)
            + renderVoiceTrends(voiceTrends)
            + renderGoalProgress(weeklyPercent, monthlyPercent, thisWeekSessions.length, weeklyGoal, monthlySessions.length, monthlyGoal)
            + renderBestSession(bestSession);

        debugLog('Progress', 'Loaded:', { totalSessions, totalSeconds, streak: streakData.currentStreak });
    } catch (err) {
        console.error('[Progress] Failed to load:', err);
        container.innerHTML = `<div class="glass-card" style="text-align:center;padding:40px;color:var(--muted)">
            <p>Unable to load progress data</p>
        </div>`;
    }
}

// --- Computation helpers ---

function computeWeeklyChart(sessions) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];

    // Build 7 days chronologically: 6 days ago → today
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayName = dayNames[date.getDay()];
        let totalDuration = 0;
        let stabilitySum = 0;
        let stabilityCount = 0;

        sessions.forEach(session => {
            const t = getTime(session);
            if (t >= date.getTime() && t < nextDay.getTime()) {
                totalDuration += session.duration || 0;
                if (session.stability != null) {
                    stabilitySum += session.stability;
                    stabilityCount++;
                }
            }
        });

        const avgStability = stabilityCount > 0 ? stabilitySum / stabilityCount : null;

        result.push({
            day: dayName,
            duration: totalDuration,
            avgStability,
            isToday: i === 0,
        });
    }

    return result;
}

function computeVoiceTrends(thisWeek, lastWeek) {
    const thisStability = thisWeek.length
        ? thisWeek.reduce((s, x) => s + (x.stability || 0), 0) / thisWeek.length
        : null;
    const lastStability = lastWeek.length
        ? lastWeek.reduce((s, x) => s + (x.stability || 0), 0) / lastWeek.length
        : null;

    const thisPitch = thisWeek.filter(s => s.avgPitch > 0);
    const lastPitch = lastWeek.filter(s => s.avgPitch > 0);
    const thisAvgPitch = thisPitch.length
        ? thisPitch.reduce((s, x) => s + x.avgPitch, 0) / thisPitch.length
        : null;
    const lastAvgPitch = lastPitch.length
        ? lastPitch.reduce((s, x) => s + x.avgPitch, 0) / lastPitch.length
        : null;

    return {
        stability: {
            current: thisStability != null ? Math.round(thisStability) : null,
            previous: lastStability != null ? Math.round(lastStability) : null,
        },
        pitch: {
            current: thisAvgPitch != null ? Math.round(thisAvgPitch) : null,
            previous: lastAvgPitch != null ? Math.round(lastAvgPitch) : null,
        },
    };
}

function findBestSession(weekSessions) {
    if (!weekSessions.length) return null;
    const withStability = weekSessions.filter(s => s.stability != null && s.stability > 0);
    if (!withStability.length) return null;
    return withStability.reduce((best, s) => (s.stability > best.stability ? s : best));
}

// --- Render helpers ---

function renderStatsHero(totalSessions, hours, minutes, streakData, achievementCount) {
    return `
        <div class="stats-grid">
            <div class="glass-card stat-card">
                <div class="stat-icon">${ICONS.calendar}</div>
                <div class="stat-info">
                    <span class="stat-number">${totalSessions}</span>
                    <span class="stat-label">Total Sessions</span>
                </div>
            </div>
            <div class="glass-card stat-card">
                <div class="stat-icon">${ICONS.clock}</div>
                <div class="stat-info">
                    <span class="stat-number">${hours}h ${minutes}m</span>
                    <span class="stat-label">Practice Time</span>
                </div>
            </div>
            <div class="glass-card stat-card">
                <div class="stat-icon">${ICONS.flame}</div>
                <div class="stat-info">
                    <span class="stat-number">${streakData.currentStreak} days</span>
                    <span class="stat-label">Current Streak</span>
                </div>
            </div>
            <div class="glass-card stat-card">
                <div class="stat-icon">${ICONS.trophy}</div>
                <div class="stat-info">
                    <span class="stat-number">${achievementCount}</span>
                    <span class="stat-label">Achievements</span>
                </div>
            </div>
        </div>
    `;
}

function renderWeeklyChart(chartData) {
    const maxDuration = Math.max(...chartData.map(d => d.duration), 1);

    const bars = chartData.map(d => {
        const heightPercent = Math.round((d.duration / maxDuration) * 100);
        const barHeight = d.duration > 0 ? Math.max(heightPercent, 3) : 0;
        const durationMin = Math.round(d.duration / 60);
        const title = d.duration > 0 ? `${durationMin} min` : 'No sessions';

        // Stability dot
        let stabilityDot = '';
        if (d.avgStability != null) {
            const dotClass = d.avgStability >= 70 ? 'good' : d.avgStability >= 50 ? 'warning' : 'caution';
            stabilityDot = `<span class="stability-dot ${dotClass}" title="Avg stability: ${Math.round(d.avgStability)}%"></span>`;
        }

        const todayClass = d.isToday ? ' today' : '';

        return `
            <div class="chart-bar${todayClass}" data-day="${d.day}" title="${title}">
                ${stabilityDot}
                <div class="bar" style="height: ${barHeight}%"></div>
                <span>${d.day}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="progress-charts">
            <div class="glass-card">
                <div class="card-header">
                    <h3>Weekly Activity</h3>
                    ${ICONS.arrowRight}
                </div>
                <div class="weekly-chart">
                    ${bars}
                </div>
            </div>
    `;
}

function renderVoiceTrends(trends) {
    const stabilityDisplay = trends.stability.current != null ? `${trends.stability.current}%` : '--';
    const pitchDisplay = trends.pitch.current != null ? `${trends.pitch.current} Hz` : '--';

    let stabilityArrow = '';
    if (trends.stability.current != null && trends.stability.previous != null) {
        const diff = trends.stability.current - trends.stability.previous;
        if (diff > 0) stabilityArrow = `<span class="trend-arrow up" title="+${diff}% vs last week">+${diff}%</span>`;
        else if (diff < 0) stabilityArrow = `<span class="trend-arrow down" title="${diff}% vs last week">${diff}%</span>`;
        else stabilityArrow = `<span class="trend-arrow flat" title="Same as last week">0%</span>`;
    }

    let pitchArrow = '';
    if (trends.pitch.current != null && trends.pitch.previous != null) {
        const diff = trends.pitch.current - trends.pitch.previous;
        if (diff > 0) pitchArrow = `<span class="trend-arrow up" title="+${diff} Hz vs last week">+${diff} Hz</span>`;
        else if (diff < 0) pitchArrow = `<span class="trend-arrow down" title="${diff} Hz vs last week">${diff} Hz</span>`;
        else pitchArrow = `<span class="trend-arrow flat" title="Same as last week">0 Hz</span>`;
    }

    return `
            <div class="glass-card">
                <div class="card-header">
                    <h3>Voice Quality Trends</h3>
                </div>
                <div class="voice-trends">
                    <div class="voice-trend-item">
                        <span class="trend-label">Avg Stability This Week</span>
                        <div class="trend-value">
                            <span class="trend-number">${stabilityDisplay}</span>
                            ${stabilityArrow}
                        </div>
                    </div>
                    <div class="voice-trend-item">
                        <span class="trend-label">Avg Pitch This Week</span>
                        <div class="trend-value">
                            <span class="trend-number">${pitchDisplay}</span>
                            ${pitchArrow}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderGoalProgress(weeklyPercent, monthlyPercent, weeklyCount, weeklyGoal, monthlyCount, monthlyGoal) {
    const weeklyOffset = 283 - (283 * weeklyPercent / 100);
    const monthlyOffset = 283 - (283 * monthlyPercent / 100);

    return `
        <div class="glass-card">
            <div class="card-header">
                <h3>Goal Progress</h3>
            </div>
            <div class="goal-circles">
                <div class="goal-item">
                    <div class="circular-progress">
                        <svg viewBox="0 0 100 100">
                            <circle class="bg" cx="50" cy="50" r="45"/>
                            <circle class="progress" cx="50" cy="50" r="45" stroke-dasharray="283" stroke-dashoffset="${weeklyOffset}"/>
                            <text x="50" y="46" text-anchor="middle" dy="0.3em" class="progress-text">${weeklyPercent}%</text>
                            <text x="50" y="62" text-anchor="middle" class="progress-subtext">${weeklyCount}/${weeklyGoal}</text>
                        </svg>
                    </div>
                    <span>Weekly Goal</span>
                </div>
                <div class="goal-item">
                    <div class="circular-progress">
                        <svg viewBox="0 0 100 100">
                            <circle class="bg" cx="50" cy="50" r="45"/>
                            <circle class="progress" cx="50" cy="50" r="45" stroke-dasharray="283" stroke-dashoffset="${monthlyOffset}"/>
                            <text x="50" y="46" text-anchor="middle" dy="0.3em" class="progress-text">${monthlyPercent}%</text>
                            <text x="50" y="62" text-anchor="middle" class="progress-subtext">${monthlyCount}/${monthlyGoal}</text>
                        </svg>
                    </div>
                    <span>Monthly Goal</span>
                </div>
            </div>
        </div>
    `;
}

function renderBestSession(session) {
    if (!session) return '';

    const date = new Date(getTime(session));
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const durationMin = Math.round((session.duration || 0) / 60);
    const pitch = session.avgPitch > 0 ? `${Math.round(session.avgPitch)} Hz` : '--';
    const stability = session.stability != null ? `${Math.round(session.stability)}%` : '--';

    return `
        <div class="glass-card best-session">
            <div class="card-header">
                <h3>Best Session This Week</h3>
                ${ICONS.star}
            </div>
            <div class="best-session-content">
                <div class="best-session-stat">
                    <span class="best-session-label">Date</span>
                    <span class="best-session-value">${dateStr}</span>
                </div>
                <div class="best-session-stat">
                    <span class="best-session-label">Duration</span>
                    <span class="best-session-value">${durationMin} min</span>
                </div>
                <div class="best-session-stat">
                    <span class="best-session-label">Avg Pitch</span>
                    <span class="best-session-value">${pitch}</span>
                </div>
                <div class="best-session-stat">
                    <span class="best-session-label">Stability</span>
                    <span class="best-session-value highlight">${stability}</span>
                </div>
            </div>
        </div>
    `;
}
