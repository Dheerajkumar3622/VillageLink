import { ConsistentHashRing } from './consistentHashing.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Consistent Hash Ring Migration Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const ring = new ConsistentHashRing(45); // 45 virtual nodes per physical node

// Add 3 initial nodes
ring.addNode('cache-server-01');
ring.addNode('cache-server-02');
ring.addNode('cache-server-03');

console.log('✅ Initialized Ring with 3 servers: [01, 02, 03]');

// Generate 1000 mock driver telemetry key IDs
const totalKeys = 1000;
const mockKeys = Array.from({ length: totalKeys }, (_, i) => `telemetry_driver_key_id_${i}`);

// Route initial keys
const initialMappings = new Map();
const distribution = { 'cache-server-01': 0, 'cache-server-02': 0, 'cache-server-03': 0 };

mockKeys.forEach(key => {
    const node = ring.getNode(key);
    initialMappings.set(key, node);
    distribution[node] = (distribution[node] || 0) + 1;
});

console.log('\n📊 Key Distribution (Initial 3 Nodes):');
Object.keys(distribution).forEach(node => {
    console.log(`   📍 Node [${node}]: ${distribution[node]} keys (${(distribution[node] / totalKeys * 100).toFixed(1)}%)`);
});

// Add a 4th server node to scale cache capacity
console.log('\n⚡ Scaling Ring capacity: Adding "cache-server-04"...');
ring.addNode('cache-server-04');

// Re-route and calculate key migrations
let migratedKeysCount = 0;
const postScaleDistribution = { 'cache-server-01': 0, 'cache-server-02': 0, 'cache-server-03': 0, 'cache-server-04': 0 };

mockKeys.forEach(key => {
    const newNode = ring.getNode(key);
    const oldNode = initialMappings.get(key);
    postScaleDistribution[newNode] = (postScaleDistribution[newNode] || 0) + 1;
    
    if (newNode !== oldNode) {
        migratedKeysCount++;
    }
});

const migrationPercentage = (migratedKeysCount / totalKeys * 100).toFixed(1);
console.log(`\n📊 Key Migration Metrics:`);
console.log(`   📍 Migrated Keys Count:   ${migratedKeysCount} / ${totalKeys}`);
console.log(`   📍 Percentage of Keys Moved: ${migrationPercentage}%`);

console.log('\n📊 New Key Distribution (Post 4 Nodes):');
Object.keys(postScaleDistribution).forEach(node => {
    console.log(`   📍 Node [${node}]: ${postScaleDistribution[node]} keys (${(postScaleDistribution[node] / totalKeys * 100).toFixed(1)}%)`);
});

// MOD Hashing comparison:
// In Modulo sharding (N=3 to N=4), adding a server invalidates roughly 75% of cache keys.
// In Consistent Hashing, it should migrate around ~25% of keys.
const test1Ok = migrationPercentage < 35; // Must be under 35%
if (test1Ok) {
    console.log(`\n   ✅ PASS: Consistent Hashing successfully minimized key migration (${migrationPercentage}% vs ~75% mod hash loss).`);
} else {
    console.error('\n   ❌ FAIL: High migration percentage detected.');
    process.exit(1);
}

// Verify lookup works on individual queries
const queryKey = 'telemetry_driver_key_id_999';
const assignedNode = ring.getNode(queryKey);
console.log(`\n🔍 Single Lookup Test: "${queryKey}" -> Routed to [${assignedNode}]`);
if (assignedNode) {
    console.log('   ✅ PASS: Single key resolution checked.');
} else {
    console.error('   ❌ FAIL: Key lookup returned null.');
    process.exit(1);
}

console.log('\n🎉 SUCCESS: Consistent Hash Ring scaling audits passed successfully!');
