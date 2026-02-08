// Aria Voice Studio - Tutorial Step Definitions

export const TUTORIAL_STEPS = [
    {
        id: 'start-training',
        selector: '#startBtn',
        title: 'Begin a Session',
        description: 'Tap here to start a live voice training session. Aria will track your pitch in real-time.',
        position: 'bottom'
    },
    {
        id: 'exercises',
        selector: '[data-screen="exercises"]',
        title: 'Guided Practice',
        description: 'Structured vocal exercises designed to help you reach your voice goals safely.',
        position: 'right'
    },
    {
        id: 'progress',
        selector: '[data-screen="progress"]',
        title: 'Track Your Growth',
        description: 'View charts and stats showing how your voice has changed over time.',
        position: 'right'
    },
    {
        id: 'snapshots',
        selector: '[data-screen="snapshots"]',
        title: 'Voice Snapshots',
        description: 'Capture and compare snapshots of your voice at different points in your journey.',
        position: 'right'
    },
    {
        id: 'health',
        selector: '[data-screen="health"]',
        title: 'Vocal Health',
        description: 'Monitor your vocal strain levels and get reminders to rest and hydrate.',
        position: 'right'
    },
    {
        id: 'journey',
        selector: '[data-screen="journey"]',
        title: 'Your Journey',
        description: 'See your milestones, achievements, and a timeline of your voice training story.',
        position: 'right'
    },
    {
        id: 'settings',
        selector: '[data-screen="settings"]',
        title: 'Settings',
        description: 'Customize your target range, notifications, theme, and training preferences.',
        position: 'right'
    },
    {
        id: 'streak',
        selector: '#streakCardBtn',
        title: 'Daily Streak',
        description: 'Track your training consistency. Practice daily to build your streak and stay motivated.',
        position: 'right'
    },
    {
        id: 'profile',
        selector: '#profileCardBtn',
        title: 'Voice Profile',
        description: 'Click here anytime to view and edit your profile, target range, and training preferences.',
        position: 'right'
    },
    {
        id: 'help',
        selector: '.help-hint',
        title: 'Need Help? Press ?',
        description: 'Access keyboard shortcuts, tips, and support anytime. You can also replay this tour from the help menu.',
        position: 'top'
    }
];
