class DemandFusionEngine {
  /**
   * Combines compatible, non-conflicting opportunities into a single co-loaded journey plan
   */
  static fuseDemands(uco, opportunities, demandsMap) {
    let currentSeats = uco.availableSeats;
    let currentWeight = uco.availableWeightKg;
    let currentVolume = uco.availableVolumeL;
    const selectedDemands = [];
    let totalStackedEarnings = 0;
    for (const opp of opportunities) {
      const demand = demandsMap.get(opp.demandId);
      if (!demand) continue;
      if (demand.passengerCount <= currentSeats && demand.weightKg <= currentWeight && demand.volumeL <= currentVolume) {
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
    const weightUtil = uco.availableWeightKg > 0 ? usedWeight / uco.availableWeightKg : 0;
    const usedSeats = uco.availableSeats - currentSeats;
    const seatUtil = uco.availableSeats > 0 ? usedSeats / uco.availableSeats : 0;
    const capacityUtilizationPercentage = Math.round(Math.max(weightUtil, seatUtil) * 100);
    return {
      planId: `FUSION_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`,
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
export {
  DemandFusionEngine
};
