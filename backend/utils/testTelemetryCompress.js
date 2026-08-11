import { encodeTelemetry, decodeTelemetry } from './protobufConverter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        Telemetry Binary Protobuf Compression Test               ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const mockData = {
    driverId: 'DRV-sasaram-4882',
    lat: 24.954219,
    lng: 84.015293,
    speed: 48.5,
    heading: 180.2,
    timestamp: Date.now(),
    routeId: 'RT-patna-sasaram'
};

console.log('🔵 Input Coordinates JSON data:');
console.log(JSON.stringify(mockData, null, 2));

const binaryBuf = encodeTelemetry(mockData);
if (!binaryBuf) {
    console.error('❌ Encoding failed!');
    process.exit(1);
}

const jsonBytes = Buffer.byteLength(JSON.stringify(mockData), 'utf8');
const binaryBytes = binaryBuf.length;
const savings = ((jsonBytes - binaryBytes) / jsonBytes * 100).toFixed(1);

console.log('\n📊 Bandwidth Metrics:');
console.log(`   Raw JSON Size:        ${jsonBytes} bytes`);
console.log(`   Binary Protobuf Size: ${binaryBytes} bytes`);
console.log(`   Bandwidth Savings:    ${savings}%`);

console.log('\n🔵 Decoding Binary Stream back to JSON...');
const decoded = decodeTelemetry(binaryBuf);

console.log('✅ Decoded Payload:');
console.log(JSON.stringify(decoded, null, 2));

// Data verification check
const match = decoded.driverId === mockData.driverId &&
              Math.abs(decoded.lat - mockData.lat) < 0.000001 &&
              Math.abs(decoded.lng - mockData.lng) < 0.000001 &&
              Math.abs(decoded.speed - mockData.speed) < 0.1 &&
              Math.abs(decoded.heading - mockData.heading) < 0.1 &&
              decoded.routeId === mockData.routeId;

if (match) {
    console.log('\n🎉 SUCCESS: Data integrity verified! Encoded and Decoded values match perfectly.');
} else {
    console.error('\n❌ FAILURE: Data mismatch detected in round-trip conversion.');
    process.exit(1);
}
