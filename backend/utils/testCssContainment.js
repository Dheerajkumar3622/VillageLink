import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                 CSS Containment Stylesheet Verification        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.resolve(__dirname, '../../frontend/index.css');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking index.css containment rules...');
    
    if (!fs.existsSync(cssPath)) {
        console.error(`   ❌ FAIL: index.css not found at: ${cssPath}`);
        process.exit(1);
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');

    const hasContainLayout = cssContent.includes('.contain-layout') && cssContent.includes('contain: layout;');
    const hasContainPaint = cssContent.includes('.contain-paint') && cssContent.includes('contain: paint;');
    const hasContainStrict = cssContent.includes('.contain-strict') && cssContent.includes('contain: strict;');
    const hasContainContent = cssContent.includes('.contain-content') && cssContent.includes('contain: content;');

    console.log(`   📍 Has .contain-layout rule: ${hasContainLayout}`);
    console.log(`   📍 Has .contain-paint rule: ${hasContainPaint}`);
    console.log(`   📍 Has .contain-strict rule: ${hasContainStrict}`);
    console.log(`   📍 Has .contain-content rule: ${hasContainContent}`);

    if (hasContainLayout && hasContainPaint && hasContainStrict && hasContainContent) {
        console.log('   ✅ PASS: CSS Containment rules configured successfully.');
        console.log('\n🎉 SUCCESS: All CSS Containment assertions passed successfully!');
    } else {
        console.error('   ❌ FAIL: CSS containment rules missing or incomplete.');
        process.exit(1);
    }
};

runVerification();
