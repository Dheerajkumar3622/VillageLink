/**
 * Graceful Shutdown Hooks Manager
 * Coordinates clean termination of HTTP servers and database connections on process signals.
 */

export class GracefulShutdownManager {
    constructor() {
        this.activeConnections = 0;
        this.isShuttingDown = false;
        this.shutdownTimeoutMs = 1000; // Force exit after 1 second
    }

    /**
     * Increments active connections count (call on new request ingress)
     */
    trackConnection() {
        if (this.isShuttingDown) {
            throw new Error('[Graceful Shutdown] Server is shutting down, rejecting connection.');
        }
        this.activeConnections++;
    }

    /**
     * Decrements active connections count (call on request egress)
     */
    releaseConnection() {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
    }

    /**
     * Triggers graceful termination sequence
     */
    initiateShutdown(mockServer, mockDb, exitCallback) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log('   [Graceful Shutdown] Intercepted termination signal. Starting cleanup...');

        // 1. Close server to stop accepting new requests
        mockServer.close(() => {
            console.log('   [Graceful Shutdown] Server stopped accepting new connections.');
        });

        // 2. Setup force-kill safety timer
        const forceExitTimeout = setTimeout(() => {
            console.warn('   [Graceful Shutdown] Shutdown timeout reached before connection drain. Forcing exit...');
            mockDb.close();
            exitCallback(1);
        }, this.shutdownTimeoutMs);

        // 3. Monitor active connection drain periodically
        const drainCheckInterval = setInterval(() => {
            console.log(`   [Graceful Shutdown] Waiting for active requests to clear. Pending: ${this.activeConnections}`);
            
            if (this.activeConnections === 0) {
                clearInterval(drainCheckInterval);
                clearTimeout(forceExitTimeout);
                
                // Close database connections safely
                mockDb.close();
                console.log('   [Graceful Shutdown] All connections drained and database connections released.');
                exitCallback(0);
            }
        }, 100);
    }
}
