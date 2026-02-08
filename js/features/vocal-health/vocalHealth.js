// Aria Voice Studio - Vocal Health

import { getAll, STORES } from '../../core/storage.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// SVG icons used in the health screen
const ICONS = {
    heart: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    waveform: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h2l3-9 4 18 4-18 3 9h2"/></svg>',
    target: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    stability: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    mic: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
};

/**
 * Compute a composite health score (0-100) from session metrics.
 *
 * Components:
 *  - Pitch stability (30% weight) — higher is better
 *  - Time in target range (30% weight) — higher percentage is better
 *  - Session pacing (20% weight) — avg duration < 20min = 100, 20-30min = 70, >30min = 40
 *  - Rest intervals (20% weight) — avg gap > 4h = 100, 2-4h = 70, <2h = 40
 */
function computeHealthScore(sessions) {
    if (!sessions.length) return null;

    // Stability score (0-100)
    const avgStability = sessions.reduce((s, x) => s + (x.stability || 0), 0) / sessions.length;
    const stabilityScore = Math.min(100, avgStability);

    // Time-in-range score (0-100)
    let rangeScore = 50; // default if data unavailable
    const sessionsWithRange = sessions.filter(s => s.totalTime > 0);
    if (sessionsWithRange.length) {
        const avgRangePct = sessionsWithRange.reduce((s, x) => {
            const pct = (x.timeInRange / x.totalTime) * 100;
            return s + pct;
        }, 0) / sessionsWithRange.length;
        rangeScore = Math.min(100, avgRangePct);
    }

    // Session pacing score
    const avgDuration = sessions.reduce((s, x) => s + (x.duration || 0), 0) / sessions.length;
    const avgDurationMin = avgDuration / 60;
    let pacingScore;
    if (avgDurationMin <= 20) pacingScore = 100;
    else if (avgDurationMin <= 30) pacingScore = 70;
    else pacingScore = 40;

    // Rest interval score
    let restScore = 70; // default
    if (sessions.length >= 2) {
        const sorted = [...sessions].sort((a, b) => getTime(a) - getTime(b));
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            gaps.push(getTime(sorted[i]) - getTime(sorted[i - 1]));
        }
        const avgGapHours = (gaps.reduce((s, g) => s + g, 0) / gaps.length) / (1000 * 60 * 60);
        if (avgGapHours >= 4) restScore = 100;
        else if (avgGapHours >= 2) restScore = 70;
        else restScore = 40;
    }

    const composite = Math.round(
        stabilityScore * 0.30 +
        rangeScore * 0.30 +
        pacingScore * 0.20 +
        restScore * 0.20
    );

    return Math.max(0, Math.min(100, composite));
}

/**
 * Determine status level from score.
 */
function getStatusFromScore(score) {
    if (score === null) return { label: 'Unknown', css: 'neutral', color: 'var(--muted)' };
    if (score >= 80) return { label: 'Excellent', css: 'good', color: 'var(--success)' };
    if (score >= 60) return { label: 'Good', css: 'good', color: 'var(--success)' };
    if (score >= 40) return { label: 'Needs Attention', css: 'warning', color: 'var(--warning)' };
    return { label: 'Rest Recommended', css: 'danger', color: 'var(--danger)' };
}

/**
 * Generate a specific message based on session data.
 */
function getHealthMessage(sessions, score) {
    if (!sessions.length) return 'Start training to track your vocal health';

    const avgStability = sessions.reduce((s, x) => s + (x.stability || 0), 0) / sessions.length;
    const avgDurationMin = (sessions.reduce((s, x) => s + (x.duration || 0), 0) / sessions.length) / 60;

    if (score >= 80) {
        return `Your voice is strong with ${Math.round(avgStability)}% stability this week`;
    }
    if (score >= 60) {
        return `Solid progress — ${sessions.length} sessions with ${Math.round(avgStability)}% avg stability`;
    }
    if (avgDurationMin > 25) {
        return `Consider shorter sessions — your average is ${Math.round(avgDurationMin)} min`;
    }
    if (avgStability < 50) {
        return 'Focus on stability exercises to improve consistency';
    }
    return 'Take breaks and stay hydrated between sessions';
}

/**
 * Compute voice quality metrics for the metric cards.
 */
