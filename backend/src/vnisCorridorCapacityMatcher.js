var MatchLevel = /* @__PURE__ */ ((MatchLevel2) => {
  MatchLevel2["LEVEL_1_EXACT_NODE_MATCH"] = "LEVEL_1_EXACT_NODE_MATCH";
  MatchLevel2["LEVEL_2_SUBSEGMENT_OVERLAP"] = "LEVEL_2_SUBSEGMENT_OVERLAP";
  MatchLevel2["LEVEL_3_DETOUR_PROXIMITY"] = "LEVEL_3_DETOUR_PROXIMITY";
  MatchLevel2["LEVEL_4_VILLAGE_MANAGER_RELAY"] = "LEVEL_4_VILLAGE_MANAGER_RELAY";
  MatchLevel2["LEVEL_5_INCOMPATIBLE"] = "LEVEL_5_INCOMPATIBLE";
  return MatchLevel2;
})(MatchLevel || {});
class VNISCorridorCapacityMatcher {
  /**
   * Performs 5-Level Trajectory Matching & Dynamic Sub-Segment Capacity Allocation
   */
  static matchCorridorCapacity(driverId, activeStops, vehicleCapacity, candidateDemands) {
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
    const subSegments = [];
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
    const matchedOpportunities = [];
    let totalCorridorEarningsRupees = 0;
    let acceptedCount = 0;
    for (const demand of candidateDemands) {
      let pickupIndex = -1;
      let dropoffIndex = -1;
      let detourDistKm = 0;
      let detourDelayMin = 0;
      let detourIncentiveRupees = 0;
      activeStops.forEach((stop, idx) => {
        if (demand.subTitle.toLowerCase().includes(stop.nodeName.toLowerCase()) || demand.pickupNodeId && demand.pickupNodeId === stop.nodeId) {
          pickupIndex = idx;
        }
        if (demand.title.toLowerCase().includes(stop.nodeName.toLowerCase()) || demand.dropoffNodeId && demand.dropoffNodeId === stop.nodeId) {
          dropoffIndex = idx;
        }
      });
      let matchLevel = "LEVEL_5_INCOMPATIBLE" /* LEVEL_5_INCOMPATIBLE */;
      let matchScore = 0;
      let pickupNodeName = pickupIndex !== -1 ? activeStops[pickupIndex].nodeName : "Unknown Node";
      let dropoffNodeName = dropoffIndex !== -1 ? activeStops[dropoffIndex].nodeName : "Unknown Node";
      let pickupEtaMinutes = pickupIndex !== -1 ? activeStops[pickupIndex].estimatedEtaMinutes : 999;
      let relayHubName = void 0;
      if (pickupIndex === 0 && dropoffIndex === activeStops.length - 1) {
        matchLevel = "LEVEL_1_EXACT_NODE_MATCH" /* LEVEL_1_EXACT_NODE_MATCH */;
        matchScore = 100;
      } else if (pickupIndex !== -1 && dropoffIndex !== -1 && pickupIndex < dropoffIndex) {
        matchLevel = "LEVEL_2_SUBSEGMENT_OVERLAP" /* LEVEL_2_SUBSEGMENT_OVERLAP */;
        matchScore = 90 - (dropoffIndex - pickupIndex) * 2;
      } else if (pickupIndex !== -1 && dropoffIndex === -1) {
        detourDistKm = 1.8;
        detourDelayMin = 4;
        detourIncentiveRupees = Math.round(detourDistKm * 15 + detourDelayMin * 5);
        matchLevel = "LEVEL_3_DETOUR_PROXIMITY" /* LEVEL_3_DETOUR_PROXIMITY */;
        matchScore = 75;
        dropoffIndex = Math.min(pickupIndex + 2, activeStops.length - 1);
        dropoffNodeName = activeStops[dropoffIndex].nodeName;
      } else if (pickupIndex === -1 && dropoffIndex !== -1) {
        matchLevel = "LEVEL_4_VILLAGE_MANAGER_RELAY" /* LEVEL_4_VILLAGE_MANAGER_RELAY */;
        matchScore = 65;
        pickupIndex = 0;
        pickupNodeName = activeStops[0].nodeName;
        relayHubName = activeStops[Math.floor(activeStops.length / 2)].nodeName;
      }
      if (matchLevel === "LEVEL_5_INCOMPATIBLE" /* LEVEL_5_INCOMPATIBLE */) {
        matchedOpportunities.push({
          demandId: demand.demandId,
          serviceType: demand.serviceType,
          customerName: demand.customerName,
          matchLevel: "LEVEL_5_INCOMPATIBLE" /* LEVEL_5_INCOMPATIBLE */,
          matchScore: 0,
          pickupNodeName: "N/A",
          dropoffNodeName: "N/A",
          pickupEtaMinutes: 999,
          baseEarningsRupees: demand.earningsRupees,
          detourIncentiveRupees: 0,
          totalPayoutRupees: demand.earningsRupees,
          detourDistanceKm: 0,
          detourDelayMinutes: 0,
          isAcceptedByCapacity: false,
          rejectionReason: "Route direction or Corridor trajectory incompatible"
        });
        continue;
      }
      const requiredSeats = demand.quantityOrSeats || 0;
      const requiredWeight = demand.weightKg || 0;
      let capacityAvailable = true;
      let capacityRejectionReason = "";
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
export {
  MatchLevel,
  VNISCorridorCapacityMatcher
};
