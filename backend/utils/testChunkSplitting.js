import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║            Dynamic Route-Based Chunk Splitting Verification    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteConfigPath = path.resolve(__dirname, '../../frontend/vite.config.ts');
const appComponentPath = path.resolve(__dirname, '../../frontend/components/App.tsx');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking Vite config chunk splitting configurations...');

    if (!fs.existsSync(viteConfigPath)) {
        console.error(`   ❌ FAIL: vite.config.ts not found at: ${viteConfigPath}`);
        process.exit(1);
    }

    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');

    const hasManualChunks = viteContent.includes('manualChunks:');
    const hasVendorReact = viteContent.includes("'vendor-react'");
    const hasVendorMaps = viteContent.includes("'vendor-maps'");

    console.log(`   📍 Has manualChunks split definitions: ${hasManualChunks}`);
    console.log(`   📍 Has vendor-react chunk separation: ${hasVendorReact}`);
    console.log(`   📍 Has vendor-maps chunk separation: ${hasVendorMaps}`);

    if (hasManualChunks && hasVendorReact && hasVendorMaps) {
        console.log('   ✅ PASS: Vite bundler optimization chunks configured.');
    } else {
        console.error('   ❌ FAIL: Vite bundler optimization chunk definitions missing.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Checking App.tsx React.lazy route loading declarations...');

    if (!fs.existsSync(appComponentPath)) {
        console.error(`   ❌ FAIL: App.tsx not found at: ${appComponentPath}`);
        process.exit(1);
    }

    const appContent = fs.readFileSync(appComponentPath, 'utf8');

    const importsLazy = appContent.includes('lazy') && appContent.includes('Suspense');
    const lazyPassengerView = appContent.includes('const PassengerView = lazy');
    const lazyKisanApp = appContent.includes('const KisanApp = lazy');
    const lazyDriverApp = appContent.includes('const DriverApp = lazy');

    console.log(`   📍 Has React lazy/Suspense import: ${importsLazy}`);
    console.log(`   📍 Has PassengerView lazy loader: ${lazyPassengerView}`);
    console.log(`   📍 Has KisanApp lazy loader: ${lazyKisanApp}`);
    console.log(`   📍 Has DriverApp lazy loader: ${lazyDriverApp}`);

    if (importsLazy && lazyPassengerView && lazyKisanApp && lazyDriverApp) {
        console.log('   ✅ PASS: Route-based code splitting and lazy loading verified.');
        console.log('\n🎉 SUCCESS: All Dynamic Route-Based Chunk Splitting checks passed!');
    } else {
        console.error('   ❌ FAIL: App.tsx routing is not lazy loaded.');
        process.exit(1);
    }
};

runVerification();