function computeMetrics(sessions) {
    // Pitch stability
    const avgStability = sessions.length
        ? sessions.reduce((s, x) => s + (x.stability || 0), 0) / sessions.length
        : 0;

    // Range accuracy (time in range / total time as percentage)
    let avgRangeAccuracy = 0;
    const sessionsWithRange = sessions.filter(s => s.totalTime > 0);
    if (sessionsWithRange.length) {
        avgRangeAccuracy = sessionsWithRange.reduce((s, x) => {
            return s + ((x.timeInRange / x.totalTime) * 100);
        }, 0) / sessionsWithRange.length;
    }

    // Pitch consistency (how tight the min-max range is relative to avg)
    let avgPitchConsistency = 0;
    const sessionsWithPitch = sessions.filter(s => s.avgPitch > 0 && s.maxPitch > 0);
    if (sessionsWithPitch.length) {
        avgPitchConsistency = sessionsWithPitch.reduce((s, x) => {
            const range = x.maxPitch - x.minPitch;
            // Tighter range = more consistent. Score: 100 if range < 20Hz, 0 if range > 200Hz
            const score = Math.max(0, Math.min(100, 100 - ((range - 20) / 180) * 100));
            return s + score;
        }, 0) / sessionsWithPitch.length;
    }

    return {
        stability: {
            value: Math.round(avgStability),
            bar: Math.min(100, avgStability),
            status: avgStability >= 70 ? 'good' : avgStability >= 50 ? 'warning' : 'caution',
            tip: avgStability >= 70 ? 'Great consistency in your pitch control'
                : avgStability >= 50 ? 'Keep practicing — your stability is improving'
                : 'Try slower exercises to build pitch control'
        },
        rangeAccuracy: {
            value: Math.round(avgRangeAccuracy),
            bar: Math.min(100, avgRangeAccuracy),
            status: avgRangeAccuracy >= 60 ? 'good' : avgRangeAccuracy >= 40 ? 'warning' : 'caution',
            tip: avgRangeAccuracy >= 60 ? 'You\'re hitting your target range consistently'
                : avgRangeAccuracy >= 40 ? 'Focus on staying within your target range'
                : 'Start with narrower target ranges to build accuracy'
        },
        pitchConsistency: {
            value: Math.round(avgPitchConsistency),
            bar: Math.min(100, avgPitchConsistency),
            status: avgPitchConsistency >= 60 ? 'good' : avgPitchConsistency >= 40 ? 'warning' : 'caution',
            tip: avgPitchConsistency >= 60 ? 'Your pitch control is steady and focused'
                : avgPitchConsistency >= 40 ? 'Try to keep your pitch within a narrower range'
                : 'Practice sustaining a single note to improve control'
        }
    };
}

/**
 * Compute practice load summary.
 */
function computePracticeLoad(sessions) {
    const totalSeconds = sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const avgSeconds = sessions.length ? totalSeconds / sessions.length : 0;

    // Rest pattern
    let restPattern = 'No data';
    if (sessions.length >= 2) {
        const sorted = [...sessions].sort((a, b) => getTime(a) - getTime(b));
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            gaps.push(getTime(sorted[i]) - getTime(sorted[i - 1]));
        }
        const avgGapHours = (gaps.reduce((s, g) => s + g, 0) / gaps.length) / (1000 * 60 * 60);
        restPattern = avgGapHours >= 2 ? 'Healthy' : 'Needs more breaks';
    } else if (sessions.length === 1) {
        restPattern = 'Too few sessions';
    }

    const totalMin = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;

    return {
        sessionCount: sessions.length,
        totalTime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        avgLength: `${Math.round(avgSeconds / 60)} min`,
        restPattern
    };
}

/**
 * Select smart tips based on user data.
 */
