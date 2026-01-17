// LAZY IMPORTS: TensorFlow and MobileNet are loaded dynamically to prevent app crash
// import * as tf from '@tensorflow/tfjs';  // REMOVED - Loaded dynamically
// import * as mobilenet from '@tensorflow-models/mobilenet';  // REMOVED - Loaded dynamically
import { DynamicFareResult, CrowdForecast, ChurnRiskAnalysis, ChatMessage, DeviationProposal, MandiRate, JobOpportunity, MarketItem, PilgrimagePackage, FuelAdvice, LeafDiagnosisResult, ParcelScanResult } from '../types';
import { API_BASE_URL } from '../config';
import { getCurrentUser, getAuthToken } from './authService';

// Singleton Model Loader - Uses dynamic imports to prevent blocking app load
let net: any = null;
let tfModule: any = null;
let mobilenetModule: any = null;

const loadMobileNet = async () => {
    if (!net) {
        console.log('Loading Dr. Kisan Neural Network...');
        // Dynamically import TensorFlow and MobileNet only when needed
        if (!tfModule) {
            tfModule = await import('@tensorflow/tfjs');
        }
        if (!mobilenetModule) {
            mobilenetModule = await import('@tensorflow-models/mobilenet');
        }
        net = await mobilenetModule.load({ version: 2, alpha: 1.0 });
        console.log('Dr. Kisan AI Ready.');
    }
    return net;
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAuthToken() || ''
});

// Helper: Image Base64 to HTML Element
const imageFromBase64 = async (base64: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => resolve(img);
    });
};

// Image Capture Helper: Creates a file input to let user take/select a photo
const captureImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use back camera if available

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        };

        input.oncancel = () => resolve(null);
        input.click();
    });
};

export const diagnoseLeaf = async (): Promise<LeafDiagnosisResult> => {
    try {
        const imgBase64 = await captureImage();
        if (!imgBase64) return { disease: "Cancelled", confidence: 0, remedy: "", productLink: "" };

        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/ai/diagnose`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: imgBase64 })
        });

        if (!response.ok) throw new Error("Backend Vision API Failed");
        const data = await response.json();

        return {
            disease: data.disease,
            confidence: Math.round(data.confidence * 100),
            remedy: data.remedy,
            productLink: data.productLink || ""
        };

    } catch (e) {
        console.error("Backend AI Error:", e);
        return { disease: "Analysis Failed", confidence: 0, remedy: "Try again with better lighting.", productLink: "" };
    }
};

// === DYNAMIC PRICING & CROWD FORECASTING ===

export const calculateDynamicFare = async (distance: number, timestamp: number): Promise<DynamicFareResult> => {
    const hour = new Date(timestamp).getHours();
    const baseFare = distance * 2; // ₹2 per km base rate

    // Rush hour: 7-9 AM and 5-8 PM
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
    // Happy hour: 11 AM - 2 PM
    const isHappyHour = hour >= 11 && hour <= 14;

    let surgeAmount = 0;
    let discountAmount = 0;
    let message = "Standard fare";

    if (isRushHour) {
        surgeAmount = baseFare * 0.2;
        message = "Rush hour surge applied (+20%)";
    } else if (isHappyHour) {
        discountAmount = baseFare * 0.1;
        message = "Happy hour discount applied (-10%)";
    }

    return {
        totalFare: Math.round(baseFare + surgeAmount - discountAmount),
        baseFare: Math.round(baseFare),
        surgeAmount: Math.round(surgeAmount),
        discountAmount: Math.round(discountAmount),
        isRushHour,
        isHappyHour,
        message
    };
};

export const getCrowdForecast = (timestamp: number): CrowdForecast => {
    const hour = new Date(timestamp).getHours();

    // Peak hours pattern
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        return { level: 'HIGH', occupancyPercent: 85, label: 'Very Crowded', hour };
    } else if ((hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 16)) {
        return { level: 'MEDIUM', occupancyPercent: 55, label: 'Moderate', hour };
    } else {
        return { level: 'LOW', occupancyPercent: 25, label: 'Light', hour };
    }
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// === LOGISTICS & MARKET FUNCTIONS ===

export const calculateLogisticsCost = async (itemType: string, weight: number): Promise<number> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/grammandi/logistics/rates`);
        const rates = await response.json();

        const baseRate = rates[itemType] || rates['DEFAULT'] || 18;
        const multiplier = rates['perKgMultiplier'] || 2;

        return Math.round(baseRate + (weight * multiplier));
    } catch (e) {
        console.warn("Using offline rates");
        // Fallback
        const rates: Record<string, number> = {
            'BOX_SMALL': 20, 'SACK_GRAIN': 15, 'DOCUMENT': 30, 'DEFAULT': 18
        };
        const baseRate = rates[itemType] || rates['DEFAULT'];
        return Math.round(baseRate + (weight * 2));
    }
};

