import { put, get, getAll, getByIndex, remove, STORES } from './storage.js';
import { events, EventTypes } from './events.js';

// Debug configuration
const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Debug logging function
function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

// Constants

export const SessionState = {
    IDLE: 'idle',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ENDED: 'ended'
};

const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const MAX_SESSION_HISTORY = 100;
const RECOVERY_KEY = 'sessionRecovery';

export class Session {
    constructor({ profileId, goalRange, type = 'training' }) {
        this.id = crypto.randomUUID();
        this.profileId = profileId;
        this.type = type;
        this.goalRange = goalRange;
        this.startTime = new Date().toISOString();
        this.endTime = null;
        this.state = SessionState.ACTIVE;

        // Statistics
        this.durationSeconds = 0;
        this.sampleCount = 0;
        this.pitchSum = 0;
        this.pitchSumSquared = 0;
        this.minPitch = Infinity;
        this.maxPitch = -Infinity;
        this.timeInRangeSeconds = 0;
        this.speakingTimeSeconds = 0;

        // Health metrics
        this.jitterSamples = [];
        this.shimmerSamples = [];
        this.hnrSamples = [];

        // Timing
        this._lastUpdateTime = Date.now();
        this._pauseStartTime = null;
        this._totalPausedTime = 0;
    }

    update(metrics, deltaTime = 0.1) {
        if (this.state !== SessionState.ACTIVE) return;

        const now = Date.now();
        const actualDelta = this._lastUpdateTime
            ? (now - this._lastUpdateTime) / 1000
            : deltaTime;
        this._lastUpdateTime = now;

        // Update duration
        this.durationSeconds += actualDelta;

        // Update speaking time if voice detected
        if (metrics.isSpeaking) {
            this.speakingTimeSeconds += actualDelta;
        }

        // Update pitch statistics
        if (metrics.pitch && metrics.pitch > 0) {
            this.sampleCount++;
            this.pitchSum += metrics.pitch;
            this.pitchSumSquared += metrics.pitch * metrics.pitch;
            this.minPitch = Math.min(this.minPitch, metrics.pitch);
            this.maxPitch = Math.max(this.maxPitch, metrics.pitch);

            // Check if in target range
            if (metrics.pitch >= this.goalRange[0] && metrics.pitch <= this.goalRange[1]) {
                this.timeInRangeSeconds += actualDelta;
            }
        }

        // Update health metrics
        if (metrics.jitter !== undefined) {
            this.jitterSamples.push(metrics.jitter);
        }
        if (metrics.shimmer !== undefined) {
            this.shimmerSamples.push(metrics.shimmer);
        }
        if (metrics.hnr !== undefined) {
            this.hnrSamples.push(metrics.hnr);
        }
    }

    pause() {
        if (this.state !== SessionState.ACTIVE) return;
        this.state = SessionState.PAUSED;
        this._pauseStartTime = Date.now();
    }

    resume() {
        if (this.state !== SessionState.PAUSED) return;
        this.state = SessionState.ACTIVE;

        if (this._pauseStartTime) {
            this._totalPausedTime += Date.now() - this._pauseStartTime;
            this._pauseStartTime = null;
        }

        this._lastUpdateTime = Date.now();
    }

    end() {
        this.state = SessionState.ENDED;
        this.endTime = new Date().toISOString();

        return this.getSummary();
    }

