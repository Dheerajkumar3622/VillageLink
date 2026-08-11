/**
 * Origin Shielding Verification Middleware
 * Protects the origin backend from direct user/bot traffic, enforcing CDN-only routing.
 */

const SHIELD_SECRET = process.env.ORIGIN_SHIELD_SECRET || 'shield_v3_secure_village_secret';

export const originShieldVerify = (req, res, next) => {
    const shieldSignature = req.headers['x-origin-shield-signature'];
    
    // In development mode, allow requests unless a simulation testing header is provided
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isTestMode = req.headers['x-shield-test-mode'] === 'true';

    if (isDev && !isTestMode) {
        return next();
    }

    if (!shieldSignature || shieldSignature !== SHIELD_SECRET) {
        console.warn(`🛡️  Origin Shield Blocked: Direct unshielded request from IP ${req.ip} to path ${req.originalUrl}`);
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Direct access to the origin server is blocked. Requests must be routed through the CDN Origin Shield.'
        });
    }

    // Request is verified and routed through the shield proxy
    next();
};
