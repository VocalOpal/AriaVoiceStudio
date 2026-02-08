export function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', options);
}

export function formatTime(timestamp, options = { hour: '2-digit', minute: '2-digit' }) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('en-US', options);
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatPitch(pitch) {
    return pitch > 0 ? `${Math.round(pitch)} Hz` : '-- Hz';
}

export function formatPercent(value, isDecimal = false) {
    const percent = isDecimal ? Math.round(value * 100) : Math.round(value);
    return `${percent}%`;
}

export default {
    formatDuration,
    formatDate,
    formatTime,
    formatBytes,
    formatPitch,
    formatPercent
};
