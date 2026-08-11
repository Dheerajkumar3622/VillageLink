import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TerraformSimulator } from './terraformSimulator.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Terraform IaC Plan & Apply Verification Checks   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runVerification = () => {
    const simulator = new TerraformSimulator();
    const configPath = path.join(__dirname, 'terraformConfig.tf');

    console.log('🔵 Test 1: Reading and parsing tf declarative configuration rules...');
    
    if (!fs.existsSync(configPath)) {
        console.error('   ❌ FAIL: terraformConfig.tf file missing.');
        process.exit(1);
    }

    const tfContent = fs.readFileSync(configPath, 'utf8');
    const resources = simulator.parseConfig(tfContent);
    console.log(`   📍 Parsed Resource count: ${resources.length}`);

    if (resources.length === 3) {
        console.log('   ✅ PASS: Correct count of database, app services, and gateway load balancer parsed.');
    } else {
        console.error('   ❌ FAIL: Resource parsing count mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating dry-run resource plan generation...');

    const plan = simulator.executePlan(tfContent);
    console.log(`   📍 Plan Status: ${plan.status} | Targets: ${plan.toAddCount} to add`);

    if (plan.status === 'PLAN_READY' && plan.toAddCount === 3) {
        console.log('   ✅ PASS: Dry-run execution plan compiled successfully.');
    } else {
        console.error('   ❌ FAIL: Plan generation failure.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Simulating resource provisioning apply operations...');

    const applyResult = simulator.executeApply(plan);
    console.log(`   📍 Apply Status: ${applyResult.applied} | Total Resources Added: ${applyResult.resourcesAddedCount}`);

    if (applyResult.applied && applyResult.resourcesAddedCount === 3) {
        console.log('   ✅ PASS: Provisioning simulator successfully created cloud resources.');
        console.log('\n🎉 SUCCESS: All Infrastructure as Code checks passed!');
    } else {
        console.error('   ❌ FAIL: Resource apply stage failed.');
        process.exit(1);
    }
};

runVerification();
