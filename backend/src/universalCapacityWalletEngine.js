const mockWalletStore = /* @__PURE__ */ new Map();
class UniversalCapacityWalletEngine {
  /**
   * Credits multi-domain earnings into user's Universal Capacity Wallet
   */
  static creditEarnings(userId, amount, category, description = "Capacity Monetization Payout") {
    let wallet = mockWalletStore.get(userId);
    if (!wallet) {
      wallet = {
        userId,
        totalBalance: 0,
        categoryBreakdown: {
          passengerEarnings: 0,
          parcelEarnings: 0,
          medicineEarnings: 0,
          mandiEarnings: 0,
          incentiveEarnings: 0
        },
        recentTransactions: []
      };
      mockWalletStore.set(userId, wallet);
    }
    wallet.totalBalance += amount;
    if (category === "PASSENGER") wallet.categoryBreakdown.passengerEarnings += amount;
    else if (category === "PARCEL") wallet.categoryBreakdown.parcelEarnings += amount;
    else if (category === "MEDICINE") wallet.categoryBreakdown.medicineEarnings += amount;
    else if (category === "MANDI") wallet.categoryBreakdown.mandiEarnings += amount;
    else if (category === "INCENTIVE" || category === "BONUS") wallet.categoryBreakdown.incentiveEarnings += amount;
    const tx = {
      transactionId: `TX_WAL_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`,
      userId,
      category,
      amount,
      currency: "INR",
      timestamp: Date.now(),
      description
    };
    wallet.recentTransactions.unshift(tx);
    if (wallet.recentTransactions.length > 20) wallet.recentTransactions.pop();
    return tx;
  }
  /**
   * Returns Universal Wallet Summary
   */
  static getWalletBalance(userId) {
    const wallet = mockWalletStore.get(userId);
    if (!wallet) {
      return {
        userId,
        totalBalance: 0,
        categoryBreakdown: { passengerEarnings: 0, parcelEarnings: 0, medicineEarnings: 0, mandiEarnings: 0, incentiveEarnings: 0 },
        recentTransactions: []
      };
    }
    return wallet;
  }
}
export {
  UniversalCapacityWalletEngine
};
