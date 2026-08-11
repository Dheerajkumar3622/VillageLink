import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Differential Serving Style Verification          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexHtmlPath = path.resolve(__dirname, '../../frontend/index.html');
const viteConfigPath = path.resolve(__dirname, '../../frontend/vite.config.ts');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking index.html script tag specifications...');
    
    if (!fs.existsSync(indexHtmlPath)) {
        console.error(`   ❌ FAIL: index.html not found at: ${indexHtmlPath}`);
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    const hasModuleScript = htmlContent.includes('type="module"');
    console.log(`   📍 Has modern module script loader (type="module"): ${hasModuleScript}`);

    if (hasModuleScript) {
        console.log('   ✅ PASS: Entry point loads clean ES modules.');
    } else {
        console.error('   ❌ FAIL: Script element loading does not specify type="module".');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Checking vite.config.ts transpilation target configurations...');

    if (!fs.existsSync(viteConfigPath)) {
        console.error(`   ❌ FAIL: vite.config.ts not found at: ${viteConfigPath}`);
        process.exit(1);
    }

    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
    const hasEs2020Target = viteContent.includes("target: 'es2020'") || viteContent.includes("target: 'esnext'");

    console.log(`   📍 Has modern compilation target (ES2020+): ${hasEs2020Target}`);

    if (hasEs2020Target) {
        console.log('   ✅ PASS: Differential serving targets resolved successfully.');
        console.log('\n🎉 SUCCESS: All Differential Serving assertions passed successfully!');
    } else {
        console.error('   ❌ FAIL: Modern JS targets missing from Vite settings.');
        process.exit(1);
    }
};

runVerification();
