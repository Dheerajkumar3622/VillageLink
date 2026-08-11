import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Skeleton Loading & Shimmer Style Verification    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skeletonPath = path.resolve(__dirname, '../../frontend/components/LoadingSkeleton.tsx');
const cssPath = path.resolve(__dirname, '../../frontend/index.css');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking LoadingSkeleton.tsx component definitions...');
    
    if (!fs.existsSync(skeletonPath)) {
        console.error(`   ❌ FAIL: LoadingSkeleton.tsx not found at: ${skeletonPath}`);
        process.exit(1);
    }

    const skeletonContent = fs.readFileSync(skeletonPath, 'utf8');

    const hasShimmer = skeletonContent.includes('const Shimmer');
    const hasViewSkeleton = skeletonContent.includes('export const ViewSkeleton');
    const hasCardSkeleton = skeletonContent.includes('export const CardSkeleton');
    const hasProfileSkeleton = skeletonContent.includes('export const ProfileSkeleton');

    console.log(`   📍 Has Shimmer base: ${hasShimmer}`);
    console.log(`   📍 Has ViewSkeleton layout: ${hasViewSkeleton}`);
    console.log(`   📍 Has CardSkeleton layout: ${hasCardSkeleton}`);
    console.log(`   📍 Has ProfileSkeleton layout: ${hasProfileSkeleton}`);

    if (hasShimmer && hasViewSkeleton && hasCardSkeleton && hasProfileSkeleton) {
        console.log('   ✅ PASS: Loader placeholders defined correctly.');
    } else {
        console.error('   ❌ FAIL: Loader component placeholders definitions missing.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Checking index.css shimmer keyframes animations...');

    if (!fs.existsSync(cssPath)) {
        console.error(`   ❌ FAIL: index.css not found at: ${cssPath}`);
        process.exit(1);
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const hasShimmerKeyframe = cssContent.includes('@keyframes shimmer') || cssContent.includes('@keyframes v5-shimmer');

    console.log(`   📍 Has Shimmer keyframe styles: ${hasShimmerKeyframe}`);

    if (hasShimmerKeyframe) {
        console.log('   ✅ PASS: Shimmer keyframe animation styles resolved successfully.');
        console.log('\n🎉 SUCCESS: All Skeleton Screen and Shimmer loader assertions passed!');
    } else {
        console.error('   ❌ FAIL: Shimmer keyframes missing from stylesheet.');
        process.exit(1);
    }
};

runVerification();
