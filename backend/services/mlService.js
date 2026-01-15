
import { MessStats } from '../models.js';

// Simple Linear Regression / Moving Average for demand prediction
// In a real production app, this would use TensorFlow.js or python microservice
export const predictDemand = async (messId) => {
    try {
        const stats = await MessStats.findOne({ messId });
        if (!stats) return { expectedFootfall: 50, confidence: 'LOW' };

        const footfallMap = stats.dailyFootfall || new Map();
        const history = Array.from(footfallMap.values()).slice(-7); // Last 7 days

        if (history.length === 0) return { expectedFootfall: 50, confidence: 'LOW' };

        const sum = history.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / history.length);

        // Simple heuristic: adjust for weekends? (Todo)
        return {
            expectedFootfall: Math.round(avg * 1.1), // Expect 10% growth
            confidence: history.length > 5 ? 'HIGH' : 'MEDIUM'
        };
    } catch (e) {
        console.error("ML Prediction Error", e);
        return { expectedFootfall: 0, error: e.message };
    }
};

export const getSmartMenuSuggestions = async (messId) => {
    try {
        const stats = await MessStats.findOne({ messId });
        if (!stats) return [];

        // Return top 3 items
        const sortedItems = Array.from(stats.popularItems.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([itemId]) => itemId);

        return sortedItems;
    } catch (e) {
        return [];
    }
};

export const updateMessStats = async (messId, bookingItems) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = await MessStats.findOne({ messId }) || new MessStats({ messId, dailyFootfall: {}, popularItems: {} });

        // Update Footfall
        const currentCount = stats.dailyFootfall.get(today) || 0;
        stats.dailyFootfall.set(today, currentCount + 1);

        // Update Item Popularity
        bookingItems.forEach(item => {
            const currentPop = stats.popularItems.get(item.itemId) || 0;
            stats.popularItems.set(item.itemId, currentPop + item.quantity);
        });

        await stats.save();
    } catch (e) {
        console.error("Stats Update Error", e);
    }
}
