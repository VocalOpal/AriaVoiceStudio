// Aria Voice Studio - Exercise Definitions
// Data-driven exercise configurations - add exercises here, not in code

import { 
    InputTypes, 
    SkillFocus, 
    VoiceGoals, 
    DifficultyLevels,
    ExerciseCategories 
} from './exerciseTypes.js';

/**
 * Exercise Definition Schema:
 * {
 *   id: string,                    // Unique identifier
 *   title: string,                 // Display name
 *   description: string,           // User-facing description
 *   instructions: string[],        // Step-by-step instructions
 *   category: ExerciseCategory,    // Category for organization
 *   goals: VoiceGoal[],           // Which voice goals this supports
 *   skills: SkillFocus[],         // Skills this exercise develops
 *   inputType: InputType,          // What the user does
 *   difficulty: DifficultyLevel,   // Base difficulty
 *   duration: number,              // Base duration in seconds
 *   repetitions: number,           // Number of reps
 *   restBetweenReps: number,       // Rest in seconds
 *   thresholds: {                  // Success/failure criteria
 *     pitchTarget?: number | [number, number],
 *     pitchTolerance?: number,
 *     stabilityMinimum?: number,
 *     durationMinimum?: number,
 *     successRate?: number
 *   },
 *   feedback: {                    // Real-time feedback rules
 *     onSuccess?: string,
 *     onPitchHigh?: string,
 *     onPitchLow?: string,
 *     onUnstable?: string,
 *     onComplete?: string
 *   },
 *   adaptiveRules?: {              // Adaptive difficulty rules
 *     increaseOn?: string,
 *     decreaseOn?: string,
 *     adjustments?: object
 *   },
 *   unlockRequirements?: {         // When this exercise unlocks
 *     completedExercises?: string[],
 *     minSessions?: number,
 *     minStreak?: number
 *   }
 * }
 */

