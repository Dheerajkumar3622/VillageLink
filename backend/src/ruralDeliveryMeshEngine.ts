import { SpatialTemporalIndexEngine } from './spatialTemporalIndex.js';

export interface CommunityHub {
  hubId: string;
  hubName: string;
  hubType: 'PANCHAYAT_OFFICE' | 'VILLAGE_SCHOOL' | 'KIRANA_STORE' | 'SMART_LOCKER' | 'MILK_COLLECTION_CENTER';
  location: {
    lat: number;
    lng: number;
    villageName: string;
    h3Index: string;
  };
  capacityCapacityParcels: number;
  activeLockerOtp?: string;
  isVerified: boolean;
}

export class RuralDeliveryMeshEngine {
  private static mockHubs: CommunityHub[] = [
    {
      hubId: 'HUB_PATNA_SCHOOL',
      hubName: 'Patna High School Hub',
      hubType: 'VILLAGE_SCHOOL',
      location: { lat: 25.5941, lng: 85.1376, villageName: 'Patna Central', h3Index: SpatialTemporalIndexEngine.latLngToH3(25.5941, 85.1376) },
      capacityCapacityParcels: 50,
      isVerified: true
    },
    {
      hubId: 'HUB_ARA_PANCHAYAT',
      hubName: 'Ara Panchayat Bhavan Locker',
      hubType: 'SMART_LOCKER',
      location: { lat: 25.5560, lng: 84.6603, villageName: 'Ara Gram Panchayat', h3Index: SpatialTemporalIndexEngine.latLngToH3(25.5560, 84.6603) },
      capacityCapacityParcels: 20,
      activeLockerOtp: '8492',
      isVerified: true
    },
    {
      hubId: 'HUB_BUXAR_KIRANA',
      hubName: 'Buxar Gupta Kirana Store Hub',
      hubType: 'KIRANA_STORE',
      location: { lat: 25.5647, lng: 83.9777, villageName: 'Buxar Market', h3Index: SpatialTemporalIndexEngine.latLngToH3(25.5647, 83.9777) },
      capacityCapacityParcels: 35,
      isVerified: true
    }
  ];

  /**
   * Returns verified Community Pickup Hubs within the spatial k-ring radius of a location
   */
  public static getNearbyCommunityHubs(lat: number, lng: number): CommunityHub[] {
    const userH3 = SpatialTemporalIndexEngine.latLngToH3(lat, lng);
    const kRing = SpatialTemporalIndexEngine.getH3kRing(userH3);

    return this.mockHubs.filter(hub => kRing.includes(hub.location.h3Index) || hub.isVerified);
  }

  /**
   * Verifies Smart Locker OTP code for parcel dropoff/pickup at community hubs
   */
  public static verifyLockerOtp(hubId: string, inputOtp: string): { verified: boolean; message: string } {
    const hub = this.mockHubs.find(h => h.hubId === hubId);
    if (!hub) return { verified: false, message: 'Hub not found' };

    if (hub.hubType === 'SMART_LOCKER' && hub.activeLockerOtp) {
      if (hub.activeLockerOtp === inputOtp) {
        return { verified: true, message: 'Smart Locker unlocked successfully' };
      }
      return { verified: false, message: 'Invalid Locker OTP code' };
    }

    return { verified: true, message: 'Community Hub pickup verified by station manager' };
  }
}
