# Aria Voice Studio PWA 🎤

A personal voice training app I built as a trans person exploring my voice journey. This privacy-first Progressive Web App helps with vocal training through real-time pitch analysis and progress tracking.

## ✨ Features

### Core Voice Training
- **Real-time Pitch Analysis**: Advanced autocorrelation-based pitch detection
- **Vocal Health Monitoring**: Strain detection and break reminders
- **Progress Tracking**: Sessions, streaks, achievements, and detailed statistics
- **Customizable Profiles**: Personalized pitch ranges and sensitivity settings
- **Exercise Library**: Targeted vocal exercises with real-time feedback

### Technical Implementation
- **🛡️ Error Boundaries**: Graceful error handling with user-friendly notifications
- **🧠 Memory Management**: Automatic resource cleanup and leak detection
- **📊 Performance Monitoring**: Real-time FPS, memory, and processing time tracking
- **🔄 State Management**: Centralized state with subscription updates
- **✅ Input Validation**: XSS protection and data sanitization
- **🎯 Type Safety**: JSDoc annotations for better development experience

### PWA Features
- **Offline Support**: Works without internet after first load
- **Privacy-First**: All data stays on your device (IndexedDB storage)
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Installable**: Native app experience on supported devices

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/aria-voice-studio.git
cd aria-voice-studio

# Start the development server
python -m http.server 5731
# or
npx serve . -p 5731
```

Then open: http://localhost:5731

## 📁 Project Structure

```
Aria PWA/
├── index.html              # Main application
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support & caching
├── js/
│   ├── app.js              # Orchestration layer (~2.7k lines)
│   ├── core/               # Core infrastructure
│   │   ├── events.js       # Event bus system
│   │   ├── storage.js      # IndexedDB operations
│   │   └── sessionManager.js
│   ├── state/              # State management
│   │   └── stateManager.js # Centralized state
│   ├── audio/              # Audio processing
│   │   ├── pitch-processor.js  # AudioWorklet
│   │   └── index.js
│   ├── ui/                 # UI modules
│   │   ├── navigation.js   # Screen navigation & theme
│   │   └── toast.js        # Notifications
│   ├── utils/              # Utilities
│   │   ├── validation.js   # Input validation
│   │   ├── errorBoundary.js
│   │   ├── formatters.js
│   │   ├── memoryManager.js
│   │   └── performanceMonitor.js
│   ├── services/           # External services
│   │   └── serviceWorkerManager.js
│   └── features/           # Feature modules
│       └── vocal-exercises/
├── css/
│   └── styles.css
├── icons/
├── docs/
└── .github/workflows/
```

## 🏗️ How I Built It

### Performance & Memory
- **UI Throttling**: Limited to 10 updates/second to prevent CPU overload
- **Memory Monitoring**: Automatic leak detection every 30 seconds
- **Resource Management**: Systematic cleanup of audio contexts and streams
- **Performance Observer**: Long task detection and automatic optimization

### Error Handling
- **Error Boundary System**: Catches and handles all async operations gracefully
- **Safe Wrapper Functions**: All critical operations wrapped with error handling
- **User Notifications**: Friendly error messages instead of generic alerts
- **Browser Compatibility**: Graceful fallbacks for unsupported features

### State Management
- **Centralized State**: Single source of truth with subscription updates
- **Middleware Support**: Performance tracking and validation hooks
- **Atomic Updates**: Prevents race conditions and inconsistent state
- **Cleanup Tasks**: Automatic subscription management

### Security & Validation
- **Input Sanitization**: XSS protection and HTML filtering
- **Form Validation**: Comprehensive validation with detailed error reporting
- **File Security**: Size and type checking for data imports
- **Type Safety**: JSDoc annotations with runtime checking in development

## 🎯 What I've Implemented

### Memory Management
- ✅ Automatic resource cleanup for audio contexts and media streams
- ✅ Event listener management with automatic disposal
- ✅ Memory leak detection and prevention
- ✅ Resource size tracking and statistics

### Performance
- ✅ Real-time FPS monitoring (target: 60fps, minimum: 30fps)
- ✅ Memory usage tracking (alerts at 50MB+)
- ✅ Audio processing time monitoring (max: 10ms)
- ✅ Automatic performance optimizations

### Error Handling
- ✅ Comprehensive error boundaries for all async operations
- ✅ User-friendly error notifications
- ✅ Browser compatibility checks
- ✅ Graceful degradation for unsupported features

### Code Quality
- ✅ 3,500+ lines of well-documented JavaScript
- ✅ Comprehensive JSDoc type annotations
- ✅ Modular architecture with clear separation of concerns
- ✅ Robust error handling and logging

## 🛠️ Development

### Getting Started
- Modern web browser with Web Audio API support
- Local development server (Python, Node.js, or similar)

### Development Tools I Built In
- **Runtime Type Checking**: Enabled in localhost development
- **Performance Monitoring**: Real-time metrics and health reporting
- **Memory Statistics**: Detailed resource usage tracking
- **Error Logging**: Comprehensive error reporting in console

### My Approach
- Modular ES6+ JavaScript with comprehensive JSDoc documentation
- Event-driven architecture with centralized state management
- Performance-first design with automatic optimizations
- Security-focused with input validation and sanitization

## 📊 Performance Metrics

The application includes built-in performance monitoring:

- **Target FPS**: 60fps (minimum: 30fps)
- **Memory Threshold**: 100MB (alerts at 50MB)
- **UI Update Limit**: 10 updates/second
- **Audio Processing**: <10ms per buffer
- **Memory Leak Detection**: Every 30 seconds

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally using IndexedDB
- **No Tracking**: No analytics or third-party tracking
- **Input Validation**: Comprehensive sanitization prevents XSS attacks
- **File Security**: Size limits and type checking for imports
- **Privacy-First**: Voice data never leaves your device

## 🌐 Browser Support

- **Chrome/Edge**: Full support with all features
- **Firefox**: Full support (may require microphone permission)
- **Safari**: Full support (iOS 14.5+, macOS 11+)
- **Mobile**: Responsive design works on all modern mobile browsers

## 📱 Installing the App

1. Open the app in a supported browser
2. Click the install icon in the address bar
3. Follow the installation prompts
4. App will be available offline with full functionality

## 🤝 Contributing

As a personal project, I'm not currently accepting contributions, but I'm happy to receive feedback and suggestions!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Web Audio API for real-time audio processing
- IndexedDB for local data persistence
- Progressive Web App standards for offline functionality
- Open source community for inspiration and tools

---

**Built with ❤️ for voice training and vocal health**
