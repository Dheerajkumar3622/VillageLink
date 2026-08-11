import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Brotli Static Compression Validation Suite         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const assetsDir = path.join(distDir, 'assets');

// Ensure test directory exists
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

const testFile = path.join(assetsDir, 'testBrotliBundle.js');
const brFile = `${testFile}.br`;

// Create mock large JS asset with highly compressible repeated code
const repeatedCode = 'function getVillageCoordinates(id) { return { lat: 24.954, lng: 84.015 }; }\n';
const rawContent = repeatedCode.repeat(1000); // ~70KB
fs.writeFileSync(testFile, rawContent, 'utf8');

// Pre-compress using native zlib Brotli
const compressed = zlib.brotliCompressSync(Buffer.from(rawContent, 'utf8'));
fs.writeFileSync(brFile, compressed);

console.log('✅ Mock assets prepared:');
const rawBytes = fs.statSync(testFile).size;
const brBytes = fs.statSync(brFile).size;
const savings = ((rawBytes - brBytes) / rawBytes * 100).toFixed(1);
console.log(`   Raw Asset Size:       ${rawBytes.toLocaleString()} bytes`);
console.log(`   Pre-compressed (.br): ${brBytes.toLocaleString()} bytes`);
console.log(`   Brotli savings ratio: ${savings}% smaller payload!`);

const SERVER_URL = 'http://localhost:3001/assets/testBrotliBundle.js';

const runVerification = async () => {
    // Wait for server boot context if running
    console.log('\n🔵 Query 1: Request WITHOUT Accept-Encoding: br (Standard Fetch)...');
    try {
        const res = await fetch(SERVER_URL, {
            headers: { 'x-origin-shield-signature': 'shield_v3_secure_village_secret' }
        });
        const content = await res.text();
        const contentBytes = Buffer.byteLength(content, 'utf8');

        console.log(`   📍 Response Code:      ${res.status}`);
        console.log(`   📍 Content-Encoding:   ${res.headers.get('content-encoding') || 'None'}`);
        console.log(`   📍 X-Static-Serve:     ${res.headers.get('x-static-serve') || 'Default express.static'}`);
        console.log(`   📍 Bytes Received (Decompressed): ${contentBytes} bytes`);
        
        if (!res.headers.get('content-encoding') || res.headers.get('content-encoding') === 'gzip') {
            console.log('   ✅ PASS: Served standard payload as expected.');
        } else {
            console.error('   ❌ FAIL: Unexpected encoding header.');
        }
    } catch (e) {
        console.error('   ❌ Query 1 error:', e.message);
    }

    console.log('\n🔵 Query 2: Request WITH Accept-Encoding: br (Brotli static serve)...');
    try {
        const res = await fetch(SERVER_URL, {
            headers: {
                'accept-encoding': 'br',
                'x-origin-shield-signature': 'shield_v3_secure_village_secret'
            }
        });
        
        // Read raw buffer response (Note: Node fetch client automatically decompresses Brotli responses)
        const content = await res.text();
        const buffer = Buffer.from(content, 'utf8');
        
        console.log(`   📍 Response Code:      ${res.status}`);
        console.log(`   📍 Content-Encoding:   ${res.headers.get('content-encoding') || 'None'}`);
        console.log(`   📍 X-Static-Serve:     ${res.headers.get('x-static-serve') || 'None'}`);
        console.log(`   📍 Bytes Received (Decompressed): ${buffer.length} bytes`);

        if (res.headers.get('content-encoding') === 'br' && res.headers.get('x-static-serve') === 'Brotli') {
            console.log('   ✅ PASS: Pre-compressed Brotli static asset served successfully.');
            
            if (content === rawContent) {
                console.log('   ✅ PASS: Data integrity check passed! Content matches original.');
            } else {
                console.error('   ❌ FAIL: Content corrupted in transfer!');
            }
        } else {
            console.error('   ❌ FAIL: Brotli serve middleware did not activate.');
        }
    } catch (e) {
        console.error('   ❌ Query 2 error:', e.message);
    }

    // Cleanup mock files
    try {
        fs.unlinkSync(testFile);
        fs.unlinkSync(brFile);
        console.log('\n🧹 Temporary mock test assets cleaned up successfully.');
    } catch (cleanErr) {
        console.warn('⚠️ Cleanup warning:', cleanErr.message);
    }
};

// Wait 2 seconds for server port bindings before querying
setTimeout(() => {
    runVerification().catch(err => console.error(err));
}, 2000);
