// Simple Custom CSS Editor with property allowlist security
class CustomCssEditor {
    constructor() {
        this.customStyleElement = null;
        // Allowlist of safe CSS properties for theming
        this.allowedProperties = new Set([
            'color', 'background', 'background-color', 'background-image',
            'background-gradient', 'font-size', 'font-family', 'font-weight',
            'font-style', 'line-height', 'letter-spacing', 'text-align',
            'text-decoration', 'text-transform', 'border', 'border-color',
            'border-radius', 'border-width', 'border-style',
            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
            'opacity', 'box-shadow', 'text-shadow', 'filter',
            'gap', 'row-gap', 'column-gap',
            'accent-color', 'caret-color', 'outline', 'outline-color',
            'outline-offset', 'outline-width', 'outline-style',
            'transition', 'transition-duration', 'transition-property',
            'transform', 'overflow', 'overflow-x', 'overflow-y',
            'display', 'flex-direction', 'align-items', 'justify-content',
            'visibility', 'cursor', 'user-select', 'scroll-behavior'
        ]);
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedCss();
        this.createStyleElement();
    }

    createStyleElement() {
        this.customStyleElement = document.getElementById('custom-css-styles') ||
            document.createElement('style');
        this.customStyleElement.id = 'custom-css-styles';
        document.head.appendChild(this.customStyleElement);
    }

    bindEvents() {
        const cssInput = document.getElementById('customCssInput');
        const saveBtn = document.getElementById('saveCssBtn');
        const clearBtn = document.getElementById('clearCssBtn');
        const exampleBtns = document.querySelectorAll('.example-btn');

        cssInput?.addEventListener('input', (e) => {
            const result = this.sanitizeCss(e.target.value);
            this.applyCss(result.sanitized);
            if (result.blocked.length > 0) {
                this.updateStatus(`${result.blocked.length} blocked property(s)`, 'warning');
            } else {
                this.updateStatus('Typing...', 'warning');
            }
        });

        saveBtn?.addEventListener('click', () => {
            this.saveCss();
        });

        clearBtn?.addEventListener('click', () => {
            this.clearCss();
        });

        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const css = btn.dataset.css;
                cssInput.value = css;
                const result = this.sanitizeCss(css);
                this.applyCss(result.sanitized);
                this.updateStatus('Example applied', 'success');
            });
        });
    }

    /**
     * Sanitize CSS by filtering to allowed properties only
     * @param {string} css - Raw CSS input
     * @returns {{sanitized: string, blocked: string[]}}
     */
    sanitizeCss(css) {
        if (!css || typeof css !== 'string') {
            return { sanitized: '', blocked: [] };
        }

        // Hard block dangerous patterns regardless
        if (/@import|javascript:|expression\(|url\s*\(|\\|<script|<\/|behavior\s*:/i.test(css)) {
            return { sanitized: '', blocked: ['Blocked: unsafe CSS pattern detected'] };
        }

        // Length limit
        if (css.length > 10000) {
            return { sanitized: '', blocked: ['Blocked: CSS exceeds 10,000 character limit'] };
        }

        const blocked = [];
        // Parse rule blocks: extract selector { declarations }
        const sanitized = css.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, declarations) => {
            const cleanedDeclarations = declarations
                .split(';')
                .map(decl => decl.trim())
                .filter(decl => {
                    if (!decl) return false;
                    const colonIndex = decl.indexOf(':');
                    if (colonIndex === -1) return false;
                    const property = decl.substring(0, colonIndex).trim().toLowerCase();
                    // Allow CSS custom properties (--variable-name)
                    if (property.startsWith('--')) return true;
                    if (this.allowedProperties.has(property)) return true;
                    blocked.push(property);
                    return false;
                })
                .join('; ');

            if (!cleanedDeclarations.trim()) return '';
            return `${selector.trim()} { ${cleanedDeclarations}; }`;
        });

        return { sanitized, blocked };
    }

    applyCss(css) {
        if (this.customStyleElement) {
            this.customStyleElement.textContent = css;
        }
    }

    saveCss() {
        const cssInput = document.getElementById('customCssInput');
        const rawCss = cssInput?.value || '';
        const result = this.sanitizeCss(rawCss);

        // Store the sanitized CSS only — never persist raw unsanitized input
        localStorage.setItem('aria-custom-css', result.sanitized);
        this.applyCss(result.sanitized);

        if (result.blocked.length > 0) {
            this.updateStatus(`Saved (${result.blocked.length} property(s) blocked)`, 'warning');
        } else {
            this.updateStatus('Saved!', 'success');
        }

        setTimeout(() => {
            this.updateStatus('Ready', 'ready');
        }, 2000);
    }

    loadSavedCss() {
        const savedCss = localStorage.getItem('aria-custom-css') || '';
        const cssInput = document.getElementById('customCssInput');

        if (cssInput) {
            cssInput.value = savedCss;
            const result = this.sanitizeCss(savedCss);
            this.applyCss(result.sanitized);
        }

        this.updateStatus('Ready', 'ready');
    }

    clearCss() {
        const cssInput = document.getElementById('customCssInput');

        if (cssInput) {
            cssInput.value = '';
            this.applyCss('');
        }

        localStorage.removeItem('aria-custom-css');
        this.updateStatus('Cleared', 'info');

        setTimeout(() => {
            this.updateStatus('Ready', 'ready');
        }, 2000);
    }

    updateStatus(text, type) {
        const statusText = document.getElementById('cssStatusText');
        const statusIndicator = document.getElementById('cssStatusIndicator');

        if (statusText) {
            statusText.textContent = text;
        }

        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            if (type) {
                statusIndicator.classList.add(`status-${type}`);
            }
        }
    }
}

let _instance = null;

export function initCustomCssEditor() {
    if (!_instance) {
        _instance = new CustomCssEditor();
    }
    return _instance;
}

export function getCustomCssEditor() {
    return _instance;
}

export { CustomCssEditor };
