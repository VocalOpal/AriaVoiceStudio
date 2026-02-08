const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

export { DEBUG };
