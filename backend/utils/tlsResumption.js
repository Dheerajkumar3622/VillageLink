/**
 * TLS Session Resumption Cache Manager
 * Caches TLS handshake session IDs to enable fast 1-RTT/0-RTT client reconnections.
 */

// In-memory TLS session store (can be connected to Redis in production)
const tlsSessionCache = new Map();

/**
 * Saves a new TLS session. Triggered by Node.js HTTPS server 'newSession' event.
 */
export const saveTlsSession = (sessionId, sessionData) => {
    const key = sessionId.toString('hex');
    tlsSessionCache.set(key, sessionData);
    console.log(`🔒 TLS Cache: Stored session credentials for ID: ${key.slice(0, 16)}...`);
};

/**
 * Retrieves a TLS session for resumption. Triggered by 'resumeSession' event.
 */
export const getTlsSession = (sessionId) => {
    const key = sessionId.toString('hex');
    const data = tlsSessionCache.get(key);
    if (data) {
        console.log(`⚡ TLS Cache: Resumed session successfully for ID: ${key.slice(0, 16)}...`);
        return data;
    }
    console.log(`⚠️ TLS Cache: Session ID not found: ${key.slice(0, 16)}...`);
    return null;
};

/**
 * Attaches the TLS session caching event listeners to an HTTPS/TLS server instance.
 */
export const bindTlsResumptionListeners = (server) => {
    try {
        server.on('newSession', (sessionId, sessionData, callback) => {
            saveTlsSession(sessionId, sessionData);
            callback();
        });

        server.on('resumeSession', (sessionId, callback) => {
            const session = getTlsSession(sessionId);
            callback(null, session);
        });

        console.log('✅ TLS Session Resumption listeners bound successfully.');
    } catch (e) {
        console.warn('⚠️ TLS Resumption Bind Warning:', e.message);
    }
};
