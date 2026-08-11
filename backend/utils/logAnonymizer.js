/**
 * Log Anonymization Utility
 * Scrubs PII data (emails, phones, credentials) from log strings and JSON payloads before writing.
 */

export class LogAnonymizer {
    /**
     * Obfuscates email formats (e.g. johndoe@gmail.com -> j******@gmail.com)
     */
    maskEmail(email) {
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) {
            return `${name[0]}***@${domain}`;
        }
        return `${name[0]}******${name[name.length - 1]}@${domain}`;
    }

    /**
     * Obfuscates phone formats (e.g. +91 9876543210 -> ******3210)
     */
    maskPhone(phone) {
        const cleaned = phone.replace(/\s+/g, '');
        if (cleaned.length < 4) return '******';
        return `******${cleaned.slice(-4)}`;
    }

    /**
     * Obfuscates basic string inputs using regex scanning for emails and phone numbers
     */
    anonymizeString(text) {
        if (typeof text !== 'string') return text;

        let result = text;

        // 1. Scan and replace emails
        const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        result = result.replace(emailRegex, (match) => this.maskEmail(match));

        // 2. Scan and replace phone numbers (matching standard 10 digit sequences)
        const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\d{10}/g;
        result = result.replace(phoneRegex, (match) => this.maskPhone(match));

        return result;
    }

    /**
     * Traverses object tree recursively to scrub sensitive keys
     */
    anonymizeObject(obj) {
        if (obj === null || obj === undefined) return obj;
        
        // Handle primitives and strings
        if (typeof obj !== 'object') {
            if (typeof obj === 'string') {
                return this.anonymizeString(obj);
            }
            return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.anonymizeObject(item));
        }

        // Handle key-value dictionaries
        const scrubbed = {};
        const sensitiveKeys = ['email', 'phone', 'aadhar', 'token', 'password', 'fullname', 'name'];

        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            
            if (sensitiveKeys.includes(keyLower) && typeof value === 'string') {
                if (keyLower.includes('email')) {
                    scrubbed[key] = this.maskEmail(value);
                } else if (keyLower.includes('phone')) {
                    scrubbed[key] = this.maskPhone(value);
                } else {
                    // General mask for general secrets or names
                    scrubbed[key] = value.length <= 4 ? '****' : `${value.slice(0, 2)}******`;
                }
            } else if (typeof value === 'object') {
                scrubbed[key] = this.anonymizeObject(value);
            } else {
                scrubbed[key] = value;
            }
        }

        return scrubbed;
    }
}
