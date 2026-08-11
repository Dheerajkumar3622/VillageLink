import { insertTieredRecord, queryTieredRecord, archiveAgedData, getTierStats } from './dataTiering.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Hot/Cold Data Tiering Validation                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    const keyHot = 'trip_active_7812';
    const keyCold = 'trip_history_0911';

    console.log('🔵 Phase 1: Inserting records into active (HOT) storage...');
    
    // Active trip (created right now)
    insertTieredRecord(keyHot, { route: 'Sasaram -> Patna', status: 'IN_TRANSIT' }, Date.now());

    // Historical trip (simulated as created 20 seconds ago)
    insertTieredRecord(keyCold, { route: 'Gaya -> Sasaram', status: 'DELIVERED' }, Date.now() - 20000);

    const statsPre = getTierStats();
    console.log(`   📍 Pre-archive Tier Sizes: HOT=${statsPre.hotSize}, COLD=${statsPre.coldSize}`);

    const resColdPre = queryTieredRecord(keyCold);
    console.log(`   📍 Query historical record (pre-archive): Tier resolved -> ${resColdPre ? resColdPre.tier : 'Null'}`);

    if (statsPre.hotSize === 2 && resColdPre.tier === 'HOT') {
        console.log('   ✅ PASS: Both records successfully initialized inside HOT active store.');
    } else {
        console.error('   ❌ FAIL: Tier state invalid pre-migration.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Simulating 10-second threshold archiving sweep...');
    // Archive anything older than 10000ms (10 seconds)
    archiveAgedData(10000);

    const statsPost = getTierStats();
    console.log(`   📍 Post-archive Tier Sizes: HOT=${statsPost.hotSize}, COLD=${statsPost.coldSize}`);

    // Resolve unified queries
    const resolvedHot = queryTieredRecord(keyHot);
    const resolvedCold = queryTieredRecord(keyCold);

    console.log(`   📍 Active Record: Resolved from tier [${resolvedHot ? resolvedHot.tier : 'Null'}]`);
    console.log(`   📍 Archived Record: Resolved from tier [${resolvedCold ? resolvedCold.tier : 'Null'}]`);

    const okHot = resolvedHot && resolvedHot.tier === 'HOT' && resolvedHot.data.status === 'IN_TRANSIT';
    const okCold = resolvedCold && resolvedCold.tier === 'COLD' && resolvedCold.data.status === 'DELIVERED';

    if (statsPost.hotSize === 1 && statsPost.coldSize === 1 && okHot && okCold) {
        console.log('   ✅ PASS: Automated migration and unified query routing validated.');
        console.log('\n🎉 SUCCESS: All Hot/Cold Data Tiering tests passed successfully!');
    } else {
        console.error('   ❌ FAIL: Data tiering checks mismatch.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
