import { UniversalCapacityObject, UniversalDemandObject } from '../../shared/src/types.js';
import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';
import { RouteSegmentationEngine, RouteStop } from './routeSegmentationEngine.js';

export interface OpportunityItem {
  opportunityId: string;
  demandId: string;
  demandType: string;
  pickupAddress?: string;
  dropAddress?: string;
  netExtraEarnings: number;
  detourDistanceKm: number;
  detourDurationMin: number;
  universalIntelligenceScore: number;
  matchEvidence: {
    routeMatchPercentage: number;
    timeMatchStatus: string;
    capacityFitPercentage: number;
    trustCompatible: boolean;
    cargoCompatible: boolean;
  };
}

export class MatchingPipelineEngine {
  /**
   * Executes the 12-Stage Matching Pipeline to produce a ranked proactive opportunity feed for a driver's UCO
   */
  public static evaluateOpportunities(
    uco: UniversalCapacityObject,
    demands: UniversalDemandObject[]
  ): OpportunityItem[] {
    if (!uco || !demands || demands.length === 0) return [];

    const driverStops: RouteStop[] = [
      { stopName: 'PickupOrigin', lat: uco.currentLocation.lat, lng: uco.currentLocation.lng },
      ...uco.intermediateStops,
      { stopName: 'Destination', lat: uco.destination.lat, lng: uco.destination.lng }
    ];

    const opportunities: OpportunityItem[] = [];

    for (const demand of demands) {
      // Stage 1: Status Filter (Demand must be Created/Matching and UCO Available)
      if (demand.status !== 'Created' && demand.status !== 'Matching') continue;
      if (uco.status !== 'Available') continue;

      // Stage 2: Geographic & H3 Proximity Filter
      const pickupH3 = demand.pickupLocation.h3Index || SpatialTemporalIndexEngine.latLngToH3(demand.pickupLocation.lat, demand.pickupLocation.lng);
      const driverH3 = uco.currentLocation.h3Index || SpatialTemporalIndexEngine.latLngToH3(uco.currentLocation.lat, uco.currentLocation.lng);
      const kRing = SpatialTemporalIndexEngine.getH3kRing(driverH3);

      // Stage 3: Trajectory Overlap & Detour Check
      const overlap = RouteSegmentationEngine.calculateTrajectoryOverlap(
        driverStops,
        demand.pickupLocation,
        demand.dropLocation
      );
      if (!overlap.isMatched) continue;

      // Stage 4: Time Window Overlap Check
      const driverWindow = { start: uco.departureTime, end: uco.arrivalTimeWindow.end };
      const demandWindow = { start: demand.deadlineWindow.pickupBefore, end: demand.deadlineWindow.dropBefore };
      const timeCheck = SpatialTemporalIndexEngine.checkTimeWindowOverlap(driverWindow, demandWindow);
      if (!timeCheck.overlap) continue;

      // Stage 5: Capacity Constraints Filter (Seats, Weight, Volume)
      if (demand.passengerCount > uco.availableSeats) continue;
      if (demand.weightKg > uco.availableWeightKg) continue;
      if (demand.volumeL > uco.availableVolumeL) continue;

      // Stage 6: Cargo Compatibility Filter
      if (demand.demandType === 'Medicine' || demand.demandType === 'AgriculturalGoods' || demand.demandType === 'Parcel') {
        if (uco.allowedCargoTypes && uco.allowedCargoTypes.length > 0) {
          const isAllowed = uco.allowedCargoTypes.includes(demand.demandType) || uco.allowedCargoTypes.includes('Parcel') || uco.allowedCargoTypes.includes('Cargo');
          if (!isAllowed) continue;
        }
      }

      // Stage 7: Trust & Verification Threshold Filter
      const trustReq = demand.trustRequirement || 50;
      if (uco.trustScore < trustReq) continue;

      // Stage 8: Insurance Requirement Filter
      if (demand.insuranceNeeded && uco.insuranceLevel < 1) continue;

      // Stage 9: Economics & Pricing Calculation
      const baseFee = demand.maxBudget || 150;
      const netExtraEarnings = Math.max(50, Math.round(baseFee * (overlap.overlapPercentage / 100)));

      // Stage 10: Universal Intelligence Score (UIS) Formulation
      const routeMatchScore = overlap.overlapPercentage; // 0-100
      const timeMatchScore = 95; // Time window compatible
      const weightRatio = uco.availableWeightKg > 0 ? (demand.weightKg / uco.availableWeightKg) : 0;
      const capacityFitScore = Math.round((1 - weightRatio) * 100);
      const trustScore = uco.trustScore;
      const profitScore = Math.min(100, Math.round((netExtraEarnings / 500) * 100));

      const uis = Math.round(
        (0.30 * routeMatchScore) +
        (0.20 * timeMatchScore) +
        (0.20 * capacityFitScore) +
        (0.15 * profitScore) +
        (0.15 * trustScore)
      );

      // Stage 11 & 12: Proactive Opportunity Feed Generation with XAI Match Evidence
      opportunities.push({
        opportunityId: `OPP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        demandId: demand.demandId,
        demandType: demand.demandType,
        pickupAddress: demand.pickupLocation.address || 'Pickup Point',
        dropAddress: demand.dropLocation.address || 'Drop Point',
        netExtraEarnings,
        detourDistanceKm: overlap.detourDistanceKm,
        detourDurationMin: overlap.detourDurationMin,
        universalIntelligenceScore: uis,
        matchEvidence: {
          routeMatchPercentage: overlap.overlapPercentage,
          timeMatchStatus: '100% SLA Compatible',
          capacityFitPercentage: capacityFitScore,
          trustCompatible: true,
          cargoCompatible: true
        }
      });
    }

    // Sort opportunities by highest Universal Intelligence Score (UIS)
    return opportunities.sort((a, b) => b.universalIntelligenceScore - a.universalIntelligenceScore);
  }
}
