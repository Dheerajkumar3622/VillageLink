
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { HygieneAudit } from '../types';

// ==================== FSSAI VALIDATION ====================

export const validateLicense = async (licenseNumber: string): Promise<{ isValid: boolean; details?: any; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/vendor/fssai/validate/${licenseNumber}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return { isValid: data.isValid, details: data.details };
    } catch (error: any) {
        return { isValid: false, error: error.message };
    }
};

export const checkComplianceStatus = async (vendorId: string): Promise<{ isCompliant: boolean; pendingActions: string[] }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/vendor/fssai/compliance/${vendorId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return { isCompliant: data.isCompliant, pendingActions: data.pendingActions || [] };
    } catch (e) {
        return { isCompliant: false, pendingActions: ['System Error: Check manually'] };
    }
};

// ==================== AI HYGIENE AUDIT ====================

export const analyzeHygieneImage = async (base64Image: string): Promise<{ score: number; hazards: string[] }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/ai/hygiene-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: base64Image })
        });

        const data = await response.json();
        return {
            score: data.score,
            hazards: data.hazards || []
        };
    } catch (e) {
        console.error("Hygiene Analysis API Error:", e);
        return { score: 0, hazards: ["Analysis technical failure"] };
    }
};

export const generateHygieneCertificate = async (vendorId: string): Promise<string> => {
    // Returns URL of PDF certificate
    return 'https://foodlink.gov.in/certs/sample.pdf';
};
