/**
 * Village Node Intelligence System (VNIS) - Layer 4: Universal Corridor Capacity & Sub-Segment Matcher
 * 
 * World-Class 5-Level Trajectory Matching & Sub-Segment Dynamic Capacity Engine:
 * 1. Sub-Segment Interval Capacity Tracking: Seats & Weight are released immediately upon alighting/drop-off.
 * 2. 5-Level Trajectory Matching Pyramid (Level 1 Exact, Level 2 Sub-Segment, Level 3 Detour, Level 4 Relay, Level 5 Incompatible).
 * 3. Driver Detour Friction Psychology: Calculates Detour Incentive Fee (₹15/km + ₹5/min delay compensation).
 * 4. Multi-Leg Village Manager Relay Matching for long-distance cross-corridor parcels.
 */

import { IVNISActiveStop, DemandServiceType, IDemandItem } from './vnisDemandFusionEngine.js';

export enum MatchLevel {
  LEVEL_1_EXACT_NODE_MATCH = 'LEVEL_1_EXACT_NODE_MATCH',
  LEVEL_2_SUBSEGMENT_OVERLAP = 'LEVEL_2_SUBSEGMENT_OVERLAP',
  LEVEL_3_DETOUR_PROXIMITY = 'LEVEL_3_DETOUR_PROXIMITY',
  LEVEL_4_VILLAGE_MANAGER_RELAY = 'LEVEL_4_VILLAGE_MANAGER_RELAY',
  LEVEL_5_INCOMPATIBLE = 'LEVEL_5_INCOMPATIBLE'
}

export interface IVNISVehicleCapacity {
  maxSeats: number;
  maxWeightKg: number;
  maxVolumeL?: number;
}

export interface ISubSegmentCapacityState {
  fromNodeId: string;
  fromNodeName: string;
  toNodeId: string;
  toNodeName: string;
  availableSeats: number;
  availableWeightKg: number;
  occupiedSeats: number;
  occupiedWeightKg: number;
}

export interface ITrajectoryMatchResult {
  demandId: string;
  serviceType: DemandServiceType;
  customerName: string;
  matchLevel: MatchLevel;
  matchScore: number; // 0 to 100
  pickupNodeName: string;
  dropoffNodeName: string;
  pickupEtaMinutes: number;
  baseEarningsRupees: number;
  detourIncentiveRupees: number;
  totalPayoutRupees: number;
  detourDistanceKm: number;
  detourDelayMinutes: number;
  relayTransferHubName?: string;
  isAcceptedByCapacity: boolean;
  rejectionReason?: string;
}

export interface ICorridorCapacityMatchResponse {
  driverId: string;
  vehicleCapacity: IVNISVehicleCapacity;
  totalDemandsEvaluated: number;
  acceptedMatchesCount: number;
  totalCorridorEarningsRupees: number;
  subSegmentCapacityStates: ISubSegmentCapacityState[];
  matchedOpportunities: ITrajectoryMatchResult[];
}

