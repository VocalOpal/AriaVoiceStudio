// Aria Voice Studio - Exercise Type Definitions
// Data-driven exercise type system

/**
 * Exercise input types - what the user does during the exercise
 */
export const InputTypes = {
    SUSTAIN: 'sustain',        // Hold a note
    GLIDE: 'glide',            // Slide between pitches
    REPEAT: 'repeat',          // Repeat a pattern
    SPEECH: 'speech',          // Natural speech
    BREATHING: 'breathing',    // Breath control (no vocalization)
    HUMMING: 'humming',        // Humming exercises
    SIRENS: 'sirens'           // Pitch sirens up/down
};

/**
 * Skill focus areas
 */
export const SkillFocus = {
    PITCH_STABILITY: 'pitch_stability',
    PITCH_RANGE: 'pitch_range',
    RESONANCE: 'resonance',
    BREATH_CONTROL: 'breath_control',
    INTONATION: 'intonation',
    REGISTER_CONTROL: 'register_control',
    VOCAL_WEIGHT: 'vocal_weight',
    FORMANT_SHAPING: 'formant_shaping'
};

/**
 * Voice goal targets
 */
export const VoiceGoals = {
    HIGHER: 'higher',
    LOWER: 'lower',
    MID: 'mid',
    NEUTRAL: 'neutral',
    CUSTOM: 'custom',
    // Aliases for backward compatibility with saved data
    FEMININE: 'higher',
    MASCULINE: 'lower',
    ANDROGYNOUS: 'mid'
};

/**
 * Difficulty levels
 */
export const DifficultyLevels = {
    BEGINNER: { id: 'beginner', label: 'Beginner', multiplier: 0.7 },
    INTERMEDIATE: { id: 'intermediate', label: 'Intermediate', multiplier: 1.0 },
    ADVANCED: { id: 'advanced', label: 'Advanced', multiplier: 1.3 }
};

/**
 * Exercise categories for organization
 */
export const ExerciseCategories = {
    WARMUP: { id: 'warmup', label: 'Warm-up', icon: '🔥', color: '#ff9800' },
    PITCH: { id: 'pitch', label: 'Pitch Training', icon: '🎵', color: '#5bcefa' },
    RESONANCE: { id: 'resonance', label: 'Resonance', icon: '🔊', color: '#f5a9b8' },
    BREATH: { id: 'breath', label: 'Breath Control', icon: '💨', color: '#4caf50' },
    SPEECH: { id: 'speech', label: 'Speech Practice', icon: '💬', color: '#9c27b0' },
    COOLDOWN: { id: 'cooldown', label: 'Cool-down', icon: '❄️', color: '#2196f3' }
};

/**
 * Feedback rule types for real-time guidance
 */
export const FeedbackRules = {
    PITCH_IN_RANGE: 'pitch_in_range',
    PITCH_ABOVE_TARGET: 'pitch_above_target',
    PITCH_BELOW_TARGET: 'pitch_below_target',
    STABILITY_GOOD: 'stability_good',
    STABILITY_POOR: 'stability_poor',
    RESONANCE_BRIGHT: 'resonance_bright',
    RESONANCE_DARK: 'resonance_dark',
    BREATH_SUPPORT: 'breath_support',
    REST_NEEDED: 'rest_needed'
};

/**
 * Default thresholds for exercise evaluation
 */
export const DefaultThresholds = {
    pitchTolerance: 15,          // Hz deviation allowed
    stabilityMinimum: 0.7,       // 0-1 stability score
    successRate: 0.8,            // 80% success to pass
    minimumDuration: 2,          // seconds to count as attempt
    restBetweenReps: 3,          // seconds between repetitions
    fatigueThreshold: 0.6,       // fatigue score triggering rest suggestion
    
    // Goal-specific defaults
    higher: {
        pitchMin: 165,
        pitchMax: 255,
        resonanceTarget: 'bright',
        formantF1Min: 400,
        formantF2Min: 2200
    },
    lower: {
        pitchMin: 85,
        pitchMax: 165,
        resonanceTarget: 'dark',
        formantF1Max: 500,
        formantF2Max: 1800
    },
    mid: {
        pitchMin: 130,
        pitchMax: 200,
        resonanceTarget: 'neutral',
        formantF1Min: 350,
        formantF2Min: 1800
    }
};

export default {
    InputTypes,
    SkillFocus,
    VoiceGoals,
    DifficultyLevels,
    ExerciseCategories,
    FeedbackRules,
    DefaultThresholds
};