function getSmartTips(sessions, score) {
    if (!sessions.length) {
        return [
            'Warm up your voice before intensive practice',
            'Take 5-minute breaks every 20 minutes',
            'Keep your throat relaxed while practicing'
        ];
    }

    const tips = [];
    const avgDurationMin = (sessions.reduce((s, x) => s + (x.duration || 0), 0) / sessions.length) / 60;
    const avgStability = sessions.reduce((s, x) => s + (x.stability || 0), 0) / sessions.length;

    // Check for long sessions
    if (avgDurationMin > 25) {
        tips.push('Try keeping sessions under 20 minutes to protect your voice');
    }

    // Check for low stability
    if (avgStability < 50) {
        tips.push('Your voice sounds a bit strained — try a warmup first');
    }

    // Check for inactivity
    if (sessions.length > 0) {
        const latest = Math.max(...sessions.map(s => getTime(s)));
        const daysSince = (Date.now() - latest) / (1000 * 60 * 60 * 24);
        if (daysSince > 3) {
            tips.push('Welcome back! Start with gentle exercises');
        }
    }

    // Check for high stability — encourage growth
    if (avgStability > 80) {
        tips.push('Great consistency! You could try expanding your range');
    }

    // Check range accuracy
    const sessionsWithRange = sessions.filter(s => s.totalTime > 0);
    if (sessionsWithRange.length) {
        const avgRange = sessionsWithRange.reduce((s, x) => s + ((x.timeInRange / x.totalTime) * 100), 0) / sessionsWithRange.length;
        if (avgRange < 50) {
            tips.push('Focus on staying in your target range during exercises');
        }
    }

    // Fill with defaults if we have fewer than 2 tips
    const defaults = [
        'Stay hydrated — drink water before and during practice',
        'Avoid whispering — it strains vocal cords more than talking',
        'Keep your throat relaxed while practicing'
    ];
    let i = 0;
    while (tips.length < 2 && i < defaults.length) {
        tips.push(defaults[i++]);
    }

    return tips.slice(0, 3);
}

/**
 * Get timestamp from a session's startTime (handles both numbers and ISO strings).
 */
function getTime(session) {
    const t = session.startTime;
    if (typeof t === 'number') return t;
    return new Date(t).getTime();
}

/**
 * Format a session timestamp for display.
 */
