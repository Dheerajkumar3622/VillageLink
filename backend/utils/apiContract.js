/**
 * API Contract Schema Validator
 * Validates request payload structures against predefined API contracts.
 */

export class ApiContractVerifier {
    constructor() {
        this.contracts = {
            createBooking: {
                origin: { type: 'string', required: true },
                destination: { type: 'string', required: true },
                passengersCount: { type: 'number', required: true, min: 1 }
            },
            submitBid: {
                bidId: { type: 'string', required: true },
                amount: { type: 'number', required: true, min: 0.01 },
                driverId: { type: 'string', required: true }
            }
        };
    }

    /**
     * Validates a request payload against a schema contract definition
     */
    validate(contractName, payload) {
        const schema = this.contracts[contractName];
        if (!schema) {
            return { valid: false, errors: [`Contract schema "${contractName}" is not registered.`] };
        }

        const errors = [];

        // Check each rule in the contract
        for (const [key, rules] of Object.entries(schema)) {
            const val = payload[key];

            // Required field check
            if (rules.required && (val === undefined || val === null)) {
                errors.push(`Missing mandatory property "${key}".`);
                continue;
            }

            if (val !== undefined && val !== null) {
                // Type verification
                if (typeof val !== rules.type) {
                    errors.push(`Property "${key}" must be of type "${rules.type}", but got "${typeof val}".`);
                    continue;
                }

                // Minimum numeric value verification
                if (rules.type === 'number' && rules.min !== undefined && val < rules.min) {
                    errors.push(`Property "${key}" value (${val}) is below minimum limit (${rules.min}).`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