export const exerciseDefinitions = [
    // ============================================
    // WARM-UP EXERCISES
    // ============================================
    {
        id: 'warmup-breathing',
        title: 'Diaphragmatic Breathing',
        description: 'Foundation breathing exercise to prepare your voice',
        instructions: [
            'Sit or stand comfortably with relaxed shoulders',
            'Place one hand on your chest, one on your belly',
            'Breathe in slowly through your nose for 4 counts',
            'Feel your belly expand (not your chest)',
            'Exhale slowly through pursed lips for 6 counts',
            'Repeat for each cycle'
        ],
        category: ExerciseCategories.WARMUP,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.BREATH_CONTROL],
        inputType: InputTypes.BREATHING,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 10,
        repetitions: 5,
        restBetweenReps: 2,
        thresholds: {
            durationMinimum: 8
        },
        feedback: {
            onSuccess: 'Great breath support!',
            onComplete: 'Breathing exercise complete. Your voice is ready.'
        }
    },
    
    {
        id: 'warmup-humming',
        title: 'Gentle Humming',
        description: 'Wake up your vocal cords with gentle humming',
        instructions: [
            'Close your lips gently',
            'Hum at a comfortable pitch',
            'Feel the vibration in your lips and nose',
            'Keep the sound steady and relaxed',
            'Breathe when needed, then continue'
        ],
        category: ExerciseCategories.WARMUP,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.PITCH_STABILITY, SkillFocus.RESONANCE],
        inputType: InputTypes.HUMMING,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 8,
        repetitions: 4,
        restBetweenReps: 3,
        thresholds: {
            stabilityMinimum: 0.5,
            durationMinimum: 5
        },
        feedback: {
            onSuccess: 'Nice steady hum!',
            onUnstable: 'Try to keep the pitch steady',
            onComplete: 'Vocal cords warmed up!'
        }
    },
    
    {
        id: 'warmup-lip-trills',
        title: 'Lip Trills',
        description: 'Relax facial muscles and warm up with lip trills',
        instructions: [
            'Relax your lips completely',
            'Blow air through closed lips to create a "brrr" sound',
            'Add voice to create a buzzing lip trill',
            'Glide up and down gently in pitch',
            'Keep your jaw relaxed'
        ],
        category: ExerciseCategories.WARMUP,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.BREATH_CONTROL, SkillFocus.PITCH_RANGE],
        inputType: InputTypes.SIRENS,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 10,
        repetitions: 4,
        restBetweenReps: 3,
        thresholds: {
            durationMinimum: 6
        },
        feedback: {
            onSuccess: 'Great lip trill!',
            onComplete: 'Face muscles relaxed and ready!'
        }
    },
    
    // ============================================
    // PITCH TRAINING EXERCISES
    // ============================================
    {
        id: 'pitch-sustain-comfortable',
        title: 'Sustained Pitch - Comfortable',
        description: 'Hold a steady pitch at your comfortable speaking level',
        instructions: [
            'Take a breath',
            'Produce an "ah" sound at your natural speaking pitch',
            'Hold the note as steady as possible',
            'Focus on consistent airflow',
            'Aim for the target duration'
        ],
        category: ExerciseCategories.PITCH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.PITCH_STABILITY],
        inputType: InputTypes.SUSTAIN,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 5,
        repetitions: 5,
        restBetweenReps: 3,
        thresholds: {
            stabilityMinimum: 0.6,
            durationMinimum: 3,
            successRate: 0.7
        },
        feedback: {
            onSuccess: 'Excellent stability!',
            onUnstable: 'Focus on steady breath support',
            onComplete: 'Great work on pitch control!'
        },
        adaptiveRules: {
            increaseOn: 'consecutiveSuccess >= 3',
            decreaseOn: 'consecutiveFail >= 2',
            adjustments: {
                duration: { increase: 1, decrease: -1, min: 3, max: 10 },
                stabilityMinimum: { increase: 0.05, decrease: -0.05, min: 0.5, max: 0.9 }
            }
        }
    },
    
    {
        id: 'pitch-sustain-target',
        title: 'Sustained Pitch - Target Range',
        description: 'Hold a steady pitch within your target range',
        instructions: [
            'Look at your target pitch range',
            'Take a breath',
            'Produce an "ah" sound within the green zone',
            'Hold the note steady',
            'Watch the visual feedback to stay in range'
        ],
        category: ExerciseCategories.PITCH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.PITCH_STABILITY, SkillFocus.PITCH_RANGE],
        inputType: InputTypes.SUSTAIN,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 5,
        repetitions: 6,
        restBetweenReps: 4,
        thresholds: {
            pitchTarget: 'userTargetRange',  // Uses user's configured range
            pitchTolerance: 20,
            stabilityMinimum: 0.65,
            durationMinimum: 3,
            successRate: 0.75
        },
        feedback: {
            onSuccess: 'Right in the target!',
            onPitchHigh: 'A bit high - relax down slightly',
            onPitchLow: 'Try raising your pitch a bit',
            onUnstable: 'Focus on keeping the pitch steady',
            onComplete: 'Excellent target practice!'
        },
        adaptiveRules: {
            increaseOn: 'consecutiveSuccess >= 3',
            decreaseOn: 'consecutiveFail >= 2',
            adjustments: {
                pitchTolerance: { increase: -3, decrease: 5, min: 10, max: 30 },
                duration: { increase: 1, decrease: -1, min: 3, max: 8 }
            }
        }
    },
    
    {
        id: 'pitch-glide-up',
        title: 'Pitch Glide Up',
        description: 'Smoothly glide from low to high pitch',
        instructions: [
            'Start at a comfortable low pitch',
            'Slowly glide upward like a siren',
            'Keep the transition smooth - no jumps',
            'Reach your comfortable high range',
            'Maintain consistent volume'
        ],
        category: ExerciseCategories.PITCH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.PITCH_RANGE, SkillFocus.REGISTER_CONTROL],
        inputType: InputTypes.GLIDE,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 6,
        repetitions: 4,
        restBetweenReps: 5,
        thresholds: {
            durationMinimum: 4,
            successRate: 0.7
        },
        feedback: {
            onSuccess: 'Smooth glide!',
            onUnstable: 'Try to keep the glide smooth, no jumps',
            onComplete: 'Great range exploration!'
        }
    },
    
    {
        id: 'pitch-glide-down',
        title: 'Pitch Glide Down',
        description: 'Smoothly glide from high to low pitch',
        instructions: [
            'Start at a comfortable high pitch',
            'Slowly glide downward like a descending siren',
            'Keep the transition smooth',
            'Reach your comfortable low range',
            'Control the descent with breath support'
        ],
        category: ExerciseCategories.PITCH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.PITCH_RANGE, SkillFocus.REGISTER_CONTROL],
        inputType: InputTypes.GLIDE,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 6,
        repetitions: 4,
        restBetweenReps: 5,
        thresholds: {
            durationMinimum: 4,
            successRate: 0.7
        },
        feedback: {
            onSuccess: 'Controlled descent!',
            onComplete: 'Excellent downward control!'
        }
    },
    
    // ============================================
    // RESONANCE EXERCISES
    // ============================================
    {
        id: 'resonance-bright-forward',
        title: 'Bright Forward Resonance',
        description: 'Practice placing your voice in the front of your face',
        instructions: [
            'Say "nee nee nee" feeling the buzz in your nose',
            'Now sustain "eeee" keeping that forward placement',
            'Imagine the sound coming from behind your nose',
            'Keep your soft palate raised',
            'Feel the vibration in your face, not throat'
        ],
        category: ExerciseCategories.RESONANCE,
        goals: [VoiceGoals.HIGHER, VoiceGoals.MID],
        skills: [SkillFocus.RESONANCE, SkillFocus.FORMANT_SHAPING],
        inputType: InputTypes.SUSTAIN,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 5,
        repetitions: 5,
        restBetweenReps: 4,
        thresholds: {
            stabilityMinimum: 0.6,
            durationMinimum: 3
        },
        feedback: {
            onSuccess: 'Great forward placement!',
            onComplete: 'Resonance practice complete!'
        }
    },
    
    {
        id: 'resonance-chest-voice',
        title: 'Chest Resonance',
        description: 'Develop rich chest voice resonance',
        instructions: [
            'Place your hand on your chest',
            'Say "mah mah mah" feeling chest vibration',
            'Sustain "ahhh" with chest resonance',
            'Feel the sound originating from your chest',
            'Keep your larynx relaxed and low'
        ],
        category: ExerciseCategories.RESONANCE,
        goals: [VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.RESONANCE, SkillFocus.VOCAL_WEIGHT],
        inputType: InputTypes.SUSTAIN,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 5,
        repetitions: 5,
        restBetweenReps: 4,
        thresholds: {
            stabilityMinimum: 0.6,
            durationMinimum: 3
        },
        feedback: {
            onSuccess: 'Great chest resonance!',
            onComplete: 'Chest voice developed!'
        }
    },
    
    // ============================================
    // SPEECH PRACTICE EXERCISES
    // ============================================
    {
        id: 'speech-sentences-target',
        title: 'Sentence Practice - Target Pitch',
        description: 'Practice natural sentences at your target pitch',
        instructions: [
            'Read the sentence displayed',
            'Speak at your target pitch range',
            'Focus on natural intonation',
            'Maintain the pitch throughout the sentence',
            'Review your average pitch after each sentence'
        ],
        category: ExerciseCategories.SPEECH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.PITCH_STABILITY, SkillFocus.INTONATION],
        inputType: InputTypes.SPEECH,
        difficulty: DifficultyLevels.INTERMEDIATE,
        duration: 8,
        repetitions: 5,
        restBetweenReps: 5,
        thresholds: {
            pitchTarget: 'userTargetRange',
            pitchTolerance: 25,
            successRate: 0.7
        },
        feedback: {
            onSuccess: 'Great natural speech!',
            onPitchHigh: 'Try speaking slightly lower',
            onPitchLow: 'Try lifting your pitch a bit',
            onComplete: 'Excellent speech practice!'
        },
        sentences: [
            "Hello, my name is...",
            "How are you doing today?",
            "I'd like to order a coffee, please.",
            "The weather is really nice today.",
            "What time does the store close?",
            "Thank you so much for your help.",
            "I'm looking forward to seeing you.",
            "Could you repeat that please?"
        ],
        unlockRequirements: {
            completedExercises: ['pitch-sustain-target'],
            minSessions: 3
        }
    },
    
    {
        id: 'speech-reading-passage',
        title: 'Reading Passage',
        description: 'Read a longer passage while maintaining target pitch',
        instructions: [
            'Read the passage at a natural pace',
            'Maintain your target pitch throughout',
            'Focus on breath support between phrases',
            'Keep natural expression and intonation',
            'Don\'t rush - quality over speed'
        ],
        category: ExerciseCategories.SPEECH,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID],
        skills: [SkillFocus.PITCH_STABILITY, SkillFocus.INTONATION, SkillFocus.BREATH_CONTROL],
        inputType: InputTypes.SPEECH,
        difficulty: DifficultyLevels.ADVANCED,
        duration: 30,
        repetitions: 1,
        restBetweenReps: 10,
        thresholds: {
            pitchTarget: 'userTargetRange',
            pitchTolerance: 30,
            successRate: 0.65
        },
        feedback: {
            onSuccess: 'Excellent sustained speech!',
            onComplete: 'Reading practice complete!'
        },
        unlockRequirements: {
            completedExercises: ['speech-sentences-target'],
            minSessions: 5
        }
    },
    
    // ============================================
    // COOL-DOWN EXERCISES
    // ============================================
    {
        id: 'cooldown-gentle-sirens',
        title: 'Gentle Sirens',
        description: 'Cool down with gentle pitch glides',
        instructions: [
            'Gently glide up and down in pitch',
            'Use a comfortable, small range',
            'Keep the volume soft',
            'Focus on relaxing your throat',
            'Breathe naturally between glides'
        ],
        category: ExerciseCategories.COOLDOWN,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.PITCH_RANGE],
        inputType: InputTypes.SIRENS,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 8,
        repetitions: 3,
        restBetweenReps: 4,
        thresholds: {
            durationMinimum: 5
        },
        feedback: {
            onComplete: 'Voice cooled down gently.'
        }
    },
    
    {
        id: 'cooldown-yawn-sigh',
        title: 'Yawn-Sigh',
        description: 'Release tension with yawn-sigh technique',
        instructions: [
            'Inhale as if starting a yawn',
            'Feel your throat open wide',
            'Release with a gentle "hahhh" sigh',
            'Let the pitch naturally fall',
            'Feel the relaxation in your throat'
        ],
        category: ExerciseCategories.COOLDOWN,
        goals: [VoiceGoals.HIGHER, VoiceGoals.LOWER, VoiceGoals.MID, VoiceGoals.NEUTRAL],
        skills: [SkillFocus.BREATH_CONTROL],
        inputType: InputTypes.BREATHING,
        difficulty: DifficultyLevels.BEGINNER,
        duration: 6,
        repetitions: 4,
        restBetweenReps: 3,
        thresholds: {
            durationMinimum: 4
        },
        feedback: {
            onComplete: 'Throat relaxed and voice rested!'
        }
    }
];

