// Data Manager - handles export, import, and clear all data
import { openDB, put, getAll, getCurrentUser, STORES } from '../../core/storage.js';
import { loadProgressScreen } from '../progress/index.js';
import { loadJourneyScreen } from '../achievements/index.js';
import { loadSnapshots } from '../snapshots/index.js';
import { loadSavedSettings } from './settingsManager.js';

import { debugLog } from '../../utils/debug.js';

export async function exportAllData() {
    try {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            userId: getCurrentUser(),
            settings: await getAll(STORES.SETTINGS),
            sessions: await getAll(STORES.SESSIONS),
            achievements: await getAll(STORES.ACHIEVEMENTS),
            snapshots: await getAll(STORES.SNAPSHOTS),
            metadata: await getAll(STORES.METADATA)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aria-backup-${getCurrentUser()}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog('Export', 'Data exported successfully');
    } catch (err) {
        debugLog('Export', 'Failed:', err);
        alert('Failed to export data. Please try again.');
    }
}

export async function importData(file) {
    const statusEl = document.getElementById('importStatus');

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.settings) {
            throw new Error('Invalid backup file format');
        }

        // Import each store
        for (const setting of data.settings || []) {
            await put(STORES.SETTINGS, setting);
        }
        for (const session of data.sessions || []) {
            await put(STORES.SESSIONS, session);
        }
        for (const achievement of data.achievements || []) {
            await put(STORES.ACHIEVEMENTS, achievement);
        }
        for (const snapshot of data.snapshots || []) {
            await put(STORES.SNAPSHOTS, snapshot);
        }
        for (const meta of data.metadata || []) {
            await put(STORES.METADATA, meta);
        }

        // Show success
        if (statusEl) {
            statusEl.classList.remove('hidden', 'error');
            statusEl.classList.add('success');
            statusEl.textContent = `Successfully imported ${data.sessions?.length || 0} sessions, ${data.achievements?.length || 0} achievements, ${data.snapshots?.length || 0} snapshots.`;
        }

        // Reload UI
        await loadSavedSettings();
        await loadProgressScreen();
        await loadJourneyScreen();
        await loadSnapshots();

        debugLog('Import', 'Data imported successfully');
    } catch (err) {
        debugLog('Import', 'Failed:', err);
        if (statusEl) {
            statusEl.classList.remove('hidden', 'success');
            statusEl.classList.add('error');
            statusEl.textContent = 'Failed to import data. Please check the file format.';
        }
    }
}

export async function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL your data? This cannot be undone!')) {
        return;
    }

    if (!confirm('This will delete all sessions, achievements, snapshots, and settings. Are you absolutely sure?')) {
        return;
    }

    try {
        // Get database instance
        const db = await openDB();

        // Clear all stores
        const tx = db.transaction(Object.values(STORES), 'readwrite');
        for (const store of Object.values(STORES)) {
            tx.objectStore(store).clear();
        }
        await tx.done;

        // Clear localStorage
        localStorage.removeItem('aria-theme');

        // Close database
        db.close();

        // Delete current user's database
        const currentUser = getCurrentUser();
        const dbName = `aria-voice-studio-${currentUser}`;
        await new Promise((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = resolve;
            deleteReq.onerror = reject;
        });

        // Reload page
        location.reload();
    } catch (err) {
        debugLog('Clear', 'Failed:', err);
        alert('Failed to clear data. Please try again.');
    }
}
