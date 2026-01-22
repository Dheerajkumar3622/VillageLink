import { Beneficiary, ProxyTransaction, VillageManagerProfile } from '../types';
import { getAuthToken } from './authService';

const API_URL = '/api/village-manager';

/**
 * VillageManager Frontend Service
 */

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
});

export const completeManagerProfile = async (data: Partial<VillageManagerProfile>): Promise<VillageManagerProfile> => {
    const response = await fetch(`${API_URL}/complete-profile`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to complete profile');
    }
    return await response.json();
};

export const getManagerProfile = async (): Promise<VillageManagerProfile> => {
    const response = await fetch(`${API_URL}/profile`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error('Failed to fetch profile');
    }
    return await response.json();
};

export const addBeneficiary = async (data: Partial<Beneficiary>): Promise<Beneficiary> => {
    const response = await fetch(`${API_URL}/beneficiary`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add beneficiary');
    }
    return await response.json();
};

export const getBeneficiaries = async (): Promise<Beneficiary[]> => {
    const response = await fetch(`${API_URL}/beneficiaries`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error('Failed to fetch beneficiaries');
    }
    return await response.json();
};

export const bookProxyTicket = async (beneficiaryId: string, ticketData: any): Promise<{ ticket: any; proxyTransaction: ProxyTransaction }> => {
    const response = await fetch(`${API_URL}/book-ticket`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ beneficiaryId, ticketData })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to book proxy ticket');
    }
    return await response.json();
};

export const getProxyTransactions = async (): Promise<ProxyTransaction[]> => {
    const response = await fetch(`${API_URL}/transactions`, {
        headers: getHeaders()
    });
    if (!response.ok) {
        throw new Error('Failed to fetch transactions');
    }
    return await response.json();
};

export default {
    completeManagerProfile,
    getManagerProfile,
    addBeneficiary,
    getBeneficiaries,
    bookProxyTicket,
    getProxyTransactions
};
