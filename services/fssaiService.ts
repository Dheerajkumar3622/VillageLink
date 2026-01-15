
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { HygieneAudit } from '../types';

// ==================== FSSAI VALIDATION ====================

export const validateLicense = async (licenseNumber: string): Promise<{ isValid: boolean; details?: any; error?: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/fssai/validate/${licenseNumber}`);
        const data = await response.json();
        return { isValid: data.isValid, details: data.details };
    } catch (error: any) {
        return { isValid: false, error: error.message };
    }
};

export const checkComplianceStatus = async (vendorId: string): Promise<{ isCompliant: boolean; pendingActions: string[] }> => {
    // Mock logic
    return {
        isCompliant: false,
        pendingActions: ['Renew License', 'Upload Water Test Report']
    };
};

// ==================== AI HYGIENE AUDIT ====================

export const analyzeHygieneImage = async (base64Image: string): Promise<{ score: number; hazards: string[] }> => {
    // Mock AI Analysis
    // In real app, send to Python/TensorFlow backend
    return {
        score: 85,
        hazards: ['Uncovered Dustbin']
    };
};

export const generateHygieneCertificate = async (vendorId: string): Promise<string> => {
    // Returns URL of PDF certificate
    return 'https://foodlink.gov.in/certs/sample.pdf';
};
