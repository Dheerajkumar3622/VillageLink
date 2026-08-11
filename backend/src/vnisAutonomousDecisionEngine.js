var DecisionLevel = /* @__PURE__ */ ((DecisionLevel2) => {
  DecisionLevel2["L0_TELEMETRY_GRID"] = "L0_TELEMETRY_GRID";
  DecisionLevel2["L1_CAPACITY_MATCHING"] = "L1_CAPACITY_MATCHING";
  DecisionLevel2["L2_DYNAMIC_PRICING"] = "L2_DYNAMIC_PRICING";
  DecisionLevel2["L3_SELF_HEALING_RESOLVER"] = "L3_SELF_HEALING_RESOLVER";
  DecisionLevel2["L4_PREDICTIVE_DISPATCH"] = "L4_PREDICTIVE_DISPATCH";
  DecisionLevel2["L5_SWARM_OPTIMIZATION"] = "L5_SWARM_OPTIMIZATION";
  DecisionLevel2["L6_CONSTITUTIONAL_GOVERNANCE"] = "L6_CONSTITUTIONAL_GOVERNANCE";
  return DecisionLevel2;
})(DecisionLevel || {});
var DisruptionType = /* @__PURE__ */ ((DisruptionType2) => {
  DisruptionType2["DRIVER_BREAKDOWN"] = "DRIVER_BREAKDOWN";
  DisruptionType2["DRIVER_CANCEL"] = "DRIVER_CANCEL";
  DisruptionType2["PASSENGER_NO_SHOW"] = "PASSENGER_NO_SHOW";
  DisruptionType2["WEATHER_ROAD_BLOCK"] = "WEATHER_ROAD_BLOCK";
  DisruptionType2["FRAUD_GPS_SPOOF"] = "FRAUD_GPS_SPOOF";
  return DisruptionType2;
})(DisruptionType || {});
var ResolutionAction = /* @__PURE__ */ ((ResolutionAction2) => {
  ResolutionAction2["AUTO_REMATCH_NEXT_DRIVER"] = "AUTO_REMATCH_NEXT_DRIVER";
  ResolutionAction2["INSTANT_WALLET_REFUND_WITH_BONUS"] = "INSTANT_WALLET_REFUND_WITH_BONUS";
  ResolutionAction2["REROUTE_SECONDARY_NODE"] = "REROUTE_SECONDARY_NODE";
  ResolutionAction2["FLAG_FRAUD_ACCOUNT"] = "FLAG_FRAUD_ACCOUNT";
  return ResolutionAction2;
})(ResolutionAction || {});
class VNISAutonomousDecisionEngine {
  /**
   * Evaluates disruption events across L0-L6 decision pyramid and executes self-healing logic
   */
  static evaluateAndSelfHeal(event) {
    const eventId = event.eventId || `EVT_${Date.now().toString().slice(-6)}`;
    if (event.telemetrySpeedKmH && event.telemetrySpeedKmH > 130) {
      return {
        eventId,
        decisionLevel: "L6_CONSTITUTIONAL_GOVERNANCE" /* L6_CONSTITUTIONAL_GOVERNANCE */,
        actionTaken: "FLAG_FRAUD_ACCOUNT" /* FLAG_FRAUD_ACCOUNT */,
        isResolvedAutonomous: true,
        resolutionSummary: `L6 Governance Shield: Blocked impossible GPS speed (${event.telemetrySpeedKmH} km/h). Flagged potential GPS spoofing fraud.`,
        antiFraudStatus: "FRAUD_BLOCKED"
      };
    }
    switch (event.disruptionType) {
      case "DRIVER_BREAKDOWN" /* DRIVER_BREAKDOWN */:
      case "DRIVER_CANCEL" /* DRIVER_CANCEL */: {
        const hasNextDriverAvailable = true;
        if (hasNextDriverAvailable) {
          return {
            eventId,
            decisionLevel: "L3_SELF_HEALING_RESOLVER" /* L3_SELF_HEALING_RESOLVER */,
            actionTaken: "AUTO_REMATCH_NEXT_DRIVER" /* AUTO_REMATCH_NEXT_DRIVER */,
            isResolvedAutonomous: true,
            newAssignedDriverId: "DRV_REMATCH_88",
            newDriverEtaMinutes: 8,
            resolutionSummary: `L3 Self-Healing: Driver breakdown handled. Auto-rematched customer to Driver #DRV_REMATCH_88 arriving in 8 minutes.`,
            antiFraudStatus: "CLEAN"
          };
        } else {
          const refundAmount = event.originalFareRupees;
          const bonus = Math.round(refundAmount * 0.1);
          const totalCredit = refundAmount + bonus;
          return {
            eventId,
            decisionLevel: "L3_SELF_HEALING_RESOLVER" /* L3_SELF_HEALING_RESOLVER */,
            actionTaken: "INSTANT_WALLET_REFUND_WITH_BONUS" /* INSTANT_WALLET_REFUND_WITH_BONUS */,
            isResolvedAutonomous: true,
            refundAmountRupees: refundAmount,
            apologyBonusRupees: bonus,
            totalWalletCreditRupees: totalCredit,
            resolutionSummary: `L3 Self-Healing: No alternative driver available. Instant \u20B9${totalCredit} credited to wallet (\u20B9${refundAmount} refund + \u20B9${bonus} 10% apology bonus).`,
            antiFraudStatus: "CLEAN"
          };
        }
      }
      case "WEATHER_ROAD_BLOCK" /* WEATHER_ROAD_BLOCK */: {
        return {
          eventId,
          decisionLevel: "L4_PREDICTIVE_DISPATCH" /* L4_PREDICTIVE_DISPATCH */,
          actionTaken: "REROUTE_SECONDARY_NODE" /* REROUTE_SECONDARY_NODE */,
          isResolvedAutonomous: true,
          resolutionSummary: `L4 Reroute: Flood roadblock detected at main causeway. Vehicle rerouted via Sadisopur Link Road Node.`,
          antiFraudStatus: "CLEAN"
        };
      }
      default:
        return {
          eventId,
          decisionLevel: "L3_SELF_HEALING_RESOLVER" /* L3_SELF_HEALING_RESOLVER */,
          actionTaken: "INSTANT_WALLET_REFUND_WITH_BONUS" /* INSTANT_WALLET_REFUND_WITH_BONUS */,
          isResolvedAutonomous: true,
          refundAmountRupees: event.originalFareRupees,
          totalWalletCreditRupees: event.originalFareRupees,
          resolutionSummary: `L3 Self-Healing: Resolved exception with full refund of \u20B9${event.originalFareRupees}.`,
          antiFraudStatus: "CLEAN"
        };
    }
  }
}
export {
  DecisionLevel,
  DisruptionType,
  ResolutionAction,
  VNISAutonomousDecisionEngine
};
