import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { K8sAutoscaleSimulator } from './k8sAutoscaleSimulator.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Kubernetes Auto-Scaling HPA Metric Verification  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runVerification = () => {
    const simulator = new K8sAutoscaleSimulator();
    const manifestPath = path.join(__dirname, 'k8sAutoscale.yaml');

    console.log('🔵 Test 1: Reading and loading Kubernetes HPA manifest parameters...');
    
    if (!fs.existsSync(manifestPath)) {
        console.error('   ❌ FAIL: k8sAutoscale.yaml manifest file missing.');
        process.exit(1);
    }

    const yamlContent = fs.readFileSync(manifestPath, 'utf8');
    simulator.loadManifestSettings(yamlContent);

    console.log(`   📍 Min Replicas: ${simulator.minReplicas}`);
    console.log(`   📍 Max Replicas: ${simulator.maxReplicas}`);
    console.log(`   📍 Target CPU: ${simulator.targetCPUUtilization}%`);

    if (simulator.minReplicas === 2 && simulator.maxReplicas === 10 && simulator.targetCPUUtilization === 70) {
        console.log('   ✅ PASS: HPA manifest boundaries successfully loaded.');
    } else {
        console.error('   ❌ FAIL: HPA manifest settings mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating scale-up action under high traffic spikes...');

    const res2 = simulator.evaluateScale(95, 3); // 95% CPU, 3 pods
    console.log(`   📍 Action: ${res2.action} | Desired Replicas: ${res2.replicas}`);

    if (res2.action === 'SCALE_UP' && res2.replicas === 5) {
        console.log('   ✅ PASS: HPA calculated correct scale-up replica expansion.');
    } else {
        console.error('   ❌ FAIL: HPA scale-up calculations mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating scale-down action during low traffic periods...');

    const res3 = simulator.evaluateScale(15, 6); // 15% CPU, 6 pods
    console.log(`   📍 Action: ${res3.action} | Desired Replicas: ${res3.replicas}`);

    if (res3.action === 'SCALE_DOWN' && res3.replicas === 2) {
        console.log('   ✅ PASS: HPA calculated correct scale-down replica downsize.');
    } else {
        console.error('   ❌ FAIL: HPA scale-down calculations mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 4: Enforcing maximum pod boundaries under extreme conditions...');

    const res4 = simulator.evaluateScale(150, 8); // 150% CPU, 8 pods
    console.log(`   📍 Action: ${res4.action} | Desired Replicas: ${res4.replicas}`);

    if (res4.action === 'SCALE_UP' && res4.replicas === 10) {
        console.log('   ✅ PASS: HPA restricted pod replicas successfully to maximum cap boundaries.');
        console.log('\n🎉 SUCCESS: All Kubernetes Auto-Scaling HPA checks passed!');
    } else {
        console.error('   ❌ FAIL: HPA failed to restrict max replica boundaries.');
        process.exit(1);
    }
};

runVerification();
