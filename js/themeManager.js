// Theme Management System - Integrated with existing light/dark themes
class ThemeManager {
    constructor() {
        this.currentTheme = 'custom';
        this.livePreview = true;
        this.currentMode = 'dark'; // 'light' or 'dark'
        
        // Theme presets for both light and dark modes
        this.themePresets = {
            ocean: {
                light: {
                    transBlue: '#0077BE',
                    transPink: '#00A8E8',
                    bg: '#E8F4F8',
                    fg: '#001F3F',
                    card: 'rgba(255, 255, 255, 0.95)',
                    sidebarBg: 'rgba(0, 31, 63, 0.97)',
                    muted: '#374151',
                    border: 'rgba(0, 31, 63, 0.15)',
                    success: '#16a34a',
                    warning: '#d97706',
                    danger: '#dc2626'
                },
                dark: {
                    transBlue: '#00A8E8',
                    transPink: '#0077BE',
                    bg: '#001F3F',
                    fg: '#E8F4F8',
                    card: 'rgba(0, 51, 102, 0.85)',
                    sidebarBg: 'rgba(0, 31, 63, 0.98)',
                    muted: '#a0a0b0',
                    border: 'rgba(0, 168, 232, 0.12)',
                    success: '#4ade80',
                    warning: '#fbbf24',
                    danger: '#f87171'
                }
            },
            sunset: {
                light: {
                    transBlue: '#FF6B35',
                    transPink: '#F7931E',
                    bg: '#FFF5E6',
                    fg: '#2C1810',
                    card: 'rgba(255, 255, 255, 0.95)',
                    sidebarBg: 'rgba(44, 24, 16, 0.97)',
                    muted: '#8B4513',
                    border: 'rgba(255, 107, 53, 0.15)',
                    success: '#16a34a',
                    warning: '#d97706',
                    danger: '#dc2626'
                },
                dark: {
                    transBlue: '#F7931E',
                    transPink: '#FF6B35',
                    bg: '#2C1810',
                    fg: '#FFF5E6',
                    card: 'rgba(61, 36, 24, 0.85)',
                    sidebarBg: 'rgba(42, 24, 16, 0.98)',
                    muted: '#D2B48C',
                    border: 'rgba(247, 147, 30, 0.12)',
                    success: '#4ade80',
                    warning: '#fbbf24',
                    danger: '#f87171'
                }
            },
            forest: {
                light: {
                    transBlue: '#2D5016',
                    transPink: '#5A7C3A',
                    bg: '#E8F5E8',
                    fg: '#1A2F1A',
                    card: 'rgba(255, 255, 255, 0.95)',
                    sidebarBg: 'rgba(26, 47, 26, 0.97)',
                    muted: '#4A5D4A',
                    border: 'rgba(45, 80, 22, 0.15)',
                    success: '#16a34a',
                    warning: '#d97706',
                    danger: '#dc2626'
                },
                dark: {
                    transBlue: '#5A7C3A',
                    transPink: '#2D5016',
                    bg: '#1A2F1A',
                    fg: '#E8F5E8',
                    card: 'rgba(47, 79, 47, 0.85)',
                    sidebarBg: 'rgba(28, 58, 28, 0.98)',
                    muted: '#90A990',
                    border: 'rgba(90, 124, 58, 0.12)',
                    success: '#4ade80',
                    warning: '#fbbf24',
                    danger: '#f87171'
                }
            },
            midnight: {
                light: {
                    transBlue: '#4A148C',
                    transPink: '#7B1FA2',
                    bg: '#F3E5F5',
                    fg: '#0A0A0F',
                    card: 'rgba(255, 255, 255, 0.95)',
                    sidebarBg: 'rgba(26, 26, 46, 0.97)',
                    muted: '#4A148C',
                    border: 'rgba(74, 20, 140, 0.15)',
                    success: '#16a34a',
                    warning: '#d97706',
                    danger: '#dc2626'
                },
                dark: {
                    transBlue: '#7B1FA2',
                    transPink: '#4A148C',
                    bg: '#0A0A0F',
                    fg: '#E8E6F0',
                    card: 'rgba(26, 26, 46, 0.85)',
                    sidebarBg: 'rgba(15, 15, 26, 0.98)',
                    muted: '#9C27B0',
                    border: 'rgba(123, 31, 162, 0.12)',
                    success: '#4ade80',
                    warning: '#fbbf24',
                    danger: '#f87171'
                }
            }
        };
        
        this.defaultColors = {
            light: {
                transBlue: '#5BCEFA',
                transPink: '#F5A9B8',
                bg: '#f0f4f8',
                fg: '#0d0d1a',
                card: 'rgba(255, 255, 255, 0.95)',
                sidebarBg: 'rgba(26, 26, 46, 0.97)',
                muted: '#374151',
                border: 'rgba(0, 0, 0, 0.15)',
                success: '#16a34a',
                warning: '#d97706',
                danger: '#dc2626'
            },
            dark: {
                transBlue: '#5BCEFA',
                transPink: '#F5A9B8',
                bg: '#0f0f1a',
                fg: '#e8e8f0',
                card: 'rgba(30, 30, 50, 0.85)',
                sidebarBg: 'rgba(15, 15, 25, 0.98)',
                muted: '#a0a0b0',
                border: 'rgba(255, 255, 255, 0.12)',
                success: '#4ade80',
                warning: '#fbbf24',
                danger: '#f87171'
            }
        };
        
        this.init();
    }
    
