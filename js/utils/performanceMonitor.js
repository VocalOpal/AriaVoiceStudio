export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameCount: 0,
            droppedFrames: 0,
            lastFrameTime: 0,
            avgFrameTime: 0,
            frameTimes: [],
            renderCount: 0,
            lastRenderTime: 0
        };
        
        this.thresholds = {
            targetFrameTime: 16.67,
            maxFrameTime: 33.33,
            sampleSize: 60
        };
        
        this.isMonitoring = false;
        this.rafId = null;
    }
    
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.metrics.lastFrameTime = performance.now();
        this.tick();
    }
    
    stop() {
        this.isMonitoring = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    
    /**
     * Internal tick for frame timing
     * @private
     */
    tick() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const frameTime = now - this.metrics.lastFrameTime;
        
        this.metrics.frameCount++;
        this.metrics.frameTimes.push(frameTime);
        
        if (this.metrics.frameTimes.length > this.thresholds.sampleSize) {
            this.metrics.frameTimes.shift();
        }
        
        if (frameTime > this.thresholds.maxFrameTime) {
            this.metrics.droppedFrames++;
        }
        
        this.metrics.avgFrameTime = this.metrics.frameTimes.reduce((a, b) => a + b, 0) / this.metrics.frameTimes.length;
        this.metrics.lastFrameTime = now;
        
        this.rafId = requestAnimationFrame(() => this.tick());
    }
    
    /**
     * Track a render operation
     */
    trackRender() {
        this.metrics.renderCount++;
        this.metrics.lastRenderTime = performance.now();
    }
    
    /**
     * Get current performance metrics
     * @returns {Object} Performance stats
     */
    getMetrics() {
        return {
            fps: this.metrics.avgFrameTime > 0 ? Math.round(1000 / this.metrics.avgFrameTime) : 0,
            avgFrameTime: Math.round(this.metrics.avgFrameTime * 100) / 100,
            droppedFrames: this.metrics.droppedFrames,
            frameCount: this.metrics.frameCount,
            renderCount: this.metrics.renderCount,
            isHealthy: this.metrics.avgFrameTime < this.thresholds.maxFrameTime
        };
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            frameCount: 0,
            droppedFrames: 0,
            lastFrameTime: performance.now(),
            avgFrameTime: 0,
            frameTimes: [],
            renderCount: 0,
            lastRenderTime: 0
        };
    }
}

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

// Singleton performance monitor
let globalPerformanceMonitor = null;

/**
 * Get or create the global performance monitor
 * @returns {PerformanceMonitor}
 */
export function getPerformanceMonitor() {
    if (!globalPerformanceMonitor) {
        globalPerformanceMonitor = new PerformanceMonitor();
    }
    return globalPerformanceMonitor;
}

export default PerformanceMonitor;