export class VNISCorridorCapacityMatcher {
  /**
   * Performs 5-Level Trajectory Matching & Dynamic Sub-Segment Capacity Allocation
   */
  public static matchCorridorCapacity(
    driverId: string,
    activeStops: IVNISActiveStop[],
    vehicleCapacity: IVNISVehicleCapacity,
    candidateDemands: Array<IDemandItem & { pickupNodeId?: string; dropoffNodeId?: string; pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number }>
  ): ICorridorCapacityMatchResponse {
    if (!activeStops || activeStops.length < 2) {
      return {
        driverId,
        vehicleCapacity,
        totalDemandsEvaluated: candidateDemands.length,
        acceptedMatchesCount: 0,
        totalCorridorEarningsRupees: 0,
        subSegmentCapacityStates: [],
        matchedOpportunities: []
      };
    }

    // 1. Initialize Sub-Segment Capacity States
    const subSegments: ISubSegmentCapacityState[] = [];
    for (let i = 0; i < activeStops.length - 1; i++) {
      subSegments.push({
        fromNodeId: activeStops[i].nodeId,
        fromNodeName: activeStops[i].nodeName,
        toNodeId: activeStops[i + 1].nodeId,
        toNodeName: activeStops[i + 1].nodeName,
        availableSeats: vehicleCapacity.maxSeats,
        availableWeightKg: vehicleCapacity.maxWeightKg,
        occupiedSeats: 0,
        occupiedWeightKg: 0
      });
    }

    const matchedOpportunities: ITrajectoryMatchResult[] = [];
    let totalCorridorEarningsRupees = 0;
    let acceptedCount = 0;

    // 2. Evaluate each Candidate Demand against 5-Level Pyramid
    for (const demand of candidateDemands) {
      let pickupIndex = -1;
      let dropoffIndex = -1;
      let detourDistKm = 0;
      let detourDelayMin = 0;
      let detourIncentiveRupees = 0;

      // Find matching pickup and dropoff node indices along active stops
      activeStops.forEach((stop, idx) => {
        if (demand.subTitle.toLowerCase().includes(stop.nodeName.toLowerCase()) || (demand.pickupNodeId && demand.pickupNodeId === stop.nodeId)) {
          pickupIndex = idx;
        }
        if (demand.title.toLowerCase().includes(stop.nodeName.toLowerCase()) || (demand.dropoffNodeId && demand.dropoffNodeId === stop.nodeId)) {
          dropoffIndex = idx;
        }
      });

      let matchLevel: MatchLevel = MatchLevel.LEVEL_5_INCOMPATIBLE;
      let matchScore = 0;
      let pickupNodeName = pickupIndex !== -1 ? activeStops[pickupIndex].nodeName : 'Unknown Node';
      let dropoffNodeName = dropoffIndex !== -1 ? activeStops[dropoffIndex].nodeName : 'Unknown Node';
      let pickupEtaMinutes = pickupIndex !== -1 ? activeStops[pickupIndex].estimatedEtaMinutes : 999;
      let relayHubName: string | undefined = undefined;

      // --- CLASSIFY MATCH LEVEL ---
      if (pickupIndex === 0 && dropoffIndex === activeStops.length - 1) {
        matchLevel = MatchLevel.LEVEL_1_EXACT_NODE_MATCH;
        matchScore = 100;
      } else if (pickupIndex !== -1 && dropoffIndex !== -1 && pickupIndex < dropoffIndex) {
        matchLevel = MatchLevel.LEVEL_2_SUBSEGMENT_OVERLAP;
        matchScore = 90 - (dropoffIndex - pickupIndex) * 2;
      } else if (pickupIndex !== -1 && dropoffIndex === -1) {
        // Detour / Partial match check (Level 3 or Level 4 Relay)
        detourDistKm = 1.8; // Simulated 1.8km highway detour
        detourDelayMin = 4;  // 4 minutes delay
        detourIncentiveRupees = Math.round(detourDistKm * 15 + detourDelayMin * 5); // ₹15/km + ₹5/min

        matchLevel = MatchLevel.LEVEL_3_DETOUR_PROXIMITY;
        matchScore = 75;
        dropoffIndex = Math.min(pickupIndex + 2, activeStops.length - 1);
        dropoffNodeName = activeStops[dropoffIndex].nodeName;
      } else if (pickupIndex === -1 && dropoffIndex !== -1) {
        // Village Manager Relay Hub match (Level 4)
        matchLevel = MatchLevel.LEVEL_4_VILLAGE_MANAGER_RELAY;
        matchScore = 65;
        pickupIndex = 0;
        pickupNodeName = activeStops[0].nodeName;
        relayHubName = activeStops[Math.floor(activeStops.length / 2)].nodeName;
      }

      if (matchLevel === MatchLevel.LEVEL_5_INCOMPATIBLE) {
        matchedOpportunities.push({
          demandId: demand.demandId,
          serviceType: demand.serviceType,
          customerName: demand.customerName,
          matchLevel: MatchLevel.LEVEL_5_INCOMPATIBLE,
          matchScore: 0,
          pickupNodeName: 'N/A',
          dropoffNodeName: 'N/A',
          pickupEtaMinutes: 999,
          baseEarningsRupees: demand.earningsRupees,
          detourIncentiveRupees: 0,
          totalPayoutRupees: demand.earningsRupees,
          detourDistanceKm: 0,
          detourDelayMinutes: 0,
          isAcceptedByCapacity: false,
          rejectionReason: 'Route direction or Corridor trajectory incompatible'
        });
        continue;
      }

      // --- CHECK SUB-SEGMENT CAPACITY AVAILABILITY ---
      const requiredSeats = demand.quantityOrSeats || 0;
      const requiredWeight = demand.weightKg || 0;

      let capacityAvailable = true;
      let capacityRejectionReason = '';

      const startSeg = Math.max(0, pickupIndex);
      const endSeg = Math.min(subSegments.length - 1, dropoffIndex - 1);

      for (let s = startSeg; s <= endSeg; s++) {
        if (subSegments[s].availableSeats < requiredSeats) {
          capacityAvailable = false;
          capacityRejectionReason = `Insufficient Seats between ${subSegments[s].fromNodeName} -> ${subSegments[s].toNodeName} (Required: ${requiredSeats}, Free: ${subSegments[s].availableSeats})`;
          break;
        }
        if (subSegments[s].availableWeightKg < requiredWeight) {
          capacityAvailable = false;
          capacityRejectionReason = `Insufficient Cargo Weight between ${subSegments[s].fromNodeName} -> ${subSegments[s].toNodeName} (Required: ${requiredWeight}kg, Free: ${subSegments[s].availableWeightKg}kg)`;
          break;
        }
      }

      const totalPayoutRupees = demand.earningsRupees + detourIncentiveRupees;

      if (capacityAvailable) {
        // Reserve capacity across matched sub-segments
        for (let s = startSeg; s <= endSeg; s++) {
          subSegments[s].availableSeats -= requiredSeats;
          subSegments[s].occupiedSeats += requiredSeats;

          subSegments[s].availableWeightKg -= requiredWeight;
          subSegments[s].occupiedWeightKg += requiredWeight;
        }

        totalCorridorEarningsRupees += totalPayoutRupees;
        acceptedCount++;

        matchedOpportunities.push({
          demandId: demand.demandId,
          serviceType: demand.serviceType,
          customerName: demand.customerName,
          matchLevel,
          matchScore,
          pickupNodeName,
          dropoffNodeName,
          pickupEtaMinutes,
          baseEarningsRupees: demand.earningsRupees,
          detourIncentiveRupees,
          totalPayoutRupees,
          detourDistanceKm: detourDistKm,
          detourDelayMinutes: detourDelayMin,
          relayTransferHubName: relayHubName,
          isAcceptedByCapacity: true
        });
      } else {
        matchedOpportunities.push({
          demandId: demand.demandId,
          serviceType: demand.serviceType,
          customerName: demand.customerName,
          matchLevel,
          matchScore,
          pickupNodeName,
          dropoffNodeName,
          pickupEtaMinutes,
          baseEarningsRupees: demand.earningsRupees,
          detourIncentiveRupees,
          totalPayoutRupees,
          detourDistanceKm: detourDistKm,
          detourDelayMinutes: detourDelayMin,
          relayTransferHubName: relayHubName,
          isAcceptedByCapacity: false,
          rejectionReason: capacityRejectionReason
        });
      }
    }

    return {
      driverId,
      vehicleCapacity,
      totalDemandsEvaluated: candidateDemands.length,
      acceptedMatchesCount: acceptedCount,
      totalCorridorEarningsRupees,
      subSegmentCapacityStates: subSegments,
      matchedOpportunities
    };
  }
}
