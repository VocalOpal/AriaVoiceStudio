export class InputValidator {
    static patterns = {
        name: /^[a-zA-Z0-9\s\-_\.]{1,50}$/,
        pitch: /^(\d{2,3})$/,
        css: /^[^<>'"&]*$/,
        filename: /^[a-zA-Z0-9\-_\.]+$/,
        sessionId: /^session-\d+$/,
        userId: /^[a-zA-Z0-9\-_]{1,50}$/
    };
    
    static limits = {
        pitchMin: 50,
        pitchMax: 500,
        nameMaxLength: 50,
        cssMaxLength: 10000,
        sessionNameMaxLength: 100
    };
    
    static sanitize(input, type = 'text') {
        if (typeof input !== 'string') {
            return '';
        }
        
        switch (type) {
            case 'text':
                return input
                    .replace(/[<>]/g, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+=/gi, '')
                    .trim()
                    .substring(0, this.limits.nameMaxLength);
                    
            case 'css':
                // Block dangerous patterns entirely
                if (/@import|javascript:|expression\(|url\s*\(|\\|<script|<\/|behavior\s*:/i.test(input)) {
                    return '';
                }
                return input.substring(0, this.limits.cssMaxLength);
                    
            case 'number':
                const num = parseInt(input, 10);
                return isNaN(num) ? 0 : num;
                    
            case 'filename':
                return input
                    .replace(/[<>:"/\\|?*]/g, '')
                    .replace(/\.\./g, '')
                    .substring(0, 100);
                    
            default:
                return input.toString().trim();
        }
    }
    
    static validate(input, type, options = {}) {
        const sanitized = this.sanitize(input, type);
        const errors = [];
        
        switch (type) {
            case 'name':
                if (!sanitized) errors.push('Name cannot be empty');
                if (sanitized.length < 1) errors.push('Name must be at least 1 character');
                if (sanitized.length > this.limits.nameMaxLength) errors.push('Name is too long');
                if (!this.patterns.name.test(sanitized)) errors.push('Name contains invalid characters');
                break;
                
            case 'pitch':
                const pitch = parseInt(sanitized, 10);
                if (isNaN(pitch)) errors.push('Pitch must be a number');
                if (pitch < this.limits.pitchMin || pitch > this.limits.pitchMax) {
                    errors.push(`Pitch must be between ${this.limits.pitchMin} and ${this.limits.pitchMax} Hz`);
                }
                break;
                
            case 'pitchRange':
                const [min, max] = sanitized.split('-').map(p => parseInt(p.trim(), 10));
                if (isNaN(min) || isNaN(max)) errors.push('Both pitch values must be numbers');
                if (min < this.limits.pitchMin || min > this.limits.pitchMax) {
                    errors.push(`Minimum pitch must be between ${this.limits.pitchMin} and ${this.limits.pitchMax} Hz`);
                }
                if (max < this.limits.pitchMin || max > this.limits.pitchMax) {
                    errors.push(`Maximum pitch must be between ${this.limits.pitchMin} and ${this.limits.pitchMax} Hz`);
                }
                if (min >= max) errors.push('Minimum pitch must be less than maximum pitch');
                break;
                
            case 'css':
                if (sanitized.length > this.limits.cssMaxLength) {
                    errors.push('CSS is too long');
                }
                // Check for dangerous CSS patterns
                if (/@import|javascript:|expression\(|url\s*\(|\\|<script|<\/|behavior\s*:/i.test(input)) {
                    errors.push('CSS contains potentially unsafe content');
                }
                if (sanitized === '' && input.trim() !== '') {
                    errors.push('CSS was blocked due to unsafe patterns');
                }
                break;
                
            case 'sessionName':
                if (!sanitized) errors.push('Session name cannot be empty');
                if (sanitized.length > this.limits.sessionNameMaxLength) {
                    errors.push('Session name is too long');
                }
                break;
                
            case 'file':
                if (!input || !input.name) errors.push('Invalid file');
                if (input.size > 10 * 1024 * 1024) errors.push('File is too large (max 10MB)');
                if (!input.name.match(/\.(json)$/i)) errors.push('File must be a JSON file');
                break;
        }
        
        return {
            isValid: errors.length === 0,
            sanitized,
            errors
        };
    }
    
    static validateForm(formData, schema) {
        const results = {};
        const allErrors = [];
        
        Object.keys(schema).forEach(field => {
            const rules = schema[field];
            const value = formData[field];
            
            if (rules.required && (!value || value.toString().trim() === '')) {
                allErrors.push(`${field} is required`);
                results[field] = { isValid: false, value: '', errors: ['Field is required'] };
                return;
            }
            
            if (value && value.toString().trim() !== '') {
                const validation = this.validate(value, rules.type, rules.options);
                results[field] = validation;
                if (!validation.isValid) {
                    allErrors.push(...validation.errors.map(err => `${field}: ${err}`));
                }
            } else {
                results[field] = { isValid: true, value: '', errors: [] };
            }
        });
        
        return {
            isValid: allErrors.length === 0,
            results,
            errors: allErrors
        };
    }
    
    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
}

/**
 * Validate profile form data
 * @param {Object} formData - Form data object
 * @returns {Object} Validation result
 */
export function validateProfileForm(formData) {
    const schema = {
        profileName: { type: 'name', required: true },
        genderIdentity: { type: 'text', required: false },
        pronouns: { type: 'text', required: false },
        targetMin: { type: 'pitch', required: true },
        targetMax: { type: 'pitch', required: true },
        sensitivity: { type: 'number', required: true }
    };
    
    return InputValidator.validateForm(formData, schema);
}

/**
 * Validate custom CSS input
 * @param {string} css - CSS string
 * @returns {Object} Validation result
 */
export function validateCustomCSS(css) {
    return InputValidator.validate(css, 'css');
}

/**
 * Validate session name
 * @param {string} name - Session name
 * @returns {Object} Validation result
 */
export function validateSessionName(name) {
    return InputValidator.validate(name, 'sessionName');
}

/**
 * Validate import file
 * @param {File} file - File object
 * @returns {Object} Validation result
 */
export function validateImportFile(file) {
    return InputValidator.validate(file, 'file');
}

export default InputValidator;
