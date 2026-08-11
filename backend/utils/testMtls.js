import { CertificateAuthority, MtlsServer } from './mtlsHandshake.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               mTLS Bidirectional Handshake Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const trustedCA = new CertificateAuthority('VillageLink Root CA');
    const rogueCA = new CertificateAuthority('Rogue Hacker CA');

    // 1. Issue server and valid client certificates
    const serverCert = trustedCA.issueCertificate('Mandi-Database-Node');
    const clientCert = trustedCA.issueCertificate('Logistics-Coordination-Node');

    // 2. Issue revoked client cert
    const revokedClientCert = trustedCA.issueCertificate('Suspended-Driver-Terminal', true);

    // 3. Issue spoofed server cert from rogue CA
    const rogueServerCert = rogueCA.issueCertificate('Mandi-Database-Node');

    const server = new MtlsServer('Mandi-DB-Server', trustedCA);

    console.log('🔵 Test 1: Initiating mTLS handshake with trusted server and client certificates...');
    
    try {
        const session = server.performHandshake(clientCert, serverCert);
        console.log(`   📍 Connection Status: ${session.status}`);
        console.log(`   📍 Cryptography Suite: ${session.sessionCipher} (${session.protocolVersion})`);

        if (session.status === 'ESTABLISHED') {
            console.log('   ✅ PASS: Bidirectional mTLS connection successfully established.');
        }
    } catch (err) {
        console.error('   ❌ FAIL: Trusted handshake aborted incorrectly:', err.message);
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Server rejecting handshake with revoked client certificate...');

    try {
        server.performHandshake(revokedClientCert, serverCert);
        console.error('   ❌ FAIL: Server accepted revoked certificate!');
        process.exit(1);
    } catch (err) {
        console.log(`   📍 Caught expected error: "${err.message}"`);
        console.log('   ✅ PASS: Server successfully blocked revoked client node connection.');
    }

    console.log('\n🔵 Test 3: Client rejecting handshake with spoofed server certificate...');

    try {
        server.performHandshake(clientCert, rogueServerCert);
        console.error('   ❌ FAIL: Client accepted rogue server certificate!');
        process.exit(1);
    } catch (err) {
        console.log(`   📍 Caught expected error: "${err.message}"`);
        console.log('   ✅ PASS: Client successfully blocked untrusted server connection.');
        console.log('\n🎉 SUCCESS: All Mutual TLS checks passed!');
    }
};

runVerification();
