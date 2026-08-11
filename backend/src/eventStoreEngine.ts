import { CapacityEventCollection, CapacityObjectCollection, DemandObjectCollection, CoordinationUnitCollection } from '../models/uceModels.js';
import { validateUCO, validateUDO } from '../../shared/src/ucoSchemas.js';

export interface EventStorePayload {
  entityId: string;
  entityType: 'Capacity' | 'Demand' | 'CoordinationUnit';
  eventType: string;
  payload: Record<string, any>;
  metadata?: {
    deviceFingerprint?: string;
    ipAddress?: string;
    sequenceId?: number;
  };
}

import mongoose from 'mongoose';

const inMemoryEvents: any[] = [];

export class CapacityEventStore {
  /**
   * Appends an immutable event to the event stream and updates the CQRS read model projection.
   */
  public static async recordEvent(eventData: EventStorePayload): Promise<any> {
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
      // In-memory fallback during standalone offline unit tests
      inMemoryEvents.push(eventRecord);
      return eventRecord;
    }
  }

  /**
   * Applies state machine projection changes based on incoming event
   */
  private static async applyProjection(
    entityType: string,
    eventType: string,
    entityId: string,
    payload: Record<string, any>
  ): Promise<void> {
    if (entityType === 'Capacity') {
      if (eventType === 'CAPACITY_PUBLISHED') {
        const validation = validateUCO(payload);
        if (validation.valid && validation.uco) {
          await CapacityObjectCollection.findOneAndUpdate(
            { capacityId: entityId },
            { $set: payload },
            { upsert: true, new: true }
          );
        }
      } else if (eventType === 'CAPACITY_STATUS_UPDATED') {
        await CapacityObjectCollection.findOneAndUpdate(
          { capacityId: entityId },
          { $set: { status: payload.status, updatedAt: new Date() } }
        );
      } else if (eventType === 'CAPACITY_GPS_UPDATED') {
        await CapacityObjectCollection.findOneAndUpdate(
          { capacityId: entityId },
          { $set: { liveGps: payload.liveGps, currentLocation: payload.currentLocation } }
        );
      }
    } else if (entityType === 'Demand') {
      if (eventType === 'DEMAND_CREATED') {
        const validation = validateUDO(payload);
        if (validation.valid && validation.udo) {
          await DemandObjectCollection.findOneAndUpdate(
            { demandId: entityId },
            { $set: payload },
            { upsert: true, new: true }
          );
        }
      } else if (eventType === 'DEMAND_STATUS_UPDATED') {
        await DemandObjectCollection.findOneAndUpdate(
          { demandId: entityId },
          { $set: { status: payload.status, updatedAt: new Date() } }
        );
      }
    } else if (entityType === 'CoordinationUnit') {
      if (eventType === 'COORDINATION_MATCH_PROPOSED' || eventType === 'COORDINATION_MATCH_CONFIRMED') {
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
  public static async replayHistory(entityId: string): Promise<Record<string, any>> {
    const events = await CapacityEventCollection.find({ entityId }).sort({ timestamp: 1 }).lean();
    let state: Record<string, any> = {};

    for (const evt of events) {
      state = { ...state, ...evt.payload, lastEventId: evt.eventId, lastTimestamp: evt.timestamp };
    }

    return state;
  }
}
