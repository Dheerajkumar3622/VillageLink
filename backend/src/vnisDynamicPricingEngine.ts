/**
 * Village Node Intelligence System (VNIS) - Layer 5: Dynamic Surge & Fair Share Pricing Engine
 * 
 * World-Class Rural Multi-Service Dynamic Pricing & Transparent 3-Way Settlement Matrix:
 * 1. Demand Asymmetry Multiplier (Morning Village->Town vs Reverse 50% Empty Return Discount).
 * 2. Gram Mandi Harvest Season Surge Multiplier (Chaitra/Kharif crop harvest peaks).
 * 3. Weather & Terrain Risk Multiplier (Monsoon flood & muddy road compensation).
 * 4. Transparent 3-Way Revenue Settlement Split:
 *    - Driver: 82% + 100% Detour Fee
 *    - Village Manager Hub Operator: 10%
 *    - VNIS Platform: 8%
 */

import { DemandServiceType } from './vnisDemandFusionEngine.js';

export interface IFareCalculationInput {
  serviceType: DemandServiceType;
  distanceKm: number;
  weightKg?: number;
  quantityOrSeats?: number;
  hourOfDay?: number; // 0 to 23
  isHarvestSeason?: boolean;
  isMonsoonOrFloodRisk?: boolean;
  isReverseDirection?: boolean; // Travel opposite to peak asymmetric flow
  detourDistanceKm?: number;
  detourDelayMinutes?: number;
}

export interface IVNISPricingReceipt {
  serviceType: DemandServiceType;
  distanceKm: number;
  weightKg: number;
  seatsCount: number;
  
  // Breakdown Components
  baseFareRupees: number;
  distanceFareRupees: number;
  weightFareRupees: number;
  
  // Dynamic Multipliers & Discounts
  peakAsymmetryMultiplier: number;
  harvestSurgeMultiplier: number;
  weatherRiskMultiplier: number;
  reverseDirectionDiscountRupees: number;
  
  // Detour Compensation
  detourFeeRupees: number;
  
  // Gross Total Fare
  grossFareRupees: number;
  
  // Transparent 3-Way Revenue Settlement Split
  settlement: {
    driverEarningsRupees: number; // 82% + Detour
    villageManagerFeeRupees: number; // 10%
    vnisPlatformFeeRupees: number; // 8%
  };

  fareSummaryText: string;
}

export class VNISDynamicPricingEngine {
  /**
   * Calculates Multi-Service Fare & 3-Way Revenue Settlement Split
   */
  public static calculateFare(input: IFareCalculationInput): IVNISPricingReceipt {
    const distanceKm = Math.max(0.5, input.distanceKm);
    const weightKg = input.weightKg || 0;
    const seats = input.quantityOrSeats || 1;
    const hour = input.hourOfDay !== undefined ? input.hourOfDay : new Date().getHours();

    let baseFare = 0;
    let distanceFare = 0;
    let weightFare = 0;

    // 1. Calculate Base, Distance & Weight Fares by Service Type
    switch (input.serviceType) {
      case DemandServiceType.YATRA_PASSENGER_PICKUP:
      case DemandServiceType.YATRA_PASSENGER_DROPOFF:
        baseFare = 15 * seats;
        distanceFare = distanceKm * 4 * seats; // ₹4/km per seat
        weightFare = weightKg > 10 ? (weightKg - 10) * 1.5 : 0; // Free 10kg luggage
        break;

      case DemandServiceType.PARCEL_PICKUP_HUB:
      case DemandServiceType.PARCEL_DROPOFF_HUB:
        baseFare = 25;
        distanceFare = distanceKm * 3.5; // ₹3.5/km
        weightFare = weightKg * 2.0;      // ₹2/kg
        break;

      case DemandServiceType.GRAM_MANDI_PRODUCE_COLLECT:
        baseFare = 40;
        distanceFare = distanceKm * 2.5; // ₹2.5/km
        weightFare = weightKg * 0.8;      // ₹0.8/kg (₹80/quintal)
        break;

      case DemandServiceType.FOOD_MESS_DELIVERY:
        baseFare = 20;
        distanceFare = distanceKm * 2.0;
        weightFare = 0;
        break;

      default:
        baseFare = 20;
        distanceFare = distanceKm * 3;
        break;
    }

    // 2. Peak Asymmetry Multiplier
    // Morning (6 AM - 10 AM) & Evening (5 PM - 8 PM) are Peak village travel hours
    let peakAsymmetryMultiplier = 1.0;
    if ((hour >= 6 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      peakAsymmetryMultiplier = 1.20; // +20% peak demand
    }

    // 3. Harvest Season Surge Multiplier
    let harvestSurgeMultiplier = input.isHarvestSeason ? 1.25 : 1.0;

    // 4. Weather & Monsoon Risk Multiplier
    let weatherRiskMultiplier = input.isMonsoonOrFloodRisk ? 1.25 : 1.0;

    // Subtotal before discounts
    let subtotal = (baseFare + distanceFare + weightFare) * peakAsymmetryMultiplier * harvestSurgeMultiplier * weatherRiskMultiplier;

    // 5. Reverse Direction Discount (50% discount for traveling opposite to peak flow)
    let reverseDirectionDiscountRupees = 0;
    if (input.isReverseDirection) {
      reverseDirectionDiscountRupees = Math.round(subtotal * 0.40); // 40% discount for filling empty return seats
      subtotal -= reverseDirectionDiscountRupees;
    }

    // 6. Detour Fee Compensation (100% goes directly to driver)
    let detourFeeRupees = 0;
    if (input.detourDistanceKm && input.detourDistanceKm > 0) {
      const delayMin = input.detourDelayMinutes || 3;
      detourFeeRupees = Math.round((input.detourDistanceKm * 15) + (delayMin * 5));
    }

    const grossFareRupees = Math.max(20, Math.round(subtotal + detourFeeRupees));

    // 7. Transparent 3-Way Revenue Settlement Split
    // Standard fare split: Driver 82%, Village Manager 10%, VNIS Platform 8%
    const baseShareableFare = Math.max(0, grossFareRupees - detourFeeRupees);
    
    const driverEarningsBase = Math.round(baseShareableFare * 0.82);
    const villageManagerFee = Math.round(baseShareableFare * 0.10);
    const vnisPlatformFee = grossFareRupees - (driverEarningsBase + detourFeeRupees + villageManagerFee);

    const driverTotalEarnings = driverEarningsBase + detourFeeRupees;

    const fareSummaryText = `Fare ₹${grossFareRupees} (Driver ₹${driverTotalEarnings} | Hub ₹${villageManagerFee} | App ₹${vnisPlatformFee})`;

    return {
      serviceType: input.serviceType,
      distanceKm,
      weightKg,
      seatsCount: seats,
      baseFareRupees: baseFare,
      distanceFareRupees: distanceFare,
      weightFareRupees: weightFare,
      peakAsymmetryMultiplier,
      harvestSurgeMultiplier,
      weatherRiskMultiplier,
      reverseDirectionDiscountRupees,
      detourFeeRupees,
      grossFareRupees,
      settlement: {
        driverEarningsRupees: driverTotalEarnings,
        villageManagerFeeRupees: villageManagerFee,
        vnisPlatformFeeRupees: vnisPlatformFee
      },
      fareSummaryText
    };
  }
}
