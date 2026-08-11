import { VehiclePhysics } from '../models.js';

/**
 * Computes vehicle dynamics power consumption in real-time.
 * Equation: P_total = (Crr * M * g * cos(theta) + M * g * sin(theta) + 0.5 * rho * Cd * A * V^2) * V / efficiency
 */
export async function calculateVehiclePhysics(vehicleId, telemetry = {}) {
    const { velocityMps = 15.0, liveSlopeDegrees = 0.0, passengerPayloadKg = 0 } = telemetry;

    // 1. Fetch or initialize the Vehicle Physics parameters
    let physics = await VehiclePhysics.findOne({ vehicleId });
    if (!physics) {
        physics = new VehiclePhysics({
            vehicleId,
            curbWeightKg: 12000, // Standard electric bus curb weight
            passengerPayloadKg,
            dragCoefficient: 0.38,
            frontalAreaM2: 7.5,
            tyreGripCoefficient: 0.8
        });
    }

    // Constants
    const Crr = 0.015; // rolling resistance
    const g = 9.81;
    const rho = 1.225; // air density (kg/m3)
    const efficiency = 0.85; // Powertrain efficiency

    const M = physics.curbWeightKg + passengerPayloadKg;
    const thetaRad = (liveSlopeDegrees * Math.PI) / 180;

    // Mechanics forces
    const forceRolling = Crr * M * g * Math.cos(thetaRad);
    const forceSlope = M * g * Math.sin(thetaRad);
    const forceDrag = 0.5 * rho * physics.dragCoefficient * physics.frontalAreaM2 * Math.pow(velocityMps, 2);

    const totalTractionForce = forceRolling + forceSlope + forceDrag;
    const powerWatts = totalTractionForce * (velocityMps / efficiency);
    const powerKw = parseFloat((powerWatts / 1000).toFixed(2));

    // Update battery states based on discharge rate (approximate 1s tick delta)
    const kWhSpent = (powerKw * (1 / 3600)); // Kw-seconds converted to kWh
    let currentKwh = physics.powerBatteryKwh.currentChargeKwh - kWhSpent;
    if (currentKwh < 0) currentKwh = 0;

    physics.powerBatteryKwh.currentChargeKwh = parseFloat(currentKwh.toFixed(4));
    physics.liveSlopeDegrees = liveSlopeDegrees;
    physics.passengerPayloadKg = passengerPayloadKg;
    physics.energyEfficiencyRate = parseFloat((powerKw / (velocityMps * 3.6 || 1.0)).toFixed(3)); // kWh/km rate
    physics.lastUpdated = Date.now();

    await physics.save();

    return {
        vehicleId,
        tractionForceNewtons: parseFloat(totalTractionForce.toFixed(1)),
        powerConsumptionKw: powerKw,
        remainingBatteryPercent: parseFloat(((physics.powerBatteryKwh.currentChargeKwh / physics.powerBatteryKwh.capacityKwh) * 100).toFixed(2)),
        energyEfficiencyKwhPerKm: physics.energyEfficiencyRate
    };
}

/**
 * Returns physics status of a vehicle.
 */
export async function getVehiclePhysics(vehicleId) {
    let stats = await VehiclePhysics.findOne({ vehicleId });
    if (!stats) {
        // Create default
        stats = new VehiclePhysics({
            vehicleId,
            curbWeightKg: 12000
        });
        await stats.save();
    }
    return stats;
}
