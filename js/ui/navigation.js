export function initNavigation(elements = null) {
    const navItems = elements?.navItems || document.querySelectorAll('.nav-item');
    if (!navItems || navItems.length === 0) return;
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateToScreen(item.dataset.screen, elements);
        });
    });
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

export default {
    initNavigation,
    navigateToScreen,
    initTheme,
    toggleTheme,
    syncThemeToggle
};
