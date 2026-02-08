// Aria Voice Studio - Voice Range Classifier

/**
 * Voice training target ranges
 */
export const VOICE_RANGES = {
    lower: { min: 85, max: 180, label: 'Lower Range', color: '#5BCEFA' },
    mid: { min: 145, max: 200, label: 'Mid Range', color: '#FFFFFF' },
    higher: { min: 180, max: 300, label: 'Higher Range', color: '#F5A9B8' }
};

/**
 * Classify a pitch frequency into voice ranges
 * @param {number} frequency - The pitch frequency in Hz
 * @param {Object} customRanges - Optional custom ranges to use instead of defaults
 * @returns {{range: string, progress: number, label: string, inRange: boolean}}
 */
export function classifyPitch(frequency, customRanges = null) {
    const ranges = customRanges || VOICE_RANGES;

    // Check if frequency falls within any defined range
    for (const [rangeName, range] of Object.entries(ranges)) {
        if (frequency >= range.min && frequency <= range.max) {
            const progress = (frequency - range.min) / (range.max - range.min);
            return {
                range: rangeName,
                progress: progress,
                label: range.label || rangeName,
                inRange: true
            };
        }
    }

    // Below or above all ranges
    const rangeEntries = Object.entries(ranges);
    const lowest = rangeEntries.reduce((a, b) => a[1].min < b[1].min ? a : b);
    const highest = rangeEntries.reduce((a, b) => a[1].max > b[1].max ? a : b);

    if (frequency < lowest[1].min) {
        return {
            range: 'below_' + lowest[0],
            progress: 0,
            label: 'Below ' + (lowest[1].label || lowest[0]),
            inRange: false
        };
    } else {
        return {
            range: 'above_' + highest[0],
            progress: 1,
            label: 'Above ' + (highest[1].label || highest[0]),
            inRange: false
        };
    }
}

/**
 * Get the target range for a specific voice goal
 * @param {string} goal - The voice goal ('lower', 'mid', 'higher')
 * @param {Object} customRanges - Optional custom ranges
 * @returns {{min: number, max: number, label: string, color: string} | null}
 */
export function getTargetRange(goal, customRanges = null) {
    const ranges = customRanges || VOICE_RANGES;
    return ranges[goal] || null;
}

/**
 * Calculate how close a frequency is to a target range center
 * @param {number} frequency - Current frequency in Hz
 * @param {string} targetRange - Target range name
 * @param {Object} customRanges - Optional custom ranges
 * @returns {{distance: number, direction: string, percentage: number}}
 */
export function getDistanceToTarget(frequency, targetRange, customRanges = null) {
    const ranges = customRanges || VOICE_RANGES;
    const target = ranges[targetRange];
    
    if (!target) {
        return { distance: 0, direction: 'unknown', percentage: 0 };
    }
    
    const targetCenter = (target.min + target.max) / 2;
    const targetWidth = target.max - target.min;
    const distance = frequency - targetCenter;
    
    let direction = 'on_target';
    if (distance < -targetWidth / 4) direction = 'below';
    else if (distance > targetWidth / 4) direction = 'above';
    
    const distanceFromCenter = Math.abs(distance);
    const maxDistance = targetWidth / 2;
    const percentage = Math.max(0, Math.min(100, (1 - distanceFromCenter / maxDistance) * 100));

    return {
        distance: Math.round(distance),
        direction,
        percentage: Math.round(percentage)
    };
}

/**
 * Get all range boundaries for visualization
 * @param {Object} customRanges - Optional custom ranges
 * @returns {Array<{name: string, min: number, max: number, label: string, color: string}>}
 */
export function getRangeBoundaries(customRanges = null) {
    const ranges = customRanges || VOICE_RANGES;
    return Object.entries(ranges).map(([name, range]) => ({
        name,
        min: range.min,
        max: range.max,
        label: range.label || name,
        color: range.color || '#888888'
    }));
}

/**
 * Check if a frequency is within a specific target range
 * @param {number} frequency - Current frequency in Hz
 * @param {string} targetRange - Target range name
 * @param {Object} customRanges - Optional custom ranges
 * @returns {boolean}
 */
export function isInTargetRange(frequency, targetRange, customRanges = null) {
    const ranges = customRanges || VOICE_RANGES;
    const target = ranges[targetRange];
    
    if (!target) return false;
    return frequency >= target.min && frequency <= target.max;
}

export default {
    VOICE_RANGES,
    classifyPitch,
    getTargetRange,
    getDistanceToTarget,
    getRangeBoundaries,
    isInTargetRange
};
