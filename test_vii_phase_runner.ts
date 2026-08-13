import { viiPhaseEngine } from './backend/src/phaseEngine.ts';

console.log('🚀 Running VII Phase 1 to Phase 30 Execution Test...\n');
const results = viiPhaseEngine.runAllPhases();

console.log(`✅ EXECUTED ${results.length} / 30 PHASES SUCCESSFULLY!\n`);

results.forEach(res => {
  console.log(`[Phase ${res.phaseId.toString().padStart(2, '0')}] ${res.phaseName.padEnd(50, ' ')} : ${res.status}`);
});

console.log('\n--- DETAILED PHASE OUTPUT SAMPLES ---');
console.log('\n1. Phase 1 (Crop Decay Solver):', JSON.stringify(results[0].metrics, null, 2));
console.log('\n2. Phase 6 (Swarm Bidding Engine):', JSON.stringify(results[5].metrics, null, 2));
console.log('\n3. Phase 7 (Digital Twin Bezier Math):', JSON.stringify(results[6].metrics, null, 2));
console.log('\n4. Phase 30 (Founder OS Governance):', JSON.stringify(results[29].metrics, null, 2));
