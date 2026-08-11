import { PassengerDigitalTwin, User } from '../models.js';

/**
 * Predicts commuter travel intent and computes confidence probabilities.
 * Formula: Pb = 1 / (1 + e^-z)
 * z = beta0 + beta1 * distanceToStop + beta2 * timeRemaining - beta3 * weatherSeverity
 */
export async function predictPassengerIntent(passengerId, clientContext = {}) {
    const { gps = {}, calendarEvents = [], weather = 'CLEAR', deviceBattery = 100 } = clientContext;
    
    // 1. Fetch or create the Digital Twin record
    let twin = await PassengerDigitalTwin.findOne({ passengerId });
    if (!twin) {
        twin = new PassengerDigitalTwin({
            passengerId,
            behavioralData: {
                walkingSpeedMps: 1.2,
                typicalCommuteSchedule: [
                    { dayOfWeek: 1, hour: 18, originStopId: 'STOP_OFFICE', destStopId: 'STOP_HOME' },
                    { dayOfWeek: 2, hour: 18, originStopId: 'STOP_OFFICE', destStopId: 'STOP_HOME' },
                    { dayOfWeek: 3, hour: 18, originStopId: 'STOP_OFFICE', destStopId: 'STOP_HOME' },
                    { dayOfWeek: 4, hour: 18, originStopId: 'STOP_OFFICE', destStopId: 'STOP_HOME' },
                    { dayOfWeek: 5, hour: 18, originStopId: 'STOP_OFFICE', destStopId: 'STOP_HOME' }
                ]
            }
        });
    }

    // 2. Perform calculation parameters
    const lat = gps.lat || 25.6120;
    const lng = gps.lng || 85.1310;
    
    // Distance calculation to stop (mocked for real engine evaluation against default stop coordinates)
    const stopLat = 25.6150;
    const stopLng = 85.1350;
    const distanceMeters = calculateDistance(lat, lng, stopLat, stopLng);

    // Weather severity mapping
    let weatherSeverity = 0.0;
    if (weather === 'RAIN') weatherSeverity = 1.5;
    else if (weather === 'STORM') weatherSeverity = 3.0;

    // Time calculations
    const now = new Date();
    const currentHour = now.getHours();
    
    // Calculate intent weight using logistic regression coefficients
    const beta0 = 3.5; // intercept
    const beta1 = -0.005; // distance penalty
    const beta2 = 0.1; // time match weighting
    const beta3 = -0.5; // weather penalty

    // Time difference from scheduled 18:00 (6 PM) exit
    const targetHour = 18;
    const timeDiffHours = Math.abs(currentHour - targetHour);
    const timeWeight = Math.max(0, 10 - timeDiffHours * 3);

    const z = beta0 + (beta1 * distanceMeters) + (beta2 * timeWeight) + (beta3 * weatherSeverity);
    const boardingProbability = parseFloat((1 / (1 + Math.exp(-z))).toFixed(3));

    // Dynamic probability metrics
    const cancellationProbability = parseFloat((1 - boardingProbability).toFixed(3));
    const lateArrivalProbability = distanceMeters > 500 && timeWeight > 8 ? 0.35 : 0.08;
    const wrongStopProbability = distanceMeters > 2000 ? 0.15 : 0.01;

    // Update Digital Twin model state
    twin.journeyConfidence = {
        boardingProbability,
        cancellationProbability,
        lateArrivalProbability,
        wrongStopProbability,
        fraudRiskProbability: 0.001
    };
    twin.lastTelemetry = {
        lat,
        lng,
        velocityMps: clientContext.velocity || 0.0,
        deviceBatteryPercent: deviceBattery,
        signalStrengthRssi: clientContext.rssi || -60,
        timestamp: Date.now()
    };
    
    await twin.save();

    // Determine target recommended action
    let recommendedVehicle = 'BUS_01';
    let intent = 'COMMUTE_HOME';
    if (calendarEvents.some(e => e.title.toLowerCase().includes('market') || e.title.toLowerCase().includes('mandi'))) {
        intent = 'GO_TO_MANDI';
        recommendedVehicle = 'BUS_02';
    }

    return {
        intent,
        probability: boardingProbability,
        recommendedVehicle,
        etaSeconds: Math.round(distanceMeters / twin.behavioralData.walkingSpeedMps),
        bookingAutoSuggestText: `Notice: System predicts commute intention: ${intent.replace(/_/g, ' ')} (${(boardingProbability * 100).toFixed(0)}% confidence). Reserve seat on ${recommendedVehicle}?`
    };
}

// Haversine distance calculator
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}
