// Aria Voice Studio - Service Worker Manager
// Extracted from app.js for modular architecture

// Debug configuration
const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function debugLog(category, ...args) {
    if (DEBUG) {
        console.log(`[${category}]`, ...args);
    }
}

/**
 * Show update notification when new service worker is waiting
 * @param {ServiceWorkerRegistration} registration
 */
export function showUpdateNotification(registration) {
    // Don't show if already showing
    if (document.getElementById('swUpdateNotification')) {
        return;
    }
    
    const notification = document.createElement('div');
    notification.id = 'swUpdateNotification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #5bcefa, #f5a9b8);
        color: #000;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        max-width: 90%;
        animation: slideUp 0.3s ease;
    `;
    
    notification.innerHTML = `
        <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 4px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> A new version of Aria is available!</span>
        <button id="swUpdateBtn" style="
            background: #000;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
        ">Update Now</button>
        <button id="swDismissBtn" style="
            background: transparent;
            border: none;
            color: #000;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            opacity: 0.7;
        ">×</button>
    `;
    
    // Add animation keyframes
    if (!document.getElementById('swUpdateStyles')) {
        const style = document.createElement('style');
        style.id = 'swUpdateStyles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Handle update button click
    document.getElementById('swUpdateBtn').addEventListener('click', () => {
        if (registration.waiting) {
            // Tell waiting SW to skip waiting and activate
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        notification.remove();
    });
    
    // Handle dismiss button click
    document.getElementById('swDismissBtn').addEventListener('click', () => {
        notification.remove();
    });
    
    debugLog('SW', 'Update notification shown');
}

/**
 * Track service worker state changes to detect when update is ready
 * @param {ServiceWorkerRegistration} registration
 */
export function trackServiceWorkerState(registration) {
    // Check for waiting worker immediately
    if (registration.waiting) {
        showUpdateNotification(registration);
        return;
    }
    
    // Listen for new installing worker
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        debugLog('SW', 'New service worker installing...');
        
        // Track state changes of the new worker
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New worker installed and there's an existing controller
                // This means an update is available
                showUpdateNotification(registration);
            }
        });
    });
}

/**
 * Register the service worker and set up update tracking
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Try different paths for GitHub Pages compatibility
            const possiblePaths = [
                '/AriaVoiceStudio/service-worker.js',
                '/service-worker.js',
                './service-worker.js',
                new URL('/service-worker.js', window.location.origin).href
            ];
            let reg = null;
            let lastError = null;

            for (const path of possiblePaths) {
                try {
                    reg = await navigator.serviceWorker.register(path);
                    debugLog('App', 'Service worker registered:', reg.scope, 'path:', path);
                    break;
                } catch (err) {
                    lastError = err;
                    debugLog('App', `Failed to register SW at ${path}:`, err.message);
                    continue;
                }
            }

            if (!reg && lastError) {
                throw lastError;
            }
            
            // Track for updates
            trackServiceWorkerState(reg);
            
            // Listen for controller change (when skipWaiting is called)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                debugLog('SW', 'Controller changed, reloading...');
                // Reload to get the new version
                window.location.reload();
            });
            
            return reg;
        } catch (err) {
            console.error('[App] Service worker registration failed:', err);
            // Don't throw error, just return null to allow app to continue
            return null;
        }
    }
    return null;
}

export default {
    registerServiceWorker,
    showUpdateNotification,
    trackServiceWorkerState
};
