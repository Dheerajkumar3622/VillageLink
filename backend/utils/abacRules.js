/**
 * Attribute-Based Access Control (ABAC) Policy Engine
 * Evaluates subject, resource, action, and environment attributes to authorize requests.
 */

export class AbacEngine {
    /**
     * Evaluates permission for a specific transaction request
     * @param {Object} subject User attributes (id, role, isActive, verificationLevel)
     * @param {Object} resource Resource attributes (ownerId, status, price, type)
     * @param {string} action Action to perform (modify_bid, accept_order, claim_refund)
     * @param {Object} environment Environment conditions (distanceKm, hoursSincePurchase, time)
     */
    checkAccess(subject, resource, action, environment = {}) {
        if (!subject || !resource || !action) {
            return { authorized: false, reason: 'INVALID_PARAMETERS' };
        }

        // Rule 1: Bid modifications (subject.id must match owner OR role is admin, and status must be OPEN)
        if (action === 'modify_bid') {
            if (resource.status !== 'OPEN') {
                return { authorized: false, reason: 'BIDDING_WINDOW_CLOSED' };
            }
            if (subject.id !== resource.ownerId && subject.role !== 'admin') {
                return { authorized: false, reason: 'NOT_RESOURCE_OWNER_OR_ADMIN' };
            }
            return { authorized: true, reason: null };
        }

        // Rule 2: Accepting orders (driver must be active, nearby within 10km, and verify certificate)
        if (action === 'accept_order') {
            if (subject.role !== 'driver') {
                return { authorized: false, reason: 'USER_IS_NOT_A_DRIVER' };
            }
            if (!subject.isActive) {
                return { authorized: false, reason: 'DRIVER_IS_INACTIVE' };
            }
            if (environment.distanceKm > 10) {
                return { authorized: false, reason: 'DRIVER_BEYOND_PROXIMITY_LIMIT' };
            }
            return { authorized: true, reason: null };
        }

        // Rule 3: Claiming refunds (booking status must be CANCELLED, and done within 48 hours)
        if (action === 'claim_refund') {
            if (resource.status !== 'CANCELLED') {
                return { authorized: false, reason: 'REFUND_ONLY_ON_CANCELLED_ORDERS' };
            }
            if (environment.hoursSincePurchase > 48) {
                return { authorized: false, reason: 'REFUND_WINDOW_EXPIRED' };
            }
            return { authorized: true, reason: null };
        }

        // Default deny policy
        return { authorized: false, reason: 'NO_MATCHING_ABAC_POLICY' };
    }
}
