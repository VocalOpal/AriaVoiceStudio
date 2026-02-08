# Aria Voice Studio

A voice training app I'm building for myself and anyone else who needs it. I'm trans and I wanted something that actually respects my privacy — no accounts, no servers, no data leaving my device. Just open it and train.

It's a PWA so it works offline, installs like a native app, and runs in any modern browser.

**[Try it live](https://vocalopal.github.io/AriaVoiceStudio/)**

## What It Does

- **Real-time pitch detection** — uses an AudioWorklet for low-latency analysis while you speak or sing
- **Target range tracking** — set your goal pitch range, see how much time you spend in it
- **Vocal exercises** — 13 guided exercises across warm-up, pitch training, resonance, speech practice, and cool-down
- **Voice snapshots** — record short clips over time to hear your own progress
- **Streak & achievements** — keeps you coming back, shows you how far you've come
- **Vocal health monitoring** — strain detection, break reminders, hydration nudges
- **Progress stats** — session history, trends, averages
- **Profile system** — custom avatar, pitch presets, sensitivity tuning
- **Data export/import** — your data, your backups, your control
- **Onboarding** — walks new users through setup instead of just dropping them in
- **Dark/light theme** — because obviously

## Privacy

Everything stays on your device. Period.

All data lives in IndexedDB. There's no backend, no analytics, no tracking, no accounts. Your voice data never touches a server. I built this for people like me who don't want some company listening to their voice training sessions.

## Running It Locally

```bash
git clone https://github.com/VocalOpal/AriaVoiceStudio.git
cd AriaVoiceStudio

# any local server works
python -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080` and allow mic access when prompted.

## Project Structure

```
├── index.html
├── service-worker.js
├── manifest.json
├── css/
│   ├── base.css, layout.css, screens.css
│   ├── journey.css, snapshots.css, sidebar.css
│   ├── modals.css, exercises.css
│   └── onboarding.css, tutorial.css
├── js/
│   ├── app.js                  # Main orchestration (~1,300 lines)
│   ├── core/                   # Events, storage, session management
│   ├── state/                  # Centralized state manager
│   ├── audio/                  # AudioWorklet pitch detection
│   ├── ui/                     # Navigation, toast, screen modules
│   ├── utils/                  # Validation, error boundaries, formatters
│   ├── services/               # Service worker, settings service
│   └── features/
│       ├── achievements/       # Streaks, milestones, badges
│       ├── modals/             # Streak calendar, help/support
│       ├── onboarding/         # Setup flow, tutorial
│       ├── profile/            # Profile modal, avatar manager
│       ├── progress/           # Stats dashboard
│       ├── settings/           # Settings UI, data export/import
│       ├── snapshots/          # Voice recording & playback
│       ├── vocal-exercises/    # Exercise engine & definitions
│       └── vocal-health/       # Health monitoring
└── icons/
```

## How It Works

The pitch detection runs through an AudioWorklet processor — it does autocorrelation with parabolic interpolation to get sub-sample accuracy. The audio never gets recorded or stored during training, it's just analyzed in real-time and thrown away.

The app uses an event bus for cross-module communication, a state manager for shared state, and a callback pattern for module isolation. Each feature module is self-contained and doesn't import from app.js.

There's error boundaries on all async ops, input validation on forms, focus trapping on modals for accessibility, and a memory leak detector that runs in dev mode.

## Browser Support

Works in Chrome, Edge, Firefox, and Safari (iOS 14.5+). You need a browser that supports AudioWorklet and getUserMedia. Mobile works fine — the whole thing is responsive.

## Installing

It's a PWA, so you can install it:
1. Open it in your browser
2. Hit the install button in the address bar
3. Done — works offline after that

## Contributing

This is a personal project but I'm open to feedback, bug reports, and feature ideas. Feel free to open an issue.

## License

MIT — do whatever you want with it.

---

Built for the voice training community. Stay hydrated. 💙🩷🤍🩷💙
