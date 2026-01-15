/**
 * Lazy Service Loaders
 * Load heavy dependencies on-demand to reduce initial bundle size
 */

// ========================================
// TensorFlow.js - Lazy Loader
// Only loads when ML features are actually used
// ========================================
let tfModule: typeof import('@tensorflow/tfjs') | null = null;
let tfLoading: Promise<typeof import('@tensorflow/tfjs')> | null = null;

export async function getTensorFlow(): Promise<typeof import('@tensorflow/tfjs')> {
    if (tfModule) return tfModule;

    if (!tfLoading) {
        tfLoading = import('@tensorflow/tfjs').then(module => {
            tfModule = module;
            console.log('✅ TensorFlow.js loaded on-demand');
            return module;
        });
    }

    return tfLoading;
}

// ========================================
// MobileNet Model - Lazy Loader
// Only loads when image classification is needed
// ========================================
let mobilenetModel: any = null;
let mobilenetLoading: Promise<any> | null = null;

export async function getMobileNet(): Promise<any> {
    if (mobilenetModel) return mobilenetModel;

    if (!mobilenetLoading) {
        mobilenetLoading = (async () => {
            const tf = await getTensorFlow();
            const mobilenet = await import('@tensorflow-models/mobilenet');
            mobilenetModel = await mobilenet.load();
            console.log('✅ MobileNet model loaded on-demand');
            return mobilenetModel;
        })();
    }

    return mobilenetLoading;
}

// ========================================
// Ethers.js - Lazy Loader
// Only loads when blockchain/wallet features are used
// ========================================
let ethersModule: typeof import('ethers') | null = null;
let ethersLoading: Promise<typeof import('ethers')> | null = null;

export async function getEthers(): Promise<typeof import('ethers')> {
    if (ethersModule) return ethersModule;

    if (!ethersLoading) {
        ethersLoading = import('ethers').then(module => {
            ethersModule = module;
            console.log('✅ Ethers.js loaded on-demand');
            return module;
        });
    }

    return ethersLoading;
}

// ========================================
// Google GenAI - Lazy Loader
// Only loads when AI chat features are used
// ========================================
let genaiModule: typeof import('@google/genai') | null = null;
let genaiLoading: Promise<typeof import('@google/genai')> | null = null;

export async function getGoogleGenAI(): Promise<typeof import('@google/genai')> {
    if (genaiModule) return genaiModule;

    if (!genaiLoading) {
        genaiLoading = import('@google/genai').then(module => {
            genaiModule = module;
            console.log('✅ Google GenAI loaded on-demand');
            return module;
        });
    }

    return genaiLoading;
}

// ========================================
// Preload hints - Call these when user is likely to need the feature
// ========================================
export function preloadTensorFlow(): void {
    if (!tfModule && !tfLoading) {
        // Use requestIdleCallback to not block main thread
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => getTensorFlow(), { timeout: 5000 });
        }
    }
}

export function preloadEthers(): void {
    if (!ethersModule && !ethersLoading) {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => getEthers(), { timeout: 5000 });
        }
    }
}

// Check if modules are already loaded
export const isLoaded = {
    tensorflow: () => tfModule !== null,
    ethers: () => ethersModule !== null,
    genai: () => genaiModule !== null,
};
