export type AuctionMode = 'MODE_A_FIXED' | 'MODE_B_DRIVER_BID' | 'MODE_C_MERCHANT_BID' | 'MODE_D_AUTO_MATCH';

export interface DynamicPricingResult {
  demandId: string;
  recommendedAuctionMode: AuctionMode;
  baseFare: number;
  surgeMultiplier: number;
  finalRecommendedFare: number;
  currency: string;
  bidRange?: {
    minBid: number;
    maxBid: number;
  };
  pricingBreakdown: {
    distanceFare: number;
    weightFare: number;
    urgencySurcharge: number;
    capacityDensitySurge: number;
  };
}

export class DynamicPricingEngine {
  /**
   * Computes dynamic fare and selects ideal auction mode based on demand priority, budget, and local spatial capacity density
   */
  public static calculatePricing(
    demand: {
      demandId: string;
      demandType: string;
      weightKg: number;
      priority: string;
      maxBudget?: number;
      bidAllowed?: boolean;
      distanceKm?: number;
    },
    activeCapacitiesInH3CellCount: number = 5
  ): DynamicPricingResult {
    const distanceKm = demand.distanceKm || 15.0; // Default 15km if not pre-computed
    const baseRatePerKm = demand.demandType === 'Passenger' ? 12 : 8;
    const distanceFare = Math.round(distanceKm * baseRatePerKm);

    const weightFare = Math.round(demand.weightKg * 4); // ₹4 per kg
    
    let urgencySurcharge = 0;
    if (demand.priority === 'High') urgencySurcharge = 50;
    if (demand.priority === 'Critical') urgencySurcharge = 120;

    // Capacity Density Surge Index (Low capacity count => Higher surge multiplier)
    let surgeMultiplier = 1.0;
    if (activeCapacitiesInH3CellCount === 0) surgeMultiplier = 1.5;
    else if (activeCapacitiesInH3CellCount <= 2) surgeMultiplier = 1.3;
    else if (activeCapacitiesInH3CellCount <= 5) surgeMultiplier = 1.1;

    const capacityDensitySurge = Math.round((distanceFare + weightFare) * (surgeMultiplier - 1.0));

    const rawTotal = Math.round((distanceFare + weightFare + urgencySurcharge + capacityDensitySurge));
    const finalRecommendedFare = demand.maxBudget ? Math.min(demand.maxBudget, rawTotal) : rawTotal;

    // Select Auction Mode
    let recommendedAuctionMode: AuctionMode = 'MODE_A_FIXED';
    if (demand.priority === 'Critical' || demand.demandType === 'Emergency') {
      recommendedAuctionMode = 'MODE_D_AUTO_MATCH';
    } else if (demand.bidAllowed && demand.demandType === 'AgriculturalGoods') {
      recommendedAuctionMode = 'MODE_C_MERCHANT_BID';
    } else if (demand.bidAllowed) {
      recommendedAuctionMode = 'MODE_B_DRIVER_BID';
    }

    return {
      demandId: demand.demandId,
      recommendedAuctionMode,
      baseFare: Math.round(distanceFare + weightFare),
      surgeMultiplier: parseFloat(surgeMultiplier.toFixed(2)),
      finalRecommendedFare,
      currency: 'INR',
      bidRange: demand.bidAllowed ? {
        minBid: Math.round(finalRecommendedFare * 0.8),
        maxBid: Math.round(finalRecommendedFare * 1.3)
      } : undefined,
      pricingBreakdown: {
        distanceFare,
        weightFare,
        urgencySurcharge,
        capacityDensitySurge
      }
    };
  }
}
