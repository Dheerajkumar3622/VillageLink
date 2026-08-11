import { routeTraffic, switchActiveEnvironment, getRouterStatus } from './blueGreenRouter.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Blue-Green Deployment Routing Validation         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    console.log('🔵 Phase 1: Checking initial default production target environment...');

    const status1 = getRouterStatus();
    const route1 = routeTraffic();

    console.log(`   📍 Active Environment: ${status1.active}`);
    console.log(`   📍 Route Target URL: ${route1.url} | Version: ${route1.version}`);

    const phase1Ok = status1.active === 'BLUE' &&
                     route1.url === 'http://blue-cluster.villagelink.local:8081' &&
                     route1.version === 'v1.4.2-stable';

    if (phase1Ok) {
        console.log('   ✅ PASS: Initial configuration targets BLUE cluster accurately.');
    } else {
        console.error('   ❌ FAIL: Initial active environment configurations mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Triggering hot update switchover (BLUE -> GREEN)...');

    const swapResult1 = switchActiveEnvironment();
    const route2 = routeTraffic();

    console.log(`   📍 Previous Active Env: ${swapResult1.previous}`);
    console.log(`   📍 Current Active Env: ${swapResult1.active}`);
    console.log(`   📍 Composed Route URL: ${route2.url} | Version: ${route2.version}`);

    const phase2Ok = swapResult1.previous === 'BLUE' &&
                     swapResult1.active === 'GREEN' &&
                     route2.url === 'http://green-cluster.villagelink.local:8082' &&
                     route2.version === 'v1.5.0-release';

    if (phase2Ok) {
        console.log('   ✅ PASS: Traffic switched instantly to GREEN cluster.');
    } else {
        console.error('   ❌ FAIL: Environment hot swap failed.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 3: Testing rollback transition safety (GREEN -> BLUE)...');

    const swapResult2 = switchActiveEnvironment();
    const route3 = routeTraffic();

    console.log(`   📍 Current Active Env: ${swapResult2.active}`);
    console.log(`   📍 Composed Route URL: ${route3.url}`);

    const phase3Ok = swapResult2.active === 'BLUE' &&
                     route3.url === 'http://blue-cluster.villagelink.local:8081';

    if (phase3Ok) {
        console.log('   ✅ PASS: Rollback mechanism restored BLUE cluster safely.');
        console.log('\n🎉 SUCCESS: All Blue-Green routing assertions passed!');
    } else {
        console.error('   ❌ FAIL: Rollback transition failed.');
        process.exit(1);
    }
};

runVerification();
