// Aria Voice Studio - Session Recorder

import { classifyPitch, VOICE_RANGES } from './voice-range-classifier.js';

/**
 * SessionRecorder class for recording and analyzing pitch data over time
 */
export class SessionRecorder {
    constructor(options = {}) {
        this.sessionData = [];
        this.sessionStartTime = null;
        this.isRecording = false;

        this.targetRanges = options.targetRanges || VOICE_RANGES;
        this.maxDataPoints = options.maxDataPoints || 10000;
    }
    
    /**
     * Start a new recording session
     */
    startSession() {
        this.sessionData = [];
        this.sessionStartTime = Date.now();
        this.isRecording = true;
    }
    
    /**
     * Stop the current recording session
     */
    stopSession() {
        this.isRecording = false;
    }
    
    /**
     * Add pitch data to session
     * @param {Object} pitchData - Pitch detection result
     */
    addData(pitchData) {
        if (!this.isRecording || !this.sessionStartTime) return;
        
        const timestamp = Date.now() - this.sessionStartTime;
        
        // Store compact data format
        this.sessionData.push({
            t: timestamp,
            f: pitchData.frequency || pitchData.pitch || 0,
            c: pitchData.confidence || 0,
            r: pitchData.rms || 0
        });
        
        // Prevent unbounded memory growth
        if (this.sessionData.length > this.maxDataPoints) {
            this.sessionData.shift();
        }
    }
    
    /**
     * Get comprehensive session statistics
     * @returns {Object|null} Session statistics or null if no data
     */
    getSessionStats() {
        if (this.sessionData.length === 0) {
            return null;
        }
        
        // Filter out zero frequencies (silence/noise)
        const validData = this.sessionData.filter(d => d.f > 0);
        if (validData.length === 0) {
            return {
                duration: this.sessionData[this.sessionData.length - 1].t,
                sampleCount: this.sessionData.length,
                validSampleCount: 0,
                min: 0,
                max: 0,
                mean: 0,
                median: 0,
                p10: 0,
                p90: 0,
                rangeTime: {},
                data: this.sessionData
            };
        }
        
        const frequencies = validData.map(d => d.f);
        const sum = frequencies.reduce((a, b) => a + b, 0);
        
        // Calculate percentiles
        const sorted = [...frequencies].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(sorted.length * 0.1)] || 0;
        const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
        const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
        
        // Calculate time in each range
        const rangeTime = {};
        for (const range of Object.keys(this.targetRanges)) {
            rangeTime[range] = 0;
        }
        rangeTime['below'] = 0;
        rangeTime['above'] = 0;
        
        let lastTimestamp = 0;
        for (const point of this.sessionData) {
            const dt = point.t - lastTimestamp;
            lastTimestamp = point.t;
            
            if (point.f > 0) {
                const classification = classifyPitch(point.f, this.targetRanges);
                if (rangeTime.hasOwnProperty(classification.range)) {
                    rangeTime[classification.range] += dt;
                } else if (classification.range.startsWith('below_')) {
                    rangeTime['below'] += dt;
                } else if (classification.range.startsWith('above_')) {
                    rangeTime['above'] += dt;
                }
            }
        }
        
        // Calculate standard deviation
        const mean = sum / frequencies.length;
        const variance = frequencies.reduce((acc, f) => acc + Math.pow(f - mean, 2), 0) / frequencies.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            duration: this.sessionData[this.sessionData.length - 1].t,
            sampleCount: this.sessionData.length,
            validSampleCount: validData.length,
            min: Math.min(...frequencies),
            max: Math.max(...frequencies),
            mean: Math.round(mean * 10) / 10,
            median: p50,
            p10,
            p90,
            stdDev: Math.round(stdDev * 10) / 10,
            rangeTime,
            data: this.sessionData
        };
    }
    
    /**
     * Export session data as CSV
     * @returns {string} CSV formatted data
     */
    exportCSV() {
        const stats = this.getSessionStats();
        if (!stats) return '';
        
        let csv = 'timestamp_ms,frequency_hz,confidence,rms\n';
        for (const point of this.sessionData) {
            csv += `${point.t},${point.f.toFixed(2)},${point.c.toFixed(3)},${point.r.toFixed(4)}\n`;
        }
        return csv;
    }
    
    /**
     * Export session data as JSON
     * @returns {string} JSON formatted data
     */
    exportJSON() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            stats: this.getSessionStats(),
            config: {
                targetRanges: this.targetRanges
            }
        }, null, 2);
    }
    
    /**
     * Download file helper
     * @param {string} content - File content
     * @param {string} filename - Filename for download
     * @param {string} mimeType - MIME type of the file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Download session as CSV file
     * @param {string} filename - Optional custom filename
     */
    downloadCSV(filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const name = filename || `aria-session-${timestamp}.csv`;
        this.downloadFile(this.exportCSV(), name, 'text/csv');
    }
    
    /**
     * Download session as JSON file
     * @param {string} filename - Optional custom filename
     */
    downloadJSON(filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const name = filename || `aria-session-${timestamp}.json`;
        this.downloadFile(this.exportJSON(), name, 'application/json');
    }
    
    /**
     * Get session duration in milliseconds
     * @returns {number}
     */
    getDuration() {
        if (this.sessionData.length === 0) return 0;
        return this.sessionData[this.sessionData.length - 1].t;
    }
    
    /**
     * Get raw session data
     * @returns {Array}
     */
    getData() {
        return this.sessionData;
    }
    
    /**
     * Clear session data
     */
    clear() {
        this.sessionData = [];
        this.sessionStartTime = null;
        this.isRecording = false;
    }
}

// Singleton instance for app-wide session recording
let globalRecorder = null;

/**
 * Get the global session recorder instance
 * @param {Object} options - Optional configuration
 * @returns {SessionRecorder}
 */
export function getSessionRecorder(options = {}) {
    if (!globalRecorder) {
        globalRecorder = new SessionRecorder(options);
    }
    return globalRecorder;
}

export default SessionRecorder;
