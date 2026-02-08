// Aria Voice Studio - Snapshot Data Manager

import { getAll, put, remove, STORES } from '../../core/storage.js';

import { debugLog } from '../../utils/debug.js';

const ICONS = {
    mic: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    camera: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    trendUp: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
};

/**
 * Get the timestamp from a snapshot (handles both `timestamp` and `createdAt` fields).
 */
function getSnapTime(snap) {
    // Prefer `timestamp` (the field actually saved by snapshotUI.js)
    // Fall back to `createdAt` for legacy data
    return snap.timestamp || snap.createdAt || 0;
}

export async function loadSnapshots() {
    const container = document.getElementById('snapshotContent');
    if (!container) return;

    try {
        const snapshots = await getAll(STORES.SNAPSHOTS);

        if (snapshots.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }

        // Sort by date, newest first — use timestamp (not createdAt)
        snapshots.sort((a, b) => getSnapTime(b) - getSnapTime(a));

        let html = '';

        // Trend summary when 2+ snapshots
        if (snapshots.length >= 2) {
            html += renderTrendSummary(snapshots);
        }

        html += '<div class="snapshot-list">';
        html += snapshots.map(snap => renderSnapshotCard(snap)).join('');
        html += '</div>';

        container.innerHTML = html;

        debugLog('Snapshots', 'Loaded:', snapshots.length);
    } catch (err) {
        console.error('[Snapshots] Failed to load:', err);
        container.innerHTML = `<div class="glass-card" style="text-align:center;padding:40px;color:var(--muted)">
            <p>Unable to load snapshots</p>
        </div>`;
    }
}

function renderEmptyState() {
    return `
        <div class="glass-card snapshot-empty-state">
            <div class="snapshot-empty-icon">${ICONS.camera}</div>
            <h3>No Voice Snapshots Yet</h3>
            <p>Record your first voice snapshot to start tracking your progress over time.</p>
            <div class="snapshot-empty-tips">
                <div class="snapshot-empty-tip">Record a snapshot before and after practice</div>
                <div class="snapshot-empty-tip">Compare your voice quality over weeks</div>
                <div class="snapshot-empty-tip">Track pitch and stability trends</div>
            </div>
        </div>
    `;
}

function renderTrendSummary(snapshots) {
    // Compare latest (first in sorted array) to earliest (last)
    const latest = snapshots[0];
    const earliest = snapshots[snapshots.length - 1];

    const latestPitch = latest.avgPitch || 0;
    const earliestPitch = earliest.avgPitch || 0;
    const latestStability = latest.stability != null ? latest.stability : null;
    const earliestStability = earliest.stability != null ? earliest.stability : null;

    let pitchTrend = '';
    if (latestPitch > 0 && earliestPitch > 0) {
        const diff = latestPitch - earliestPitch;
        const arrow = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        const sign = diff > 0 ? '+' : '';
        pitchTrend = `
            <div class="snapshot-trend-item">
                <span class="trend-label">Avg Pitch</span>
                <span class="trend-value">${earliestPitch} Hz <span class="trend-arrow-inline">&rarr;</span> ${latestPitch} Hz</span>
                <span class="trend-arrow ${arrow}">${sign}${diff} Hz</span>
            </div>
        `;
    }

    let stabilityTrend = '';
    if (latestStability != null && earliestStability != null) {
        const diff = latestStability - earliestStability;
        const arrow = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        const sign = diff > 0 ? '+' : '';
        stabilityTrend = `
            <div class="snapshot-trend-item">
                <span class="trend-label">Stability</span>
                <span class="trend-value">${earliestStability}% <span class="trend-arrow-inline">&rarr;</span> ${latestStability}%</span>
                <span class="trend-arrow ${arrow}">${sign}${diff}%</span>
            </div>
        `;
    }

    if (!pitchTrend && !stabilityTrend) return '';

    return `
        <div class="glass-card snapshot-trend">
            <div class="card-header">
                <h3>Overall Trend</h3>
                ${ICONS.trendUp}
            </div>
            <p class="snapshot-trend-subtitle">Comparing your earliest to latest snapshot</p>
            ${pitchTrend}
            ${stabilityTrend}
        </div>
    `;
}

function renderSnapshotCard(snap) {
    const ts = getSnapTime(snap);
    const date = new Date(ts);
    const dateStr = ts ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date';
    const timeStr = ts ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    const avgPitch = snap.avgPitch || '--';
    const minPitch = snap.minPitch != null ? snap.minPitch : null;
    const maxPitch = snap.maxPitch != null ? snap.maxPitch : null;
    const stability = snap.stability != null ? snap.stability : null;
    const duration = snap.duration != null ? snap.duration : null;

    // Stability badge
    let stabilityBadge = '';
    if (stability != null) {
        const badgeClass = stability >= 70 ? 'good' : stability >= 50 ? 'warning' : 'caution';
        stabilityBadge = `<span class="snapshot-badge ${badgeClass}">${stability}%</span>`;
    }

    // Pitch range bar
    let rangeBar = '';
    if (minPitch != null && maxPitch != null && maxPitch > 0) {
        // Normalize to 80-300 Hz display range
        const rangeMin = 80;
        const rangeMax = 300;
        const leftPct = Math.max(0, Math.min(100, ((minPitch - rangeMin) / (rangeMax - rangeMin)) * 100));
        const rightPct = Math.max(0, Math.min(100, ((maxPitch - rangeMin) / (rangeMax - rangeMin)) * 100));
        const widthPct = Math.max(2, rightPct - leftPct);
        rangeBar = `
            <div class="snapshot-range-bar" title="${minPitch}-${maxPitch} Hz">
                <div class="snapshot-range-fill" style="left: ${leftPct}%; width: ${widthPct}%"></div>
            </div>
        `;
    }

    // Duration display
    const durationStr = duration != null ? formatSnapDuration(duration) : '';

    return `
        <div class="glass-card snapshot-item" data-id="${snap.id}">
            <div class="snapshot-icon">
                ${ICONS.mic}
            </div>
            <div class="snapshot-info">
                <h4>${snap.name || 'Untitled Snapshot'}</h4>
                <p>${dateStr}${timeStr ? ' \u2022 ' + timeStr : ''}${durationStr ? ' \u2022 ' + durationStr : ''}</p>
            </div>
            <div class="snapshot-details">
                <div class="snapshot-detail">
                    <span class="snapshot-detail-label">Avg Pitch</span>
                    <span class="snapshot-detail-value">${avgPitch} Hz</span>
                </div>
                <div class="snapshot-detail">
                    <span class="snapshot-detail-label">Range</span>
                    <span class="snapshot-detail-value">${minPitch != null && maxPitch != null ? minPitch + '-' + maxPitch + ' Hz' : '--'}</span>
                    ${rangeBar}
                </div>
                <div class="snapshot-detail">
                    <span class="snapshot-detail-label">Stability</span>
                    ${stabilityBadge || '<span class="snapshot-detail-value">--</span>'}
                </div>
            </div>
            <button class="btn-icon" onclick="deleteSnapshot('${snap.id}')" title="Delete snapshot">
                ${ICONS.trash}
            </button>
        </div>
    `;
}

function formatSnapDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export async function deleteSnapshot(id) {
    if (!confirm('Delete this snapshot?')) return;
    try {
        await remove(STORES.SNAPSHOTS, id);
        await loadSnapshots();
    } catch (err) {
        console.error('[Snapshots] Failed to delete:', err);
    }
}

export async function saveSnapshotData(snapshotObj) {
    await put(STORES.SNAPSHOTS, snapshotObj);
}