export const getMandiRates = async (): Promise<MandiRate[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/grammandi/market/prices`);
        const data = await response.json();
        if (!response.ok) throw new Error("Failed to fetch rates");
        return data; // Assumes backend returns array of MandiRate
    } catch (e) {
        console.error("Failed to fetch mandi rates", e);
        return [];
    }
};

export const getJobs = async (): Promise<JobOpportunity[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/grammandi/jobs`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Failed to fetch jobs", e);
        return [];
    }
};

// Update return type in types.ts if needed, assuming MarketItem logic is moved or kept for now.
export const getMarketItems = (): MarketItem[] => {
    return [
        { id: 'M1', name: 'Organic Dal', price: 120, unit: 'kg', supplier: 'Gram Store', inStock: true, isDidiProduct: true },
        { id: 'M2', name: 'Fresh Vegetables', price: 50, unit: 'kg', supplier: 'Local Farm', inStock: true },
        { id: 'M3', name: 'Mustard Oil', price: 180, unit: 'litre', supplier: 'Gram Store', inStock: true }
    ];
};

export const getPackages = async (): Promise<PilgrimagePackage[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/grammandi/travel/packages`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Failed to fetch packages", e);
        return [];
    }
};

// === BIOMETRIC & AI SCANNING ===

export const verifyGenderBiometrics = async (type: 'VOICE' | 'FACE'): Promise<{ verified: boolean }> => {
    try {
        const token = await getAuthToken();
        let payload: any = { type };

        if (type === 'FACE') {
            const img = await captureImage();
            if (!img) return { verified: false };
            payload.imageBase64 = img;
        } else {
            // Simulated voice capture for now as we don't have a voice capture helper in this file yet
            // But we route to real backend
            payload.audioBase64 = "MOCK_AUDIO_DATA";
        }

        const response = await fetch(`${API_BASE_URL}/api/ai/verify-bio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return { verified: data.verified };
    } catch (e) {
        console.error("Biometric API Error:", e);
        return { verified: false };
    }
};

export const estimateParcelSize = async (): Promise<ParcelScanResult> => {
    try {
        const img = await captureImage();
        if (!img) return { weightKg: 0, dimensions: "", recommendedType: "" };

        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/ai/parcel-scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: img })
        });

        const data = await response.json();
        return {
            weightKg: data.weightKg,
            dimensions: data.dimensions,
            recommendedType: data.recommendedType
        };
    } catch (e) {
        console.error("Parcel Scan API Error:", e);
        return { weightKg: 5, dimensions: "Standard", recommendedType: "BOX" };
    }
};

// BEHAVIORAL PHYSICS ENGINE
// Analyzes user interactions to determine psychological state (Churn Risk, Frustration)
export const analyzeChurnRisk = (userHistory: any[]): ChurnRiskAnalysis => {
    // 1. Feature Extraction
    const recentTrips = userHistory.filter(h => (Date.now() - h.timestamp) < 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const cancelledCount = recentTrips.filter(t => t.status === 'CANCELLED').length;
    const completedCount = recentTrips.filter(t => t.status === 'COMPLETED').length;

    // 2. Psychological Coefficients
    const frustrationIndex = cancelledCount / Math.max(1, recentTrips.length); // 0 to 1
    const engagementScore = recentTrips.length > 0 ? 1 : 0; // Binary active

    // 3. Rule-Based Inference
    let probability = 0.1; // Base risk
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (recentTrips.length === 0) {
        probability = 0.8; // High risk (Inactive)
        riskLevel = 'HIGH';
    } else if (frustrationIndex > 0.4) {
        probability = 0.7; // High risk (Bad experience)
        riskLevel = 'HIGH';
    } else if (frustrationIndex > 0.2) {
        probability = 0.4;
        riskLevel = 'MEDIUM';
    }

    console.log(`🧠 Psych Engine: Frustration=${frustrationIndex.toFixed(2)}, Risk=${riskLevel}`);

    return {
        riskLevel,
        churnProbability: probability,
        recommendedOffer: riskLevel === 'HIGH' ? {
            discountPercent: 20,
            code: 'GRAM20',
            description: 'Offer 20% Discount'
        } : undefined
    };
};

export const checkForRouteDeviations = (currentLoc: { lat: number, lng: number }, pathDetails: { lat: number, lng: number }[]): DeviationProposal | null => {
    let minDistance = Infinity;
    pathDetails.forEach(p => {
        const d = calculateHaversine(currentLoc.lat, currentLoc.lng, p.lat, p.lng);
        if (d < minDistance) minDistance = d;
    });
    if (minDistance > 0.5) {
        return {
            id: `DEV-${Date.now()}`,
            detourVillage: 'Unknown Detour',
            extraDistance: minDistance,
            estimatedRevenue: 0,
            passengerCount: 0,
            confidenceScore: 0.95,
            satelliteReason: "⚠️ Off-Route Detected by GPS"
        };
    }
    return null;
};

const calculateHaversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

let motionHistory: number[] = [];
let fatigueListener: any = null;

export const initFatigueMonitoring = () => {
    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
        fatigueListener = (event: DeviceMotionEvent) => {
            const acc = event.acceleration;
            if (acc) {
                const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
                motionHistory.push(magnitude);
                if (motionHistory.length > 50) motionHistory.shift();
            }
        };
        window.addEventListener('devicemotion', fatigueListener);
    }
};

