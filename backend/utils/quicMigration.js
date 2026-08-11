/**
 * QUIC Connection Migration Manager (Simulator)
 * Maps connection IDs (CIDs) to client network address endpoints.
 * Handles seamless client IP handovers (WiFi <-> LTE) without connection teardown.
 */

const quicRegistry = new Map();

/**
 * Registers an active connection session under a unique QUIC Connection ID
 */
export const registerQuicConnection = (cid, ip, port, networkType = 'WIFI') => {
    quicRegistry.set(cid, {
        ip,
        port,
        networkType,
        lastPacketAt: Date.now(),
        packetsReceived: 0
    });
};

/**
 * Handles incoming packets under a QUIC CID.
 * Detects client IP/port changes and executes connection migration.
 */
export const receiveQuicPacket = (cid, clientIp, clientPort, networkType = 'WIFI') => {
    const session = quicRegistry.get(cid);
    
    if (!session) {
        // First packet, register session
        registerQuicConnection(cid, clientIp, clientPort, networkType);
        return { migrated: false, status: 'CONNECTED' };
    }

    session.lastPacketAt = Date.now();
    session.packetsReceived += 1;

    // Check if network tuple has migrated
    if (session.ip !== clientIp || session.port !== clientPort) {
        const oldIp = session.ip;
        const oldPort = session.port;
        const oldNet = session.networkType;

        // Perform connection migration
        session.ip = clientIp;
        session.port = clientPort;
        session.networkType = networkType;

        console.log(
            `🚀 QUIC Migration: Connection ${cid.slice(0, 8)}... migrated successfully!\n` +
            `   From: [${oldNet}] ${oldIp}:${oldPort}\n` +
            `   To:   [${networkType}] ${clientIp}:${clientPort}`
        );

        return {
            migrated: true,
            status: 'MIGRATED',
            from: { ip: oldIp, port: oldPort, network: oldNet },
            to: { ip: clientIp, port: clientPort, network: networkType }
        };
    }

    return { migrated: false, status: 'ACTIVE' };
};

/**
 * Debug print helper
 */
export const printQuicRegistryStatus = () => {
    console.log('✅ QUIC Connection Migration Registry initialized (HTTP/3 connection tracking active).');
};
