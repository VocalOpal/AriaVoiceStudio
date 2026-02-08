// Aria Voice Studio - Toast Notification System
// Extracted from app.js for modular architecture

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('info', 'success', 'error', 'warning')
 */
export function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', 'alert');

    const span = document.createElement('span');
    span.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');

    toast.appendChild(span);
    toast.appendChild(closeBtn);
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Close on click
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export default showToast;
