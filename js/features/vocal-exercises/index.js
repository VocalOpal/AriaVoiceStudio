// Aria Voice Studio - Vocal Exercises Feature
// Main entry point for the vocal exercise system

export * from './exerciseTypes.js';
export * from './exerciseDefinitions.js';
export * from './exerciseRunner.js';
export * from './exerciseManager.js';
export * from './exerciseUI.js';

// Re-export main utilities
export { getExerciseManager, initExerciseManager } from './exerciseManager.js';
export { ExerciseRunner } from './exerciseRunner.js';
export { getExercises, getExerciseById, getExercisesByCategory } from './exerciseDefinitions.js';

// Exercise UI exports
export { 
    initExerciseUI, 
    startExercise, 
    exitExerciseMode, 
    getCurrentExercise,
    isInExerciseMode,
    onTrainingStart,
    onTrainingStop,
    getExerciseTitle,
    getExerciseSubtitle
} from './exerciseUI.js';
