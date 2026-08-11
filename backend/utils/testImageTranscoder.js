import { negotiateImageFormat, transcodeToFormat } from './imageTranscoder.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               WebP/AVIF Image Transcoding Validation           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Test 1: Negotiating optimized image formats based on browser headers...');
    
    const formats = [
        negotiateImageFormat('text/html,application/xhtml+xml,image/avif,image/webp,image/apng,*/*'),
        negotiateImageFormat('image/webp,image/apng,image/*,*/*'),
        negotiateImageFormat('text/html,application/xhtml+xml,*/*')
    ];

    console.log(`   📍 Accept: [avif, webp] -> Negotiated Format: ${formats[0]} (Expected: avif)`);
    console.log(`   📍 Accept: [webp]       -> Negotiated Format: ${formats[1]} (Expected: webp)`);
    console.log(`   📍 Accept: [legacy]     -> Negotiated Format: ${formats[2]} (Expected: jpeg)`);

    const test1Ok = formats[0] === 'avif' && formats[1] === 'webp' && formats[2] === 'jpeg';
    if (test1Ok) {
        console.log('   ✅ PASS: Format negotiation matched client compatibility correctly.');
    } else {
        console.error('   ❌ FAIL: Format negotiation mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Compiling transcode targets and calculating byte savings...');

    const origSize = 100000; // 100 KB
    const avifResult = transcodeToFormat('crop_catalog_001.png', origSize, 'avif');
    const webpResult = transcodeToFormat('driver_license_front.jpg', origSize, 'webp');

    console.log(`   📍 AVIF Transcode: File=${avifResult.fileName} | Size=${avifResult.optimizedSizeBytes} bytes | Savings=${avifResult.savings} (Expected: 35000 bytes, 65%)`);
    console.log(`   📍 WebP Transcode: File=${webpResult.fileName} | Size=${webpResult.optimizedSizeBytes} bytes | Savings=${webpResult.savings} (Expected: 50000 bytes, 50%)`);

    const test2Ok = avifResult.optimizedSizeBytes === 35000 && avifResult.savings === '65%' &&
                    webpResult.optimizedSizeBytes === 50000 && webpResult.savings === '50%';

    if (test2Ok) {
        console.log('   ✅ PASS: Transcoding compression and byte sizing validated.');
        console.log('\n🎉 SUCCESS: All WebP/AVIF Image Transcoder checks passed successfully!');
    } else {
        console.error('   ❌ FAIL: Transcoding byte calculations mismatch.');
        process.exit(1);
    }
};

runVerification();
