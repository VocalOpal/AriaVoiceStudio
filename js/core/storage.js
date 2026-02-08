// Constants

const DB_NAME = 'aria-voice-studio';
const DB_VERSION = 1;

// Debug configuration
const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Debug logging function
function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

export const STORES = {
    PROFILES: 'profiles',
    SESSIONS: 'sessions',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings',
    SNAPSHOTS: 'snapshots',
    METADATA: 'metadata'
};

let currentUserId = 'default';
let dbInstance = null;

const migrations = {
    1: (db, transaction) => {
        // Version 1: Initial schema

        // Profiles store
        if (!db.objectStoreNames.contains(STORES.PROFILES)) {
            const profileStore = db.createObjectStore(STORES.PROFILES, {
                keyPath: 'id'
            });
            profileStore.createIndex('name', 'name', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
            const sessionStore = db.createObjectStore(STORES.SESSIONS, {
                keyPath: 'id'
            });
            sessionStore.createIndex('profileId', 'profileId', { unique: false });
            sessionStore.createIndex('startTime', 'startTime', { unique: false });
        }

        // Achievements store
        if (!db.objectStoreNames.contains(STORES.ACHIEVEMENTS)) {
            db.createObjectStore(STORES.ACHIEVEMENTS, {
                keyPath: 'id'
            });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, {
                keyPath: 'key'
            });
        }

        // Snapshots store
        if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
            const snapshotStore = db.createObjectStore(STORES.SNAPSHOTS, {
                keyPath: 'id'
            });
            snapshotStore.createIndex('profileId', 'profileId', { unique: false });
            snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, {
                keyPath: 'key'
            });
        }
    }
};

// Database Operations

// Configuration for blocked state handling
const DB_BLOCKED_CONFIG = {
    maxRetries: 3,
    retryDelayMs: 2000,
    notificationTimeoutMs: 30000
};

// Track blocked state for UI notification
let dbBlockedState = {
    isBlocked: false,
    retryCount: 0,
    onBlockedCallback: null
};

/**
 * Register a callback to be notified when database is blocked
 * @param {Function} callback - Called with { isBlocked, retryCount, maxRetries }
 */
export function onDatabaseBlocked(callback) {
    dbBlockedState.onBlockedCallback = callback;
}

/**
 * Notify UI of blocked state change
 */
function notifyBlockedState(isBlocked, retryCount = 0) {
    dbBlockedState.isBlocked = isBlocked;
    dbBlockedState.retryCount = retryCount;
    
    if (dbBlockedState.onBlockedCallback) {
        try {
            dbBlockedState.onBlockedCallback({
                isBlocked,
                retryCount,
                maxRetries: DB_BLOCKED_CONFIG.maxRetries
            });
        } catch (err) {
            console.error('[Storage] Error in blocked callback:', err);
        }
    }
}

