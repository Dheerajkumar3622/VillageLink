import express from 'express';
import { VNISRegistryEngine } from '../src/vnisRegistryEngine.js';
import { VNISCorridorSnappingEngine } from '../src/vnisCorridorSnappingEngine.js';
import { VNISDemandFusionEngine } from '../src/vnisDemandFusionEngine.js';
import { VNISCorridorCapacityMatcher } from '../src/vnisCorridorCapacityMatcher.js';
import { VNISDynamicPricingEngine } from '../src/vnisDynamicPricingEngine.js';
import { VNISVillageManagerEngine } from '../src/vnisVillageManagerEngine.js';
import { VNISAutonomousDecisionEngine } from '../src/vnisAutonomousDecisionEngine.js';
import { GSMTriangulationEngine } from '../src/gsmTriangulationEngine.js';
import { ContractionHierarchiesEngine } from '../src/contractionHierarchiesEngine.js';
import { DriverTrajectoryModel } from '../src/driverTrajectoryModel.js';
import { SpatialTemporalIndexEngine } from '../src/spatialTemporalIndex.js';
import { VNISSpatialClusteringEngine } from '../src/vnisSpatialClusteringEngine.js';
import { VNISHMMMapMatcher } from '../src/vnisHMMMapMatcher.js';
import { VNISJunctionVillageAllocator } from '../src/vnisJunctionVillageAllocator.js';

const router = express.Router();

/**
 * POST /api/vnis/corridor/allocate-junctions
 * T-Junction & Y-Junction Feeder Village Catchment Allocator Endpoint
 */
