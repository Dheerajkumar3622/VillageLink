import { initWasmGeoService, getDistance } from './wasmGeoService.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         WebAssembly vs JavaScript Vector Math Benchmark        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const ITERATIONS = 1000000;
console.log(`📊 Iteration Count: ${ITERATIONS.toLocaleString()} loops`);

// Native JS function
const jsDistance = (x1, y1, x2, y2) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
};

const runBenchmark = async () => {
    // 1. Initialize WebAssembly
    const wasmReady = await initWasmGeoService();
    if (!wasmReady) {
        console.error('❌ Wasm failed to load. Benchmark aborted.');
        process.exit(1);
    }

    // Mock Points
    const x1 = 24.9542, y1 = 84.0152;
    const x2 = 25.1029, y2 = 84.1843;

    // Heat up phase
    for (let i = 0; i < 10000; i++) {
        jsDistance(x1, y1, x2, y2);
        getDistance(x1, y1, x2, y2);
    }

    // 2. Benchmark JavaScript
    console.log('\n🔵 Benchmarking Native JavaScript...');
    const tJSStart = performance.now();
    let resJS = 0;
    for (let i = 0; i < ITERATIONS; i++) {
        resJS = jsDistance(x1 + (i * 0.000001), y1, x2, y2);
    }
    const tJSEnd = performance.now();
    const jsDuration = tJSEnd - tJSStart;
    console.log(`   JS Total Time: ${jsDuration.toFixed(2)} ms`);

    // 3. Benchmark WebAssembly
    console.log('🔵 Benchmarking WebAssembly (Wasm)...');
    const tWasmStart = performance.now();
    let resWasm = 0;
    for (let i = 0; i < ITERATIONS; i++) {
        resWasm = getDistance(x1 + (i * 0.000001), y1, x2, y2);
    }
    const tWasmEnd = performance.now();
    const wasmDuration = tWasmEnd - tWasmStart;
    console.log(`   Wasm Total Time: ${wasmDuration.toFixed(2)} ms`);

    // Results calculation
    const ratio = (jsDuration / wasmDuration).toFixed(2);
    const percentFaster = (((jsDuration - wasmDuration) / jsDuration) * 100).toFixed(1);

    console.log('\n📊 Performance Analysis:');
    console.log(`   WebAssembly is ${ratio}x faster than standard JS!`);
    console.log(`   Time savings: ${percentFaster}% reduction in computational latency.`);

    // Data verification check
    if (Math.abs(resJS - resWasm) < 0.000001) {
        console.log('\n🎉 SUCCESS: Wasm math computation matches Javascript output perfectly.');
    } else {
        console.error('\n❌ FAILURE: Computation output discrepancy detected.');
        process.exit(1);
    }
};

runBenchmark().catch(err => console.error(err));
