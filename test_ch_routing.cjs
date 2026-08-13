/**
 * Test Script for Contraction Hierarchies (CH) Sub-5ms Routing Engine
 */

const { ContractionHierarchiesEngine } = require('./backend/src/contractionHierarchiesEngine.ts');

async function testCHRouting() {
  console.log('⚡ Testing Contraction Hierarchies (CH) Routing Engine...');

  const t0 = Date.now();
  const result = await ContractionHierarchiesEngine.computeSub5msRoute(
    'Bagen',
    'Sasaram Junction',
    25.59,
    84.12,
    24.95,
    84.03
  );
  const latency = Date.now() - t0;

  console.log('✅ CH Route Calculation Result:', {
    totalDistanceKm: result.totalDistanceKm,
    calculationLatencyMs: `${result.calculationLatencyMs}ms (Total roundtrip: ${latency}ms)`,
    stopsCount: result.nodesSequence.length,
    engine: result.engine
  });

  if (result.calculationLatencyMs <= 5) {
    console.log('🎉 Contraction Hierarchies Sub-5ms Speed Benchmark Passed!');
  } else {
    console.warn(`⚠️ Latency was ${result.calculationLatencyMs}ms (Expected <= 5ms)`);
  }
}

testCHRouting().catch(console.error);
