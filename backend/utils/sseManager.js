/**
 * Server-Sent Events (SSE) Broadcast Coordinator
 * Manages active response streams and formats messages to W3C spec.
 */

let clients = [];

/**
 * Initializes a new SSE response stream connection
 */
export const registerSseClient = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Write handshake message to establish connection immediately
    res.write(`event: handshake\ndata: ${JSON.stringify({ status: 'connected', epoch: Date.now() })}\n\n`);

    clients.push(res);
    console.log(`   [SseManager] Connected client registered. Total active: ${clients.length}`);

    // Remove client on connection closure
    req.on('close', () => {
        clients = clients.filter(c => c !== res);
        console.log(`   [SseManager] Client disconnected. Total active: ${clients.length}`);
    });
};

/**
 * Broadcasts an event payload to all active client streams
 * @param {string} eventName Event identifier string
 * @param {Object} payload JSON serialize-ready data object
 */
export const broadcastSseEvent = (eventName, payload) => {
    const dataString = JSON.stringify(payload);
    
    // Format conforming strictly to W3C text/event-stream specs
    const sseMessage = `event: ${eventName}\ndata: ${dataString}\n\n`;

    let activeBroadcasts = 0;
    clients.forEach(res => {
        try {
            res.write(sseMessage);
            activeBroadcasts++;
        } catch (err) {
            console.error('   [SseManager] Failed to write to connection socket:', err.message);
        }
    });

    return activeBroadcasts;
};

/**
 * Returns number of active listeners
 */
export const getActiveListenerCount = () => {
    return clients.length;
};

/**
 * Resets active clients references
 */
export const clearSseConnections = () => {
    clients = [];
};
