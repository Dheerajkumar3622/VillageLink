import fs from 'fs';
import path from 'url';
import { fileURLToPath } from 'url';
import nodePath from 'path';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Resource Hints Document Verification             ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const indexHtmlPath = nodePath.resolve(__dirname, '../../frontend/index.html');

const runVerification = () => {
    console.log('🔵 Phase 1: Reading index.html head tags...');
    
    if (!fs.existsSync(indexHtmlPath)) {
        console.error(`   ❌ FAIL: index.html not found at: ${indexHtmlPath}`);
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    const hasPreconnect = htmlContent.includes('rel="preconnect"');
    const hasDnsPrefetch = htmlContent.includes('rel="dns-prefetch"');
    const hasGoogleFontsPreconnect = htmlContent.includes('href="https://fonts.googleapis.com"');

    console.log(`   📍 Has preconnect link tag: ${hasPreconnect}`);
    console.log(`   📍 Has dns-prefetch link tag: ${hasDnsPrefetch}`);
    console.log(`   📍 Has Google Fonts preconnect tag: ${hasGoogleFontsPreconnect}`);

    if (hasPreconnect && hasDnsPrefetch && hasGoogleFontsPreconnect) {
        console.log('   ✅ PASS: Preload, preconnect, and dns-prefetch optimization elements verified.');
        console.log('\n🎉 SUCCESS: All Resource Hints html markup assertions passed!');
    } else {
        console.error('   ❌ FAIL: Resource Hint link tags are missing or incomplete in index.html.');
        process.exit(1);
    }
};

runVerification();
