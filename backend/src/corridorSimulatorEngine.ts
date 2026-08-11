import { UniversalCapacityObject, UniversalDemandObject } from '../../shared/src/types.js';
import { MatchingPipelineEngine } from './matchingPipelineEngine.js';
import { DemandFusionEngine } from './demandFusionEngine.js';

export interface CorridorSimulationResult {
  corridorName: string;
  simulatedDriversCount: number;
  simulatedDemandsCount: number;
  matchedDemandsCount: number;
  totalEmptyKmSaved: number; // Recovered Idle Capacity (RIC)
  totalDriverRevenueGenerated: number;
  averageCapacityUtilization: number;
}

export class CorridorSimulatorEngine {
  /**
   * Simulates execution along a single high-density liquidity corridor (e.g. Patna -> Ara -> Buxar)
   */
  public static runCorridorSimulation(
    simulatedDriversCount: number = 10,
    simulatedDemandsCount: number = 35
  ): CorridorSimulationResult {
    const now = Date.now();
    const corridorName = 'Patna-Ara-Buxar Corridor (NH-922)';

    const simulatedUCOs: UniversalCapacityObject[] = [];
    for (let i = 0; i < simulatedDriversCount; i++) {
      simulatedUCOs.push({
        capacityId: `UCO_SIM_DRIVER_${i + 1}`,
        ownerId: `DRIVER_SIM_${i + 1}`,
        vehicleId: `BR01_SIM_${1000 + i}`,
        currentLocation: { lat: 25.5941 + (i * 0.01), lng: 85.1376 - (i * 0.01) },
        destination: { lat: 25.5560, lng: 84.6603 },
        intermediateStops: [],
        availableSeats: 3,
        availableWeightKg: 60,
        availableVolumeL: 120,
        departureTime: now,
        arrivalTimeWindow: { start: now, end: now + 7200000 },
        allowedCargoTypes: ['Passenger', 'Parcel', 'Medicine'],
        trustScore: 90 + (i % 10),
        insuranceLevel: 1,
        status: 'Available',
        liveGps: { lat: 25.5941, lng: 85.1376, timestamp: now },
        expiryTime: now + 14400000
      });
    }

    const simulatedUDOs: UniversalDemandObject[] = [];
    const types: Array<'Passenger' | 'Parcel' | 'Medicine' | 'AgriculturalGoods'> = ['Passenger', 'Parcel', 'Medicine', 'AgriculturalGoods'];

    for (let j = 0; j < simulatedDemandsCount; j++) {
      simulatedUDOs.push({
        demandId: `UDO_SIM_DEMAND_${j + 1}`,
        requesterId: `REQ_SIM_${j + 1}`,
        demandType: types[j % types.length],
        pickupLocation: { lat: 25.5941 + (j * 0.005), lng: 85.1376 - (j * 0.005), address: 'Corridor Pickup Point' },
        dropLocation: { lat: 25.5560 - (j * 0.003), lng: 84.6603 + (j * 0.003), address: 'Corridor Drop Point' },
        weightKg: 5 + (j % 15),
        volumeL: 10 + (j % 20),
        passengerCount: (j % types.length) === 0 ? 1 : 0,
        priority: j % 5 === 0 ? 'High' : 'Medium',
        deadlineWindow: { pickupBefore: now + 3600000, dropBefore: now + 7200000 },
        insuranceNeeded: false,
        maxBudget: 150 + (j * 10),
        trustRequirement: 50,
        status: 'Created',
        createdAt: now
      });
    }

    let matchedDemandsCount = 0;
    let totalEmptyKmSaved = 0;
    let totalDriverRevenueGenerated = 0;
    let totalUtilization = 0;

    const demandsMap = new Map();
    simulatedUDOs.forEach(d => demandsMap.set(d.demandId, d));

    simulatedUCOs.forEach(uco => {
      const opps = MatchingPipelineEngine.evaluateOpportunities(uco, simulatedUDOs);
      if (opps.length > 0) {
        const fusedPlan = DemandFusionEngine.fuseDemands(uco, opps, demandsMap);
        matchedDemandsCount += fusedPlan.selectedDemands.length;
        totalDriverRevenueGenerated += fusedPlan.totalStackedEarnings;
        totalEmptyKmSaved += fusedPlan.selectedDemands.length * 28.5; // ~28.5km empty return saved per co-loaded demand
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
