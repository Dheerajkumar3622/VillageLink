import { BackpressureQueue } from './backpressure.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Backpressure Flow Control Watermark Validation   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    // 1. Initialize Bounded Queue with high watermark 5 and low watermark 2
    const bpQueue = new BackpressureQueue(5, 2);
    let producerPaused = false;

    bpQueue.registerControls(
        () => { producerPaused = true; },
        () => { producerPaused = false; }
    );

    console.log(`🔵 Phase 1: Checking normal queues pushes below high watermark...
      Current Queue size: ${bpQueue.getSize()} | Producer Paused: ${producerPaused}`);

    bpQueue.push({ eventId: 'ev-1' });
    bpQueue.push({ eventId: 'ev-2' });
    bpQueue.push({ eventId: 'ev-3' });
    bpQueue.push({ eventId: 'ev-4' });

    console.log(`   📍 Queue size after 4 pushes: ${bpQueue.getSize()} | Producer Paused: ${producerPaused}`);

    const phase1Ok = bpQueue.getSize() === 4 && !producerPaused;
    if (phase1Ok) {
        console.log('   ✅ PASS: Queue handles incoming packets below limits without backpressure.');
    } else {
        console.error('   ❌ FAIL: Flow control triggered prematurely.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Crossing High Watermark (5 items) to trigger PAUSE...');
    
    // Push 5th item (crosses high watermark)
    bpQueue.push({ eventId: 'ev-5' });
    console.log(`   📍 Queue size: ${bpQueue.getSize()} | Producer Paused: ${producerPaused}`);

    const phase2Ok = bpQueue.getSize() === 5 && producerPaused;
    if (phase2Ok) {
        console.log('   ✅ PASS: High watermark triggered producer PAUSE signal successfully.');
    } else {
        console.error('   ❌ FAIL: Bounded limits failed to trigger backpressure.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 3: Draining queue items to trigger RESUME...');

    // Pop 1
    const p1 = bpQueue.pop(); // Size drops to 4, still paused
    // Pop 2
    const p2 = bpQueue.pop(); // Size drops to 3, still paused
    // Pop 3
    const p3 = bpQueue.pop(); // Size drops to 2 (drains below low watermark), triggers RESUME!

    console.log(`   📍 Pop 1: ${p1.eventId} | Pop 2: ${p2.eventId} | Pop 3: ${p3.eventId}`);
    console.log(`   📍 Current Queue size: ${bpQueue.getSize()} | Producer Paused: ${producerPaused}`);

    const phase3Ok = bpQueue.getSize() === 2 && !producerPaused;
    if (phase3Ok) {
        console.log('   ✅ PASS: Bounded queue drained, triggering producer RESUME signal.');
        console.log('\n🎉 SUCCESS: All Backpressure Flow Control checks passed!');
    } else {
        console.error('   ❌ FAIL: Low watermark failed to resume producer.');
        process.exit(1);
    }
};

runVerification();