function formatSessionDate(session) {
    const d = new Date(getTime(session));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatSessionTime(session) {
    const d = new Date(getTime(session));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Get stability status class for session log dots.
 */
function stabilityDotClass(stability) {
    if (stability >= 70) return 'good';
    if (stability >= 50) return 'warning';
    return 'caution';
}

/**
 * Get CSS class for metric status.
 */
function metricBarClass(status) {
    if (status === 'good') return '';
    if (status === 'warning') return 'warning';
    return 'caution';
}

// ── Rendering ──────────────────────────────────────────

function renderHealthScreen(sessions) {
    const container = document.getElementById('healthContent');
    if (!container) return;

    if (!sessions.length) {
        container.innerHTML = renderEmptyState();
        return;
    }

    const score = computeHealthScore(sessions);
    const status = getStatusFromScore(score);
    const message = getHealthMessage(sessions, score);
    const metrics = computeMetrics(sessions);
    const load = computePracticeLoad(sessions);
    const tips = getSmartTips(sessions, score);

    container.innerHTML = `
        ${renderHero(score, status, message)}
        ${renderMetricCards(metrics)}
        ${renderSessionLog(sessions)}
        ${renderPracticeLoad(load)}
        ${renderSmartTips(tips)}
    `;
}

function renderEmptyState() {
    return `
        <div class="glass-card health-empty-state">
            <div class="health-icon neutral">
                ${ICONS.heart}
            </div>
            <h3>No Session Data Yet</h3>
            <p>Start training to track your vocal health. Your session metrics will appear here after your first practice.</p>
            <div class="smart-tips">
                <h4>${ICONS.info} Getting Started</h4>
                <ul class="smart-tips-list">
                    <li>${ICONS.check} Warm up your voice before intensive practice</li>
                    <li>${ICONS.check} Take 5-minute breaks every 20 minutes</li>
                    <li>${ICONS.check} Keep your throat relaxed while practicing</li>
                </ul>
            </div>
        </div>
    `;
}

function renderHero(score, status, message) {
    return `
        <div class="glass-card health-overview">
            <div class="health-score-ring ${status.css}">
                <svg viewBox="0 0 80 80" class="score-ring-svg">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" stroke-width="6"/>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="${status.color}" stroke-width="6"
                        stroke-dasharray="${Math.round((score / 100) * 213.6)} 213.6"
                        stroke-linecap="round" transform="rotate(-90 40 40)"/>
                </svg>
                <span class="score-value">${score}</span>
            </div>
            <div class="health-info">
                <p class="health-label">Overall Vocal Health</p>
                <h2 class="health-status">${status.label}</h2>
                <p class="health-message" style="color: ${status.color}">${message}</p>
            </div>
        </div>
    `;
}

function renderMetricCards(metrics) {
    const cards = [
        {
            icon: ICONS.stability,
            label: 'Pitch Stability',
            value: `${metrics.stability.value}%`,
            bar: metrics.stability.bar,
            status: metrics.stability.status,
            tip: metrics.stability.tip
        },
        {
            icon: ICONS.target,
            label: 'Range Accuracy',
            value: `${metrics.rangeAccuracy.value}%`,
            bar: metrics.rangeAccuracy.bar,
            status: metrics.rangeAccuracy.status,
            tip: metrics.rangeAccuracy.tip
        },
        {
            icon: ICONS.waveform,
            label: 'Pitch Consistency',
            value: `${metrics.pitchConsistency.value}%`,
            bar: metrics.pitchConsistency.bar,
            status: metrics.pitchConsistency.status,
            tip: metrics.pitchConsistency.tip
        }
    ];

    return `
        <div class="health-metrics">
            ${cards.map(c => `
                <div class="glass-card health-metric">
                    <div class="metric-icon ${c.status}">
                        ${c.icon}
                    </div>
                    <div class="metric-info">
                        <h4>${c.label} <span class="metric-value">${c.value}</span></h4>
                        <div class="progress-bar"><div class="progress-fill ${metricBarClass(c.status)}" style="width: ${c.bar}%"></div></div>
                        <p>${c.tip}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSessionLog(sessions) {
    const sorted = [...sessions].sort((a, b) => getTime(b) - getTime(a));
    const recent = sorted.slice(0, 10);

    return `
        <div class="glass-card">
            <h3>Recent Sessions</h3>
            <div class="session-log">
                ${recent.map(s => {
                    const durationMin = Math.round((s.duration || 0) / 60);
                    const avgHz = s.avgPitch ? `${Math.round(s.avgPitch)} Hz` : '—';
                    const stabClass = stabilityDotClass(s.stability || 0);
                    return `
                        <div class="session-log-row">
                            <span class="session-log-date">${formatSessionDate(s)}</span>
                            <span class="session-log-time">${formatSessionTime(s)}</span>
                            <span class="session-log-duration">${durationMin} min</span>
                            <span class="session-log-pitch">${avgHz}</span>
                            <span class="session-log-dot ${stabClass}" title="${Math.round(s.stability || 0)}% stability"></span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderPracticeLoad(load) {
    return `
        <div class="glass-card practice-load">
            <h3>This Week</h3>
            <div class="practice-load-grid">
                <div class="load-stat">
                    <span class="load-value">${load.sessionCount}</span>
                    <span class="load-label">Sessions</span>
                </div>
                <div class="load-stat">
                    <span class="load-value">${load.totalTime}</span>
                    <span class="load-label">Total Time</span>
                </div>
                <div class="load-stat">
                    <span class="load-value">${load.avgLength}</span>
                    <span class="load-label">Avg Length</span>
                </div>
                <div class="load-stat">
                    <span class="load-value ${load.restPattern === 'Healthy' ? 'good' : ''}">${load.restPattern}</span>
                    <span class="load-label">Rest Pattern</span>
                </div>
            </div>
        </div>
    `;
}

function renderSmartTips(tips) {
    return `
        <div class="glass-card smart-tips">
            <h4>${ICONS.info} Tips For You</h4>
            <ul class="smart-tips-list">
                ${tips.map(t => `<li>${ICONS.check} ${t}</li>`).join('')}
            </ul>
        </div>
    `;
}

// ── Public API ─────────────────────────────────────────

export async function loadVocalHealth() {
    try {
        const sessions = await getAll(STORES.SESSIONS);

        const recentSessions = sessions.filter(s =>
            getTime(s) > Date.now() - SEVEN_DAYS_MS
        );

        renderHealthScreen(recentSessions);
    } catch (err) {
        console.error('[Health] Failed to load:', err);
        const container = document.getElementById('healthContent');
        if (container) {
            container.innerHTML = `
                <div class="glass-card health-empty-state">
                    <p>Unable to load vocal health data. Please try again.</p>
                </div>
            `;
        }
    }
}
