/**
 * Village Node Intelligence System (VNIS) - Layer 1: Master Registry Engine
 * 
 * World-Class Spatial & Behavioral Node Engine integrating:
 * 1. Dual-mode ultra-compact DB storage + Hydrated Human-readable Getters.
 * 2. H3 Resolution 7 & 9 Spatial Hexagonal Indexing.
 * 3. Human Behavioral Psychology: Local Landmark Nicknames, Vernacular Aliases, Safety & Night Operational Ratings.
 * 4. Ergonomic Vehicle Access Levels (Auto, LMV Pickup, Heavy Truck/Bus, Tractor).
 * 5. Distance-to-Village-Center walking metrics (Off-Road vs Highway Junction).
 */

import mongoose, { Schema, Document } from 'mongoose';
import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';

export enum VNISNodeType {
  PRIMARY_HIGHWAY_JUNCTION = 'PRIMARY_HIGHWAY_JUNCTION',
  SECONDARY_JUNCTION = 'SECONDARY_JUNCTION',
  CLUSTER_HAMLET_NODE = 'CLUSTER_HAMLET_NODE',
  RAILWAY_STATION_HUB = 'RAILWAY_STATION_HUB',
  URBAN_MANDI_HUB = 'URBAN_MANDI_HUB'
}

export enum VehicleAccessLevel {
  ALL_VEHICLES = 'ALL_VEHICLES',             // Heavy Trucks, Buses, Bolero, Autos
  LMV_AND_AUTO = 'LMV_AND_AUTO',             // Bolero Pickups, Cars, Auto-rickshaws
  AUTO_TWO_WHEELER = 'AUTO_TWO_WHEELER',     // Autos, E-rickshaws, Bikes
  HEAVY_AGRI_ONLY = 'HEAVY_AGRI_ONLY'        // Tractors, Harvesters, Goods Trolleys
}

export interface IVNISNodeDetails {
  nodeId: string;
  name: string;
  localNameHindi: string;
  landmarkNickname: string;
  vernacularAliases: string[];
  nodeType: VNISNodeType;
  lat: number;
  lng: number;
  h3IndexRes7: string;
  h3IndexRes9: string;
  district: string;
  state: string;
  pincode?: string;
  stationCode?: string;
  offRoadVillageName: string;
  offRoadVillageCenterCoords?: { lat: number; lng: number };
  walkDistanceToHighwayMeters?: number;
  vehicleAccessLevel: VehicleAccessLevel;
  safetyRating: {
    nightLighting: boolean;
    cctvOrManagerCoverage: boolean;
    parkingSpaceScore: number; // 1 to 5
    overallSafetyScore: number; // 1 to 5
  };
  villageManager: {
    managerId?: string;
    name: string;
    phone: string;
    hubStatus: 'ACTIVE' | 'OFFLINE' | 'BUSY';
    lockerCapacityKg: number;
  };
}

// Compact Schema for Database (Memory Optimized)
const vnisNodeMongoSchema = new Schema({
  _id: { type: String, required: true }, // Compact Node ID e.g. "V_12345" or "S_PAT"
  n: { type: String, required: true },   // Name
  h: { type: String },                   // Local Hindi Name
  nick: { type: String },                // Landmark Nickname e.g. "Bihta Shiv Mandir Mode"
  aliases: [{ type: String }],           // Vernacular Aliases
  t: { type: String, default: 'j' },     // 'j' = junction, 's' = station, 'u' = urban mandi, 'c' = cluster
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  h3_r7: { type: String },               // H3 Res 7 Key
  h3_r9: { type: String },               // H3 Res 9 Key
  d: { type: String, required: true },   // District
  s: { type: String, required: true },   // State
  p: { type: String },                   // Pincode
  c: { type: String },                   // Station Code
  vName: { type: String },               // Off-Road Village Name
  offCenter: {
    lat: Number,
    lng: Number
  },
  walkDistM: { type: Number, default: 450 }, // Distance from village center to highway junction
  vac: { type: String, default: 'ALL_VEHICLES' },
  sft: {
    nl: { type: Boolean, default: true },   // Night lighting
    cm: { type: Boolean, default: true },   // Manager coverage
    ps: { type: Number, default: 4 },       // Parking score
    os: { type: Number, default: 4.5 }      // Overall safety score
  },
  vm: {
    id: String,
    n: String,
    p: String,
    st: { type: String, default: 'ACTIVE' },
    cap: { type: Number, default: 500 }
  }
}, {
  timestamps: true,
  collection: 'village_junction_nodes'
});

// Indexes for $O(1)$ / $O(\log N)$ Spatial and Text queries
vnisNodeMongoSchema.index({ loc: '2dsphere' });
vnisNodeMongoSchema.index({ h3_r7: 1 });
vnisNodeMongoSchema.index({ n: 'text', nick: 'text', d: 'text', s: 'text' });

export const VNISNodeModel = mongoose.model('VNISNodeModel', vnisNodeMongoSchema);

