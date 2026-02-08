# Changelog

All notable changes to Aria Voice Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.2.0] - 2026-02-07

### The Big Refactor

Everything in this app was crammed into one massive `app.js` (107KB) and one giant `styles.css` (83KB). It worked, but it was becoming impossible to maintain. This release is a full teardown and rebuild of the codebase — same features, completely different structure.

#### What Changed
All of these already existed but lived as giant blocks inside app.js. Now they're proper standalone modules:

- **Voice snapshots** → `js/features/snapshots/` — recording, playback, comparison, modal
- **Achievements & journey** → `js/features/achievements/` — streaks, milestones, badges, journey screen
- **Vocal health** → `js/features/vocal-health/` — strain grades, hydration reminders, recommendations
- **Progress stats** → `js/features/progress/` — session history, trends dashboard
- **Profile system** → `js/features/profile/` — avatar uploads, pitch presets, sensitivity, modal editor
- **Modals** → `js/features/modals/` — streak calendar, help/support tabs
- **Settings** → `js/features/settings/` — all settings UI, data export/import/clear
- **Onboarding** → `js/features/onboarding/` — setup flow, tutorial, goal selection

#### New Stuff
- **Onboarding flow** — new users actually get walked through setup now instead of being dropped into the app cold
- **Exercise list hooked up to real definitions** — replaced the old hardcoded 5-item list with the full 13-exercise system from `exerciseDefinitions.js`, with proper categories, durations, difficulty levels, and unlock requirements
- **Custom CSS editor** for tweaking the look
- **Onboarding & tutorial CSS** — dedicated stylesheets

#### CSS Overhaul
- Broke `styles.css` (83KB) into 10 focused files: `base.css`, `layout.css`, `screens.css`, `journey.css`, `snapshots.css`, `sidebar.css`, `modals.css`, `exercises.css`, `onboarding.css`, `tutorial.css`
- Each file handles one feature area instead of scrolling through thousands of lines

#### Architecture
- **app.js: 107KB → 47KB** — finally readable
- Every module uses a callback pattern so nothing reaches back into app.js
- Event bus for cross-module communication
- Dedicated state manager instead of scattered globals
- Memory leak detection in dev mode
- Error boundaries on all async operations
- Input validation and sanitization everywhere
- Focus trapping and keyboard nav for accessibility
- Cleaned up dead imports and unused functions
- Service worker cache bumped to v3

Honestly the app looks and works the same. But the codebase went from "please don't make me open app.js" to something I can actually navigate and build on.

---

## [2.1.0] - 2026-02-01

### Changed - Modular Architecture Refactor

Major refactoring of `app.js` to improve maintainability and reduce cognitive load.

#### Code Reduction
- **app.js**: Reduced from 3,960 to 2,686 lines (~32% reduction)
- Extracted zero-coupling utilities into dedicated modules
- Removed duplicate class implementations

#### New Modules Extracted
- `js/utils/validation.js` - Input validation and sanitization
- `js/utils/errorBoundary.js` - Error handling with user-friendly messages
- `js/utils/formatters.js` - Duration and data formatting utilities
- `js/ui/toast.js` - Toast notification system
- `js/ui/navigation.js` - Screen navigation and theme management
- `js/services/serviceWorkerManager.js` - Service worker registration and updates

#### Service Worker Updates
- Bumped cache version to v2
- Added all new modules to static cache for offline support
- Improved cache asset list coverage

#### Documentation
- Updated `docs/REFACTOR_ARCHITECTURE.md` with extraction progress
- Updated README with new project structure

## [2.0.0] - 2026-01-31

### Added - PWA Migration

This release migrates Aria Voice Studio from a Python desktop app to a Progressive Web App (PWA).

#### Core Features
- **Offline Support**: Full functionality without internet after initial load
- **Privacy-First**: All data stored locally in IndexedDB, never leaves device
- **Cross-Platform**: Works on any device with a modern browser
- **Installable**: Can be installed as a standalone app on desktop and mobile

#### Modules Ported from Python
- Session management with state machine and autosave
- Voice analysis (pitch detection, formant analysis, vocal quality)
- Achievement system with streaks, milestones, and badges
- Vocal health analyzer with grades and recommendations
- Safety monitoring with strain detection and break reminders
- Export to JSON/CSV formats
- Voice snapshots with audio recording and playback

#### New PWA-Specific Features
- Service Worker with multiple caching strategies
- IndexedDB storage with schema migrations
- AudioWorklet for low-latency audio processing
- Web Audio API for alerts and snapshot playback
- Stale-while-revalidate for seamless updates

#### DSP Improvements
- Multi-method pitch detection with validation
- Triple-confirmation safety alerts (reduces false positives)
- Confidence scoring for all measurements
- Parabolic interpolation for sub-sample pitch accuracy

#### Test Infrastructure
- Integration test suite (`/tests/integration.html`)
- Individual module test harnesses
- ESLint configuration
- GitHub Actions CI/CD

### Changed
- Audio processing moved from Python/NumPy to JavaScript
- Storage moved from JSON files to IndexedDB
- GUI moved from PyQt6 to vanilla HTML/CSS/JS

### Removed
- Python dependencies (no longer required)
- Desktop-only features (system tray, file dialogs)
- Server-side components (none existed, but now explicitly client-only)

## [1.0.0] - Previous

Original Python desktop application with PyQt6 GUI.

---

## Migration Notes

### For Users
- Export your data from the Python app before switching
- Import into PWA using Settings → Import Data
- See `migration/PWA_GUIDE.md` for installation instructions

### For Developers
- See `docs/ARCHITECTURE.md` for PWA structure
- See `docs/DEV_SETUP.md` for development environment
- See `migration/TODOs.md` for migration details
