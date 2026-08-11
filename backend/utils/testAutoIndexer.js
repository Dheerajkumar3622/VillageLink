import { DatabaseAutoIndexer } from './autoIndexer.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Database Auto-Indexing Plan Verification         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const analyzer = new DatabaseAutoIndexer();

    console.log('🔵 Test 1: Simulating repetitive slow COLLSCAN query patterns...');
    
    // Log first two queries (unindexed COLLSCAN)
    analyzer.logQuery('orders', 'region', 85, 'COLLSCAN');
    analyzer.logQuery('orders', 'region', 75, 'COLLSCAN');
    
    let recommendations = analyzer.analyze();
    console.log(`   📍 Frequency: 2 queries | Recommendations compiled: ${recommendations.length}`);

    // Log third query to reach frequency threshold
    analyzer.logQuery('orders', 'region', 90, 'COLLSCAN');
    recommendations = analyzer.analyze();
    console.log(`   📍 Frequency: 3 queries | Recommendations compiled: ${recommendations.length}`);
    
    if (recommendations.length === 1 && recommendations[0].field === 'region') {
        console.log(`   ✅ PASS: Slow query pattern audit generated recommended index: "${recommendations[0].recommendation}"`);
    } else {
        console.error('   ❌ FAIL: Index recommendation criteria not met.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Applying index recommendations to the database engine...');

    const appliedCount = analyzer.applyRecommendations(recommendations);
    console.log(`   📍 Applied Indexes Count: ${appliedCount}`);

    if (appliedCount === 1 && analyzer.appliedIndexes.has('orders:region')) {
        console.log('   ✅ PASS: Dynamically applied index target registration verified.');
    } else {
        console.error('   ❌ FAIL: Index execution application failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Verifying subsequent queries resolve via index scan (IXSCAN)...');

    // Ingest another query. It should resolve as IXSCAN automatically.
    analyzer.logQuery('orders', 'region', 2); // 2ms index scan
    const lastLog = analyzer.slowQueryLogs[analyzer.slowQueryLogs.length - 1];
    console.log(`   📍 Query Scan Type Resolved: ${lastLog.scanType}`);
    console.log(`   📍 Query Execution Latency: ${lastLog.durationMs}ms`);

    if (lastLog.scanType === 'IXSCAN' && lastLog.durationMs < 5) {
        console.log('   ✅ PASS: Target query successfully shifted from COLLSCAN to IXSCAN.');
        console.log('\n🎉 SUCCESS: All Database Auto-indexing analysis checks passed!');
    } else {
        console.error('   ❌ FAIL: Query did not utilize the new index.');
        process.exit(1);
    }
};

runVerification();
