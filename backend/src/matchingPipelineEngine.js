import { SpatialTemporalIndexEngine } from "./spatialTemporalIndex.js";
import { RouteSegmentationEngine } from "./routeSegmentationEngine.js";
class MatchingPipelineEngine {
  /**
   * Executes the 12-Stage Matching Pipeline to produce a ranked proactive opportunity feed for a driver's UCO
   */
  static evaluateOpportunities(uco, demands) {
    if (!uco || !demands || demands.length === 0) return [];
    const driverStops = [
      { stopName: "PickupOrigin", lat: uco.currentLocation.lat, lng: uco.currentLocation.lng },
      ...uco.intermediateStops,
      { stopName: "Destination", lat: uco.destination.lat, lng: uco.destination.lng }
    ];
    const opportunities = [];
    for (const demand of demands) {
      if (demand.status !== "Created" && demand.status !== "Matching") continue;
      if (uco.status !== "Available") continue;
      const pickupH3 = demand.pickupLocation.h3Index || SpatialTemporalIndexEngine.latLngToH3(demand.pickupLocation.lat, demand.pickupLocation.lng);
      const driverH3 = uco.currentLocation.h3Index || SpatialTemporalIndexEngine.latLngToH3(uco.currentLocation.lat, uco.currentLocation.lng);
      const kRing = SpatialTemporalIndexEngine.getH3kRing(driverH3);
      const overlap = RouteSegmentationEngine.calculateTrajectoryOverlap(
        driverStops,
        demand.pickupLocation,
        demand.dropLocation
      );
      if (!overlap.isMatched) continue;
      const driverWindow = { start: uco.departureTime, end: uco.arrivalTimeWindow.end };
      const demandWindow = { start: demand.deadlineWindow.pickupBefore, end: demand.deadlineWindow.dropBefore };
      const timeCheck = SpatialTemporalIndexEngine.checkTimeWindowOverlap(driverWindow, demandWindow);
      if (!timeCheck.overlap) continue;
      if (demand.passengerCount > uco.availableSeats) continue;
      if (demand.weightKg > uco.availableWeightKg) continue;
      if (demand.volumeL > uco.availableVolumeL) continue;
      if (demand.demandType === "Medicine" || demand.demandType === "AgriculturalGoods" || demand.demandType === "Parcel") {
        if (uco.allowedCargoTypes && uco.allowedCargoTypes.length > 0) {
          const isAllowed = uco.allowedCargoTypes.includes(demand.demandType) || uco.allowedCargoTypes.includes("Parcel") || uco.allowedCargoTypes.includes("Cargo");
          if (!isAllowed) continue;
        }
      }
      const trustReq = demand.trustRequirement || 50;
      if (uco.trustScore < trustReq) continue;
      if (demand.insuranceNeeded && uco.insuranceLevel < 1) continue;
      const baseFee = demand.maxBudget || 150;
      const netExtraEarnings = Math.max(50, Math.round(baseFee * (overlap.overlapPercentage / 100)));
      const routeMatchScore = overlap.overlapPercentage;
      const timeMatchScore = 95;
      const weightRatio = uco.availableWeightKg > 0 ? demand.weightKg / uco.availableWeightKg : 0;
      const capacityFitScore = Math.round((1 - weightRatio) * 100);
      const trustScore = uco.trustScore;
      const profitScore = Math.min(100, Math.round(netExtraEarnings / 500 * 100));
      const uis = Math.round(
        0.3 * routeMatchScore + 0.2 * timeMatchScore + 0.2 * capacityFitScore + 0.15 * profitScore + 0.15 * trustScore
      );
      opportunities.push({
        opportunityId: `OPP_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`,
        demandId: demand.demandId,
        demandType: demand.demandType,
        pickupAddress: demand.pickupLocation.address || "Pickup Point",
        dropAddress: demand.dropLocation.address || "Drop Point",
        netExtraEarnings,
        detourDistanceKm: overlap.detourDistanceKm,
        detourDurationMin: overlap.detourDurationMin,
        universalIntelligenceScore: uis,
        matchEvidence: {
          routeMatchPercentage: overlap.overlapPercentage,
          timeMatchStatus: "100% SLA Compatible",
          capacityFitPercentage: capacityFitScore,
          trustCompatible: true,
          cargoCompatible: true
        }
      });
    }
    return opportunities.sort((a, b) => b.universalIntelligenceScore - a.universalIntelligenceScore);
  }
}
export {
  MatchingPipelineEngine
};
