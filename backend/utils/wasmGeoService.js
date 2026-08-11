let wasmInstance = null;

// Tiny, pre-compiled WebAssembly module for fast Euclidean distance calculations
// WAT structure: distance(x1, y1, x2, y2) => sqrt((x1-x2)^2 + (y1-y2)^2)
const wasmBytecode = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x09, 0x01, 0x60, 0x04, 0x7c, 0x7c, 0x7c, 0x7c, 0x01, 0x7c,
    0x03, 0x02, 0x01, 0x00,
    0x07, 0x0c, 0x01, 0x08, 0x64, 0x69, 0x73, 0x74, 0x61, 0x6e, 0x63, 0x65, 0x00, 0x00,
    0x0a, 0x1c, 0x01, 0x1a, 0x00, 0x20, 0x00, 0x20, 0x02, 0xa1, 0x20, 0x00,
    0x20, 0x02, 0xa1, 0xa2, 0x20, 0x01, 0x20, 0x03, 0xa1, 0x20, 0x01, 0x20,
    0x03, 0xa1, 0xa2, 0xa0, 0x9f, 0x0b
]);

export const initWasmGeoService = async () => {
    try {
        const wasmModule = await WebAssembly.compile(wasmBytecode);
        wasmInstance = await WebAssembly.instantiate(wasmModule);
        console.log('✅ WebAssembly Geo-Engine initialized successfully (Near-native speed calculation active).');
        return true;
    } catch (e) {
        console.warn('⚠️ WebAssembly compile failed. Falling back to native JS:', e.message);
        wasmInstance = null;
        return false;
    }
};

// JS Fallback
const jsDistance = (x1, y1, x2, y2) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * High-speed Euclidean Distance check
 */
export const getDistance = (x1, y1, x2, y2) => {
    if (wasmInstance && wasmInstance.exports.distance) {
        return wasmInstance.exports.distance(x1, y1, x2, y2);
    }
    return jsDistance(x1, y1, x2, y2);
};
