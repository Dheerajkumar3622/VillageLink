import { SessionSyncCoordinator } from './sessionSync.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Local Session Storage Sync Verification          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const coordinator = new SessionSyncCoordinator();

    console.log('🔵 Test 1: Registering virtual browser tabs...');
    coordinator.registerTab('tab-alpha');
    coordinator.registerTab('tab-beta');
    coordinator.registerTab('tab-gamma');

    console.log('\n🔵 Test 2: Simulating session write (auth login) on Tab Alpha...');
    coordinator.updateSession('tab-alpha', 'userToken', 'secure_jwt_token_8899');

    // Values should immediately propagate to other tabs
    const tokenAlpha = coordinator.getSessionVal('tab-alpha', 'userToken');
    const tokenBeta = coordinator.getSessionVal('tab-beta', 'userToken');
    const tokenGamma = coordinator.getSessionVal('tab-gamma', 'userToken');

    console.log(`   📍 Tab Alpha userToken: "${tokenAlpha}"`);
    console.log(`   📍 Tab Beta userToken: "${tokenBeta}"`);
    console.log(`   📍 Tab Gamma userToken: "${tokenGamma}"`);

    if (tokenBeta === 'secure_jwt_token_8899' && tokenGamma === 'secure_jwt_token_8899') {
        console.log('   ✅ PASS: Authentication token successfully replicated to other tabs.');
    } else {
        console.error('   ❌ FAIL: Session storage write did not propagate.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating cart update on Tab Beta...');
    coordinator.updateSession('tab-beta', 'selectedCropId', 'crop_paddy_20');

    const cropAlpha = coordinator.getSessionVal('tab-alpha', 'selectedCropId');
    console.log(`   📍 Tab Alpha selectedCropId: "${cropAlpha}"`);

    if (cropAlpha === 'crop_paddy_20') {
        console.log('   ✅ PASS: Session state updates from alternate source tabs propagate correctly.');
    } else {
        console.error('   ❌ FAIL: Cross-tab update propagation failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Simulating user logout on Tab Gamma...');
    // Delete session token on Tab Gamma
    coordinator.removeSession('tab-gamma', 'userToken');

    const tokenAlphaAfterDelete = coordinator.getSessionVal('tab-alpha', 'userToken');
    console.log(`   📍 Tab Alpha userToken after logout: "${tokenAlphaAfterDelete}"`);

    if (tokenAlphaAfterDelete === undefined) {
        console.log('   ✅ PASS: Session deletion successfully cleared state across same-origin tabs.');
        console.log('\n🎉 SUCCESS: All Local Session storage sync checks passed!');
    } else {
        console.error('   ❌ FAIL: Session deletion did not propagate.');
        process.exit(1);
    }
};

runVerification();
