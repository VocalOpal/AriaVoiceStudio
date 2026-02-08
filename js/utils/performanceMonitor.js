/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum ms between calls
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
    let inThrottle = false;
    let lastArgs = null;
    
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn.apply(this, lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args;
        }
    };
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Ms to wait after last call
 * @param {boolean} [immediate=false] - Execute on leading edge
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait, immediate = false) {
    let timeout = null;
    
    return function(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) fn.apply(this, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) fn.apply(this, args);
    };
}

/**
 * Request idle callback with fallback
 * @param {Function} callback - Callback to execute when idle
 * @param {Object} [options] - requestIdleCallback options
 * @returns {number} Callback ID
 */
export function requestIdleCallback(callback, options = {}) {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
    }
    // Fallback for Safari
    return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1);
}

/**
 * Cancel idle callback with fallback
 * @param {number} id - Callback ID
 */
export function cancelIdleCallback(id) {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
}

/**
 * Batch DOM updates using requestAnimationFrame
 * @param {Function[]} updates - Array of update functions
 */
export function batchDOMUpdates(updates) {
    requestAnimationFrame(() => {
        updates.forEach(update => {
            try {
                update();
            } catch (err) {
                console.error('[PerformanceMonitor] Batch update error:', err);
            }
        });
    });
}

/**
 * Memoize a function's results
 * @param {Function} fn - Function to memoize
 * @param {Function} [keyResolver] - Custom key resolver
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyResolver) {
    const cache = new Map();
    const memoized = function(...args) {
        const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn.apply(this, args);
        cache.set(key, result);
        
        // Limit cache size
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        return result;
    };
    
    memoized.clear = () => cache.clear();
    return memoized;
}

/**
 * Create a throttled UI updater that batches updates
 * @param {number} [fps=30] - Target updates per second
 * @returns {Object} { schedule, flush }
 */
export function createUIUpdater(fps = 30) {
    const interval = 1000 / fps;
    let pendingUpdates = new Map();
    let lastFlush = 0;
    let scheduled = false;
    
    function flush() {
        const now = performance.now();
        if (now - lastFlush < interval && pendingUpdates.size < 10) {
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
            return;
        }
        
        scheduled = false;
        lastFlush = now;
        
        const updates = pendingUpdates;
        pendingUpdates = new Map();
        
        updates.forEach((update) => {
            try {
                update();
            } catch (err) {
                console.error('[UIUpdater] Update error:', err);
            }
        });
    }
    
    return {
        /**
         * Schedule a UI update (deduped by key)
         * @param {string} key - Unique key for deduplication
         * @param {Function} update - Update function
         */
        schedule(key, update) {
            pendingUpdates.set(key, update);
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
        },
        
        /**
         * Immediately flush all pending updates
         */
        flush() {
            lastFlush = 0;
            flush();
        }
    };
}


