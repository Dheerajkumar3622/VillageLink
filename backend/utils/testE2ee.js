import { E2eeNode, encryptPayload, decryptPayload } from './e2eeManager.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               E2EE Keypair and Sealed Envelope Verification   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Test 1: Instantiating cryptographically secure user nodes...');
    
    const aliceNode = new E2eeNode('Alice-Farmer');
    const bobNode = new E2eeNode('Bob-Driver');

    const alicePublic = aliceNode.getPublicKey();
    const bobPublic = bobNode.getPublicKey();

    console.log(`   📍 Alice Public Key Length: ${alicePublic.length} bytes`);
    console.log(`   📍 Bob Public Key Length: ${bobPublic.length} bytes`);

    if (alicePublic.includes('-----BEGIN PUBLIC KEY-----') && bobPublic.includes('-----BEGIN PUBLIC KEY-----')) {
        console.log('   ✅ PASS: Asymmetric RSA keypairs successfully initialized.');
    } else {
        console.error('   ❌ FAIL: Keypair generation failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Alice sealing coordinate payload using Bob public key...');

    const coordinates = 'Lat: 25.6821, Lng: 85.2145 (Buxar Warehouse #4 Gate)';
    const ciphertext = encryptPayload(bobPublic, coordinates);

    console.log(`   📍 Plaintext Message: "${coordinates}"`);
    console.log(`   📍 Base64 Sealed Envelope: "${ciphertext.slice(0, 60)}..."`);

    if (!ciphertext.includes(coordinates) && ciphertext.length > 50) {
        console.log('   ✅ PASS: Payload successfully converted to secure cryptographic ciphertext.');
    } else {
        console.error('   ❌ FAIL: Payload encryption failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Bob decrypting sealed envelope using his private key...');

    const decryptedText = decryptPayload(bobNode.privateKey, ciphertext);
    console.log(`   📍 Decrypted Message: "${decryptedText}"`);

    if (decryptedText === coordinates) {
        console.log('   ✅ PASS: Bob successfully recovered coordinate coordinates.');
        console.log('\n🎉 SUCCESS: All E2EE asymmetric cryptography checks passed!');
    } else {
        console.error('   ❌ FAIL: Decrypted text mismatch.');
        process.exit(1);
    }
};

runVerification();
