import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrometheusAlertManager } from './prometheusAlertManager.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Prometheus Alertmanager Threshold Verifications ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runVerification = () => {
    const manager = new PrometheusAlertManager();
    const rulesPath = path.join(__dirname, 'prometheusAlertRules.yml');

    console.log('🔵 Test 1: Reading and loading Prometheus YAML alerting rules configuration...');
    
    if (!fs.existsSync(rulesPath)) {
        console.error('   ❌ FAIL: prometheusAlertRules.yml file missing.');
        process.exit(1);
    }

    const yamlContent = fs.readFileSync(rulesPath, 'utf8');
    manager.loadRules(yamlContent);

    console.log(`   📍 Loaded Rules count: ${manager.alertRules.length}`);
    console.log(`   📍 Rules list: [${manager.alertRules.join(', ')}]`);

    if (manager.alertRules.includes('APIHighLatency') && manager.alertRules.includes('DatabaseConnectionFailure')) {
        console.log('   ✅ PASS: Alert thresholds and group rules successfully loaded.');
    } else {
        console.error('   ❌ FAIL: Alert rules loading mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Checking alert routing under healthy status values...');

    const healthyMetrics = {
        http_request_duration_seconds: 0.45,
        mongodb_connected_status: 1
    };

    const res2 = manager.evaluateMetrics(healthyMetrics);
    console.log(`   📍 Firing Alerts Count: ${res2.alertsFiring.length} | Notification Dispatched: ${res2.notificationSent}`);

    if (res2.alertsFiring.length === 0 && !res2.notificationSent) {
        console.log('   ✅ PASS: Healthy metrics passed with 0 alerts correctly.');
    } else {
        console.error('   ❌ FAIL: False alarm triggered on healthy metrics.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Spiking API response latency (Triggering Warning Alarm)...');

    const highLatencyMetrics = {
        http_request_duration_seconds: 2.8,
        mongodb_connected_status: 1
    };

    const res3 = manager.evaluateMetrics(highLatencyMetrics);
    console.log(`   📍 Firing Alerts Count: ${res3.alertsFiring.length} | Alert Code: ${res3.alertsFiring[0]?.alert} | Severity: ${res3.alertsFiring[0]?.severity}`);

    if (res3.alertsFiring.length === 1 && res3.alertsFiring[0]?.alert === 'APIHighLatency' && res3.alertsFiring[0]?.severity === 'warning') {
        console.log('   ✅ PASS: API response latency warning alert triggered and routed.');
    } else {
        console.error('   ❌ FAIL: Failed to detect response latency threshold breach.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Terminating Database connection status (Triggering Critical Alarm)...');

    const dbDisconnectMetrics = {
        http_request_duration_seconds: 0.2,
        mongodb_connected_status: 0
    };

    const res4 = manager.evaluateMetrics(dbDisconnectMetrics);
    console.log(`   📍 Firing Alerts Count: ${res4.alertsFiring.length} | Alert Code: ${res4.alertsFiring[0]?.alert} | Severity: ${res4.alertsFiring[0]?.severity}`);

    if (res4.alertsFiring.length === 1 && res4.alertsFiring[0]?.alert === 'DatabaseConnectionFailure' && res4.alertsFiring[0]?.severity === 'critical') {
        console.log('   ✅ PASS: Database disconnect critical alert triggered and routed.');
        console.log('\n🎉 SUCCESS: All Prometheus Alerting System checks passed!');
    } else {
        console.error('   ❌ FAIL: Failed to detect database disconnect critical alarm.');
        process.exit(1);
    }
};

runVerification();
