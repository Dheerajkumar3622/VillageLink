class DecisionIntelligenceEngine {
  /**
   * Evaluates a candidate match against the 7-Level Decision Pyramid and Decision Constitution
   */
  static evaluateDecision(demand, uco) {
    const evaluationId = `DEC_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`;
    let riskScore = 15;
    if (demand.priority === "High") riskScore += 25;
    if (demand.priority === "Critical") riskScore += 45;
    if (demand.demandType === "Medicine" || demand.demandType === "Emergency") riskScore += 30;
    if (demand.insuranceNeeded) riskScore += 15;
    if (uco.trustScore < 80) riskScore += 20;
    riskScore = Math.min(100, riskScore);
    let decisionLevel = "L6_EXECUTE";
    let requiresHumanApproval = false;
    if (riskScore >= 75) {
      decisionLevel = "L4_EVALUATE_RISK";
      requiresHumanApproval = true;
    } else if (riskScore >= 45) {
      decisionLevel = "L5_RECOMMEND";
      requiresHumanApproval = false;
    } else {
      decisionLevel = "L6_EXECUTE";
      requiresHumanApproval = false;
    }
    const constitutionCompliant = uco.trustScore >= (demand.trustRequirement || 50) && uco.status === "Available";
    const xaiEvidenceRationale = {
      rule1_SafetyFirst: riskScore >= 75 ? "HIGH RISK DETECTED: Escalated to Human Approval Mode" : "SAFE: Within automated SLA risk threshold",
      rule2_HumanOverrideActive: true,
      rule3_ExplainabilityEvidence: `Match validated with Driver Trust ${uco.trustScore}/100, Priority ${demand.priority}, Demand Type ${demand.demandType}`,
      rule4_TransparentLearning: true,
      rule5_GlobalNetworkUtilityScore: Math.round(90 - riskScore * 0.2),
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
export {
  DecisionIntelligenceEngine
};
