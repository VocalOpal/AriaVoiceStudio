// Aria Voice Studio - Profile Screen UI
// Modular screen component for vocal profile with actionable metrics

import { eventBus } from '../../core/events.js';
import { getSettingsService } from '../../services/settingsService.js';
import { get, put, getAll, STORES } from '../../core/storage.js';
import { throttle, debounce } from '../../utils/performanceMonitor.js';

/**
 * ProfileScreen - Manages the vocal profile screen with actionable insights
 */
class ProfileScreen {
    constructor() {
        this.container = null;
        this.settingsService = null;
        this.sessionData = [];
        this.metricsCache = null;
        this.profileImageUrl = null;
        this.unsubscribers = [];
    }
    
    /**
     * Initialize the screen
     */
    async initialize(container) {
        this.container = container;
        this.settingsService = getSettingsService();
        
        // Load data
        await this.loadSessionData();
        await this.loadProfileImage();
        
        // Compute metrics once
        this.metricsCache = this.computeMetrics();
        
        // Subscribe to real-time updates with throttling
        this.subscribeToEvents();
        
        // Render
        this.render();
    }
    
    /**
     * Load session history
     */
    async loadSessionData() {
        try {
            this.sessionData = await getAll(STORES.SESSIONS) || [];
            // Sort by date descending
            this.sessionData.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        } catch (err) {
            console.error('[ProfileScreen] Failed to load sessions:', err);
            this.sessionData = [];
        }
    }
    
    /**
     * Load profile image from storage
     */
    async loadProfileImage() {
        try {
            const imageData = await get(STORES.METADATA, 'profileImage');
            if (imageData?.data) {
                this.profileImageUrl = imageData.data;
            }
        } catch (err) {
            console.error('[ProfileScreen] Failed to load profile image:', err);
        }
    }
    
