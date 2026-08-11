import { isFeatureAllowed, executeTaskWithFallback } from './gracefulDegradation.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Graceful Degradation (Fallback Mode) Validation  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    // Actions & Fallbacks
    const normalBooking = () => 'LIVE_BOOKING_DISPATCHED';
    const fallbackBooking = () => 'QUEUE_OFFLINE_BOOKING_DRAFT';
    
    const normalGps = () => 'STREAMING_REALTIME_MAP_GPS';
    const fallbackGps = () => 'STATIC_TEXT_COORDINATES';

    const normalVision = () => 'AR_GEMINI_VISION_CROP_QUALITY_ADVISOR';
    const fallbackVision = () => 'FALLBACK_TEXT_PRICE_LIST';

    console.log('🔵 Test 1: Evaluating feature operations under NORMAL load...');
    
    const resBookingNormal = executeTaskWithFallback('BOOKING_ENGINE', 'NORMAL', normalBooking, fallbackBooking);
    const resGpsNormal = executeTaskWithFallback('LIVE_MAP_GPS', 'NORMAL', normalGps, fallbackGps);
    const resVisionNormal = executeTaskWithFallback('AR_GRADE_VISION', 'NORMAL', normalVision, fallbackVision);

    console.log(`   📍 Booking: ${resBookingNormal} (Expected: LIVE_BOOKING_DISPATCHED)`);
    console.log(`   📍 Live GPS: ${resGpsNormal} (Expected: STREAMING_REALTIME_MAP_GPS)`);
    console.log(`   📍 Crop Vision: ${resVisionNormal} (Expected: AR_GEMINI_VISION_CROP_QUALITY_ADVISOR)`);

    const test1Ok = resBookingNormal === 'LIVE_BOOKING_DISPATCHED' &&
                    resGpsNormal === 'STREAMING_REALTIME_MAP_GPS' &&
                    resVisionNormal === 'AR_GEMINI_VISION_CROP_QUALITY_ADVISOR';

    if (test1Ok) {
        console.log('   ✅ PASS: All features fully active under normal conditions.');
    } else {
        console.error('   ❌ FAIL: Feature blocks misbehaved on normal load.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Evaluating feature operations under HIGH_LOAD...');
    
    const resBookingHigh = executeTaskWithFallback('BOOKING_ENGINE', 'HIGH_LOAD', normalBooking, fallbackBooking);
    const resGpsHigh = executeTaskWithFallback('LIVE_MAP_GPS', 'HIGH_LOAD', normalGps, fallbackGps);
    const resVisionHigh = executeTaskWithFallback('AR_GRADE_VISION', 'HIGH_LOAD', normalVision, fallbackVision);

    console.log(`   📍 Booking: ${resBookingHigh} (Expected: LIVE_BOOKING_DISPATCHED)`);
    console.log(`   📍 Live GPS: ${resGpsHigh} (Expected: STREAMING_REALTIME_MAP_GPS)`);
    console.log(`   📍 Crop Vision: ${resVisionHigh} (Expected: FALLBACK_TEXT_PRICE_LIST)`);

    const test2Ok = resBookingHigh === 'LIVE_BOOKING_DISPATCHED' &&
                    resGpsHigh === 'STREAMING_REALTIME_MAP_GPS' &&
                    resVisionHigh === 'FALLBACK_TEXT_PRICE_LIST';

    if (test2Ok) {
        console.log('   ✅ PASS: Crop Vision degraded dynamically, preserving Booking & GPS.');
    } else {
        console.error('   ❌ FAIL: High load fallback routing failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Evaluating feature operations under CRITICAL load...');
    
    const resBookingCritical = executeTaskWithFallback('BOOKING_ENGINE', 'CRITICAL', normalBooking, fallbackBooking);
    const resGpsCritical = executeTaskWithFallback('LIVE_MAP_GPS', 'CRITICAL', normalGps, fallbackGps);
    const resVisionCritical = executeTaskWithFallback('AR_GRADE_VISION', 'CRITICAL', normalVision, fallbackVision);

    console.log(`   📍 Booking: ${resBookingCritical} (Expected: LIVE_BOOKING_DISPATCHED)`);
    console.log(`   📍 Live GPS: ${resGpsCritical} (Expected: STATIC_TEXT_COORDINATES)`);
    console.log(`   📍 Crop Vision: ${resVisionCritical} (Expected: FALLBACK_TEXT_PRICE_LIST)`);

    const test3Ok = resBookingCritical === 'LIVE_BOOKING_DISPATCHED' &&
                    resGpsCritical === 'STATIC_TEXT_COORDINATES' &&
                    resVisionCritical === 'FALLBACK_TEXT_PRICE_LIST';

    if (test3Ok) {
        console.log('   ✅ PASS: Secondary GPS mapping degraded, ensuring Booking core pipeline remains active.');
        console.log('\n🎉 SUCCESS: All Graceful Degradation verification checks passed!');
    } else {
        console.error('   ❌ FAIL: Critical load fallback routing failed.');
        process.exit(1);
    }
};

runVerification();
