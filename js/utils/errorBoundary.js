export class ErrorBoundary {
    static async withErrorHandling(operation, context = 'Operation', fallback = null) {
        try {
            return await operation();
        } catch (error) {
            console.error(`[ErrorBoundary] ${context} failed:`, error);
            
            const errorMessage = this.getUserFriendlyMessage(error);
            this.showErrorNotification(context, errorMessage);
            
            if (fallback) {
                try {
                    return await fallback();
                } catch (fallbackError) {
                    console.error(`[ErrorBoundary] Fallback for ${context} also failed:`, fallbackError);
                }
            }
            
            return null;
        }
    }
    
    static getUserFriendlyMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'Microphone access was denied. Please allow microphone access to use voice training.';
        } else if (error.name === 'NotFoundError') {
            return 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
            return 'Microphone is already in use by another application.';
        } else if (error.name === 'QuotaExceededError') {
            return 'Storage quota exceeded. Please clear some data and try again.';
        } else if (error.message?.includes('database')) {
            return 'Data storage error. Please refresh the page and try again.';
        } else {
            return 'An unexpected error occurred. Please try again.';
        }
    }
    
    static showErrorNotification(context, message) {
        let notification = document.getElementById('errorNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'errorNotification';
            notification.className = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-size: 14px;
                transform: translateX(400px);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.transform = 'translateX(0)';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
        }, 5000);
    }
    
    static wrapAsyncFunction(fn, context = fn.name) {
        return async (...args) => {
            return this.withErrorHandling(() => fn(...args), context);
        };
    }
    
    static wrapSyncFunction(fn, context = fn.name) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                console.error(`[ErrorBoundary] ${context} failed:`, error);
                const errorMessage = this.getUserFriendlyMessage(error);
                this.showErrorNotification(context, errorMessage);
                return null;
            }
        };
    }
}

export default ErrorBoundary;
