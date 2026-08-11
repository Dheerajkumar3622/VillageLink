/**
 * Nginx HTTP/3 QUIC Proxy and Session Migration Simulator
 * Evaluates handshake timing differentials and connection IP switches.
 */

export class NginxQuicSimulator {
    constructor() {
        this.connections = new Map();
        this.oneWayRttMs = 40; // Simulated mobile network RTT: 40ms
    }

    /**
     * Simulates client connection handshake
     */
    establishConnection(clientId, ipAddress, mode = '1-RTT') {
        const connectionId = `cid-${Math.floor(Math.random() * 900000) + 100000}`;
        let handshakeMs = 0;

        if (mode === 'TCP_TLS') {
            // TCP Handshake (1 RTT) + TLS Key Exchange (2 RTT) = 3 RTT
            handshakeMs = this.oneWayRttMs * 3;
        } else if (mode === '1-RTT') {
            // QUIC Initial Handshake = 1 RTT
            handshakeMs = this.oneWayRttMs * 1;
        } else if (mode === '0-RTT') {
            // QUIC Session Resumption = 0 RTT
            handshakeMs = 0;
        }

        const session = {
            clientId,
            clientIp: ipAddress,
            establishedAt: Date.now(),
            mode
        };

        this.connections.set(connectionId, session);

        return {
            connectionId,
            handshakeMs,
            status: 'ESTABLISHED'
        };
    }

    /**
     * Simulates client switching networks (IP migration) while maintaining connection ID
     */
    migrateConnection(connectionId, newIpAddress) {
        const session = this.connections.get(connectionId);
        
        if (!session) {
            throw new Error(`[Nginx QUIC] Connection ID "${connectionId}" not found.`);
        }

        const oldIp = session.clientIp;
        session.clientIp = newIpAddress; // Update session IP without resetting TLS state
        
        console.log(`   [Nginx QUIC] Connection Migration: Client IP changed from "${oldIp}" to "${newIpAddress}".`);

        return {
            status: 'MIGRATED',
            rehandshakeRequired: false,
            handshakeMs: 0 // Zero packet re-handshake latency
        };
    }
}
