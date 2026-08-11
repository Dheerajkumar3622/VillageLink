import { LocalVideoProcessor } from './edgeVideoProcessing.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Edge AI Video Processing Validation              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const processor = new LocalVideoProcessor();

    console.log('🔵 Test 1: Processing frame stream locally on driver mobile client...');

    // Frame 1: 3 cargo bags detected
    const frame1 = {
        detectedObjects: [
            { class: 'crop_bag', confidence: 0.96 },
            { class: 'crop_bag', confidence: 0.94 },
            { class: 'crop_bag', confidence: 0.91 }
        ]
    };
    processor.processFrame(frame1);

    // Frame 2: 5 cargo bags detected (cargo loading in progress)
    const frame2 = {
        detectedObjects: [
            { class: 'crop_bag', confidence: 0.98 },
            { class: 'crop_bag', confidence: 0.97 },
            { class: 'crop_bag', confidence: 0.95 },
            { class: 'crop_bag', confidence: 0.94 },
            { class: 'crop_bag', confidence: 0.90 }
        ]
    };
    processor.processFrame(frame2);

    // Frame 3: Defect check (security seal is broken)
    const frame3 = {
        detectedObjects: [
            { class: 'crop_bag', confidence: 0.93 },
            { class: 'broken_seal', confidence: 0.89 }
        ]
    };
    processor.processFrame(frame3);

    console.log(`   📍 Frames processed: ${processor.processedFramesCount}`);
    console.log(`   📍 Peak crop bags detected: ${processor.bagsCount}`);
    console.log(`   📍 Seal violations logged: ${processor.sealViolationsCount}`);

    console.log('\n🔵 Test 2: Compiling metadata and calculating bandwidth savings...');

    const telemetryReport = processor.generateTelemetryEvent('SESSION-BASMATI-881');

    console.log(`   📍 Telemetry Payload Size: ${telemetryReport.payloadSize}`);
    console.log(`   📍 Telemetry Payload Content:`, telemetryReport.metadata);
    console.log(`   📍 Bandwidth Savings (vs uploading raw video): ${telemetryReport.bandwidthSavings}`);

    const testOk = telemetryReport.metadata.totalBagsLoaded === 5 &&
                   telemetryReport.metadata.secureSealIntact === false &&
                   parseFloat(telemetryReport.bandwidthSavings) > 99.0;

    if (testOk) {
        console.log('   ✅ PASS: Local frame objects aggregated correctly; bandwidth optimized by >99%.');
        console.log('\n🎉 SUCCESS: All Edge AI Video Processing checks passed!');
    } else {
        console.error('   ❌ FAIL: Edge vision aggregation metrics mismatch.');
        process.exit(1);
    }
};

runVerification();