/**
 * Open database with retry logic for blocked state
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB(retryCount = 0) {
    if (dbInstance) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(`${DB_NAME}-${currentUserId}`, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = request.result;
            const transaction = event.target.transaction;

            // Run migrations
            for (let version = 1; version <= DB_VERSION; version++) {
                if (event.oldVersion < version && migrations[version]) {
                    migrations[version](db, transaction);
                }
            }
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            
            // Clear blocked state on success
            if (dbBlockedState.isBlocked) {
                notifyBlockedState(false);
            }
            
            // Handle connection closing unexpectedly (e.g., version change in another tab)
            dbInstance.onversionchange = () => {
                dbInstance.close();
                dbInstance = null;
                debugLog('Storage', 'Database version changed in another tab, connection closed');
                // Notify UI that a refresh may be needed
                notifyBlockedState(true, 0);
            };
            
            resolve(dbInstance);
        };

        request.onerror = () => {
            reject(new Error(`Failed to open database: ${request.error?.message}`));
        };

        request.onblocked = async () => {
            console.warn('[Storage] Database upgrade blocked - close other tabs');
            
            // Notify UI of blocked state
            notifyBlockedState(true, retryCount);
            
            // Retry logic with exponential backoff
            if (retryCount < DB_BLOCKED_CONFIG.maxRetries) {
                const delay = DB_BLOCKED_CONFIG.retryDelayMs * Math.pow(2, retryCount);
                debugLog('Storage', `Database blocked, retrying in ${delay}ms (attempt ${retryCount + 1}/${DB_BLOCKED_CONFIG.maxRetries})`);
                
                setTimeout(async () => {
                    try {
                        const db = await openDB(retryCount + 1);
                        resolve(db);
                    } catch (retryErr) {
                        reject(retryErr);
                    }
                }, delay);
            } else {
                // Max retries exceeded
                const error = new Error(
                    'Database upgrade blocked. Please close other tabs using Aria and refresh this page. ' +
                    'Your data is safe, but the app cannot start until other tabs are closed.'
                );
                error.code = 'DB_BLOCKED';
                reject(error);
            }
        };
    });
}

export async function closeDB() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        debugLog('Storage', 'Database closed');
    }
}

// CRUD Operations

export async function put(storeName, value, key = null) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to put in ${storeName}: ${request.error?.message}`));
    });
}

export async function get(storeName, key) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get from ${storeName}: ${request.error?.message}`));
    });
}

export async function remove(storeName, key) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete from ${storeName}: ${request.error?.message}`));
    });
}

export async function getAll(storeName) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to getAll from ${storeName}: ${request.error?.message}`));
    });
}

export async function listKeys(storeName) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to listKeys from ${storeName}: ${request.error?.message}`));
    });
}

export async function clear(storeName) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error?.message}`));
    });
}

export async function getByIndex(storeName, indexName, value) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to query ${storeName}.${indexName}: ${request.error?.message}`));
    });
}

export async function count(storeName, query) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = query ? store.count(query) : store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to count ${storeName}: ${request.error?.message}`));
    });
}

// Batch Operations

export async function batch(storeName, operations) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        operations.forEach(op => {
            if (op.type === 'put') {
                store.put(op.data);
            } else if (op.type === 'delete') {
                store.delete(op.data);
            }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Batch operation failed in ${storeName}`));
    });
}

// Export / Import

export async function exportAll() {
    const db = await openDB();
    const data = {
        version: DB_VERSION,
        stores: {}
    };

    const storeNames = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
        data.stores[storeName] = await getAll(storeName);
    }

    return data;
}

export async function importAll(data, merge = false) {
    if (!data || !data.stores) {
        throw new Error('Invalid import data format');
    }

    if (!merge) {
        // Clear all existing data
        const db = await openDB();
        const storeNames = Array.from(db.objectStoreNames);

        for (const storeName of storeNames) {
            await clear(storeName);
        }
    }

    // Import data
    for (const [storeName, storeData] of Object.entries(data.stores)) {
        if (Array.isArray(storeData)) {
            await batch(storeName, storeData.map(item => ({ type: 'put', data: item })));
        }
    }

    // Update import metadata
    await put(STORES.METADATA, {
        key: 'lastImport',
        timestamp: new Date().toISOString(),
        sourceVersion: data.version
    });

    debugLog('Storage', 'Import complete');
}

export async function createBackupBlob() {
    const data = await exportAll();
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
}

export async function downloadBackup(filename) {
    const blob = await createBackupBlob();
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const defaultFilename = `aria-backup-${date}.json`;
    const finalFilename = filename || defaultFilename;

    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();

    URL.revokeObjectURL(url);

    // Update backup metadata
    await put(STORES.METADATA, {
        key: 'lastBackup',
        timestamp: new Date().toISOString()
    });
}

// Storage Persistence

export async function requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) {
        console.warn('[Storage] Storage persistence not supported');
        return false;
    }

    try {
        const persisted = await navigator.storage.persist();
        
        if (persisted) {
            debugLog('Storage', 'Persistent storage granted');
        } else {
            console.warn('[Storage] Persistent storage denied');
        }

        return persisted;
    } catch (error) {
        console.error('[Storage] Failed to request persistence:', error);
        return false;
    }
}

export async function isPersisted() {
    if (!navigator.storage || !navigator.storage.persisted) {
        return false;
    }

    return navigator.storage.persisted();
}

export async function getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) {
        return { usage: 0, quota: 0, percent: 0 };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percent = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percent };
}

// User Management

export async function switchUser(userId) {
    if (currentUserId === userId) {
        return; // Already using this user
    }

    // Close current database
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
    
    // Switch to new user
    currentUserId = userId;
    debugLog('Storage', `Switched to user: ${userId}`);
}

export function getCurrentUser() {
    return currentUserId;
}

export async function getAllUsers() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.databases();
        request.onsuccess = () => {
            const dbs = request.result || [];
            const userDbs = dbs
                .filter(db => db.name.startsWith(DB_NAME + '-'))
                .map(db => db.name.replace(DB_NAME + '-', ''));
            resolve(userDbs);
        };
        request.onerror = () => reject(new Error('Failed to list databases'));
    });
}

export async function deleteUser(userId) {
    if (userId === currentUserId) {
        throw new Error('Cannot delete the current user. Switch to another user first.');
    }

    const dbName = `${DB_NAME}-${userId}`;
    
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        deleteRequest.onsuccess = () => {
            debugLog('Storage', `Deleted user database: ${userId}`);
            resolve();
        };
        
        deleteRequest.onerror = () => {
            reject(new Error(`Failed to delete user ${userId}: ${deleteRequest.error?.message}`));
        };
    });
}

// Legacy exports for compatibility
export { DB_NAME, DB_VERSION };
