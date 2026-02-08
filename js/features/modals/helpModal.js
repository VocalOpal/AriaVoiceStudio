// Help Modal - manages the help/support/feedback modal

let _callbacks = {};

export function initHelpModal(callbacks) {
    _callbacks = callbacks;
}

export function openHelpModal(tab = 'help') {
    const modal = document.getElementById('helpModal');
    if (!modal) return;

    _callbacks.setLastFocused?.(document.activeElement);
    modal.classList.remove('hidden');

    // Switch to appropriate tab
    const tabs = modal.querySelectorAll('.help-tab');
    const contents = modal.querySelectorAll('.help-content');

    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    contents.forEach(c => c.classList.toggle('active', c.id === `help-${tab}`));

    // Add tab click listeners
    tabs.forEach(t => {
        t.onclick = () => {
            tabs.forEach(tb => tb.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            t.classList.add('active');
            document.getElementById(`help-${t.dataset.tab}`)?.classList.add('active');
        };
    });

    // Focus the close button or first focusable element
    _callbacks.trapFocusInModal?.(modal);
}

export function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.add('hidden');
    _callbacks.restoreFocus?.();
}
