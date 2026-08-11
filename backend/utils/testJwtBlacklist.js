import { JwtBlacklist } from './jwtBlacklist.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               JWT Blacklist Token Revocation Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    const manager = new JwtBlacklist();
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockSignature123';

    console.log('🔵 Test 1: Checking non-blacklisted active token status...');
    
    const initialCheck = manager.isTokenRevoked(mockToken);
    console.log(`   📍 Token Revoked: ${initialCheck}`);

    if (!initialCheck) {
        console.log('   ✅ PASS: Active token is not blacklisted by default.');
    } else {
        console.error('   ❌ FAIL: Active token reported as blacklisted.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Revoking token with short TTL...');

    // Revoke token for 200ms
    manager.revokeToken(mockToken, 200);

    const revokedCheck = manager.isTokenRevoked(mockToken);
    console.log(`   📍 Token Revoked: ${revokedCheck}`);

    if (revokedCheck) {
        console.log('   ✅ PASS: Token successfully logged as blacklisted.');
    } else {
        console.error('   ❌ FAIL: Revoked token was not blacklisted.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Validating automatic TTL memory eviction...');

    // Wait 300ms for TTL eviction timer to clear token from blacklist map
    await delay(300);

    const expiredCheck = manager.isTokenRevoked(mockToken);
    console.log(`   📍 Token Revoked: ${expiredCheck}`);

    if (!expiredCheck) {
        console.log('   ✅ PASS: Token automatically evicted from blacklist map after expiry TTL.');
        console.log('\n🎉 SUCCESS: All JWT Blacklist checks passed!');
    } else {
        console.error('   ❌ FAIL: Expired token was not cleaned from memory.');
        process.exit(1);
    }

    manager.clearAllTimers();
};

runVerification();
