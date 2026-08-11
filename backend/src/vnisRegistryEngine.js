import mongoose from 'mongoose';
import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';

const vnisNodeSchema = new mongoose.Schema({
  n: { type: String },
  name: { type: String },
  h: { type: String },
  localNameHindi: { type: String },
  nick: { type: String },
  aliases: [{ type: String }],
  t: { type: String },
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true },
  d: { type: String },
  district: { type: String },
  s: { type: String },
  state: { type: String },
  p: { type: String },
  c: { type: String }
}, { timestamps: true });

vnisNodeSchema.index({ loc: '2dsphere' });
vnisNodeSchema.index({ n: 'text', h: 'text', aliases: 'text', name: 'text' });

export const VNISNodeModel = mongoose.models.VNISNodeModel || mongoose.model('VNISNodeModel', vnisNodeSchema, 'village_junction_nodes');

export class VNISRegistryEngine {
  static hydrateNode(doc) {
    let coords = [84.87, 25.55];
    if (doc.loc && doc.loc.coordinates && doc.loc.coordinates.length === 2) {
      coords = doc.loc.coordinates;
    }
    const lng = coords[0];
    const lat = coords[1];

    let nodeType = 'PRIMARY_HIGHWAY_JUNCTION';
    if (doc.t === 's') nodeType = 'RAILWAY_STATION_HUB';
    else if (doc.t === 'u') nodeType = 'URBAN_MANDI_HUB';
    else if (doc.t === 'c') nodeType = 'CLUSTER_HAMLET_NODE';

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
      offRoadVillageName: doc.vName || nodeName,
      offRoadVillageCenterCoords: doc.offCenter || { lat: lat + 0.004, lng: lng + 0.004 },
      walkDistanceToHighwayMeters: doc.walkDistM || 450,
      vehicleAccessLevel: doc.vac || 'ALL_VEHICLES',
      safetyRating: {
        nightLighting: doc.sft?.nl ?? true,
        cctvOrManagerCoverage: doc.sft?.cm ?? true,
        parkingSpaceScore: doc.sft?.ps || 4,
        overallSafetyScore: doc.sft?.os || 4.5
      },
      villageManager: {
        managerId: doc.vm?.id || `VM_${doc._id}`,
        name: doc.vm?.n || `${nodeName} Hub Manager`,
        phone: doc.vm?.p || '+91 9801612025',
        hubStatus: doc.vm?.st || 'ACTIVE',
        lockerCapacityKg: doc.vm?.cap || 500
      }
    };
  }

  static async getNodeById(nodeId) {
    const doc = await VNISNodeModel.findById(nodeId).lean();
    if (!doc) return null;
    return this.hydrateNode(doc);
  }

  static async searchNodesByRadius(lat, lng, radiusKm = 5) {
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

  static async searchNodesByKeyword(query, district, state) {
    const filter = {};
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { n: new RegExp(query, 'i') },
        { localNameHindi: new RegExp(query, 'i') },
        { h: new RegExp(query, 'i') }
      ];
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
}
