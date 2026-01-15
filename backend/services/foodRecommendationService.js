
import { FoodOrder, FoodVendor, VendorMenuItem } from '../models.js';

/**
 * Get personalized food recommendations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of recommended menu items
 */
export const getRecommendations = async (userId) => {
    try {
        // 1. Get User's Order History
        const userOrders = await FoodOrder.find({ userId, status: 'COMPLETED' });
        const orderedItemIds = userOrders.flatMap(order => order.items.map(i => i.id));

        // 2. Simple Collaborative Filtering:
        // Find other users who ordered the same items
        const similarUsers = await FoodOrder.distinct('userId', {
            'items.id': { $in: orderedItemIds },
            userId: { $ne: userId }
        });

        // 3. Get what those similar users ordered (that this user hasn't)
        const recommendedItemIds = await FoodOrder.distinct('items.id', {
            userId: { $in: similarUsers },
            'items.id': { $nin: orderedItemIds }
        });

        // 4. Fetch the actual items
        let recommendations = await VendorMenuItem.find({
            id: { $in: recommendedItemIds },
            available: true
        }).limit(5);

        // 5. Fallback: If no collaborative recommendations, return top rated/popular items
        if (recommendations.length < 3) {
            const popularItems = await VendorMenuItem.find({
                available: true
            })
                .sort({ rating: -1 })
                .limit(5);

            // Merge and deduplicate
            const existingIds = new Set(recommendations.map(r => r.id));
            popularItems.forEach(item => {
                if (!existingIds.has(item.id) && recommendations.length < 5) {
                    recommendations.push(item);
                    existingIds.add(item.id);
                }
            });
        }

        // Attach Vendor details to recommendations
        const enriched = await Promise.all(recommendations.map(async (item) => {
            const vendor = await FoodVendor.findOne({ id: item.vendorId }).select('stallName location rating');
            return {
                ...item.toObject(),
                vendor
            };
        }));

        return enriched;
    } catch (error) {
        console.error('Recommendation Engine Error:', error);
        return [];
    }
};
