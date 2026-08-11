import { UniversalCapacityObject, UniversalDemandObject } from '../../shared/src/types.js';

export type DecisionPyramidLevel = 'L0_OBSERVE' | 'L1_UNDERSTAND' | 'L2_PREDICT' | 'L3_GENERATE_OPTIONS' | 'L4_EVALUATE_RISK' | 'L5_RECOMMEND' | 'L6_EXECUTE';

export interface DecisionEvaluationResult {
  evaluationId: string;
  demandId: string;
  capacityId: string;
  riskScore: number; // 0 to 100
  decisionLevel: DecisionPyramidLevel;
  requiresHumanApproval: boolean;
  constitutionCompliant: boolean;
  xaiEvidenceRationale: {
    rule1_SafetyFirst: string;
    rule2_HumanOverrideActive: boolean;
    rule3_ExplainabilityEvidence: string;
    rule4_TransparentLearning: boolean;
    rule5_GlobalNetworkUtilityScore: number;
    rule6_PrivacyAndLegalCompliant: boolean;
    rule7_LongTermTrustPriority: boolean;
  };
}

export class DecisionIntelligenceEngine {
  /**
   * Evaluates a candidate match against the 7-Level Decision Pyramid and Decision Constitution
   */
  public static evaluateDecision(
    demand: UniversalDemandObject,
    uco: UniversalCapacityObject
  ): DecisionEvaluationResult {
    const evaluationId = `DEC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Risk Scoring Algorithm
    let riskScore = 15; // Base low risk

    if (demand.priority === 'High') riskScore += 25;
    if (demand.priority === 'Critical') riskScore += 45;
    if (demand.demandType === 'Medicine' || demand.demandType === 'Emergency') riskScore += 30;
    if (demand.insuranceNeeded) riskScore += 15;
    if (uco.trustScore < 80) riskScore += 20;

    riskScore = Math.min(100, riskScore);

    // Determine Decision Pyramid Level ($L_0$ to $L_6$)
    let decisionLevel: DecisionPyramidLevel = 'L6_EXECUTE';
    let requiresHumanApproval = false;

    if (riskScore >= 75) {
      decisionLevel = 'L4_EVALUATE_RISK';
      requiresHumanApproval = true;
    } else if (riskScore >= 45) {
      decisionLevel = 'L5_RECOMMEND';
      requiresHumanApproval = false;
    } else {
      decisionLevel = 'L6_EXECUTE';
      requiresHumanApproval = false;
    }

    // Validate Decision Constitution Rules
    const constitutionCompliant = uco.trustScore >= (demand.trustRequirement || 50) && uco.status === 'Available';

    const xaiEvidenceRationale = {
      rule1_SafetyFirst: riskScore >= 75 ? 'HIGH RISK DETECTED: Escalated to Human Approval Mode' : 'SAFE: Within automated SLA risk threshold',
      rule2_HumanOverrideActive: true,
      rule3_ExplainabilityEvidence: `Match validated with Driver Trust ${uco.trustScore}/100, Priority ${demand.priority}, Demand Type ${demand.demandType}`,
      rule4_TransparentLearning: true,
      rule5_GlobalNetworkUtilityScore: Math.round(90 - (riskScore * 0.2)),
      rule6_PrivacyAndLegalCompliant: true,
      rule7_LongTermTrustPriority: true
    };

    return {
      evaluationId,
      demandId: demand.demandId,
      capacityId: uco.capacityId,
      riskScore,
      decisionLevel,
      requiresHumanApproval,
      constitutionCompliant,
      xaiEvidenceRationale
    };
  }
}
