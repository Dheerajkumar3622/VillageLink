import { LocalCropClassifier } from './onDeviceMl.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               On-Device ML Inference Offline Diagnostics Check ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    const classifier = new LocalCropClassifier();

    console.log('🔵 Test 1: Simulating local model weights loading into browser/device indexDB...');
    console.log(`   📍 Loaded State Before: ${classifier.modelLoaded}`);
    
    await classifier.loadModel('/assets/models/rice-grade-v2.bin');

    console.log(`   📍 Loaded State After: ${classifier.modelLoaded}`);

    if (classifier.modelLoaded) {
        console.log('   ✅ PASS: Local model compiled successfully.');
    } else {
        console.error('   ❌ FAIL: Model loading failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating offline inference for High-Quality Basmati Rice...');

    // Premium Basmati: long grain, dry, low chalkiness
    const metricsA = { grainLength: 7.2, moisturePercent: 12.5, chalkyGrains: 1.0 };
    const predictionA = classifier.predict(metricsA);

    console.log(`   📍 Prediction Grade: "${predictionA.grade}"`);
    console.log(`   📍 Confidence Score: ${(predictionA.confidence * 100).toFixed(1)}%`);
    console.log(`   📍 Local execution latency: ${predictionA.localInferenceTimeMs}ms (Zero Network calls)`);

    const test2Ok = predictionA.grade === 'Premium Grade A (Basmati)' && 
                    predictionA.confidence >= 0.95 &&
                    predictionA.suggestedPriceMultiplier === 1.5;

    if (test2Ok) {
        console.log('   ✅ PASS: High-quality crop metrics matched expected classifier rules.');
    } else {
        console.error('   ❌ FAIL: Premium grade evaluation mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating offline inference for Medium-Grade Rice...');

    // Standard Choice: average grain, low chalkiness
    const metricsB = { grainLength: 5.9, moisturePercent: 13.0, chalkyGrains: 2.0 };
    const predictionB = classifier.predict(metricsB);

    console.log(`   📍 Prediction Grade: "${predictionB.grade}"`);
    console.log(`   📍 Confidence Score: ${(predictionB.confidence * 100).toFixed(1)}%`);
    console.log(`   📍 Local execution latency: ${predictionB.localInferenceTimeMs}ms (Zero Network calls)`);

    const test3Ok = predictionB.grade === 'Grade B (Choice)' && 
                    predictionB.confidence >= 0.85 &&
                    predictionB.suggestedPriceMultiplier === 1.2;

    if (test3Ok) {
        console.log('   ✅ PASS: Medium-quality crop metrics matched expected classifier rules.');
        console.log('\n🎉 SUCCESS: All On-Device ML Inference checks passed!');
    } else {
        console.error('   ❌ FAIL: Medium grade evaluation mismatch.');
        process.exit(1);
    }
};

runVerification();