/**
 * Get exercises filtered by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered exercises
 */
export function getExercises(filters = {}) {
    let results = [...exerciseDefinitions];
    
    if (filters.category) {
        results = results.filter(ex => ex.category.id === filters.category);
    }
    
    if (filters.goal) {
        results = results.filter(ex => ex.goals.some(g => g === filters.goal));
    }
    
    if (filters.skill) {
        results = results.filter(ex => ex.skills.includes(filters.skill));
    }
    
    if (filters.difficulty) {
        results = results.filter(ex => ex.difficulty.id === filters.difficulty);
    }
    
    if (filters.inputType) {
        results = results.filter(ex => ex.inputType === filters.inputType);
    }
    
    return results;
}

/**
 * Get an exercise by ID
 * @param {string} id - Exercise ID
 * @returns {Object|null} Exercise definition
 */
export function getExerciseById(id) {
    return exerciseDefinitions.find(ex => ex.id === id) || null;
}

/**
 * Get exercises organized by category
 * @param {string} [goal] - Optional goal filter
 * @returns {Object} Exercises grouped by category
 */
export function getExercisesByCategory(goal = null) {
    const byCategory = {};
    
    for (const category of Object.values(ExerciseCategories)) {
        byCategory[category.id] = getExercises({ 
            category: category.id,
            goal: goal 
        });
    }
    
    return byCategory;
}

export default exerciseDefinitions;
