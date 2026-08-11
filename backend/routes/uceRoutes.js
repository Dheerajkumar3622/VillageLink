import express from 'express';
import { CapacityObjectCollection, DemandObjectCollection, CapacityEventCollection, CoordinationUnitCollection } from '../models/uceModels.js';
import { validateUCO, validateUDO } from '../../shared/src/ucoSchemas.js';
import { CapacityEventStore } from '../src/eventStoreEngine.js';
import { SpatialTemporalIndexEngine } from '../src/spatialTemporalIndex.js';
import { RouteSegmentationEngine } from '../src/routeSegmentationEngine.js';
import { MatchingPipelineEngine } from '../src/matchingPipelineEngine.js';
import { DemandFusionEngine } from '../src/demandFusionEngine.js';
import { DynamicPricingEngine } from '../src/dynamicPricingEngine.js';
import { MerchantOSEngine } from '../src/merchantOsEngine.js';
import { RuralDeliveryMeshEngine } from '../src/ruralDeliveryMeshEngine.js';
import { DecisionIntelligenceEngine } from '../src/decisionIntelligenceEngine.js';
import { CorridorSimulatorEngine } from '../src/corridorSimulatorEngine.js';
import { AntiFraudShieldEngine } from '../src/antiFraudShieldEngine.js';
import { UniversalCapacityWalletEngine } from '../src/universalCapacityWalletEngine.js';
import { RicAnalyticsEngine } from '../src/ricAnalyticsEngine.js';

const router = express.Router();

/**
 * POST /api/uce/capacity/publish
 * Registers a new Universal Capacity Object (UCO) via the Event Store
 */
