import { CapacityEventCollection, CapacityObjectCollection, DemandObjectCollection, CoordinationUnitCollection } from "../models/uceModels.js";
import { validateUCO, validateUDO } from "../../shared/src/ucoSchemas.js";
import mongoose from "mongoose";
const inMemoryEvents = [];
class CapacityEventStore {
  /**
   * Appends an immutable event to the event stream and updates the CQRS read model projection.
   */
  static async recordEvent(eventData) {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = Date.now();
    const eventRecord = {
      eventId,
      entityId: eventData.entityId,
      entityType: eventData.entityType,
      eventType: eventData.eventType,
      payload: eventData.payload,
      timestamp,
      metadata: eventData.metadata || {}
    };
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const eventDocument = new CapacityEventCollection(eventRecord);
      await eventDocument.save();
      await this.applyProjection(eventData.entityType, eventData.eventType, eventData.entityId, eventData.payload);
      return eventDocument;
    } else {
      inMemoryEvents.push(eventRecord);
      return eventRecord;
    }
  }
  /**
   * Applies state machine projection changes based on incoming event
   */
  static async applyProjection(entityType, eventType, entityId, payload) {
    if (entityType === "Capacity") {
      if (eventType === "CAPACITY_PUBLISHED") {
        const validation = validateUCO(payload);
        if (validation.valid && validation.uco) {
          await CapacityObjectCollection.findOneAndUpdate(
            { capacityId: entityId },
            { $set: payload },
            { upsert: true, new: true }
          );
        }
      } else if (eventType === "CAPACITY_STATUS_UPDATED") {
        await CapacityObjectCollection.findOneAndUpdate(
          { capacityId: entityId },
          { $set: { status: payload.status, updatedAt: /* @__PURE__ */ new Date() } }
        );
      } else if (eventType === "CAPACITY_GPS_UPDATED") {
        await CapacityObjectCollection.findOneAndUpdate(
          { capacityId: entityId },
          { $set: { liveGps: payload.liveGps, currentLocation: payload.currentLocation } }
        );
      }
    } else if (entityType === "Demand") {
      if (eventType === "DEMAND_CREATED") {
        const validation = validateUDO(payload);
        if (validation.valid && validation.udo) {
          await DemandObjectCollection.findOneAndUpdate(
            { demandId: entityId },
            { $set: payload },
            { upsert: true, new: true }
          );
        }
      } else if (eventType === "DEMAND_STATUS_UPDATED") {
        await DemandObjectCollection.findOneAndUpdate(
          { demandId: entityId },
          { $set: { status: payload.status, updatedAt: /* @__PURE__ */ new Date() } }
        );
      }
    } else if (entityType === "CoordinationUnit") {
      if (eventType === "COORDINATION_MATCH_PROPOSED" || eventType === "COORDINATION_MATCH_CONFIRMED") {
        await CoordinationUnitCollection.findOneAndUpdate(
          { cuId: entityId },
          { $set: payload },
          { upsert: true, new: true }
        );
      }
    }
  }
  /**
   * Replays complete event history for an entity to reconstruct true state
   */
  static async replayHistory(entityId) {
    const events = await CapacityEventCollection.find({ entityId }).sort({ timestamp: 1 }).lean();
    let state = {};
    for (const evt of events) {
      state = { ...state, ...evt.payload, lastEventId: evt.eventId, lastTimestamp: evt.timestamp };
    }
    return state;
  }
}
export {
  CapacityEventStore
};
