import { SurgePricingEngine } from './surgePricing.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Dynamic Surge Pricing AI Multiplier Validation   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const engine = new SurgePricingEngine();

    console.log('🔵 Test 1: Calculating baseline pricing (Healthy supply/demand ratio)...');
    
    const result1 = engine.calculateSurgeMultiplier(10, 5, 'Clear');
    console.log(`   📍 Multiplier: ${result1.totalSurgeMultiplier}x (Ratio Surge: ${result1.ratioSurge}, Weather: ${result1.weatherSurge})`);

    if (result1.totalSurgeMultiplier === 1.0) {
        console.log('   ✅ PASS: Baseline rate of 1.0x returned under low demand.');
    } else {
        console.error('   ❌ FAIL: Baseline rate mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Calculating congestion surge (High demand, low driver count)...');
    
    const result2 = engine.calculateSurgeMultiplier(2, 8, 'Clear');
    console.log(`   📍 Multiplier: ${result2.totalSurgeMultiplier}x (Ratio Surge: ${result2.ratioSurge}, Weather: ${result2.weatherSurge})`);

    // Expected: ratio = 4.0. Over 1.5 is 2.5. ratioSurge = 2.5 * 0.2 = 0.5. Total = 1.0 + 0.5 = 1.5.
    if (result2.totalSurgeMultiplier === 1.5) {
        console.log('   ✅ PASS: Correct supply-demand ratio surge applied.');
    } else {
        console.error('   ❌ FAIL: Congestion ratio surge mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Calculating hazard surge (Congestion + Rainy Weather)...');
    
    const result3 = engine.calculateSurgeMultiplier(2, 8, 'Rainy');
    console.log(`   📍 Multiplier: ${result3.totalSurgeMultiplier}x (Ratio Surge: ${result3.ratioSurge}, Weather: ${result3.weatherSurge})`);

    // Expected: ratio surge = 0.5. weather surge = 0.25. Total = 1.75.
    if (result3.totalSurgeMultiplier === 1.75) {
        console.log('   ✅ PASS: Correct weather hazard premium added.');
    } else {
        console.error('   ❌ FAIL: Hazard weather surge calculation mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Enforcing maximum pricing cap guardrails under extreme conditions...');
    
    const result4 = engine.calculateSurgeMultiplier(1, 15, 'Stormy');
    console.log(`   📍 Multiplier: ${result4.totalSurgeMultiplier}x (Ratio Surge: ${result4.ratioSurge}, Weather: ${result4.weatherSurge})`);

    // Expected raw multiplier = 1.0 + (15 - 1.5)*0.2 + 0.5 = 4.2x. Capped at 2.50x.
    if (result4.totalSurgeMultiplier === 2.50) {
        console.log('   ✅ PASS: Pricing capped successfully at the maximum threshold limit.');
        console.log('\n🎉 SUCCESS: All Dynamic Surge Pricing AI checks passed!');
    } else {
        console.error('   ❌ FAIL: Pricing guardrail limits not enforced.');
        process.exit(1);
    }
};

runVerification();
