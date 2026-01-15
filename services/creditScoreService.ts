
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { CreditScore } from '../types';

// ==================== ALTERNATIVE SCORING ENGINE ====================

export const calculateCreditScore = async (vendorId: string): Promise<CreditScore> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/credit-score/calculate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vendorId })
        });
        const data = await response.json();
        return data.score;
    } catch (error) {
        console.error("Credit Score Calc Failed", error);
        // Return Mock if API fails
        return getMockCreditScore(vendorId);
    }
};

export const getLoanOffers = async (creditScore: number): Promise<any[]> => {
    // Logic to map score to bank offers
    if (creditScore > 750) {
        return [
            { bank: 'SBI', amount: 50000, rate: 10.5, name: 'Micro Business Loan' },
            { bank: 'HDFC', amount: 100000, rate: 12.0, name: 'Vyapar Unnati' }
        ];
    } else if (creditScore > 600) {
        return [
            { bank: 'Union Bank', amount: 10000, rate: 14.0, name: 'PM SVANidhi' }
        ];
    }
    return [];
};

// ==================== MOCK SCORE GENERATOR ====================

export const getMockCreditScore = (vendorId: string): CreditScore => ({
    vendorId,
    score: 720,
    tier: 'GOOD',
    factors: [
        { name: 'Digital Transactions', impact: 'POSITIVE', weight: 40, value: 85 },
        { name: 'Customer Ratings', impact: 'POSITIVE', weight: 30, value: 4.5 },
        { name: 'Vintage', impact: 'NEUTRAL', weight: 20, value: 24 } // months
    ],
    metrics: {
        avgDailySales: 3500,
        salesConsistencyScore: 92,
        upiTransactionRatio: 0.75,
        repaymentHistory: 100,
        businessAge: 24,
        appEngagementScore: 80
    },
    loanEligibility: {
        pmSvanidhi: { eligible: true, maxAmount: 20000, tier: 2 },
        workingCapital: { eligible: true, maxAmount: 100000, interestRate: 11.5 }
    }
});