router.post('/capacity/publish', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.capacityId) {
      payload.capacityId = `UCO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Annotate H3 spatial indices
    if (payload.currentLocation?.lat && payload.currentLocation?.lng) {
      payload.currentLocation.h3Index = SpatialTemporalIndexEngine.latLngToH3(
        payload.currentLocation.lat,
        payload.currentLocation.lng
      );
    }
    if (payload.destination?.lat && payload.destination?.lng) {
      payload.destination.h3Index = SpatialTemporalIndexEngine.latLngToH3(
        payload.destination.lat,
        payload.destination.lng
      );
    }

    if (!payload.expiryTime) {
      payload.expiryTime = Date.now() + (4 * 60 * 60 * 1000); // Default 4 hours expiry
    }

    const validation = validateUCO(payload);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Record Event (Appends to event log and updates CQRS projection)
    const eventDoc = await CapacityEventStore.recordEvent({
      entityId: payload.capacityId,
      entityType: 'Capacity',
      eventType: 'CAPACITY_PUBLISHED',
      payload: validation.uco,
      metadata: {
        ipAddress: req.ip,
        deviceFingerprint: req.headers['user-agent']
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Universal Capacity Object (UCO) published successfully',
      capacityId: payload.capacityId,
      h3Index: payload.currentLocation.h3Index,
      eventId: eventDoc.eventId
    });
  } catch (error) {
    console.error('[UCE Routes] Capacity publish error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/demand/create
 * Creates a new Universal Demand Object (UDO) via the Event Store
 */
router.post('/demand/create', async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.demandId) {
      payload.demandId = `UDO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Annotate H3 spatial indices
    if (payload.pickupLocation?.lat && payload.pickupLocation?.lng) {
      payload.pickupLocation.h3Index = SpatialTemporalIndexEngine.latLngToH3(
        payload.pickupLocation.lat,
        payload.pickupLocation.lng
      );
    }
    if (payload.dropLocation?.lat && payload.dropLocation?.lng) {
      payload.dropLocation.h3Index = SpatialTemporalIndexEngine.latLngToH3(
        payload.dropLocation.lat,
        payload.dropLocation.lng
      );
    }

    if (!payload.createdAt) payload.createdAt = Date.now();

    const validation = validateUDO(payload);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Record Event
    const eventDoc = await CapacityEventStore.recordEvent({
      entityId: payload.demandId,
      entityType: 'Demand',
      eventType: 'DEMAND_CREATED',
      payload: validation.udo,
      metadata: {
        ipAddress: req.ip,
        deviceFingerprint: req.headers['user-agent']
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Universal Demand Object (UDO) created successfully',
      demandId: payload.demandId,
      pickupH3Index: payload.pickupLocation.h3Index,
      eventId: eventDoc.eventId
    });
  } catch (error) {
    console.error('[UCE Routes] Demand create error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/capacity/active
 * Queries active capacities filtered by optional spatial H3 ring or status
 */
router.get('/capacity/active', async (req, res) => {
  try {
    const { lat, lng, h3Index, status } = req.query;
    const filter = { status: status || 'Available', expiryTime: { $gt: Date.now() } };

    if (lat && lng) {
      const computedH3 = SpatialTemporalIndexEngine.latLngToH3(parseFloat(lat), parseFloat(lng));
      const kRing = SpatialTemporalIndexEngine.getH3kRing(computedH3);
      filter['currentLocation.h3Index'] = { $in: kRing };
    } else if (h3Index) {
      const kRing = SpatialTemporalIndexEngine.getH3kRing(h3Index);
      filter['currentLocation.h3Index'] = { $in: kRing };
    }

    const capacities = await CapacityObjectCollection.find(filter).lean();
    return res.json({ success: true, count: capacities.length, capacities });
  } catch (error) {
    console.error('[UCE Routes] Active capacities query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/demand/active
 * Queries active demands
 */
router.get('/demand/active', async (req, res) => {
  try {
    const { demandType, priority } = req.query;
    const filter = { status: { $in: ['Created', 'Matching'] } };

    if (demandType) filter.demandType = demandType;
    if (priority) filter.priority = priority;

    const demands = await DemandObjectCollection.find(filter).lean();
    return res.json({ success: true, count: demands.length, demands });
  } catch (error) {
    console.error('[UCE Routes] Active demands query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/events/:entityId
 * Replays and fetches event history log for any entity
 */
router.get('/events/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const events = await CapacityEventCollection.find({ entityId }).sort({ timestamp: 1 }).lean();
    const currentState = await CapacityEventStore.replayHistory(entityId);

    return res.json({ success: true, entityId, eventCount: events.length, events, currentState });
  } catch (error) {
    console.error('[UCE Routes] Event replay error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/route/segment
 * Partitions driver route stops into sub-segments and computes available capacity vectors per segment
 */
router.post('/route/segment', async (req, res) => {
  try {
    const { stops, availableSeats, availableWeightKg, availableVolumeL } = req.body;

    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 route stops required' });
    }

    const segments = RouteSegmentationEngine.segmentRoute(
      stops,
      availableSeats || 0,
      availableWeightKg || 0,
      availableVolumeL || 0
    );

    const totalDistanceKm = segments.reduce((sum, seg) => sum + seg.distanceKm, 0);
    const totalDurationMin = segments.reduce((sum, seg) => sum + seg.estimatedDurationMin, 0);

    return res.json({
      success: true,
      segmentCount: segments.length,
      totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
      totalDurationMin,
      segments
    });
  } catch (error) {
    console.error('[UCE Routes] Route segment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/route/match
 * Calculates spatial trajectory overlap and detour ratio between driver stops and demand pickup/drop
 */
router.post('/route/match', async (req, res) => {
  try {
    const { driverStops, pickupLocation, dropLocation } = req.body;

    if (!driverStops || !pickupLocation || !dropLocation) {
      return res.status(400).json({ success: false, error: 'driverStops, pickupLocation, and dropLocation required' });
    }

    const overlap = RouteSegmentationEngine.calculateTrajectoryOverlap(
      driverStops,
      pickupLocation,
      dropLocation
    );

    return res.json({
      success: true,
      overlap
    });
  } catch (error) {
    console.error('[UCE Routes] Route match error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/matching/feed
 * Runs 12-Stage Matching Pipeline on a driver's UCO against active UDOs and returns ranked proactive opportunities
 */
router.post('/matching/feed', async (req, res) => {
  try {
    const { capacityId, uco } = req.body;
    let targetUCO = uco;

    if (!targetUCO && capacityId) {
      targetUCO = await CapacityObjectCollection.findOne({ capacityId }).lean();
    }

    if (!targetUCO) {
      return res.status(400).json({ success: false, error: 'Valid UCO or capacityId required' });
    }

    const activeDemands = await DemandObjectCollection.find({ status: { $in: ['Created', 'Matching'] } }).lean();

    const opportunities = MatchingPipelineEngine.evaluateOpportunities(targetUCO, activeDemands);

    return res.json({
      success: true,
      capacityId: targetUCO.capacityId,
      opportunityCount: opportunities.length,
      opportunities
    });
  } catch (error) {
    console.error('[UCE Routes] Matching feed error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/fusion/optimize
 * Fuses non-conflicting qualified opportunities into a single co-loaded journey plan
 */
router.post('/fusion/optimize', async (req, res) => {
  try {
    const { capacityId, uco, opportunities } = req.body;
    let targetUCO = uco;

    if (!targetUCO && capacityId) {
      targetUCO = await CapacityObjectCollection.findOne({ capacityId }).lean();
    }

    if (!targetUCO) {
      return res.status(400).json({ success: false, error: 'Valid UCO or capacityId required' });
    }

    const activeDemandsList = await DemandObjectCollection.find({ status: { $in: ['Created', 'Matching'] } }).lean();
    const demandsMap = new Map();
    activeDemandsList.forEach(d => demandsMap.set(d.demandId, d));

    const evalOpportunities = opportunities || MatchingPipelineEngine.evaluateOpportunities(targetUCO, activeDemandsList);

    const fusedPlan = DemandFusionEngine.fuseDemands(targetUCO, evalOpportunities, demandsMap);

    return res.json({
      success: true,
      fusedPlan
    });
  } catch (error) {
    console.error('[UCE Routes] Fusion optimize error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/pricing/calculate
 * Computes dynamic pricing and selects recommended auction mode for a demand
 */
router.post('/pricing/calculate', async (req, res) => {
  try {
    const { demandId, demandType, weightKg, priority, maxBudget, bidAllowed, distanceKm, activeCapacitiesInH3CellCount } = req.body;

    if (!demandType) {
      return res.status(400).json({ success: false, error: 'demandType is required' });
    }

    const pricingResult = DynamicPricingEngine.calculatePricing(
      {
        demandId: demandId || `UDO_CALC_${Date.now()}`,
        demandType,
        weightKg: weightKg || 0,
        priority: priority || 'Medium',
        maxBudget,
        bidAllowed: bidAllowed !== undefined ? bidAllowed : true,
        distanceKm: distanceKm || 15.0
      },
      activeCapacitiesInH3CellCount || 5
    );

    return res.json({
      success: true,
      pricing: pricingResult
    });
  } catch (error) {
    console.error('[UCE Routes] Pricing calculate error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/merchant/signal
 * Publishes an automated UDO Need Signal from a Merchant's Inventory packing event
 */
router.post('/merchant/signal', async (req, res) => {
  try {
    const { merchantId, merchantName, pickupLocation, dropLocation, itemType, weightKg, volumeL, priority, maxBudget } = req.body;

    if (!merchantId || !pickupLocation || !dropLocation || !itemType) {
      return res.status(400).json({ success: false, error: 'merchantId, pickupLocation, dropLocation, and itemType are required' });
    }

    const udo = await MerchantOSEngine.publishNeedSignal({
      merchantId,
      merchantName: merchantName || 'Store Owner',
      pickupLocation,
      dropLocation,
      itemType,
      weightKg: weightKg || 1,
      volumeL: volumeL || 5,
      priority: priority || 'Medium',
      maxBudget
    });

    return res.status(201).json({
      success: true,
      message: 'Merchant Need Signal published into UDO Exchange successfully',
      demandId: udo.demandId,
      udo
    });
  } catch (error) {
    console.error('[UCE Routes] Merchant signal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/mesh/hubs
 * Queries verified Community Pickup Hubs and Smart Lockers nearby
 */
router.get('/mesh/hubs', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const latitude = lat ? parseFloat(lat) : 25.5941;
    const longitude = lng ? parseFloat(lng) : 85.1376;

    const hubs = RuralDeliveryMeshEngine.getNearbyCommunityHubs(latitude, longitude);

    return res.json({
      success: true,
      hubCount: hubs.length,
      hubs
    });
  } catch (error) {
    console.error('[UCE Routes] Mesh hubs query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/decision/evaluate
 * Evaluates candidate match against Decision Pyramid (L0-L6) and Decision Constitution
 */
router.post('/decision/evaluate', async (req, res) => {
  try {
    const { udo, uco, demandId, capacityId } = req.body;
    let targetUDO = udo;
    let targetUCO = uco;

    if (!targetUDO && demandId) {
      targetUDO = await DemandObjectCollection.findOne({ demandId }).lean();
    }
    if (!targetUCO && capacityId) {
      targetUCO = await CapacityObjectCollection.findOne({ capacityId }).lean();
    }

    if (!targetUDO || !targetUCO) {
      return res.status(400).json({ success: false, error: 'Valid UDO and UCO or IDs required' });
    }

    const evaluation = DecisionIntelligenceEngine.evaluateDecision(targetUDO, targetUCO);

    return res.json({
      success: true,
      evaluation
    });
  } catch (error) {
    console.error('[UCE Routes] Decision evaluate error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/corridor/simulate
 * Runs Patna-Ara liquidity corridor simulation and computes Recovered Idle Capacity (RIC km)
 */
router.post('/corridor/simulate', async (req, res) => {
  try {
    const { driverCount, demandCount } = req.body;
    const result = CorridorSimulatorEngine.runCorridorSimulation(
      driverCount || 10,
      demandCount || 35
    );

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[UCE Routes] Corridor simulate error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uce/fraud/verify
 * Verifies driver GPS telemetry update to detect location jumps (>150 km/h) or fake availability
 */
router.post('/fraud/verify', async (req, res) => {
  try {
    const { driverId, lastLocation, newLocation } = req.body;

    if (!driverId || !lastLocation || !newLocation) {
      return res.status(400).json({ success: false, error: 'driverId, lastLocation, and newLocation are required' });
    }

    const verification = AntiFraudShieldEngine.verifyTelemetry(driverId, lastLocation, newLocation);

    return res.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('[UCE Routes] Fraud verify error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/wallet/:userId
 * Fetches Universal Capacity Wallet balance and multi-domain earnings summary
 */
router.get('/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = UniversalCapacityWalletEngine.getWalletBalance(userId);

    return res.json({
      success: true,
      wallet
    });
  } catch (error) {
    console.error('[UCE Routes] Wallet query error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uce/analytics/ric
 * Queries platform North Star metrics (Recovered Idle Capacity - RIC & Capacity Utilization Index - CUI)
 */
router.get('/analytics/ric', async (req, res) => {
  try {
    const metrics = RicAnalyticsEngine.getPlatformMetrics();

    return res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('[UCE Routes] RIC analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;