export class VNISRegistryEngine {
  /**
   * Hydrates raw DB document into full human-readable & psychological VNISNode Details
   */
  public static hydrateNode(doc: any): IVNISNodeDetails {
    const coords = doc.loc?.coordinates || [85.0, 25.5];
    const lng = coords[0];
    const lat = coords[1];

    let nodeType = VNISNodeType.PRIMARY_HIGHWAY_JUNCTION;
    if (doc.t === 's') nodeType = VNISNodeType.RAILWAY_STATION_HUB;
    else if (doc.t === 'u') nodeType = VNISNodeType.URBAN_MANDI_HUB;
    else if (doc.t === 'c') nodeType = VNISNodeType.CLUSTER_HAMLET_NODE;

    const nodeName = doc.n || doc.name || 'Village Node';
    const hindiName = doc.h || doc.localNameHindi || `${nodeName} मोड़`;

    return {
      nodeId: doc.nodeId || doc._id?.toString(),
      name: nodeName,
      localNameHindi: hindiName,
      landmarkNickname: doc.nick || doc.landmarkNickname || `${nodeName} मेन रोड कटान चौक`,
      vernacularAliases: doc.aliases || doc.vernacularNicknames || [nodeName, `${nodeName} Mode`],
      nodeType,
      lat,
      lng,
      h3IndexRes7: doc.h3_r7 || SpatialTemporalIndexEngine.latLngToH3(lat, lng, 7),
      h3IndexRes9: doc.h3_r9 || SpatialTemporalIndexEngine.latLngToH3(lat, lng, 9),
      district: doc.d || doc.district || 'Buxar',
      state: doc.s || doc.state || 'Bihar',
      pincode: doc.p || doc.pincode,
      stationCode: doc.c,
      offRoadVillageName: doc.vName || doc.n,
      offRoadVillageCenterCoords: doc.offCenter || { lat: lat + 0.004, lng: lng + 0.004 },
      walkDistanceToHighwayMeters: doc.walkDistM || 450,
      vehicleAccessLevel: (doc.vac as VehicleAccessLevel) || VehicleAccessLevel.ALL_VEHICLES,
      safetyRating: {
        nightLighting: doc.sft?.nl ?? true,
        cctvOrManagerCoverage: doc.sft?.cm ?? true,
        parkingSpaceScore: doc.sft?.ps || 4,
        overallSafetyScore: doc.sft?.os || 4.5
      },
      villageManager: {
        managerId: doc.vm?.id || `VM_${doc._id}`,
        name: doc.vm?.n || `${doc.n} Hub Manager`,
        phone: doc.vm?.p || '+91 9801612025',
        hubStatus: (doc.vm?.st as any) || 'ACTIVE',
        lockerCapacityKg: doc.vm?.cap || 500
      }
    };
  }

  /**
   * Fetches Node details by ID
   */
  public static async getNodeById(nodeId: string): Promise<IVNISNodeDetails | null> {
    const doc = await VNISNodeModel.findById(nodeId).lean();
    if (!doc) return null;
    return this.hydrateNode(doc);
  }

  /**
   * Spatial Radius Query: Finds all Village Nodes within radiusKm of given lat/lng
   */
  public static async searchNodesByRadius(lat: number, lng: number, radiusKm: number = 5): Promise<IVNISNodeDetails[]> {
    const radiusMeters = radiusKm * 1000;
    const rawDocs = await VNISNodeModel.find({
      loc: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusMeters
        }
      }
    }).limit(50).lean();

    return rawDocs.map(doc => this.hydrateNode(doc));
  }

  /**
   * Full-Text Keyword Search with District & State Filters
   */
  public static async searchNodesByKeyword(query: string, district?: string, state?: string): Promise<IVNISNodeDetails[]> {
    const filter: any = {};
    if (query) {
      filter.$text = { $search: query };
    }
    if (district) {
      filter.d = new RegExp(district, 'i');
    }
    if (state) {
      filter.s = new RegExp(state, 'i');
    }

    const rawDocs = await VNISNodeModel.find(filter).limit(20).lean();
    return rawDocs.map(doc => this.hydrateNode(doc));
  }

  /**
   * Polyline Intersecting Node Fetcher (For Corridor Routing)
   */
  public static async getNodesForCorridor(polylinePoints: Array<{ lat: number; lng: number }>, bufferKm: number = 1.0): Promise<IVNISNodeDetails[]> {
    if (!polylinePoints || polylinePoints.length === 0) return [];

    // Extract unique H3 Ring cells along polyline trajectory for O(1) grid matching
    const h3Cells = new Set<string>();
    for (const pt of polylinePoints) {
      const cell = SpatialTemporalIndexEngine.latLngToH3(pt.lat, pt.lng, 7);
      const ring = SpatialTemporalIndexEngine.getH3kRing(cell);
      ring.forEach(c => h3Cells.add(c));
    }

    const rawDocs = await VNISNodeModel.find({
      h3_r7: { $in: Array.from(h3Cells) }
    }).lean();

    const hydratedNodes = rawDocs.map(doc => this.hydrateNode(doc));

    // Sort nodes sequentially along polyline distance from Origin
    const origin = polylinePoints[0];
    hydratedNodes.sort((a, b) => {
      const distA = Math.hypot(a.lat - origin.lat, a.lng - origin.lng);
      const distB = Math.hypot(b.lat - origin.lat, b.lng - origin.lng);
      return distA - distB;
    });

    return hydratedNodes;
  }
}
