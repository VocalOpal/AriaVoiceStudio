// Streak Modal - manages the streak/calendar modal
import { get, getAll, STORES } from '../../core/storage.js';

let _callbacks = {};

export function initStreakModal(callbacks) {
    _callbacks = callbacks;
}

export async function openStreakModal() {
    const modal = document.getElementById('streakModal');
    if (!modal) return;

    _callbacks.setLastFocused?.(document.activeElement);
    modal.classList.remove('hidden');

    // Load streak data
    const streakData = await get(STORES.METADATA, 'streak') || {
        currentStreak: 0,
        longestStreak: 0
    };
    const sessions = await getAll(STORES.SESSIONS);

    // Update modal stats
    document.getElementById('modalCurrentStreak').textContent = streakData.currentStreak || 0;
    document.getElementById('modalLongestStreak').textContent = streakData.longestStreak || 0;
    document.getElementById('modalTotalDays').textContent = sessions.length;

    // Calculate consistency (sessions in last 30 days / 30)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => s.startTime > thirtyDaysAgo);
    const uniqueDays = new Set(recentSessions.map(s => new Date(s.startTime).toDateString()));
    const consistency = Math.round((uniqueDays.size / 30) * 100);
    document.getElementById('modalConsistency').textContent = `${consistency}%`;

    // Generate calendar
    generateStreakCalendar(sessions);

    // Focus management
    _callbacks.trapFocusInModal?.(modal);
}

export function closeStreakModal() {
    const modal = document.getElementById('streakModal');
    if (modal) modal.classList.add('hidden');
    _callbacks.restoreFocus?.();
}

function generateStreakCalendar(sessions) {
    const container = document.getElementById('streakCalendar');
    if (!container) return;

    const sessionDates = new Set(sessions.map(s => new Date(s.startTime).toDateString()));
    const today = new Date();
    const days = [];

    // Generate last 28 days
    for (let i = 27; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push({
            date,
            completed: sessionDates.has(date.toDateString()),
            isToday: i === 0
        });
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    container.innerHTML = `
        <div class="calendar-header">
            ${dayNames.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="calendar-days">
            ${days.map(d => `
                <div class="calendar-day ${d.completed ? 'completed' : ''} ${d.isToday ? 'today' : ''}">
                    ${d.date.getDate()}
                </div>
            `).join('')}
        </div>
    `;
}
