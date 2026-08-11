import { SpatialTemporalIndexEngine } from "./spatialTemporalIndex.js";
import { CapacityEventStore } from "./eventStoreEngine.js";
class MerchantOSEngine {
  /**
   * Generates an automated UDO Need Signal from a merchant's inventory packing event
   */
  static async publishNeedSignal(merchantData) {
    const demandId = `UDO_MERCHANT_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`;
    const now = Date.now();
    const pickupWindowMs = (merchantData.pickupWithinMinutes || 60) * 60 * 1e3;
    const pickupH3 = SpatialTemporalIndexEngine.latLngToH3(merchantData.pickupLocation.lat, merchantData.pickupLocation.lng);
    const dropH3 = SpatialTemporalIndexEngine.latLngToH3(merchantData.dropLocation.lat, merchantData.dropLocation.lng);
    const udo = {
      demandId,
      requesterId: merchantData.merchantId,
      demandType: merchantData.itemType,
      pickupLocation: {
        lat: merchantData.pickupLocation.lat,
        lng: merchantData.pickupLocation.lng,
        address: merchantData.pickupLocation.address,
        h3Index: pickupH3
      },
      dropLocation: {
        lat: merchantData.dropLocation.lat,
        lng: merchantData.dropLocation.lng,
        address: merchantData.dropLocation.address,
        h3Index: dropH3
      },
      weightKg: merchantData.weightKg,
      volumeL: merchantData.volumeL,
      passengerCount: 0,
      priority: merchantData.priority || "Medium",
      deadlineWindow: {
        pickupBefore: now + pickupWindowMs,
        dropBefore: now + pickupWindowMs * 3
      },
      fragile: false,
      insuranceNeeded: merchantData.weightKg > 20 || merchantData.itemType === "Medicine",
      bidAllowed: true,
      maxBudget: merchantData.maxBudget || 200,
      trustRequirement: 60,
      status: "Created",
      createdAt: now
    };
    await CapacityEventStore.recordEvent({
      entityId: demandId,
      entityType: "Demand",
      eventType: "DEMAND_CREATED",
      payload: udo,
      metadata: {
        deviceFingerprint: `MERCHANT_OS_${merchantData.merchantId}`
      }
    });
    return udo;
  }
  /**
   * Predicts upcoming merchant pickups based on historical temporal patterns (e.g. daily 9 PM dispatches)
   */
  static predictMerchantPickups(merchantId, historyCount = 10) {
    const now = Date.now();
    const nextHour = now + 3600 * 1e3;
    return {
      merchantId,
      expectedDispatchTime: nextHour,
      predictedPackageCount: Math.max(1, Math.round(historyCount * 0.4)),
      predictedTotalWeightKg: Math.round(15.5 * (historyCount > 5 ? 1.5 : 1)),
      confidenceScore: Math.min(98, 70 + historyCount * 2)
    };
  }
}
export {
  MerchantOSEngine
};
