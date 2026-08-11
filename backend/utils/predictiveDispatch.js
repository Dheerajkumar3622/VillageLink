/**
 * Predictive Dispatching & Fleet Placement Coordinator
 * Mines historical spatial demand records to preemptively position idle vehicles.
 */

export class PredictiveDispatcher {
    constructor() {
        // Historical temporal demand logs for Mandis & Villages
        this.historicalLogs = [
            { timeOfDay: 'Morning', dayOfWeek: 'Tuesday', zoneName: 'Buxar Basmati Mandi', lat: 25.56, lng: 84.01, demandWeight: 9 },
            { timeOfDay: 'Morning', dayOfWeek: 'Tuesday', zoneName: 'Dumraon Seed Depot', lat: 25.52, lng: 84.15, demandWeight: 7 },
            { timeOfDay: 'Afternoon', dayOfWeek: 'Tuesday', zoneName: 'Arrah Grain Terminal', lat: 25.55, lng: 84.66, demandWeight: 8 },
            { timeOfDay: 'Evening', dayOfWeek: 'Friday', zoneName: 'Patna Central Market', lat: 25.61, lng: 85.12, demandWeight: 10 }
        ];
    }

    /**
     * Filters and returns high-demand zones matching the target time slot
     */
    predictDemandZones(timeOfDay, dayOfWeek) {
        return this.historicalLogs
            .filter(log => log.timeOfDay === timeOfDay && log.dayOfWeek === dayOfWeek)
            .sort((a, b) => b.demandWeight - a.demandWeight);
    }

    /**
     * Matches an idle driver to the closest predicted high-demand zone
     * Uses Euclidean coordinate distance calculation
     */
    dispatchPreemptively(driverId, currentLat, currentLng, demandZones) {
        if (demandZones.length === 0) {
            return null;
        }

        let closestZone = null;
        let minDistance = Infinity;

        demandZones.forEach(zone => {
            const dy = zone.lat - currentLat;
            const dx = zone.lng - currentLng;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestZone = zone;
            }
        });

        console.log(`   [PredictiveDispatch] Preemptively routing Driver "${driverId}" -> Closest Hub: "${closestZone.zoneName}" (Dist: ${minDistance.toFixed(4)})`);
        
        return {
            driverId,
            targetZone: closestZone.zoneName,
            targetCoords: { lat: closestZone.lat, lng: closestZone.lng },
            computedDistance: minDistance
        };
    }
}
