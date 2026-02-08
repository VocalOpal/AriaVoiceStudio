export function initNavigation(elements = null) {
    const navItems = elements?.navItems || document.querySelectorAll('.nav-item');
    if (!navItems || navItems.length === 0) return;
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateToScreen(item.dataset.screen, elements);
            closeMobileMenu();
        });
    });

    initMobileMenu();
}

export function navigateToScreen(screenId, elements = null) {
    const navItems = elements?.navItems || document.querySelectorAll('.nav-item');
    const screens = elements?.screens || document.querySelectorAll('.screen');

    navItems.forEach(n => {
        n.classList.toggle('active', n.dataset.screen === screenId);
        n.setAttribute('aria-selected', n.dataset.screen === screenId ? 'true' : 'false');
    });

    screens.forEach(s => {
        s.classList.toggle('active', s.id === `screen-${screenId}`);
    });
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        // Move focus to the screen heading for accessibility
        const heading = targetScreen.querySelector('h1, h2, .screen-title');
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus();
            // Remove tabindex after blur to prevent permanent tab-order pollution
            heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
        }
    }
}

export function initTheme(elements = null) {
    const saved = localStorage.getItem('aria-theme');
    if (saved === 'light') {
        document.body.classList.remove('dark');
    }
    
    const themeToggle = elements?.themeToggle || document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleTheme();
        });
    }
}

export function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('aria-theme', isDark ? 'dark' : 'light');
    
    syncThemeToggle();
}

export function syncThemeToggle() {
    const isDark = document.body.classList.contains('dark');
    const themeToggles = document.querySelectorAll('.toggle-btn[data-theme]');
    themeToggles.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === (isDark ? 'dark' : 'light'));
    });
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (!menuBtn || !sidebar) return;

    // Create backdrop element
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        sidebar.parentNode.insertBefore(backdrop, sidebar.nextSibling);
    }

    menuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        backdrop.classList.toggle('active', isOpen);
        menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    backdrop.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
}

export default {
    initNavigation,
    navigateToScreen,
    initTheme,
    toggleTheme,
    syncThemeToggle
};
