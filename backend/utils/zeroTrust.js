/**
 * Zero-Trust inter-service authorization manager
 * Validates cryptographic tokens and confirms boundary permissions on every call.
 * Core Philosophy: Never Trust, Always Verify.
 */

// Cryptographic service key map
const SERVICE_REGISTRY = {
    'tok-mandi-893': {
        name: 'mandi-produce-service',
        allowedActions: ['read_produce', 'write_produce', 'read_market_index']
    },
    'tok-yatra-332': {
        name: 'yatra-transit-service',
        allowedActions: ['read_booking', 'write_booking', 'calculate_surge']
    },
    'tok-wallet-449': {
        name: 'wallet-billing-service',
        allowedActions: ['read_wallet', 'mutate_wallet', 'read_booking', 'refund_claim']
    }
};

/**
 * Validates inter-service request tokens and confirms access permissions
 * @param {string} token Client service token
 * @param {string} requestedAction Target action name
 */
export const verifyServiceRequest = (token, requestedAction) => {
    // 1. Authenticate - verify token is registered
    const service = SERVICE_REGISTRY[token];
    if (!service) {
        return {
            authorized: false,
            reason: 'INVALID_AUTHENTICATION_TOKEN',
            message: 'Access Denied: Service credentials could not be verified.'
        };
    }

    // 2. Authorize - verify action permissions bounds
    const isAllowed = service.allowedActions.includes(requestedAction);
    if (!isAllowed) {
        return {
            authorized: false,
            reason: 'UNAUTHORIZED_ACTION',
            message: `Access Denied: Service "${service.name}" is unauthorized to perform "${requestedAction}".`
        };
    }

    return {
        authorized: true,
        serviceName: service.name
    };
};
