export interface WalletTransaction {
  transactionId: string;
  userId: string;
  category: 'PASSENGER' | 'PARCEL' | 'MEDICINE' | 'MANDI' | 'INCENTIVE' | 'BONUS';
  amount: number;
  currency: string;
  timestamp: number;
  description: string;
}

export interface UniversalWalletSummary {
  userId: string;
  totalBalance: number;
  categoryBreakdown: {
    passengerEarnings: number;
    parcelEarnings: number;
    medicineEarnings: number;
    mandiEarnings: number;
    incentiveEarnings: number;
  };
  recentTransactions: WalletTransaction[];
}

const mockWalletStore: Map<string, UniversalWalletSummary> = new Map();

export class UniversalCapacityWalletEngine {
  /**
   * Credits multi-domain earnings into user's Universal Capacity Wallet
   */
  public static creditEarnings(
    userId: string,
    amount: number,
    category: WalletTransaction['category'],
    description: string = 'Capacity Monetization Payout'
  ): WalletTransaction {
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

    if (category === 'PASSENGER') wallet.categoryBreakdown.passengerEarnings += amount;
    else if (category === 'PARCEL') wallet.categoryBreakdown.parcelEarnings += amount;
    else if (category === 'MEDICINE') wallet.categoryBreakdown.medicineEarnings += amount;
    else if (category === 'MANDI') wallet.categoryBreakdown.mandiEarnings += amount;
    else if (category === 'INCENTIVE' || category === 'BONUS') wallet.categoryBreakdown.incentiveEarnings += amount;

    const tx: WalletTransaction = {
      transactionId: `TX_WAL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      category,
      amount,
      currency: 'INR',
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
  public static getWalletBalance(userId: string): UniversalWalletSummary {
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
