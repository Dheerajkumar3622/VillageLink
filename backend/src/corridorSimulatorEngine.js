import { MatchingPipelineEngine } from "./matchingPipelineEngine.js";
import { DemandFusionEngine } from "./demandFusionEngine.js";
class CorridorSimulatorEngine {
  /**
   * Simulates execution along a single high-density liquidity corridor (e.g. Patna -> Ara -> Buxar)
   */
  static runCorridorSimulation(simulatedDriversCount = 10, simulatedDemandsCount = 35) {
    const now = Date.now();
    const corridorName = "Patna-Ara-Buxar Corridor (NH-922)";
    const simulatedUCOs = [];
    for (let i = 0; i < simulatedDriversCount; i++) {
      simulatedUCOs.push({
        capacityId: `UCO_SIM_DRIVER_${i + 1}`,
        ownerId: `DRIVER_SIM_${i + 1}`,
        vehicleId: `BR01_SIM_${1e3 + i}`,
        currentLocation: { lat: 25.5941 + i * 0.01, lng: 85.1376 - i * 0.01 },
        destination: { lat: 25.556, lng: 84.6603 },
        intermediateStops: [],
        availableSeats: 3,
        availableWeightKg: 60,
        availableVolumeL: 120,
        departureTime: now,
        arrivalTimeWindow: { start: now, end: now + 72e5 },
        allowedCargoTypes: ["Passenger", "Parcel", "Medicine"],
        trustScore: 90 + i % 10,
        insuranceLevel: 1,
        status: "Available",
        liveGps: { lat: 25.5941, lng: 85.1376, timestamp: now },
        expiryTime: now + 144e5
      });
    }
    const simulatedUDOs = [];
    const types = ["Passenger", "Parcel", "Medicine", "AgriculturalGoods"];
    for (let j = 0; j < simulatedDemandsCount; j++) {
      simulatedUDOs.push({
        demandId: `UDO_SIM_DEMAND_${j + 1}`,
        requesterId: `REQ_SIM_${j + 1}`,
        demandType: types[j % types.length],
        pickupLocation: { lat: 25.5941 + j * 5e-3, lng: 85.1376 - j * 5e-3, address: "Corridor Pickup Point" },
        dropLocation: { lat: 25.556 - j * 3e-3, lng: 84.6603 + j * 3e-3, address: "Corridor Drop Point" },
        weightKg: 5 + j % 15,
        volumeL: 10 + j % 20,
        passengerCount: j % types.length === 0 ? 1 : 0,
        priority: j % 5 === 0 ? "High" : "Medium",
        deadlineWindow: { pickupBefore: now + 36e5, dropBefore: now + 72e5 },
        insuranceNeeded: false,
        maxBudget: 150 + j * 10,
        trustRequirement: 50,
        status: "Created",
        createdAt: now
      });
    }
    let matchedDemandsCount = 0;
    let totalEmptyKmSaved = 0;
    let totalDriverRevenueGenerated = 0;
    let totalUtilization = 0;
    const demandsMap = /* @__PURE__ */ new Map();
    simulatedUDOs.forEach((d) => demandsMap.set(d.demandId, d));
    simulatedUCOs.forEach((uco) => {
      const opps = MatchingPipelineEngine.evaluateOpportunities(uco, simulatedUDOs);
      if (opps.length > 0) {
        const fusedPlan = DemandFusionEngine.fuseDemands(uco, opps, demandsMap);
        matchedDemandsCount += fusedPlan.selectedDemands.length;
        totalDriverRevenueGenerated += fusedPlan.totalStackedEarnings;
        totalEmptyKmSaved += fusedPlan.selectedDemands.length * 28.5;
        totalUtilization += fusedPlan.capacityUtilizationPercentage;
      }
    });
    const averageCapacityUtilization = Math.round(totalUtilization / simulatedDriversCount);
    return {
      corridorName,
      simulatedDriversCount,
      simulatedDemandsCount,
      matchedDemandsCount,
      totalEmptyKmSaved: parseFloat(totalEmptyKmSaved.toFixed(1)),
      totalDriverRevenueGenerated,
      averageCapacityUtilization
    };
  }
}
export {
  CorridorSimulatorEngine
};
