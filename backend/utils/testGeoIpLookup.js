import { GeoIpLookup } from './geoIpLookup.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               GeoIP Database Lookup Integration Test           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const geoip = new GeoIpLookup();

    console.log('🔵 Test 1: Querying Indian IP address (Bihar region)...');
    const resIN = geoip.lookup('103.55.99.14');
    console.log('   📍 Bihar Resolve Details:', JSON.stringify(resIN, null, 2));

    if (resIN.resolved && resIN.region === 'Bihar' && resIN.city === 'Patna') {
        console.log('   ✅ PASS: IP address resolved to correct regional city location.');
    } else {
        console.error('   ❌ FAIL: Bihar IP lookup resolution mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Querying Indian IP address (Maharashtra region)...');
    const resMH = geoip.lookup('103.88.42.204');
    console.log('   📍 Mumbai Resolve Details:', JSON.stringify(resMH, null, 2));

    if (resMH.resolved && resMH.region === 'Maharashtra' && resMH.city === 'Mumbai') {
        console.log('   ✅ PASS: IP address resolved to Mumbai coordinate indices.');
    } else {
        console.error('   ❌ FAIL: Mumbai IP lookup resolution mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Querying US IP address (Oregon region)...');
    const resUS = geoip.lookup('104.22.4.98');
    console.log('   📍 US Resolve Details:', JSON.stringify(resUS, null, 2));

    if (resUS.resolved && resUS.region === 'Oregon' && resUS.country === 'US') {
        console.log('   ✅ PASS: US IP address resolved to Oregon coordinates.');
    } else {
        console.error('   ❌ FAIL: US IP lookup resolution mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Verifying localhost and unknown IP fallbacks...');
    const resFallback = geoip.lookup('127.0.0.1');
    console.log('   📍 Localhost Resolve Details:', JSON.stringify(resFallback, null, 2));

    if (!resFallback.resolved && resFallback.city === 'New Delhi') {
        console.log('   ✅ PASS: Fallback gracefully directed lookup to default Delhi location.');
        console.log('\n🎉 SUCCESS: All GeoIP database lookup integration checks passed!');
    } else {
        console.error('   ❌ FAIL: Fallback handling failed.');
        process.exit(1);
    }
};

runVerification();
