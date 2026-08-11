import { processClientSync, serverDatabase, clearServerDatabase } from './offlineSync.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Offline-First Sync Engine Validation               ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    clearServerDatabase();

    const clientMutations = [
        // 1. Valid insert
        {
            txId: 'tx_op_001',
            action: 'SET',
            key: 'inventory_bananas',
            value: { qty: 100 },
            timestamp: 2000
        },
        // 2. Valid insert
        {
            txId: 'tx_op_002',
            action: 'SET',
            key: 'wallet_balance_user12',
            value: { amount: 450 },
            timestamp: 3000
        },
        // 3. Duplicate Transaction (retry logic check)
        {
            txId: 'tx_op_001',
            action: 'SET',
            key: 'inventory_bananas',
            value: { qty: 100 },
            timestamp: 2000
        },
        // 4. Out-of-order older write conflict (should be dropped)
        {
            txId: 'tx_op_003',
            action: 'SET',
            key: 'wallet_balance_user12',
            value: { amount: 400 },
            timestamp: 2500 // 2500 < existing 3000 on server
        }
    ];

    console.log('🔵 Phase 1: Submitting client mutations queue to sync engine...');
    const result = processClientSync('farmer_device_101', clientMutations);

    console.log(`   📍 Synchronization Summary: Applied=${result.appliedCount}, Skipped=${result.skippedCount}`);

    // Verify database values
    const bananas = serverDatabase.get('inventory_bananas');
    const balance = serverDatabase.get('wallet_balance_user12');

    console.log(`   📍 inventory_bananas quantity: ${bananas ? bananas.value.qty : 'Null'} (Expected: 100)`);
    console.log(`   📍 wallet_balance_user12 amount: ${balance ? balance.value.amount : 'Null'} (Expected: 450)`);

    const checkOk = result.appliedCount === 2 && 
                    result.skippedCount === 2 &&
                    bananas && bananas.value.qty === 100 &&
                    balance && balance.value.amount === 450;

    if (checkOk) {
        console.log('   ✅ PASS: Sync engine successfully de-duplicated packets and resolved out-of-order writes.');
        console.log('\n🎉 SUCCESS: All Offline-First Sync validations passed successfully!');
    } else {
        console.error('   ❌ FAIL: Synchronization reconciliation checks failed.');
        process.exit(1);
    }
};

runVerification().catch(err => console.error(err));
