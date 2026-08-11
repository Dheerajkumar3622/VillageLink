/**
 * Dynamic Surge Pricing AI Engine
 * Adjusts booking price multipliers based on real-time driver supply, booking demand, and weather conditions.
 * Enforces guardrails to protect user segments against pricing abuse.
 */

export class SurgePricingEngine {
    constructor() {
        this.minMultiplier = 1.0;
        this.maxMultiplier = 2.5;
    }

    /**
     * Calculates the real-time surge multiplier
     * @param {number} supplyCount Active drivers available in region
     * @param {number} demandCount Pending booking requests in region
     * @param {string} weatherCondition Current environmental weather (Clear, Rainy, Stormy)
     */
    calculateSurgeMultiplier(supplyCount, demandCount, weatherCondition = 'Clear') {
        let baseMultiplier = 1.0;
        let ratioSurge = 0.0;
        let weatherSurge = 0.0;

        const supply = Math.max(supplyCount, 1);
        const ratio = demandCount / supply;

        // 1. Supply-Demand Congestion Surge
        // If demand is 1.5x greater than supply, trigger ratio surge
        if (ratio > 1.5) {
            ratioSurge = (ratio - 1.5) * 0.2; // 0.2 addition per unit ratio over 1.5
        }

        // 2. Weather Hazard Surge
        if (weatherCondition === 'Rainy') {
            weatherSurge = 0.25;
        } else if (weatherCondition === 'Stormy') {
            weatherSurge = 0.50;
        }

        let totalMultiplier = baseMultiplier + ratioSurge + weatherSurge;

        // 3. Enforce pricing guardrails limits
        if (totalMultiplier < this.minMultiplier) {
            totalMultiplier = this.minMultiplier;
        } else if (totalMultiplier > this.maxMultiplier) {
            totalMultiplier = this.maxMultiplier;
        }

        // Round to 2 decimal places
        totalMultiplier = Math.round(totalMultiplier * 100) / 100;
        ratioSurge = Math.round(ratioSurge * 100) / 100;

        console.log(`   [SurgeAI] Supply: ${supply} | Demand: ${demandCount} | Weather: ${weatherCondition} -> Multiplier: ${totalMultiplier.toFixed(2)}x`);

        return {
            baseMultiplier,
            ratioSurge,
            weatherSurge,
            totalSurgeMultiplier: totalMultiplier
        };
    }
}
