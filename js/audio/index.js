// Aria Voice Studio - Audio Module Index
// Central export for audio processing components

/**
 * Audio module provides:
 * - pitch-processor.js: AudioWorklet for real-time pitch detection
 * - voice-range-classifier.js: Voice range classification (lower/mid/higher)
 * - session-recorder.js: Session recording with statistics and export
 */

// Re-export voice range classifier
export { 
    VOICE_RANGES, 
    classifyPitch, 
    getTargetRange, 
    getDistanceToTarget,
    getRangeBoundaries,
    isInTargetRange 
} from './voice-range-classifier.js';

// Re-export session recorder
export { 
    SessionRecorder, 
    getSessionRecorder 
} from './session-recorder.js';

// Audio configuration
export const AUDIO_CONFIG = {
    bufferSize: 2048,
    minFrequency: 50,
    maxFrequency: 1000,
    minRMS: 0.01,
    confidenceThreshold: 0.5,
    sampleOverlap: 0.25,
    smoothing: 0.85
};
