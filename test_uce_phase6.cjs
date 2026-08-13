const { DecisionIntelligenceEngine } = require('./backend/src/decisionIntelligenceEngine');

async function runVerificationPhase6() {
  console.log('====================================================');
  console.log('     UCE PHASE 6 VERIFICATION TEST RUNNER          ');
  console.log('====================================================\n');

  const now = Date.now();

  // Test Driver UCO (High Trust 95/100)
  const highTrustDriverUCO = {
    capacityId: 'UCO_DRIVER_SAFE_01',
    ownerId: 'DRIVER_RAHUL',
    vehicleId: 'BR01_AB_7777',
    trustScore: 95,
    status: 'Available'
  };

  // Test Driver UCO (Low Trust 65/100)
  const lowTrustDriverUCO = {
    capacityId: 'UCO_DRIVER_RISK_02',
    ownerId: 'DRIVER_NEW',
    vehicleId: 'BR01_XY_0000',
    trustScore: 65,
    status: 'Available'
  };

  // Demand A: Normal Parcel (Low Risk)
  const lowRiskUDO = {
    demandId: 'UDO_PARCEL_LOW_RISK',
    requesterId: 'USER_AKASH',
    demandType: 'Parcel',
    priority: 'Low',
    weightKg: 2,
    trustRequirement: 50,
    status: 'Created'
  };

  // Demand B: Emergency Critical Medicine (High Risk)
  const highRiskUDO = {
    demandId: 'UDO_MEDICINE_CRITICAL',
    requesterId: 'HOSPITAL_PATNA',
    demandType: 'Medicine',
    priority: 'Critical',
    weightKg: 10,
    insuranceNeeded: true,
    trustRequirement: 90,
    status: 'Created'
  };

  // Test 1: Low Risk Autonomous Match (L6 Execute)
  console.log('[1/2] Testing Low-Risk Match Decision Evaluation (L6 Execute)...');
  const eval1 = DecisionIntelligenceEngine.evaluateDecision(lowRiskUDO, highTrustDriverUCO);

  console.log(` -> Evaluation ID: ${eval1.evaluationId}`);
  console.log(` -> Risk Score: ${eval1.riskScore}/100 | Decision Level: ${eval1.decisionLevel}`);
  console.log(` -> Requires Human Approval: ${eval1.requiresHumanApproval} | Constitution Compliant: ${eval1.constitutionCompliant}`);
  console.log(` -> XAI Rationale: "${eval1.xaiEvidenceRationale.rule1_SafetyFirst}"`);

  if (eval1.riskScore >= 40 || eval1.decisionLevel !== 'L6_EXECUTE' || eval1.requiresHumanApproval) {
    throw new Error('Low risk decision evaluation test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  // Test 2: High Risk Match Escalation (L4 Evaluate Risk + Mandatory Human Approval)
  console.log('[2/2] Testing High-Risk Match Escalation (L4 Evaluate Risk + Human-in-Loop)...');
  const eval2 = DecisionIntelligenceEngine.evaluateDecision(highRiskUDO, lowTrustDriverUCO);

  console.log(` -> Evaluation ID: ${eval2.evaluationId}`);
  console.log(` -> Risk Score: ${eval2.riskScore}/100 | Decision Level: ${eval2.decisionLevel}`);
  console.log(` -> Requires Human Approval: ${eval2.requiresHumanApproval} | Constitution Compliant: ${eval2.constitutionCompliant}`);
  console.log(` -> XAI Rationale: "${eval2.xaiEvidenceRationale.rule1_SafetyFirst}"`);

  if (eval2.riskScore < 75 || eval2.decisionLevel !== 'L4_EVALUATE_RISK' || !eval2.requiresHumanApproval) {
    throw new Error('High risk decision escalation test failed!');
  }
  console.log(' -> PASSED ✔️\n');

  console.log('====================================================');
  console.log('🎉 ALL EXECUTION PHASE 6 VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerificationPhase6().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
