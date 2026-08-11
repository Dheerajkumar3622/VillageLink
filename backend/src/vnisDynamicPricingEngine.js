import { DemandServiceType } from "./vnisDemandFusionEngine.js";
class VNISDynamicPricingEngine {
  /**
   * Calculates Multi-Service Fare & 3-Way Revenue Settlement Split
   */
  static calculateFare(input) {
    const distanceKm = Math.max(0.5, input.distanceKm);
    const weightKg = input.weightKg || 0;
    const seats = input.quantityOrSeats || 1;
    const hour = input.hourOfDay !== void 0 ? input.hourOfDay : (/* @__PURE__ */ new Date()).getHours();
    let baseFare = 0;
    let distanceFare = 0;
    let weightFare = 0;
    switch (input.serviceType) {
      case DemandServiceType.YATRA_PASSENGER_PICKUP:
      case DemandServiceType.YATRA_PASSENGER_DROPOFF:
        baseFare = 15 * seats;
        distanceFare = distanceKm * 4 * seats;
        weightFare = weightKg > 10 ? (weightKg - 10) * 1.5 : 0;
        break;
      case DemandServiceType.PARCEL_PICKUP_HUB:
      case DemandServiceType.PARCEL_DROPOFF_HUB:
        baseFare = 25;
        distanceFare = distanceKm * 3.5;
        weightFare = weightKg * 2;
        break;
      case DemandServiceType.GRAM_MANDI_PRODUCE_COLLECT:
        baseFare = 40;
        distanceFare = distanceKm * 2.5;
        weightFare = weightKg * 0.8;
        break;
      case DemandServiceType.FOOD_MESS_DELIVERY:
        baseFare = 20;
        distanceFare = distanceKm * 2;
        weightFare = 0;
        break;
      default:
        baseFare = 20;
        distanceFare = distanceKm * 3;
        break;
    }
    let peakAsymmetryMultiplier = 1;
    if (hour >= 6 && hour <= 10 || hour >= 17 && hour <= 20) {
      peakAsymmetryMultiplier = 1.2;
    }
    let harvestSurgeMultiplier = input.isHarvestSeason ? 1.25 : 1;
    let weatherRiskMultiplier = input.isMonsoonOrFloodRisk ? 1.25 : 1;
    let subtotal = (baseFare + distanceFare + weightFare) * peakAsymmetryMultiplier * harvestSurgeMultiplier * weatherRiskMultiplier;
    let reverseDirectionDiscountRupees = 0;
    if (input.isReverseDirection) {
      reverseDirectionDiscountRupees = Math.round(subtotal * 0.4);
      subtotal -= reverseDirectionDiscountRupees;
    }
    let detourFeeRupees = 0;
    if (input.detourDistanceKm && input.detourDistanceKm > 0) {
      const delayMin = input.detourDelayMinutes || 3;
      detourFeeRupees = Math.round(input.detourDistanceKm * 15 + delayMin * 5);
    }
    const grossFareRupees = Math.max(20, Math.round(subtotal + detourFeeRupees));
    const baseShareableFare = Math.max(0, grossFareRupees - detourFeeRupees);
    const driverEarningsBase = Math.round(baseShareableFare * 0.82);
    const villageManagerFee = Math.round(baseShareableFare * 0.1);
    const vnisPlatformFee = grossFareRupees - (driverEarningsBase + detourFeeRupees + villageManagerFee);
    const driverTotalEarnings = driverEarningsBase + detourFeeRupees;
    const fareSummaryText = `Fare \u20B9${grossFareRupees} (Driver \u20B9${driverTotalEarnings} | Hub \u20B9${villageManagerFee} | App \u20B9${vnisPlatformFee})`;
    return {
      serviceType: input.serviceType,
      distanceKm,
      weightKg,
      seatsCount: seats,
      baseFareRupees: baseFare,
      distanceFareRupees: distanceFare,
      weightFareRupees: weightFare,
      peakAsymmetryMultiplier,
      harvestSurgeMultiplier,
      weatherRiskMultiplier,
      reverseDirectionDiscountRupees,
      detourFeeRupees,
      grossFareRupees,
      settlement: {
        driverEarningsRupees: driverTotalEarnings,
        villageManagerFeeRupees: villageManagerFee,
        vnisPlatformFeeRupees: vnisPlatformFee
      },
      fareSummaryText
    };
  }
}
export {
  VNISDynamicPricingEngine
};
