import { NginxQuicSimulator } from './nginxQuicSimulator.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Nginx Reverse Proxy HTTP/3 QUIC Verification     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const proxy = new NginxQuicSimulator();

    console.log('🔵 Test 1: Connecting client via HTTP/3 (QUIC 1-RTT Handshake)...');
    
    const conn1 = proxy.establishConnection('farmer-kisan-10', '103.55.99.12', '1-RTT');
    console.log(`   📍 Connection ID: ${conn1.connectionId}`);
    console.log(`   📍 Handshake Time: ${conn1.handshakeMs}ms`);

    if (conn1.status === 'ESTABLISHED' && conn1.handshakeMs === 40) {
        console.log('   ✅ PASS: QUIC 1-RTT session established in 1 round trip.');
    } else {
        console.error('   ❌ FAIL: QUIC session setup timing mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating mobile connection migration (IP change)...');

    // Client switches from Wi-Fi to cellular data IP
    const migrationRes = proxy.migrateConnection(conn1.connectionId, '103.88.42.204');
    console.log(`   📍 Migration Status: ${migrationRes.status}`);
    console.log(`   📍 Handshake Time: ${migrationRes.handshakeMs}ms`);
    console.log(`   📍 Re-handshake Required: ${migrationRes.rehandshakeRequired}`);

    if (migrationRes.status === 'MIGRATED' && migrationRes.handshakeMs === 0 && !migrationRes.rehandshakeRequired) {
        console.log('   ✅ PASS: Connection successfully migrated without packet re-handshake latency.');
    } else {
        console.error('   ❌ FAIL: Connection migration dropped session or required re-handshake.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Comparing connection handshake latency (TCP vs HTTP/3)...');

    const tcpConn = proxy.establishConnection('driver-yatra-1', '103.55.99.12', 'TCP_TLS');
    const quic0Rtt = proxy.establishConnection('farmer-kisan-10', '103.88.42.204', '0-RTT');

    console.log(`   📍 TCP + TLS Handshake Duration: ${tcpConn.handshakeMs}ms`);
    console.log(`   📍 QUIC 1-RTT Handshake Duration: ${conn1.handshakeMs}ms`);
    console.log(`   📍 QUIC 0-RTT Session Resumption Duration: ${quic0Rtt.handshakeMs}ms`);

    if (quic0Rtt.handshakeMs === 0 && conn1.handshakeMs < tcpConn.handshakeMs) {
        console.log('   ✅ PASS: QUIC protocol eliminates 3-way TCP handshake overhead.');
        console.log('\n🎉 SUCCESS: All Nginx Reverse Proxy with QUIC checks passed!');
    } else {
        console.error('   ❌ FAIL: Handshake latency comparison mismatch.');
        process.exit(1);
    }
};

runVerification();
