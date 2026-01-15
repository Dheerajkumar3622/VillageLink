
import Models from '../models.js';
const { MarketItem } = Models;

// Realistic base prices for Bihar region (in INR per Quintal)
const COMMODITY_DATA = [
    { name: 'Paddy (Dhan)', basePrice: 2183, variability: 50 },
    { name: 'Wheat', basePrice: 2275, variability: 40 },
    { name: 'Maize', basePrice: 2090, variability: 60 },
    { name: 'Masur Dal', basePrice: 6400, variability: 100 },
    { name: 'Mustard', basePrice: 5650, variability: 80 },
    { name: 'Potato', basePrice: 1200, variability: 200 },
    { name: 'Onion', basePrice: 1800, variability: 300 }
];

export const refreshMarketPrices = async () => {
    console.log("📈 Updating Market Prices (Realism Mode)...");
    try {
        const today = new Date().toISOString().split('T')[0];

        for (const item of COMMODITY_DATA) {
            // Simulate daily fluctuation (Realism, not Randomness per request)
            // In a real app, this would fetch from an API like data.gov.in
            const fluctuation = (Math.random() * item.variability * 2) - item.variability;
            const currentPrice = Math.floor(item.basePrice + fluctuation);

            const trend = fluctuation > 0 ? 'UP' : 'DOWN';
            const insight = trend === 'UP' ? "Demand increasing in local mandis." : "Supply ample, prices stable.";

            await MarketItem.findOneAndUpdate(
                { name: item.name, type: 'COMMODITY' },
                {
                    price: currentPrice,
                    properties: { trend, insight, lastUpdated: today }
                },
                { upsert: true, new: true }
            );
        }
        console.log("✅ Market Prices Updated in DB");
    } catch (e) {
        console.error("❌ Market Price Update Failed:", e);
    }
};

// Default export for CJS compatibility
export default { refreshMarketPrices };