    getSummary() {
        const avgPitch = this.sampleCount > 0
            ? this.pitchSum / this.sampleCount
            : 0;

        const variance = this.sampleCount > 1
            ? (this.pitchSumSquared - (this.pitchSum * this.pitchSum) / this.sampleCount) / (this.sampleCount - 1)
            : 0;

        const stdDev = Math.sqrt(Math.max(0, variance));
        const pitchStability = avgPitch > 0 ? (1 - stdDev / avgPitch) * 100 : 0;

        const timeInRange = this.durationSeconds > 0
            ? (this.timeInRangeSeconds / this.durationSeconds) * 100
            : 0;

        const avgJitter = this._average(this.jitterSamples);
        const avgShimmer = this._average(this.shimmerSamples);
        const avgHnr = this._average(this.hnrSamples);

        return {
            id: this.id,
            profileId: this.profileId,
            type: this.type,
            startTime: this.startTime,
            endTime: this.endTime,
            durationSeconds: this.durationSeconds,
            sampleCount: this.sampleCount,
            avgPitch: Math.round(avgPitch),
            minPitch: this.minPitch === Infinity ? 0 : Math.round(this.minPitch),
            maxPitch: this.maxPitch === -Infinity ? 0 : Math.round(this.maxPitch),
            pitchStability: Math.round(pitchStability * 100) / 100,
            timeInRange: Math.round(timeInRange * 100) / 100,
            jitter: Math.round(avgJitter * 1000) / 1000,
            shimmer: Math.round(avgShimmer * 1000) / 1000,
            hnr: Math.round(avgHnr * 10) / 10
        };
    }

    toJSON() {
        return this.getSummary();
    }

