import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VNISDemandOverlayEngine {
  /**
   * Phase 6: Unified Ride + Parcel + Mandi + Mess Demand Overlay Engine
   * Overlays live economic demand objects onto the ordered Village-Aware Road Graph.
   * 
   * @param {Array<Object>} orderedVillageNodes Output from Phase 4 / Phase 5 GeoGraph
   * @param {string} routeId Optional route identifier
   */
  static async overlayUnifiedDemand(orderedVillageNodes, routeId = 'R-CORRIDOR-01') {
    if (!orderedVillageNodes || orderedVillageNodes.length === 0) {
      return { success: false, error: 'orderedVillageNodes array required' };
    }

    let totalPassengersWaiting = 0;
    let totalParcelsWaiting = 0;
    let totalMandiListings = 0;

    const nodesWithDemand = orderedVillageNodes.map((node, idx) => {
      // Simulate/Retrieve live node economic demand overlay
      const passengerCount = Math.floor(Math.random() * 4); // 0 to 3 waiting
      const parcelCount = Math.floor(Math.random() * 3); // 0 to 2 parcels
      const mandiCount = (idx % 2 === 0) ? Math.floor(Math.random() * 2) + 1 : 0; // Mandi produce listings

      totalPassengersWaiting += passengerCount;
      totalParcelsWaiting += parcelCount;
      totalMandiListings += mandiCount;

      const hasActiveDemand = passengerCount > 0 || parcelCount > 0 || mandiCount > 0;

      return {
        ...node,
        demandOverlay: {
          hasActiveDemand,
          passengerDemandCount: passengerCount,
          parcelDemandCount: parcelCount,
          mandiListingCount: mandiCount,
          estimatedSubSegmentFare: 15 + (idx * 10), // ₹ fare for intermediate sub-segment
          statusTag: passengerCount > 2 ? 'HIGH_DEMAND_HOTSPOT' : hasActiveDemand ? 'ACTIVE_PICKUP_NODE' : 'FEEDER_NODE'
        }
      };
    });

    const activeDemandNodesCount = nodesWithDemand.filter(n => n.demandOverlay.hasActiveDemand).length;

    return {
      success: true,
      routeId,
      overlaySummary: {
        totalNodesEvaluated: nodesWithDemand.length,
        activeDemandNodesCount,
        totalPassengersWaiting,
        totalParcelsWaiting,
        totalMandiListings,
        estimatedTotalRouteRevenueBoost: (totalPassengersWaiting * 35) + (totalParcelsWaiting * 50) + (totalMandiListings * 100)
      },
      nodesWithDemand
    };
  }
}
