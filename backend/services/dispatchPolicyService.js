/**
 * Scores and ranks vehicle matches for human + agent clients.
 * Pluggable: ETA primary, optional trust / load factors.
 */

export function rankSegmentVehicles(vehicles, { driverTrustScore = {} } = {}) {
    if (!Array.isArray(vehicles)) return [];
    return [...vehicles].sort((a, b) => {
        const etaA = a.etaMinutes ?? 999;
        const etaB = b.etaMinutes ?? 999;
        if (etaA !== etaB) return etaA - etaB;
        const trustA = driverTrustScore[a.driverId] ?? 0.5;
        const trustB = driverTrustScore[b.driverId] ?? 0.5;
        return trustB - trustA;
    });
}

export function attachConfidence(vehicle) {
    const eta = vehicle.etaMinutes ?? 30;
    const confidence = Math.max(0.35, Math.min(0.99, 1 - eta / 120));
    const etaWindowMin = Math.max(1, eta - 5);
    const etaWindowMax = eta + 10;
    return {
        ...vehicle,
        confidence: Math.round(confidence * 100) / 100,
        etaWindow: { min: etaWindowMin, max: etaWindowMax },
        priceBreakdown: vehicle.priceBreakdown || null
    };
}
