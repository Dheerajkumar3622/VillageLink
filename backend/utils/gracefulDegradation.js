/**
 * Graceful Degradation (Fallback Mode) Coordinator
 * Automatically disables heavy non-critical application features under high system load.
 * Guarantees core transaction availability (bookings, payments) during capacity spikes.
 */

// Load hierarchy ranks
const LOAD_RANKS = {
    'NORMAL': 0,
    'HIGH_LOAD': 1,
    'CRITICAL': 2
};

// Feature limits: Defines the MAXIMUM load rank at which a feature is still allowed
const FEATURE_LIMITS = {
    'BOOKING_ENGINE': 'CRITICAL',     // Allowed up to CRITICAL (Always active)
    'LIVE_MAP_GPS': 'HIGH_LOAD',      // Allowed up to HIGH_LOAD (Disabled on CRITICAL)
    'AR_GRADE_VISION': 'NORMAL',       // Allowed only on NORMAL (Disabled on HIGH_LOAD & CRITICAL)
    'CHAT_SIMULATOR': 'NORMAL'         // Allowed only on NORMAL (Disabled on HIGH_LOAD & CRITICAL)
};

/**
 * Checks if a feature is allowed to execute under the current system load
 */
export const isFeatureAllowed = (featureName, currentSystemLoad = 'NORMAL') => {
    const limitState = FEATURE_LIMITS[featureName];
    if (!limitState) return true; // Unregulated features allowed

    const currentRank = LOAD_RANKS[currentSystemLoad] ?? 0;
    const limitRank = LOAD_RANKS[limitState];

    return currentRank <= limitRank;
};

/**
 * Executes the primary action if the feature is allowed, or redirects to the fallback action
 */
export const executeTaskWithFallback = (featureName, currentSystemLoad, normalFn, fallbackFn) => {
    const allowed = isFeatureAllowed(featureName, currentSystemLoad);
    
    if (allowed) {
        return normalFn();
    } else {
        return fallbackFn();
    }
};
