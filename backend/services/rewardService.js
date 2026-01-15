
import { User, FoodVendor } from '../models.js';

/**
 * Reward user with GramCoins for order completion
 * @param {string} userId - ID of the user to reward
 * @param {number} amount - Order amount
 */
export const rewardUserForOrder = async (userId, amount) => {
    try {
        // 5% cashback in GramCoins (1 GramCoin = 1 INR for simplicity)
        const rewards = Math.floor(amount * 0.05);
        if (rewards <= 0) return;

        // In a real decentralized app, this would trigger a token transfer
        // For now, we update the internal ledger and simulate a 'Minable' event
        await User.findOneAndUpdate(
            { id: userId },
            { $inc: { walletBalance: rewards } }
        );

        console.log(`🎁 Rewarded User ${userId} with ${rewards} GramCoins`);
        return rewards;
    } catch (e) {
        console.error("Reward User Error:", e);
    }
};

/**
 * Reward vendor for high quality service
 * @param {string} vendorId - ID of the vendor
 */
export const rewardVendorBonus = async (vendorId) => {
    try {
        const vendor = await FoodVendor.findOne({ id: vendorId });
        if (vendor && vendor.rating >= 4.5) {
            // Vendors with high ratings get a "Trust Bonus" badge or points
            await FoodVendor.findOneAndUpdate(
                { id: vendorId },
                { $addToSet: { badges: 'TRUSTED_ELITE' } }
            );
        }
    } catch (e) {
        console.error("Reward Vendor Error:", e);
    }
};
