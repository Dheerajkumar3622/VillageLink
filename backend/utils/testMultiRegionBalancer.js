import { MultiRegionBalancer } from './multiRegionBalancer.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Multi-Region Load Balancing Verification         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const balancer = new MultiRegionBalancer();

    console.log('🔵 Test 1: Verifying geographical proximity routing...');
    
    const routeIN = balancer.route('IN');
    console.log(`   📍 Indian Client routed to: ${routeIN.routedRegion} (Latency: ${routeIN.latencyMs}ms, Failover: ${routeIN.failoverOccurred})`);

    const routeAPAC = balancer.route('APAC');
    console.log(`   📍 APAC Client routed to: ${routeAPAC.routedRegion} (Latency: ${routeAPAC.latencyMs}ms, Failover: ${routeAPAC.failoverOccurred})`);

    if (routeIN.routedRegion.startsWith('ap-south-1') && routeAPAC.routedRegion.startsWith('ap-east-1')) {
        console.log('   ✅ PASS: Users successfully routed to closest geographical server regions.');
    } else {
        console.error('   ❌ FAIL: Proximity routing failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating primary region outage (Mumbai offline)...');
    
    balancer.setNodeStatus('ap-south-1', false);
    
    // Route Indian client again. Proximity should failover to Hong Kong.
    const failoverRoute = balancer.route('IN');
    console.log(`   📍 Indian Client routed to: ${failoverRoute.routedRegion} (Latency: ${failoverRoute.latencyMs}ms, Failover: ${failoverRoute.failoverOccurred})`);

    if (failoverRoute.routedRegion.startsWith('ap-east-1') && failoverRoute.failoverOccurred) {
        console.log('   ✅ PASS: Automated failover redirected user traffic to next closest healthy region.');
    } else {
        console.error('   ❌ FAIL: Failover routing did not resolve correctly.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating cascading region outages (Hong Kong also offline)...');

    balancer.setNodeStatus('ap-east-1', false);

    // Route Indian client again. Should fall back to Oregon (US).
    const secondaryFailoverRoute = balancer.route('IN');
    console.log(`   📍 Indian Client routed to: ${secondaryFailoverRoute.routedRegion} (Latency: ${secondaryFailoverRoute.latencyMs}ms, Failover: ${secondaryFailoverRoute.failoverOccurred})`);

    if (secondaryFailoverRoute.routedRegion.startsWith('us-west-2') && secondaryFailoverRoute.failoverOccurred) {
        console.log('   ✅ PASS: Cascading failover preserved service availability using distant active node.');
        console.log('\n🎉 SUCCESS: All Multi-Region Load Balancing checks passed!');
    } else {
        console.error('   ❌ FAIL: Cascading failover did not execute.');
        process.exit(1);
    }
};

runVerification();
