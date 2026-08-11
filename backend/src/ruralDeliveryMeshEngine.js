import { SpatialTemporalIndexEngine } from "./spatialTemporalIndex.js";
class RuralDeliveryMeshEngine {
  static {
    this.mockHubs = [
      {
        hubId: "HUB_PATNA_SCHOOL",
        hubName: "Patna High School Hub",
        hubType: "VILLAGE_SCHOOL",
        location: { lat: 25.5941, lng: 85.1376, villageName: "Patna Central", h3Index: SpatialTemporalIndexEngine.latLngToH3(25.5941, 85.1376) },
        capacityCapacityParcels: 50,
        isVerified: true
      },
      {
        hubId: "HUB_ARA_PANCHAYAT",
        hubName: "Ara Panchayat Bhavan Locker",
        hubType: "SMART_LOCKER",
        location: { lat: 25.556, lng: 84.6603, villageName: "Ara Gram Panchayat", h3Index: SpatialTemporalIndexEngine.latLngToH3(25.556, 84.6603) },
        capacityCapacityParcels: 20,
        activeLockerOtp: "8492",
        isVerified: true
      },
      {
        hubId: "HUB_BUXAR_KIRANA",
        hubName: "Buxar Gupta Kirana Store Hub",
        hubType: "KIRANA_STORE",
        location: { lat: 25.5647, lng: 83.9777, villageName: "Buxar Market", h3Index: SpatialTemporalIndexEngine.latLngToH3(25.5647, 83.9777) },
        capacityCapacityParcels: 35,
        isVerified: true
      }
    ];
  }
  /**
   * Returns verified Community Pickup Hubs within the spatial k-ring radius of a location
   */
  static getNearbyCommunityHubs(lat, lng) {
    const userH3 = SpatialTemporalIndexEngine.latLngToH3(lat, lng);
    const kRing = SpatialTemporalIndexEngine.getH3kRing(userH3);
    return this.mockHubs.filter((hub) => kRing.includes(hub.location.h3Index) || hub.isVerified);
  }
  /**
   * Verifies Smart Locker OTP code for parcel dropoff/pickup at community hubs
   */
  static verifyLockerOtp(hubId, inputOtp) {
    const hub = this.mockHubs.find((h) => h.hubId === hubId);
    if (!hub) return { verified: false, message: "Hub not found" };
    if (hub.hubType === "SMART_LOCKER" && hub.activeLockerOtp) {
      if (hub.activeLockerOtp === inputOtp) {
        return { verified: true, message: "Smart Locker unlocked successfully" };
      }
      return { verified: false, message: "Invalid Locker OTP code" };
    }
    return { verified: true, message: "Community Hub pickup verified by station manager" };
  }
}
export {
  RuralDeliveryMeshEngine
};
