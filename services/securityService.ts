
import { DeviceFingerprint, SecurityContext, GeoLocation } from '../types';

/**
 * VillageLink v13.1 - Adjusted Security
 * Adjusted specifically for Mobile Touch Interactions
 */

// 1. BEHAVIORAL BIOMETRICS
// Tracks user interaction patterns to detect bots vs humans
let interactionData: number[] = [];
let lastInteractionTime = Date.now();

export const trackBehavior = () => {
  const now = Date.now();
  const diff = now - lastInteractionTime;
  if (diff < 5000) { // Only track rapid interactions
    interactionData.push(diff);
  }
  lastInteractionTime = now;
  
  if (interactionData.length > 20) interactionData.shift();
};

export const getBehavioralScore = (): number => {
  // Relaxed Constraint: Default to 1.0 (Human) if not enough data
  if (interactionData.length < 3) return 1.0; 
  
  // Calculate variance. 
  const mean = interactionData.reduce((a, b) => a + b) / interactionData.length;
  const variance = interactionData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / interactionData.length;
  
  // Adjusted Thresholds for Mobile:
  // Bots are extremely fast (<20ms avg) or perfectly consistent (variance < 2).
  // Humans on mobile can be fast, so we lowered the mean threshold from 50 to 20.
  if (mean < 20 || variance < 2) return 0.1; // Likely Bot
  return 0.95; // Likely Human
};

// 2. CANVAS FINGERPRINTING (Device ID)
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas blocked");

  // Draw complex graphic that renders differently on different GPUs
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("VillageLink_Secure_v13", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("TrustChain", 4, 17);

  const dataUrl = canvas.toDataURL();
  
  // Simple Hash
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  const hashArray = Array.from(new Uint8Array(hash));
  const canvasHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    id: `DEV-${canvasHash.substring(0, 12)}`,
    canvasHash,
    userAgentHash: btoa(navigator.userAgent),
    screenRes: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    trustScore: 1.0 // Initial
  };
};

// 3. END-TO-END ENCRYPTION (Web Crypto API)
let keyPair: CryptoKeyPair | null = null;

export const generateKeys = async (): Promise<CryptoKeyPair> => {
  if (keyPair) return keyPair;
  keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

export const encryptData = async (data: string): Promise<string> => {
  if (!keyPair) await generateKeys();
  const encoded = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    keyPair!.publicKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

// 4. DECENTRALIZED IDENTITY (DID) SIGNING
export const signTransaction = async (payload: any): Promise<string> => {
    // Simulating ECDSA signing for DID
    // In real app, this uses private key stored in secure enclave
    const fingerprint = await generateDeviceFingerprint();
    const content = JSON.stringify(payload) + fingerprint.id + Date.now();
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    return `did:vl:${Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
};

export const verifySignature = async (data: any, signature: string): Promise<boolean> => {
    // Simulate verification
    // In real world: verify(signature, publicKey, data)
    await new Promise(r => setTimeout(r, 200));
    return signature && signature.startsWith('did:vl:');
};

// 5. GEO-VELOCITY CHECK
let lastKnownLocation: GeoLocation | null = null;

export const updateLastLocation = (loc: GeoLocation) => {
    lastKnownLocation = loc;
};

export const checkImpossibleTravel = (lastLoc: GeoLocation, currentLoc: GeoLocation): boolean => {
    const R = 6371; // km
    const dLat = (currentLoc.lat - lastLoc.lat) * Math.PI / 180;
    const dLng = (currentLoc.lng - lastLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lastLoc.lat * Math.PI / 180) * Math.cos(currentLoc.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    
    // Time diff in hours
    const timeDiffHours = (currentLoc.timestamp - lastLoc.timestamp) / (1000 * 60 * 60);
    
    if (timeDiffHours <= 0) return distanceKm > 5; // Instant teleportation > 5km is impossible

    const speed = distanceKm / timeDiffHours;
    // Speed > 1000 km/h (Plane speed) = Fraud
    return speed > 1000; 
};

export const isTravelPossible = (newLoc: GeoLocation): boolean => {
    if (!lastKnownLocation) {
        return true;
    }
    return !checkImpossibleTravel(lastKnownLocation, newLoc);
};

// 6. CHUPPI TODEIN (Shake Detection) - Feature 4
export const initShakeDetection = (onShake: () => void) => {
  let lastX: number | null = null;
  let lastY: number | null = null;
  let lastZ: number | null = null;
  let lastShakeTime = 0;
  
  // High threshold to ensure only vigorous shaking triggers alert
  // 25 m/s^2 change across axes is roughly 2.5G
  const threshold = 25; 

  if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', (event: DeviceMotionEvent) => {
        const current = event.accelerationIncludingGravity;
        if (!current) return;
        
        // Initialize on first event to prevent initial spike from null -> gravity
        if (lastX === null) {
            lastX = current.x || 0;
            lastY = current.y || 0;
            lastZ = current.z || 0;
            return;
        }

        const deltaX = Math.abs((current.x || 0) - lastX);
        const deltaY = Math.abs((current.y || 0) - lastY);
        const deltaZ = Math.abs((current.z || 0) - lastZ);

        // Sum absolute changes to catch any violent movement
        if ((deltaX + deltaY + deltaZ) > threshold) {
            const now = Date.now();
            // 3 Second Cooldown
            if (now - lastShakeTime > 3000) {
                lastShakeTime = now;
                console.log("SOS Shake Detected");
                onShake();
            }
        }

        lastX = current.x || 0;
        lastY = current.y || 0;
        lastZ = current.z || 0;
      });
  }
};

// Initialize listeners
if (typeof window !== 'undefined') {
    // Adding touchstart to catch mobile interactions better
    window.addEventListener('click', trackBehavior);
    window.addEventListener('touchstart', trackBehavior); 
    window.addEventListener('scroll', trackBehavior);
    window.addEventListener('keydown', trackBehavior);
}
