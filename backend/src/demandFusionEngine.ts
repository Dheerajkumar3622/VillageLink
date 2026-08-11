import { UniversalCapacityObject, UniversalDemandObject } from '../../shared/src/types.js';
import { OpportunityItem } from './matchingPipelineEngine.js';

export interface FusedJourneyPlan {
  planId: string;
  capacityId: string;
  selectedDemands: Array<{
    demandId: string;
    demandType: string;
    pickupAddress?: string;
    dropAddress?: string;
    earnings: number;
  }>;
  totalStackedEarnings: number;
  residualCapacity: {
    remainingSeats: number;
    remainingWeightKg: number;
    remainingVolumeL: number;
  };
  capacityUtilizationPercentage: number;
}

export class DemandFusionEngine {
  /**
   * Combines compatible, non-conflicting opportunities into a single co-loaded journey plan
   */
  public static fuseDemands(
    uco: UniversalCapacityObject,
    opportunities: OpportunityItem[],
    demandsMap: Map<string, UniversalDemandObject>
  ): FusedJourneyPlan {
    let currentSeats = uco.availableSeats;
    let currentWeight = uco.availableWeightKg;
    let currentVolume = uco.availableVolumeL;

    const selectedDemands: FusedJourneyPlan['selectedDemands'] = [];
    let totalStackedEarnings = 0;

    for (const opp of opportunities) {
      const demand = demandsMap.get(opp.demandId);
      if (!demand) continue;

      // Check if current residual capacity fits this demand
      if (
        demand.passengerCount <= currentSeats &&
        demand.weightKg <= currentWeight &&
        demand.volumeL <= currentVolume
      ) {
        // Accept into fused journey plan
        currentSeats -= demand.passengerCount;
        currentWeight -= demand.weightKg;
        currentVolume -= demand.volumeL;

        totalStackedEarnings += opp.netExtraEarnings;

        selectedDemands.push({
          demandId: opp.demandId,
          demandType: opp.demandType,
          pickupAddress: opp.pickupAddress,
          dropAddress: opp.dropAddress,
          earnings: opp.netExtraEarnings
        });
      }
    }

    const usedWeight = uco.availableWeightKg - currentWeight;
    const weightUtil = uco.availableWeightKg > 0 ? (usedWeight / uco.availableWeightKg) : 0;
    const usedSeats = uco.availableSeats - currentSeats;
    const seatUtil = uco.availableSeats > 0 ? (usedSeats / uco.availableSeats) : 0;

    const capacityUtilizationPercentage = Math.round(Math.max(weightUtil, seatUtil) * 100);

    return {
      planId: `FUSION_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      capacityId: uco.capacityId,
      selectedDemands,
      totalStackedEarnings,
      residualCapacity: {
        remainingSeats: currentSeats,
        remainingWeightKg: currentWeight,
        remainingVolumeL: currentVolume
      },
      capacityUtilizationPercentage
    };
  }
}