export const stopFatigueMonitoring = () => {
    if (fatigueListener) {
        window.removeEventListener('devicemotion', fatigueListener);
        motionHistory = [];
    }
};

export const analyzeDriverDrowsiness = (): boolean => {
    if (motionHistory.length < 20) return false;
    const recent = motionHistory.slice(-5);
    const older = motionHistory.slice(0, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (olderAvg < 0.1 && recentAvg > 1.5) {
        return true;
    }
    return false;
};

export const calculateGramScore = (history: any[], walletBalance: number): number => {
    let score = 300;
    if (walletBalance > 50) score += 50;
    if (history.length > 5) score += 100;
    if (history.length > 20) score += 100;
    return Math.min(900, score);
};

export const analyzeBusAudioOccupancy = async (): Promise<number> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        let averageVolume = 0;

        await new Promise<void>(resolve => {
            let readings = 0;
            let sum = 0;
            scriptProcessor.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = 0;
                const length = array.length;
                for (let i = 0; i < length; i++) {
                    values += array[i];
                }
                const average = values / length;
                sum += average;
                readings++;
            };
            setTimeout(() => {
                averageVolume = sum / readings;
                stream.getTracks().forEach(t => t.stop());
                audioContext.close();
                resolve();
            }, 2000);
        });

        const baseNoise = 10;
        const estimatedPeople = Math.max(0, Math.round((averageVolume - baseNoise) / 2));
        return Math.min(60, estimatedPeople);

    } catch (e) {
        console.warn("Audio Occupancy Failed:", e);
        return 0;
    }
};

export const findPoolMatches = (route: string): boolean => Math.random() > 0.6;

// === NATURAL LANGUAGE PROCESSING FOR SARPANCH AI ===

export const processNaturalLanguageQuery = async (query: string): Promise<ChatMessage> => {
    const lowerQuery = query.toLowerCase();

    // Simple keyword-based intent detection
    if (lowerQuery.includes('bus') || lowerQuery.includes('ticket') || lowerQuery.includes('safar')) {
        return {
            id: Date.now().toString(),
            text: "Bus ke liye BOOK tab pe jaiye! Aapka safe safar humara priority hai. 🚌",
            sender: 'BOT',
            timestamp: Date.now(),
            actionLink: { label: "Book Bus →", tab: 'HOME' }
        };
    }

    if (lowerQuery.includes('parcel') || lowerQuery.includes('saman') || lowerQuery.includes('bhejo')) {
        return {
            id: Date.now().toString(),
            text: "Parcel bhejne ke liye LOGISTICS section use karo. Sabse sasta aur safe! 📦",
            sender: 'BOT',
            timestamp: Date.now(),
            actionLink: { label: "Send Parcel →", tab: 'LOGISTICS' }
        };
    }

    if (lowerQuery.includes('pass') || lowerQuery.includes('monthly')) {
        return {
            id: Date.now().toString(),
            text: "Monthly pass leke paisa bachao! Student pass pe 50% discount milega. 🎫",
            sender: 'BOT',
            timestamp: Date.now(),
            actionLink: { label: "Buy Pass →", tab: 'PASSES' }
        };
    }

    if (lowerQuery.includes('maike') || lowerQuery.includes('ghar') || lowerQuery.includes('home')) {
        return {
            id: Date.now().toString(),
            text: "Maike jaana hai? Hum safe route aur women-friendly bus dhundh denge. 🏠",
            sender: 'BOT',
            timestamp: Date.now(),
            actionLink: { label: "Book Safe Ride →", tab: 'HOME' }
        };
    }

    if (lowerQuery.includes('mandi') || lowerQuery.includes('crop') || lowerQuery.includes('fasal')) {
        return {
            id: Date.now().toString(),
            text: "Aaj ka Mandi rate: Wheat ₹2200/qtl (↑), Rice ₹1980/qtl. Behetar price ke liye ruko! 🌾",
            sender: 'BOT',
            timestamp: Date.now()
        };
    }

    // Default response
    return {
        id: Date.now().toString(),
        text: "Hum samjhe nahi. Bus booking, parcel, ya maike jaana - kuch bhi pucho! 🙏",
        sender: 'BOT',
        timestamp: Date.now()
    };
};
