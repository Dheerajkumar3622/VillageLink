/**
 * utils/interpolation.ts
 * Interpolation utilities for smooth vehicle movement on Vector Maps
 * 
 * Uses mathematical interpolation (bezier/hermite approximations)
 * to calculate intermediate coordinates between two GPS points
 * at a given progress percentage (0.0 to 1.0).
 */

/**
 * Linear Interpolation between two numbers
 */
export const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

/**
 * Linear Interpolation between two geographic coordinates
 * @param start {lat, lng} - Starting coordinate
 * @param end {lat, lng} - Ending coordinate
 * @param t - Progress from 0.0 to 1.0
 * @returns {lat, lng} - Interpolated coordinate
 */
export const lerpCoordinate = (
    start: { lat: number, lng: number }, 
    end: { lat: number, lng: number }, 
    t: number
) => {
    // Clamp t between 0 and 1
    const clampedT = Math.max(0, Math.min(1, t));
    
    // Quick handle of extremes
    if (clampedT === 0) return { ...start };
    if (clampedT === 1) return { ...end };
    
    return {
        lat: lerp(start.lat, end.lat, clampedT),
        lng: lerp(start.lng, end.lng, clampedT)
    };
};

/**
 * Calculates a smooth Hermite Spline interpolation between coordinates.
 * This looks much more natural than linear interpolation for vehicles turning.
 * (Advanced form of bezier curves for geographic points)
 * 
 * For simplicity in Phase 1, we wrap lerp, but this gives us the 
 * architectural hook to upgrade to true cubic splines later if 
 * we feed it the previous and next points as tangents.
 */
export const smoothCoordinate = (
    p0: { lat: number, lng: number }, 
    p1: { lat: number, lng: number }, 
    t: number
) => {
    // Easing function to make start/stop slightly smoother 
    // (Ease In Out Quad)
    const smoothT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    return lerpCoordinate(p0, p1, smoothT);
};

export default {
    lerpCoordinate,
    smoothCoordinate
};