    init() {
        this.detectCurrentMode();
        this.bindEvents();
        this.loadSavedTheme();
        this.updateColorInputs();
        this.updateThemeToggleButtons();
    }
    
    detectCurrentMode() {
        this.currentMode = document.body.classList.contains('dark') ? 'dark' : 'light';
    }
    
    bindEvents() {
        // Listen for theme changes from the main theme toggle
        const observer = new MutationObserver(() => {
            const newMode = document.body.classList.contains('dark') ? 'dark' : 'light';
            if (newMode !== this.currentMode) {
                this.currentMode = newMode;
                this.updateColorInputs();
                this.applyCurrentTheme();
                this.updateThemeToggleButtons();
            }
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // New three-way theme toggle buttons
        const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
        themeToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.themeMode;
                this.handleThemeModeChange(mode);
            });
        });
        
        // Color input events
        const colorInputs = document.querySelectorAll('.color-input');
        colorInputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleColorChange(e));
        });
        
        // Text input events
        const textInputs = document.querySelectorAll('.color-text');
        textInputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleTextChange(e));
        });
        
        // Preset buttons
        const presetButtons = document.querySelectorAll('[data-preset]');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
        });
        
        // Action buttons
        document.getElementById('saveCustomThemeBtn')?.addEventListener('click', () => this.saveTheme());
        document.getElementById('resetThemeBtn')?.addEventListener('click', () => this.resetTheme());
        document.getElementById('exportThemeBtn')?.addEventListener('click', () => this.exportTheme());
        document.getElementById('importThemeBtn')?.addEventListener('change', (e) => this.importTheme(e));
        
        // Live preview toggle
        document.getElementById('livePreview')?.addEventListener('change', (e) => {
            this.livePreview = e.target.checked;
        });
    }
    
    handleThemeModeChange(mode) {
        const customThemeSection = document.getElementById('customThemeSection');
        
        if (mode === 'custom') {
            // Show custom theme section
            customThemeSection?.classList.remove('hidden');
            // Update toggle buttons
            this.updateThemeToggleButtons(mode);
        } else {
            // Hide custom theme section
            customThemeSection?.classList.add('hidden');
            // Apply standard theme
            if (mode === 'light') {
                document.body.classList.remove('dark');
            } else {
                document.body.classList.add('dark');
            }
            // Update toggle buttons
            this.updateThemeToggleButtons(mode);
        }
    }
    
    updateThemeToggleButtons(activeMode = null) {
        const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
        const currentMode = activeMode || (document.getElementById('customThemeSection')?.classList.contains('hidden') ? 
            (document.body.classList.contains('dark') ? 'dark' : 'light') : 'custom');
        
        themeToggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeMode === currentMode);
        });
    }
    
    updateColorInputs() {
        const currentColors = this.getCurrentThemeColors();
        Object.keys(currentColors).forEach(key => {
            const colorInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1));
            const textInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1) + 'Text');
            
            if (colorInput) colorInput.value = currentColors[key];
            if (textInput) textInput.value = currentColors[key];
        });
        
        // Update mode indicator
        this.updateModeIndicator();
    }
    
    updateModeIndicator() {
        const modeBadge = document.getElementById('currentModeBadge');
        if (modeBadge) {
            modeBadge.textContent = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
        }
    }
    
    getCurrentThemeColors() {
        // Get current colors for the current mode (light/dark)
        const savedTheme = this.getSavedTheme();
        if (savedTheme && savedTheme[this.currentMode]) {
            return savedTheme[this.currentMode];
        }
        return this.defaultColors[this.currentMode];
    }
    
    handleColorChange(e) {
        const colorInput = e.target;
        const textInput = document.getElementById(colorInput.id + 'Text');
        
        if (textInput) {
            textInput.value = colorInput.value;
        }
        
        if (this.livePreview) {
            this.updateThemeVariable(colorInput.id.replace('theme', '').toLowerCase(), colorInput.value);
        }
    }
    
    handleTextChange(e) {
        const textInput = e.target;
        const colorInput = document.getElementById(textInput.id.replace('Text', ''));
        const value = textInput.value;
        
        // Validate hex color
        if (/^#[0-9A-F]{6}$/i.test(value)) {
            if (colorInput) {
                colorInput.value = value;
            }
            
            if (this.livePreview) {
                this.updateThemeVariable(textInput.id.replace('theme', '').replace('Text', '').toLowerCase(), value);
            }
        }
    }
    
    updateThemeVariable(property, value) {
        // Map property names to CSS variables
        const variableMap = {
            'transblue': '--trans-blue',
            'transpink': '--trans-pink',
            'bg': '--bg',
            'fg': '--fg',
            'card': '--card',
            'sidebarbg': '--sidebar-bg',
            'muted': '--muted',
            'border': '--border',
            'success': '--success',
            'warning': '--warning',
            'danger': '--danger'
        };
        
        const cssVar = variableMap[property];
        if (cssVar) {
            // Apply to the appropriate theme context
            if (this.currentMode === 'dark') {
                // For dark mode, we need to override the .dark class styles
                document.documentElement.style.setProperty(cssVar, value);
            } else {
                // For light mode, we override the :root styles
                document.documentElement.style.setProperty(cssVar, value);
            }
        }
    }
    
    applyPreset(presetName) {
        const preset = this.themePresets[presetName];
        if (!preset || !preset[this.currentMode]) return;
        
        const presetColors = preset[this.currentMode];
        Object.keys(presetColors).forEach(key => {
            const colorInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1));
            const textInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1) + 'Text');
            
            if (colorInput) colorInput.value = presetColors[key];
            if (textInput) textInput.value = presetColors[key];
            
            if (this.livePreview) {
                this.updateThemeVariable(key.toLowerCase(), presetColors[key]);
            }
        });
    }
    
    saveTheme() {
        const currentThemeData = this.getSavedTheme() || {};
        const currentColors = this.getCurrentColorsFromInputs();
        
        currentThemeData[this.currentMode] = currentColors;
        
        localStorage.setItem('aria-custom-theme', JSON.stringify(currentThemeData));
        
        this.showNotification(`Theme saved for ${this.currentMode} mode!`, 'success');
    }
    
    getSavedTheme() {
        const savedTheme = localStorage.getItem('aria-custom-theme');
        if (savedTheme) {
            try {
                return JSON.parse(savedTheme);
            } catch (e) {
                console.error('Failed to load saved theme:', e);
            }
        }
        return null;
    }
    
    loadSavedTheme() {
        const savedTheme = this.getSavedTheme();
        if (savedTheme && savedTheme[this.currentMode]) {
            this.applyCurrentTheme();
        }
    }
    
    applyCurrentTheme() {
        const savedTheme = this.getSavedTheme();
        if (savedTheme && savedTheme[this.currentMode]) {
            const colors = savedTheme[this.currentMode];
            
            // Clear any existing inline styles first
            const style = document.documentElement.style;
            const properties = [];
            for (let i = 0; i < style.length; i++) {
                properties.push(style[i]);
            }
            properties.forEach(prop => {
                if (prop.startsWith('--')) {
                    style.removeProperty(prop);
                }
            });
            
            // Apply new colors
            Object.keys(colors).forEach(key => {
                this.updateThemeVariable(key.toLowerCase(), colors[key]);
            });
        }
    }
    
    getCurrentColorsFromInputs() {
        return {
            transBlue: document.getElementById('themeTransBlue')?.value || this.defaultColors[this.currentMode].transBlue,
            transPink: document.getElementById('themeTransPink')?.value || this.defaultColors[this.currentMode].transPink,
            bg: document.getElementById('themeBg')?.value || this.defaultColors[this.currentMode].bg,
            fg: document.getElementById('themeFg')?.value || this.defaultColors[this.currentMode].fg,
            card: document.getElementById('themeCard')?.value || this.defaultColors[this.currentMode].card,
            sidebarBg: document.getElementById('themeSidebarBg')?.value || this.defaultColors[this.currentMode].sidebarBg,
            muted: document.getElementById('themeMuted')?.value || this.defaultColors[this.currentMode].muted,
            border: document.getElementById('themeBorder')?.value || this.defaultColors[this.currentMode].border,
            success: document.getElementById('themeSuccess')?.value || this.defaultColors[this.currentMode].success,
            warning: document.getElementById('themeWarning')?.value || this.defaultColors[this.currentMode].warning,
            danger: document.getElementById('themeDanger')?.value || this.defaultColors[this.currentMode].danger
        };
    }
    
    resetTheme() {
        const defaultColors = this.defaultColors[this.currentMode];
        Object.keys(defaultColors).forEach(key => {
            const colorInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1));
            const textInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1) + 'Text');
            
            if (colorInput) colorInput.value = defaultColors[key];
            if (textInput) textInput.value = defaultColors[key];
            
            if (this.livePreview) {
                this.updateThemeVariable(key.toLowerCase(), defaultColors[key]);
            }
        });
        
        // Clear saved theme for current mode
        const savedTheme = this.getSavedTheme() || {};
        delete savedTheme[this.currentMode];
        localStorage.setItem('aria-custom-theme', JSON.stringify(savedTheme));
        
        this.showNotification(`Theme reset to default for ${this.currentMode} mode`, 'info');
    }
    
    exportTheme() {
        const themeData = this.getSavedTheme() || { light: this.defaultColors.light, dark: this.defaultColors.dark };
        const dataStr = JSON.stringify(themeData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'aria-custom-theme.json';
        link.click();
        
        this.showNotification('Theme exported successfully!', 'success');
    }
    
    importTheme(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const themeData = JSON.parse(event.target.result);
                
                // Validate theme data
                if (this.validateThemeData(themeData)) {
                    localStorage.setItem('aria-custom-theme', JSON.stringify(themeData));
                    
                    // Apply theme for current mode
                    if (themeData[this.currentMode]) {
                        Object.keys(themeData[this.currentMode]).forEach(key => {
                            const colorInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1));
                            const textInput = document.getElementById('theme' + key.charAt(0).toUpperCase() + key.slice(1) + 'Text');
                            
                            if (colorInput) colorInput.value = themeData[this.currentMode][key];
                            if (textInput) textInput.value = themeData[this.currentMode][key];
                            
                            if (this.livePreview) {
                                this.updateThemeVariable(key.toLowerCase(), themeData[this.currentMode][key]);
                            }
                        });
                    }
                    
                    this.showNotification('Theme imported successfully!', 'success');
                } else {
                    this.showNotification('Invalid theme file format', 'error');
                }
            } catch (e) {
                this.showNotification('Failed to import theme file', 'error');
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        e.target.value = '';
    }
    
    validateThemeData(data) {
        const requiredKeys = ['transBlue', 'transPink', 'bg', 'fg', 'card', 'sidebarBg'];
        
        // Check if at least one mode has valid data
        return (data.light && requiredKeys.every(key => 
            data.light[key] && /^#[0-9A-F]{6}$/i.test(data.light[key])
        )) || (data.dark && requiredKeys.every(key => 
            data.dark[key] && /^#[0-9A-F]{6}$/i.test(data.dark[key])
        ));
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `theme-notification theme-notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

let _instance = null;

export function initThemeManager() {
    if (!_instance) {
        _instance = new ThemeManager();
    }
    return _instance;
}

export function getThemeManager() {
    return _instance;
}

export { ThemeManager };
