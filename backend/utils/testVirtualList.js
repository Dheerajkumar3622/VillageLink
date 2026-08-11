import { calculateVirtualWindow } from './virtualList.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Virtual Viewport Lists Math Validation           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const totalItems = 100000;      // 100,000 active directory entries
    const rowHeight = 50;           // 50px per listing card
    const viewportHeight = 400;     // 400px visible scroll container
    const scrollTop = 1200;         // scrolled down by 1200px
    const buffer = 2;               // preload 2 items on top/bottom

    console.log(`🔵 Phase 1: Computing list virtualization with:
      Total Items: ${totalItems}
      Row Height: ${rowHeight}px
      Viewport Height: ${viewportHeight}px
      Scroll Top Offset: ${scrollTop}px
      Buffer preloads: ${buffer}`);

    const result = calculateVirtualWindow(totalItems, rowHeight, viewportHeight, scrollTop, buffer);

    console.log(`\n🔵 Calculated Window results:
      Start Item Index: ${result.startIndex} (Expected: 22)
      End Item Index: ${result.endIndex} (Expected: 34)
      Rendered DOM Elements: ${result.renderedCount} (Expected: 13)
      Top Spacer Height: ${result.topSpacer}px (Expected: 1100)
      Bottom Spacer Height: ${result.bottomSpacer}px (Expected: 4998250)
      Total Virtual height: ${result.totalHeight}px (Expected: 5000000)`);

    const checksOk = result.startIndex === 22 &&
                     result.endIndex === 34 &&
                     result.renderedCount === 13 &&
                     result.topSpacer === 1100 &&
                     result.bottomSpacer === 4998250 &&
                     result.totalHeight === 5000000;

    if (checksOk) {
        console.log('\n   ✅ PASS: Virtualization boundaries and spacer padding heights resolved accurately.');
        console.log('\n🎉 SUCCESS: All Virtual Viewport scroll windowing assertions passed!');
    } else {
        console.error('\n   ❌ FAIL: Virtual list calculation offsets mismatch.');
        process.exit(1);
    }
};

runVerification();