    _average(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

class SessionManager {
    constructor() {
        this._currentSession = null;
        this._autosaveInterval = null;
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return null;

        this._initialized = true;

        // Check for recoverable session
        const recovery = await this._checkRecovery();
        if (recovery) {
            events.emit(EventTypes.SESSION_RECOVERED, recovery);
            return recovery;
        }

        return null;
    }

    async startSession({ profileId, goalRange, type = 'training' }) {
        // End any existing session
        if (this._currentSession) {
            await this.endSession();
        }

        // Create new session
        this._currentSession = new Session({ profileId, goalRange, type });

        // Start autosave
        this._startAutosave();

        // Save recovery data
        await this._saveRecovery();

        // Emit start event
        events.emit(EventTypes.SESSION_START, {
            sessionId: this._currentSession.id,
            profileId,
            goalRange,
            type
        });

        debugLog('SessionManager', 'Session started:', this._currentSession.id);

        return this._currentSession;
    }

    updateSession(metrics) {
        if (!this._currentSession) return;

        this._currentSession.update(metrics);

        // Emit periodic update events (throttled)
        if (this._currentSession.sampleCount % 10 === 0) {
            events.emit(EventTypes.SESSION_UPDATE, this._currentSession.getSummary());
        }
    }

    pauseSession() {
        if (!this._currentSession) return;

        this._currentSession.pause();
        this._stopAutosave();

        events.emit(EventTypes.TRAINING_PAUSE, {
            sessionId: this._currentSession.id
        });
    }

    resumeSession() {
        if (!this._currentSession) return;

        this._currentSession.resume();
        this._startAutosave();

        events.emit(EventTypes.TRAINING_RESUME, {
            sessionId: this._currentSession.id
        });
    }

    async endSession() {
        if (!this._currentSession) {
            return null;
        }

        // Stop autosave
        this._stopAutosave();

        // End the session
        const summary = this._currentSession.end();

        // Save to storage
        await put(STORES.SESSIONS, summary);

        // Update streak
        await this._updateStreak(summary.profileId);

        // Clear recovery data
        await this._clearRecovery();

        // Emit end event
        events.emit(EventTypes.SESSION_END, summary);

        debugLog('SessionManager', 'Session ended:', summary.id);

        // Clear current session
        this._currentSession = null;

        return summary;
    }

    getCurrentSession() {
        return this._currentSession?.getSummary() || null;
    }

    isActive() {
        return this._currentSession?.state === SessionState.ACTIVE;
    }

    async getSessionHistory(profileId, limit = 50) {
        const sessions = await getByIndex(STORES.SESSIONS, 'profileId', profileId);

        // Sort by start time descending and limit
        return sessions
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit);
    }

    async getSessionsInRange(profileId, startDate, endDate) {
        const sessions = await getByIndex(STORES.SESSIONS, 'profileId', profileId);

        return sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= startDate && sessionDate <= endDate;
        });
    }

    async getTodaySessions(profileId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getSessionsInRange(profileId, today, tomorrow);
    }

    async getTotalPracticeTime(profileId) {
        const sessions = await getByIndex(STORES.SESSIONS, 'profileId', profileId);
        return sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    }

    async getStreakData(profileId) {
        const key = `streak_${profileId}`;
        const data = await get(STORES.SETTINGS, key);

        return data?.value || {
            currentStreak: 0,
            longestStreak: 0,
            lastSessionDate: null,
            streakHistory: []
        };
    }

    async deleteSession(sessionId) {
        await remove(STORES.SESSIONS, sessionId);
    }

    async pruneOldSessions(profileId, maxSessions = MAX_SESSION_HISTORY) {
        const sessions = await getByIndex(STORES.SESSIONS, 'profileId', profileId);

        if (sessions.length <= maxSessions) return;

        // Sort by date and get sessions to delete
        const sorted = sessions.sort((a, b) =>
            new Date(a.startTime) - new Date(b.startTime)
        );

        const toDelete = sorted.slice(0, sessions.length - maxSessions);

        // Delete old sessions
        await Promise.all(toDelete.map(session => remove(STORES.SESSIONS, session.id)));
    }

    // Private methods

    _startAutosave() {
        if (this._autosaveInterval) return;

        this._autosaveInterval = setInterval(() => {
            this._autosave();
        }, AUTOSAVE_INTERVAL);
    }

    _stopAutosave() {
        if (this._autosaveInterval) {
            clearInterval(this._autosaveInterval);
            this._autosaveInterval = null;
        }
    }

    async _autosave() {
        if (!this._currentSession) return;

        try {
            await put(STORES.SESSIONS, this._currentSession.getSummary());
        } catch (error) {
            console.error('[SessionManager] Autosave failed:', error);
        }
    }

    async _saveRecovery() {
        if (!this._currentSession) return;

        const recoveryData = {
            key: RECOVERY_KEY,
            value: {
                sessionId: this._currentSession.id,
                profileId: this._currentSession.profileId,
                goalRange: this._currentSession.goalRange,
                type: this._currentSession.type,
                startTime: this._currentSession.startTime,
                timestamp: Date.now()
            }
        };

        await put(STORES.SETTINGS, recoveryData);
    }

    async _checkRecovery() {
        try {
            const recovery = await get(STORES.SETTINGS, RECOVERY_KEY);
            
            if (!recovery?.value) return null;

            const { timestamp } = recovery.value;
            const now = Date.now();

            // Only recover if less than 1 hour old
            if (now - timestamp > 3600000) {
                await this._clearRecovery();
                return null;
            }

            return recovery.value;
        } catch (error) {
            console.error('[SessionManager] Recovery check failed:', error);
            return null;
        }
    }

    async _clearRecovery() {
        try {
            await remove(STORES.SETTINGS, RECOVERY_KEY);
        } catch (error) {
            console.error('[SessionManager] Error clearing recovery:', error);
        }
    }

    async _updateStreak(profileId) {
        const streakKey = `streak_${profileId}`;
        const existing = await get(STORES.SETTINGS, streakKey);
        const streakData = existing?.value || {
            currentStreak: 0,
            longestStreak: 0,
            lastSessionDate: null,
            streakHistory: []
        };

        const today = new Date().toISOString().split('T')[0];
        const lastDate = streakData.lastSessionDate;

        if (lastDate === today) {
            // Already practiced today, no streak change
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
            // Consecutive day - increment streak
            streakData.currentStreak++;
        } else if (lastDate) {
            // Streak broken - reset
            streakData.currentStreak = 1;
        } else {
            // First session ever
            streakData.currentStreak = 1;
        }

        // Update longest streak
        if (streakData.currentStreak > streakData.longestStreak) {
            streakData.longestStreak = streakData.currentStreak;
        }

        // Update last session date
        streakData.lastSessionDate = today;

        // Keep streak history (last 30 days)
        streakData.streakHistory.push({
            date: today,
            streak: streakData.currentStreak
        });
        if (streakData.streakHistory.length > 30) {
            streakData.streakHistory = streakData.streakHistory.slice(-30);
        }

        // Save
        await put(STORES.SETTINGS, { key: streakKey, value: streakData });

        // Emit streak update event
        events.emit(EventTypes.STREAK_UPDATE, {
            profileId,
            ...streakData
        });
    }
}

export const sessionManager = new SessionManager();
export default sessionManager;