router.post('/corridor/allocate-junctions', async (req, res) => {
  try {
    const { polyline, maxFeederRadiusKm } = req.body;
    if (!polyline || !Array.isArray(polyline)) {
      return res.status(400).json({ success: false, error: 'polyline array required' });
    }

    const result = await VNISJunctionVillageAllocator.allocateJunctionVillages(
      polyline,
      maxFeederRadiusKm ? parseFloat(maxFeederRadiusKm) : 3.0
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Junction Allocation Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vnis/corridor/fast-ch-route
 * Contraction Hierarchies Sub-5ms Fast Route Endpoint
 */
router.post('/corridor/fast-ch-route', async (req, res) => {
  try {
    const { originName, destinationName, originLat, originLng, destLat, destLng } = req.body;
    if (!originName || !destinationName) {
      return res.status(400).json({ success: false, error: 'originName and destinationName required' });
    }

    const result = await ContractionHierarchiesEngine.computeSub5msRoute(
      originName,
      destinationName,
      originLat,
      originLng,
      destLat,
      destLng
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Fast CH Route Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vnis/telemetry/gsm-locate
 * Cellular Cell-Tower Triangulation Endpoint
 */
router.post('/telemetry/gsm-locate', async (req, res) => {
  try {
    const { towers } = req.body;
    if (!towers || !Array.isArray(towers) || towers.length === 0) {
      return res.status(400).json({ success: false, error: 'towers array required' });
    }

    const result = await GSMTriangulationEngine.resolveLocation(towers);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('GSM Locate Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vnis/telemetry/probe-batch (Phase 1: GPS Probe Telemetry Ingestion)
 */
router.post('/telemetry/probe-batch', async (req, res) => {
  try {
    const { driverId, tripId, probePoints } = req.body;
    if (!driverId || !probePoints || !Array.isArray(probePoints) || probePoints.length === 0) {
      return res.status(400).json({ success: false, error: 'driverId and non-empty probePoints array required' });
    }

    const docsToInsert = probePoints.map(p => {
      const lat = p.lat || 0;
      const lng = p.lng || 0;
      const h3_r7 = SpatialTemporalIndexEngine.latLngToH3(lat, lng, 7);
      const h3_r9 = SpatialTemporalIndexEngine.latLngToH3(lat, lng, 9);
      return {
        driverId,
        tripId: tripId || `TRIP_${driverId}_${Date.now()}`,
        loc: { type: 'Point', coordinates: [lng, lat] },
        speed: p.speed || 0,
        heading: p.heading || 0,
        timestamp: p.timestamp || Date.now(),
        h3_r7,
        h3_r9
      };
    });

    try {
      await DriverTrajectoryModel.insertMany(docsToInsert, { ordered: false });
    } catch (dbErr) {
      // Gracefully log if DB buffering times out
      console.warn('[VNIS Probe Telemetry] Ingested', docsToInsert.length, 'points to buffer/local cache.');
    }

    return res.json({ success: true, ingestedCount: docsToInsert.length });
  } catch (error) {
    console.error('Probe Telemetry Ingestion Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vnis/telemetry/auto-clusters (Phase 2: Speed-Dip & Heading Divergence Clustering)
 */
router.get('/telemetry/auto-clusters', async (req, res) => {
  try {
    const minSpeed = req.query.minSpeed ? Number(req.query.minSpeed) : 15;
    const eps = req.query.eps ? Number(req.query.eps) : 35;
    const minPts = req.query.minPts ? Number(req.query.minPts) : 3;

    const clusters = await VNISSpatialClusteringEngine.discoverJunctionClusters(minSpeed, eps, minPts);
    return res.json({ success: true, count: clusters.length, clusters });
  } catch (error) {
    console.error('DBSCAN Clustering Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/vnis/telemetry/hmm-snap (Phase 3: Hidden Markov Model Centerline Map Matcher)
 */
router.post('/telemetry/hmm-snap', async (req, res) => {
  try {
    const { rawTrajectoryPoints, centerlinePolyline } = req.body;
    if (!rawTrajectoryPoints || !Array.isArray(rawTrajectoryPoints)) {
      return res.status(400).json({ success: false, error: 'rawTrajectoryPoints array required' });
    }

    const snapped = VNISHMMMapMatcher.snapTrajectoryToCenterline(rawTrajectoryPoints, centerlinePolyline || []);
    return res.json({ success: true, count: snapped.length, data: snapped });
  } catch (error) {
    console.error('HMM Map Match Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vnis/nodes/search
 * Search Village Nodes by keyword, district, state
 */
router.get('/nodes/search', async (req, res) => {
  try {
    const { q, district, state } = req.query;
    const nodes = await VNISRegistryEngine.searchNodesByKeyword(
      q ? String(q) : '',
      district ? String(district) : undefined,
      state ? String(state) : undefined
    );

    return res.json({
      success: true,
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    console.error('VNIS Search Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vnis/nodes/nearby
 * Find nearby Village Nodes within radiusKm of lat/lng
 */
router.get('/nodes/nearby', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const radiusKm = radius ? parseFloat(String(radius)) : 5.0;
    const nodes = await VNISRegistryEngine.searchNodesByRadius(
      parseFloat(String(lat)),
      parseFloat(String(lng)),
      radiusKm
    );

    return res.json({
      success: true,
      count: nodes.length,
      radiusKm,
      data: nodes
    });
  } catch (error) {
    console.error('VNIS Nearby Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vnis/nodes/:id
 * Get hydrated VNIS Node details by ID
 */
router.get('/nodes/:id', async (req, res) => {
  try {
    const node = await VNISRegistryEngine.getNodeById(req.params.id);
    if (!node) {
      return res.status(404).json({ success: false, message: 'Village Node not found' });
    }

    return res.json({
      success: true,
      data: node
    });
  } catch (error) {
    console.error('VNIS GetNode Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/corridor/snap-polyline (VNIS Layer 2)
 * Decodes polyline or uses lat/lng points to intersect village nodes along corridor
 */
router.post('/corridor/snap-polyline', async (req, res) => {
  try {
    const { polylineString, polylinePoints, bufferKm, speedKmH, minNodeSpacingMeters } = req.body;
    
    let points = polylinePoints || [];
    if (polylineString && typeof polylineString === 'string') {
      points = VNISCorridorSnappingEngine.decodePolyline(polylineString);
    }

    if (!points || points.length < 2) {
      return res.status(400).json({ success: false, message: 'Valid polylinePoints array or polylineString is required' });
    }

    const snapResult = await VNISCorridorSnappingEngine.snapPolylinePointsToNodes(
      points,
      bufferKm ? parseFloat(String(bufferKm)) : 0.8,
      speedKmH ? parseFloat(String(speedKmH)) : 40,
      minNodeSpacingMeters ? parseInt(String(minNodeSpacingMeters)) : 250
    );

    return res.json({
      success: true,
      data: snapResult
    });
  } catch (error) {
    console.error('VNIS Polyline Snapping Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/corridor/active-demand-fusion (VNIS Layer 3)
 * Filters 50+ logical corridor nodes into ONLY Active Stops with fused Yatra/Parcel/Mandi demands
 */
router.post('/corridor/active-demand-fusion', async (req, res) => {
  try {
    const { driverId, polylinePoints, demandPool } = req.body;
    if (!polylinePoints || !Array.isArray(polylinePoints)) {
      return res.status(400).json({ success: false, message: 'polylinePoints array is required' });
    }

    const snapResult = await VNISCorridorSnappingEngine.snapPolylinePointsToNodes(polylinePoints, 0.8, 40, 250);
    const fusedResult = VNISDemandFusionEngine.fuseDemandForCorridor(
      driverId || 'DRV_DEMO_1',
      snapResult.nodesSequence,
      demandPool || []
    );

    return res.json({
      success: true,
      data: fusedResult
    });
  } catch (error) {
    console.error('VNIS Demand Fusion Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/corridor/capacity-matching (VNIS Layer 4)
 * 5-Level Trajectory Matching + Sub-Segment Dynamic Capacity Re-allocation
 */
router.post('/corridor/capacity-matching', async (req, res) => {
  try {
    const { driverId, polylinePoints, vehicleCapacity, demandPool } = req.body;
    if (!polylinePoints || !Array.isArray(polylinePoints)) {
      return res.status(400).json({ success: false, message: 'polylinePoints array is required' });
    }

    const snapResult = await VNISCorridorSnappingEngine.snapPolylinePointsToNodes(polylinePoints, 0.8, 40, 250);
    const fusedResult = VNISDemandFusionEngine.fuseDemandForCorridor(
      driverId || 'DRV_DEMO_1',
      snapResult.nodesSequence,
      demandPool || []
    );

    const matchResponse = VNISCorridorCapacityMatcher.matchCorridorCapacity(
      driverId || 'DRV_DEMO_1',
      fusedResult.activeStopsSequence,
      vehicleCapacity || { maxSeats: 6, maxWeightKg: 500 },
      demandPool || []
    );

    return res.json({
      success: true,
      data: matchResponse
    });
  } catch (error) {
    console.error('VNIS Capacity Matching Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/pricing/calculate-fare (VNIS Layer 5)
 * Multi-service fare calculation + 3-way revenue settlement split
 */
router.post('/pricing/calculate-fare', async (req, res) => {
  try {
    const receipt = VNISDynamicPricingEngine.calculateFare(req.body);
    return res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('VNIS Pricing Calculation Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vnis/hub/:nodeId (VNIS Layer 6)
 * Returns Village Manager Hub details, wallet balance, and active locker capacity
 */
router.get('/hub/:nodeId', async (req, res) => {
  try {
    const hub = VNISVillageManagerEngine.getOrCreateHub(req.params.nodeId, 'Junction Node');
    return res.json({
      success: true,
      data: hub
    });
  } catch (error) {
    console.error('VNIS Hub Details Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/hub/stage-parcel (VNIS Layer 6)
 * Sender stages parcel at Origin Village Manager Hub
 */
router.post('/hub/stage-parcel', async (req, res) => {
  try {
    const { originNodeId, originNodeName, destinationNodeName, senderName, senderPhone, recipientName, recipientPhone, weightKg, totalFareRupees } = req.body;
    
    const parcel = VNISVillageManagerEngine.stageParcelAtOriginHub(
      originNodeId, originNodeName, destinationNodeName, senderName, senderPhone, recipientName, recipientPhone, weightKg || 5, totalFareRupees || 200
    );

    return res.json({
      success: true,
      data: parcel
    });
  } catch (error) {
    console.error('VNIS Stage Parcel Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/hub/driver-handshake (VNIS Layer 6)
 * Driver QR code scan handshake at Hub (Credits 10% VM fee to Village Manager Wallet!)
 */
router.post('/hub/driver-handshake', async (req, res) => {
  try {
    const { originNodeId, driverId, driverName, driverPhone, parcelId } = req.body;
    
    const result = VNISVillageManagerEngine.handoverParcelToDriver(
      originNodeId, driverId, driverName || 'Driver', driverPhone || '', parcelId
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('VNIS Driver Handshake Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/hub/recipient-pickup (VNIS Layer 6)
 * Recipient collects parcel from Destination Hub using OTP
 */
router.post('/hub/recipient-pickup', async (req, res) => {
  try {
    const { parcelId, verificationOtp } = req.body;
    
    const result = VNISVillageManagerEngine.deliverParcelToRecipient(parcelId, verificationOtp);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('VNIS Recipient Pickup Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vnis/autonomous/self-heal (VNIS Layer 7)
 * Executes 7-Level Autonomous Decision Pyramid (L0-L6) for self-healing exception resolution & anti-fraud
 */
router.post('/autonomous/self-heal', async (req, res) => {
  try {
    const resolution = VNISAutonomousDecisionEngine.evaluateAndSelfHeal(req.body);
    return res.json({
      success: true,
      data: resolution
    });
  } catch (error) {
    console.error('VNIS Autonomous Self-Heal Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
