class DynamicPricingEngine {
  /**
   * Computes dynamic fare and selects ideal auction mode based on demand priority, budget, and local spatial capacity density
   */
  static calculatePricing(demand, activeCapacitiesInH3CellCount = 5) {
    const distanceKm = demand.distanceKm || 15;
    const baseRatePerKm = demand.demandType === "Passenger" ? 12 : 8;
    const distanceFare = Math.round(distanceKm * baseRatePerKm);
    const weightFare = Math.round(demand.weightKg * 4);
    let urgencySurcharge = 0;
    if (demand.priority === "High") urgencySurcharge = 50;
    if (demand.priority === "Critical") urgencySurcharge = 120;
    let surgeMultiplier = 1;
    if (activeCapacitiesInH3CellCount === 0) surgeMultiplier = 1.5;
    else if (activeCapacitiesInH3CellCount <= 2) surgeMultiplier = 1.3;
    else if (activeCapacitiesInH3CellCount <= 5) surgeMultiplier = 1.1;
    const capacityDensitySurge = Math.round((distanceFare + weightFare) * (surgeMultiplier - 1));
    const rawTotal = Math.round(distanceFare + weightFare + urgencySurcharge + capacityDensitySurge);
    const finalRecommendedFare = demand.maxBudget ? Math.min(demand.maxBudget, rawTotal) : rawTotal;
    let recommendedAuctionMode = "MODE_A_FIXED";
    if (demand.priority === "Critical" || demand.demandType === "Emergency") {
      recommendedAuctionMode = "MODE_D_AUTO_MATCH";
    } else if (demand.bidAllowed && demand.demandType === "AgriculturalGoods") {
      recommendedAuctionMode = "MODE_C_MERCHANT_BID";
    } else if (demand.bidAllowed) {
      recommendedAuctionMode = "MODE_B_DRIVER_BID";
    }
    return {
      demandId: demand.demandId,
      recommendedAuctionMode,
      baseFare: Math.round(distanceFare + weightFare),
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(2)),
      finalRecommendedFare,
      currency: "INR",
      bidRange: demand.bidAllowed ? {
        minBid: Math.round(finalRecommendedFare * 0.8),
        maxBid: Math.round(finalRecommendedFare * 1.3)
      } : void 0,
      pricingBreakdown: {
        distanceFare,
        weightFare,
        urgencySurcharge,
        capacityDensitySurge
      }
    };
  }
}
export {
  DynamicPricingEngine
};
