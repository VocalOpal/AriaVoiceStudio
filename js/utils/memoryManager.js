export class MemoryManager {
    constructor() {
        this.resources = new Map();
        this.timers = new Set();
        this.observers = new Set();
        this.intervals = new Set();
        this.memoryStats = {
            totalAllocated: 0,
            totalFreed: 0,
            peakUsage: 0
        };
    }
    
    allocateResource(type, resource, metadata = {}) {
        const id = Symbol(type);
        this.resources.set(id, {
            type,
            resource,
            metadata,
            allocatedAt: Date.now(),
            size: this.estimateResourceSize(resource)
        });
        
        this.memoryStats.totalAllocated += this.resources.get(id).size;
        this.updatePeakUsage();
        
        return id;
    }
    
    deallocateResource(id) {
        const resourceInfo = this.resources.get(id);
        if (!resourceInfo) return false;
        
        try {
            switch (resourceInfo.type) {
                case 'audioContext':
                    if (resourceInfo.resource && resourceInfo.resource.state !== 'closed') {
                        resourceInfo.resource.close();
                    }
                    break;
                    
                case 'mediaStream':
                    if (resourceInfo.resource) {
                        resourceInfo.resource.getTracks().forEach(track => track.stop());
                    }
                    break;
                    
                case 'eventListener':
                    if (resourceInfo.resource && resourceInfo.metadata.element) {
                        resourceInfo.metadata.element.removeEventListener(
                            resourceInfo.metadata.event,
                            resourceInfo.resource,
                            resourceInfo.metadata.options
                        );
                    }
                    break;
                    
                case 'observer':
                    if (resourceInfo.resource) {
                        resourceInfo.resource.disconnect();
                    }
                    break;
                    
                case 'blob':
                    if (resourceInfo.resource) {
                        URL.revokeObjectURL(resourceInfo.resource);
                    }
                    break;
                    
                default:
                    if (resourceInfo.resource && typeof resourceInfo.resource.dispose === 'function') {
                        resourceInfo.resource.dispose();
                    } else if (resourceInfo.resource && typeof resourceInfo.resource.destroy === 'function') {
                        resourceInfo.resource.destroy();
                    }
            }
            
            this.memoryStats.totalFreed += resourceInfo.size;
            this.resources.delete(id);
            return true;
            
        } catch (err) {
            console.warn('[MemoryManager] Error deallocating resource:', err);
            this.resources.delete(id);
            return false;
        }
    }
    
    /**
     * Add a managed timer
     * @param {Function} callback - Timer callback
     * @param {number} delay - Delay in ms
     * @param {...*} args - Callback arguments
     * @returns {number} Timer ID
     */
    addTimer(callback, delay, ...args) {
        const timerId = setTimeout(() => {
            this.timers.delete(timerId);
            callback(...args);
        }, delay);
        
        this.timers.add(timerId);
        return timerId;
    }
    
    /**
     * Clear a managed timer
     * @param {number} timerId - Timer ID
     * @returns {boolean} Success status
     */
    clearTimer(timerId) {
        if (this.timers.has(timerId)) {
            clearTimeout(timerId);
            this.timers.delete(timerId);
            return true;
        }
        return false;
    }
    
    /**
     * Add a managed interval
     * @param {Function} callback - Interval callback
     * @param {number} interval - Interval in ms
     * @param {...*} args - Callback arguments
     * @returns {number} Interval ID
     */
    addInterval(callback, interval, ...args) {
        const intervalId = setInterval(callback, interval, ...args);
        this.intervals.add(intervalId);
        return intervalId;
    }
    
    /**
     * Clear a managed interval
     * @param {number} intervalId - Interval ID
     * @returns {boolean} Success status
     */
    clearInterval(intervalId) {
        if (this.intervals.has(intervalId)) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
            return true;
        }
        return false;
    }
    
    /**
     * Add a managed observer
     * @param {*} observer - Observer instance
     * @returns {*} The observer
     */
    addObserver(observer) {
        this.observers.add(observer);
        return observer;
    }
    
    /**
     * Remove a managed observer
     * @param {*} observer - Observer instance
     * @returns {boolean} Success status
     */
    removeObserver(observer) {
        if (this.observers.has(observer)) {
            observer.disconnect();
            this.observers.delete(observer);
            return true;
        }
        return false;
    }
    
    /**
     * Clean up all managed resources
     */
    async cleanup() {
        // Clear all timers
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.timers.clear();
        
        // Clear all intervals
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.intervals.clear();
        
        // Disconnect all observers
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (err) {
                console.warn('[MemoryManager] Error disconnecting observer:', err);
            }
        });
        this.observers.clear();
        
        // Deallocate all resources
        const resourceIds = Array.from(this.resources.keys());
        await Promise.allSettled(
            resourceIds.map(id => Promise.resolve(this.deallocateResource(id)))
        );
        
        // Run garbage collection if available (Chrome dev tools)
        if (window.gc) {
            try {
                window.gc();
            } catch (err) {
                // GC not available in production
            }
        }
    }
    
    /**
     * Estimate resource size in bytes
     * @private
     */
    estimateResourceSize(resource) {
        if (!resource) return 0;
        
        try {
            if (resource instanceof ArrayBuffer) {
                return resource.byteLength;
            } else if (resource instanceof Blob) {
                return resource.size;
            } else if (resource instanceof ImageData) {
                return resource.data.byteLength;
            } else if (Array.isArray(resource)) {
                return resource.length * 8;
            } else if (typeof resource === 'object') {
                return JSON.stringify(resource).length * 2;
            } else {
                return 64;
            }
        } catch (err) {
            return 64;
        }
    }
    
    /**
     * Update peak memory usage stat
     * @private
     */
    updatePeakUsage() {
        const currentUsage = this.memoryStats.totalAllocated - this.memoryStats.totalFreed;
        if (currentUsage > this.memoryStats.peakUsage) {
            this.memoryStats.peakUsage = currentUsage;
        }
    }
    
    /**
     * Get memory usage statistics
     * @returns {Object} Memory stats
     */
    getMemoryStats() {
        const currentUsage = this.memoryStats.totalAllocated - this.memoryStats.totalFreed;
        return {
            ...this.memoryStats,
            currentUsage,
            resourceCount: this.resources.size,
            timerCount: this.timers.size,
            intervalCount: this.intervals.size,
            observerCount: this.observers.size
        };
    }
    
    /**
     * Check for potential memory leaks
     * @returns {string[]} Warning messages
     */
    checkForLeaks() {
        const stats = this.getMemoryStats();
        const warnings = [];
        
        if (stats.resourceCount > 50) {
            warnings.push(`High resource count: ${stats.resourceCount}`);
        }
        
        if (stats.timerCount > 20) {
            warnings.push(`High timer count: ${stats.timerCount}`);
        }
        
        if (stats.currentUsage > 50 * 1024 * 1024) {
            warnings.push(`High memory usage: ${Math.round(stats.currentUsage / 1024 / 1024)}MB`);
        }
        
        // Check for long-lived resources
        const now = Date.now();
        this.resources.forEach((resource) => {
            const age = now - resource.allocatedAt;
            if (age > 5 * 60 * 1000) { // 5 minutes
                warnings.push(`Long-lived resource: ${resource.type} (${Math.round(age / 1000)}s)`);
            }
        });
        
        return warnings;
    }
}

// Singleton instance
let globalMemoryManager = null;

/**
 * Get or create the global memory manager
 * @returns {MemoryManager}
 */
export function getMemoryManager() {
    if (!globalMemoryManager) {
        globalMemoryManager = new MemoryManager();
    }
    return globalMemoryManager;
}

/**
 * Start periodic memory leak detection
 * @param {number} [intervalMs=30000] - Check interval in ms
 * @returns {number} Interval ID
 */
export function startLeakDetection(intervalMs = 30000) {
    const mm = getMemoryManager();
    return setInterval(() => {
        const warnings = mm.checkForLeaks();
        if (warnings.length > 0) {
            console.warn('[MemoryManager] Potential memory leaks detected:', warnings);
        }
    }, intervalMs);
}

export default MemoryManager;
