import { generateTraceId, startActiveSpan, endActiveSpan } from './openTelemetry.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Distributed Tracing OpenTelemetry Validation     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    console.log('🔵 Phase 1: Initiating transaction context root trace spans...');

    const rootTraceId = generateTraceId();
    console.log(`   📍 W3C Root TraceID Generated: ${rootTraceId}`);

    // Start Parent Span
    const parentSpan = startActiveSpan('CREATE_BOOKING', rootTraceId);
    await delay(100);

    console.log('\n🔵 Phase 2: Simulating nested child service operations...');

    // Child Span 1: surge calculation
    const childSpan1 = startActiveSpan('CALCULATE_SURGE_MULTIPLIER', parentSpan.traceId, parentSpan.spanId);
    await delay(60);
    const traceLog1 = endActiveSpan(childSpan1, { service: 'pricing-api', geohash: '83f43b' });

    // Child Span 2: seat lock reservation
    const childSpan2 = startActiveSpan('RESERVE_SEAT_LOCKS', parentSpan.traceId, parentSpan.spanId);
    await delay(90);
    const traceLog2 = endActiveSpan(childSpan2, { service: 'inventory-db', seatNo: 'A2' });

    // End Parent Span
    const traceLogParent = endActiveSpan(parentSpan, { outcome: 'success' });

    console.log('\n🔵 Phase 3: Asserting trace correlation tree mappings...');

    const traceIdOk = traceLog1.traceId === rootTraceId &&
                      traceLog2.traceId === rootTraceId &&
                      traceLogParent.traceId === rootTraceId;

    const parentIdOk = traceLog1.parentSpanId === parentSpan.spanId &&
                       traceLog2.parentSpanId === parentSpan.spanId &&
                       traceLogParent.parentSpanId === null;

    const durationsOk = traceLog1.durationMs >= 50 &&
                        traceLog2.durationMs >= 80 &&
                        traceLogParent.durationMs >= 240;

    console.log(`   📍 Trace Correlation Match: ${traceIdOk}`);
    console.log(`   📍 Parent/Child Span Linking Match: ${parentIdOk}`);
    console.log(`   📍 Latency Metrics Capture: ${durationsOk}`);

    if (traceIdOk && parentIdOk && durationsOk) {
        console.log('   ✅ PASS: Trace spans generated W3C header graphs correctly.');
        console.log('\n🎉 SUCCESS: All Distributed Tracing assertions passed!');
    } else {
        console.error('   ❌ FAIL: Trace ID context propagation failed.');
        process.exit(1);
    }
};

runVerification();
