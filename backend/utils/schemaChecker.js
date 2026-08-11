export class SchemaChecker {
    constructor() {
        this.schemas = {
            'booking': {
                required: ['riderId', 'pickup', 'destination', 'seats'],
                types: {
                    riderId: { type: 'string', pattern: /^u-[0-9]+$/ },
                    pickup: { type: 'string', minLength: 2 },
                    destination: { type: 'string', minLength: 2 },
                    seats: { type: 'number', minimum: 1, maximum: 8 }
                }
            },
            'bid': {
                required: ['cropId', 'bidAmount'],
                types: {
                    cropId: { type: 'string', pattern: /^crop-[0-9]+$/ },
                    bidAmount: { type: 'number', minimum: 0.01 }
                }
            }
        };
    }

    validate(schemaName, payload) {
        const schema = this.schemas[schemaName];
        if (!schema) {
            throw new Error(`Schema "${schemaName}" is not defined.`);
        }

        const errors = [];
        schema.required.forEach(field => {
            if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
                errors.push(`Missing mandatory field: "${field}"`);
            }
        });

        if (errors.length > 0) return { valid: false, errors };

        for (const [key, rules] of Object.entries(schema.types)) {
            const val = payload[key];
            if (val === undefined || val === null) continue;

            const actualType = typeof val;
            if (actualType !== rules.type) {
                errors.push(`Field "${key}" type mismatch. Expected ${rules.type}, received ${actualType}`);
                continue;
            }

            if (rules.type === 'string') {
                if (rules.minLength && val.length < rules.minLength) {
                    errors.push(`Field "${key}" is too short. Minimum length: ${rules.minLength}`);
                }
                if (rules.pattern && !rules.pattern.test(val)) {
                    errors.push(`Field "${key}" value format mismatch. Pattern violation.`);
                }
            }

            if (rules.type === 'number') {
                if (rules.minimum !== undefined && val < rules.minimum) {
                    errors.push(`Field "${key}" value out of bounds. Minimum allowed: ${rules.minimum}`);
                }
                if (rules.maximum !== undefined && val > rules.maximum) {
                    errors.push(`Field "${key}" value out of bounds. Maximum allowed: ${rules.maximum}`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }
}
