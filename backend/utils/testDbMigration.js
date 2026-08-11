import { DbMigrationEngine } from './dbMigration.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Blue-Green DB Schema Migrations Verification    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const db = new DbMigrationEngine();

    console.log('🔵 Test 1: Simulating historical records (legacy schema)...');
    
    // Legacy database status: only has first_name and last_name
    db.usersTable.push({
        id: 'u-101',
        first_name: 'Amit',
        last_name: 'Sharma'
    });

    console.log('🔵 Test 2: Transitioning to EXPAND phase (Dual-write starts)...');
    db.setPhase('EXPAND');

    const u102 = db.insertUser('u-102', 'Dheeraj', 'Kumar');
    console.log('   📍 Inserted User 102 Record:', JSON.stringify(u102, null, 2));

    if (u102.first_name === 'Dheeraj' && u102.fullname === 'Dheeraj Kumar') {
        console.log('   ✅ PASS: Dual-write populates legacy fields and unified field concurrently.');
    } else {
        console.error('   ❌ FAIL: Dual-write failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Transitioning to SYNC phase (Backfilling historical records)...');
    db.setPhase('SYNC');
    
    const backfilledCount = db.backfillHistory();
    const u101 = db.readUser('u-101');
    console.log('   📍 Backfilled User 101 Record:', JSON.stringify(u101, null, 2));

    if (backfilledCount === 1 && u101.fullname === 'Amit Sharma') {
        console.log('   ✅ PASS: Historical data safely mapped onto the expanded schema structure.');
    } else {
        console.error('   ❌ FAIL: Backfill failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Transitioning to CONTRACT phase (Dropping legacy fields)...');
    db.setPhase('CONTRACT');

    // New insertions during CONTRACT phase write ONLY to new fields
    const u103 = db.insertUser('u-103', 'Vikram', 'Singh');
    console.log('   📍 User 103 Record written during CONTRACT:', JSON.stringify(db.usersTable.find(u => u.id === 'u-103'), null, 2));

    const readU102 = db.readUser('u-102');
    console.log('   📍 User 102 Record read during CONTRACT:', JSON.stringify(readU102, null, 2));

    const legacyColumnsDropped = !('first_name' in readU102) && !('last_name' in readU102);

    if (legacyColumnsDropped && u103.fullname === 'Vikram Singh' && !u103.first_name) {
        console.log('   ✅ PASS: Zero-downtime DB Schema upgrade completed successfully.');
        console.log('\n🎉 SUCCESS: All Blue-Green DB Schema Migrations checks passed!');
    } else {
        console.error('   ❌ FAIL: Legacy columns not dropped or CONTRACT write failed.');
        process.exit(1);
    }
};

runVerification();