    /**
     * Subscribe to real-time events
     */
    subscribeToEvents() {
        // Throttle UI updates during live analysis
        const throttledUpdate = throttle((data) => {
            this.updateLiveMetrics(data);
        }, 200);
        
        const unsub = eventBus.on('ANALYSIS_RESULT', throttledUpdate);
        this.unsubscribers.push(unsub);
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    
    /**
     * Compute aggregate metrics from session history
     */
    computeMetrics() {
        if (this.sessionData.length === 0) {
            return this.getEmptyMetrics();
        }
        
        const recentSessions = this.sessionData.slice(0, 30);
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekSessions = this.sessionData.filter(s => new Date(s.startTime).getTime() > weekAgo);
        
        // Calculate averages
        const avgPitch = this.average(recentSessions.map(s => s.avgPitch).filter(p => p > 0));
        const avgStability = this.average(recentSessions.map(s => s.stability).filter(s => s !== undefined));
        const avgTimeInRange = this.average(recentSessions.map(s => s.timeInRange).filter(t => t !== undefined));
        
        // Calculate trends (comparing first half to second half of recent sessions)
        const midpoint = Math.floor(recentSessions.length / 2);
        const olderHalf = recentSessions.slice(midpoint);
        const newerHalf = recentSessions.slice(0, midpoint);
        
        const pitchTrend = this.calculateTrend(
            this.average(olderHalf.map(s => s.avgPitch).filter(p => p > 0)),
            this.average(newerHalf.map(s => s.avgPitch).filter(p => p > 0))
        );
        
        const stabilityTrend = this.calculateTrend(
            this.average(olderHalf.map(s => s.stability).filter(s => s !== undefined)),
            this.average(newerHalf.map(s => s.stability).filter(s => s !== undefined))
        );
        
        // Weekly stats
        const weeklyPracticeMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
        const weeklySessionCount = weekSessions.length;
        
        // Pitch range analysis
        const allPitches = recentSessions.flatMap(s => [s.minPitch, s.maxPitch]).filter(p => p > 0);
        const typicalLow = this.percentile(allPitches, 10);
        const typicalHigh = this.percentile(allPitches, 90);
        
        return {
            // Core metrics
            averagePitch: avgPitch,
            pitchStability: avgStability,
            timeInRange: avgTimeInRange,
            
            // Trends
            pitchTrend,
            stabilityTrend,
            
            // Weekly
            weeklyPracticeMinutes,
            weeklySessionCount,
            
            // Range
            typicalPitchLow: typicalLow,
            typicalPitchHigh: typicalHigh,
            pitchRange: typicalHigh - typicalLow,
            
            // Session counts
            totalSessions: this.sessionData.length,
            recentSessionCount: recentSessions.length
        };
    }
    
    /**
     * Get empty metrics for new users
     */
    getEmptyMetrics() {
        return {
            averagePitch: 0,
            pitchStability: 0,
            timeInRange: 0,
            pitchTrend: 'none',
            stabilityTrend: 'none',
            weeklyPracticeMinutes: 0,
            weeklySessionCount: 0,
            typicalPitchLow: 0,
            typicalPitchHigh: 0,
            pitchRange: 0,
            totalSessions: 0,
            recentSessionCount: 0
        };
    }
    
    /**
     * Calculate average
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    /**
     * Calculate percentile
     */
    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    
    /**
     * Calculate trend direction
     */
    calculateTrend(older, newer) {
        if (!older || !newer) return 'none';
        const diff = (newer - older) / older;
        if (diff > 0.05) return 'up';
        if (diff < -0.05) return 'down';
        return 'stable';
    }
    
    /**
     * Main render method
     */
    render() {
        if (!this.container) return;
        
        const metrics = this.metricsCache;
        const settings = this.settingsService;
        
        this.container.innerHTML = `
            <div class="profile-screen">
                <!-- Profile Header -->
                <div class="profile-header glass-card">
                    <div class="profile-avatar-section">
                        <div class="profile-avatar" id="profileAvatar">
                            ${this.profileImageUrl 
                                ? `<img src="${this.profileImageUrl}" alt="Profile" class="avatar-image"/>` 
                                : `<span class="avatar-initial">${(settings.getCached('profileName', 'U')[0] || 'U').toUpperCase()}</span>`
                            }
                            <button class="avatar-upload-btn" id="uploadAvatarBtn" title="Upload photo">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            </button>
                        </div>
                        <input type="file" id="avatarFileInput" accept="image/*" hidden/>
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-name">${settings.getCached('profileName', 'Voice Trainer')}</h2>
                        <span class="profile-pronouns">${settings.getCached('pronouns', 'they/them')}</span>
                        <div class="profile-target">
                            <span class="target-label">Target Range:</span>
                            <span class="target-value">${settings.getCached('targetMin', 140)}-${settings.getCached('targetMax', 200)} Hz</span>
                        </div>
                    </div>
                </div>
                
                <!-- Voice Summary Card -->
                <div class="voice-summary glass-card">
                    <h3>Your Voice Profile</h3>
                    
                    ${metrics.totalSessions === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>
                            <p>Complete your first training session to see your voice profile!</p>
                        </div>
                    ` : `
                        <div class="summary-grid">
                            ${this.renderMetricCard('Average Pitch', 
                                `${Math.round(metrics.averagePitch)} Hz`,
                                this.getPitchInsight(metrics.averagePitch),
                                metrics.pitchTrend,
                                'pitch'
                            )}
                            
                            ${this.renderMetricCard('Pitch Stability', 
                                `${Math.round(metrics.pitchStability * 100)}%`,
                                this.getStabilityInsight(metrics.pitchStability),
                                metrics.stabilityTrend,
                                'stability'
                            )}
                            
                            ${this.renderMetricCard('Time in Range', 
                                `${Math.round(metrics.timeInRange * 100)}%`,
                                this.getTimeInRangeInsight(metrics.timeInRange),
                                'none',
                                'range'
                            )}
                            
                            ${this.renderMetricCard('Pitch Range', 
                                `${Math.round(metrics.typicalPitchLow)}-${Math.round(metrics.typicalPitchHigh)} Hz`,
                                this.getPitchRangeInsight(metrics.pitchRange),
                                'none',
                                'range-span'
                            )}
                        </div>
                    `}
                </div>
                
                <!-- Weekly Progress -->
                <div class="weekly-progress glass-card">
                    <h3>This Week</h3>
                    <div class="weekly-stats">
                        <div class="weekly-stat">
                            <div class="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                            <div class="stat-content">
                                <span class="stat-value">${Math.round(metrics.weeklyPracticeMinutes)} min</span>
                                <span class="stat-label">Practice Time</span>
                            </div>
                        </div>
                        <div class="weekly-stat">
                            <div class="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></div>
                            <div class="stat-content">
                                <span class="stat-value">${metrics.weeklySessionCount}</span>
                                <span class="stat-label">Sessions</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Actionable Insights -->
                ${metrics.totalSessions >= 3 ? `
                    <div class="insights-section glass-card">
                        <h3>What This Means</h3>
                        <div class="insights-list">
                            ${this.generateInsights(metrics).map(insight => `
                                <div class="insight-card insight-${insight.type}">
                                    <span class="insight-icon">${insight.icon}</span>
                                    <div class="insight-content">
                                        <strong>${insight.title}</strong>
                                        <p>${insight.description}</p>
                                        ${insight.action ? `<span class="insight-action">${insight.action}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Recent Sessions -->
                ${this.sessionData.length > 0 ? `
                    <div class="recent-sessions glass-card">
                        <h3>Recent Sessions</h3>
                        <div class="sessions-list">
                            ${this.sessionData.slice(0, 5).map(session => this.renderSessionItem(session)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    /**
     * Render a metric card with trend and insight
     */
    renderMetricCard(title, value, insight, trend, type) {
        const trendIcon = {
            'up': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
            'down': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
            'stable': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
            'none': ''
        }[trend];
        
        const trendClass = {
            'up': trend === 'up' && type === 'stability' ? 'positive' : (type === 'pitch' ? 'neutral' : 'positive'),
            'down': trend === 'down' && type === 'stability' ? 'negative' : 'neutral',
            'stable': 'neutral',
            'none': ''
        }[trend];
        
        return `
            <div class="metric-card metric-${type}">
                <div class="metric-header">
                    <span class="metric-title">${title}</span>
                    ${trend !== 'none' ? `<span class="metric-trend ${trendClass}">${trendIcon}</span>` : ''}
                </div>
                <div class="metric-value">${value}</div>
                <div class="metric-insight">${insight}</div>
            </div>
        `;
    }
    
    /**
     * Get insight text for average pitch
     */
    getPitchInsight(avgPitch) {
        const targetMin = this.settingsService.getCached('targetMin', 140);
        const targetMax = this.settingsService.getCached('targetMax', 200);
        const targetCenter = (targetMin + targetMax) / 2;
        
        if (avgPitch === 0) return 'No data yet';
        if (avgPitch >= targetMin && avgPitch <= targetMax) {
            return 'Within your target range';
        } else if (avgPitch < targetMin) {
            const diff = targetMin - avgPitch;
            return `${Math.round(diff)} Hz below target`;
        } else {
            const diff = avgPitch - targetMax;
            return `${Math.round(diff)} Hz above target`;
        }
    }
    
    /**
     * Get insight text for stability
     */
    getStabilityInsight(stability) {
        if (stability === 0) return 'No data yet';
        if (stability >= 0.8) return 'Excellent control';
        if (stability >= 0.6) return 'Good, room to improve';
        if (stability >= 0.4) return 'Practice sustained notes';
        return 'Focus on breath support';
    }
    
    /**
     * Get insight text for time in range
     */
    getTimeInRangeInsight(timeInRange) {
        if (timeInRange === 0) return 'No data yet';
        if (timeInRange >= 0.7) return 'Great consistency';
        if (timeInRange >= 0.5) return 'Building muscle memory';
        return 'Keep practicing!';
    }
    
    /**
     * Get insight text for pitch range
     */
    getPitchRangeInsight(range) {
        if (range === 0) return 'No data yet';
        if (range >= 100) return 'Wide range - great flexibility';
        if (range >= 50) return 'Good working range';
        return 'Range will expand with practice';
    }
    
    /**
     * Generate actionable insights based on metrics
     */
    generateInsights(metrics) {
        const insights = [];
        const targetMin = this.settingsService.getCached('targetMin', 140);
        const targetMax = this.settingsService.getCached('targetMax', 200);
        
        // Pitch position insight
        if (metrics.averagePitch > 0) {
            if (metrics.averagePitch < targetMin) {
                insights.push({
                    type: 'suggestion',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
                    title: 'Pitch Below Target',
                    description: `Your average pitch is ${Math.round(targetMin - metrics.averagePitch)} Hz below your target. This is normal during training.`,
                    action: 'Try pitch glide exercises to expand your range upward.'
                });
            } else if (metrics.averagePitch > targetMax) {
                insights.push({
                    type: 'info',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
                    title: 'Pitch Above Target',
                    description: `You're speaking ${Math.round(metrics.averagePitch - targetMax)} Hz above your target. Make sure this feels comfortable.`,
                    action: 'If you feel strain, try relaxing your larynx.'
                });
            } else {
                insights.push({
                    type: 'success',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
                    title: 'On Target!',
                    description: 'Your average pitch is within your target range. Great progress!',
                    action: 'Focus on consistency and naturalness.'
                });
            }
        }
        
        // Stability insight
        if (metrics.pitchStability < 0.6 && metrics.totalSessions >= 3) {
            insights.push({
                type: 'suggestion',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
                title: 'Improve Stability',
                description: 'Your pitch varies quite a bit during practice. This is common when learning.',
                action: 'Try sustained vowel exercises to build control.'
            });
        } else if (metrics.stabilityTrend === 'up') {
            insights.push({
                type: 'success',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
                title: 'Stability Improving',
                description: 'Your pitch control is getting better over time!',
                action: null
            });
        }
        
        // Practice frequency insight
        if (metrics.weeklySessionCount < 3) {
            insights.push({
                type: 'reminder',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
                title: 'Practice Reminder',
                description: 'Consistent practice helps build muscle memory. Even 5-10 minutes daily makes a difference.',
                action: 'Aim for 3-5 sessions per week.'
            });
        }
        
        return insights.slice(0, 3); // Limit to 3 insights
    }
    
    /**
     * Render a session history item
     */
    renderSessionItem(session) {
        const date = new Date(session.startTime);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const duration = Math.round((session.duration || 0) / 60);
        
        return `
            <div class="session-item">
                <div class="session-date">
                    <span class="date">${dateStr}</span>
                    <span class="time">${timeStr}</span>
                </div>
                <div class="session-stats">
                    <span class="session-pitch">${Math.round(session.avgPitch || 0)} Hz avg</span>
                    <span class="session-duration">${duration} min</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Avatar upload button
        const uploadBtn = this.container.querySelector('#uploadAvatarBtn');
        const fileInput = this.container.querySelector('#avatarFileInput');
        
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }
    }
    
    /**
     * Handle avatar image upload
     */
    async handleAvatarUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('Image must be less than 2MB.');
            return;
        }
        
        try {
            // Convert to base64 data URL
            const dataUrl = await this.fileToDataUrl(file);
            
            // Resize if needed
            const resizedUrl = await this.resizeImage(dataUrl, 200, 200);
            
            // Save to storage
            await put(STORES.METADATA, {
                key: 'profileImage',
                data: resizedUrl,
                updatedAt: Date.now()
            });
            
            this.profileImageUrl = resizedUrl;
            
            // Update avatar display
            const avatarEl = this.container.querySelector('.profile-avatar');
            if (avatarEl) {
                const imgEl = avatarEl.querySelector('.avatar-image');
                const initialEl = avatarEl.querySelector('.avatar-initial');
                
                if (imgEl) {
                    imgEl.src = resizedUrl;
                } else if (initialEl) {
                    initialEl.outerHTML = `<img src="${resizedUrl}" alt="Profile" class="avatar-image"/>`;
                }
            }
            
        } catch (err) {
            console.error('[ProfileScreen] Failed to upload avatar:', err);
            alert('Failed to upload image. Please try again.');
        }
    }
    
    /**
     * Convert file to data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Resize image to max dimensions
     */
    resizeImage(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataUrl;
        });
    }
    
    /**
     * Update live metrics during training (throttled)
     */
    updateLiveMetrics(data) {
        // Only update specific elements without full re-render
        // This prevents lag during live training
    }
}

// Singleton instance
let profileScreenInstance = null;

/**
 * Get or create the profile screen instance
 */
export function getProfileScreen() {
    if (!profileScreenInstance) {
        profileScreenInstance = new ProfileScreen();
    }
    return profileScreenInstance;
}

export default ProfileScreen;
