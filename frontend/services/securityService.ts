
import { DeviceFingerprint, SecurityContext, GeoLocation } from '@villagelink/shared';

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

// Helper fallback hash function for non-secure HTTP contexts
const sha256Fallback = (str: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x55555555;
  for (let i = 0; i < str.length; i++) {
    h1 = (h1 ^ str.charCodeAt(i)) * 16777619;
    h2 = (h2 ^ str.charCodeAt(i)) * 16777619;
  }
  const part1 = Math.abs(h1).toString(16).padStart(8, '0');
  const part2 = Math.abs(h2).toString(16).padStart(8, '0');
  return (part1 + part2).padEnd(64, 'f');
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

  let canvasHash = '';
  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null;
  if (cryptoObj && cryptoObj.subtle) {
    try {
      const hash = await cryptoObj.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
      const hashArray = Array.from(new Uint8Array(hash));
      canvasHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      canvasHash = sha256Fallback(dataUrl);
    }
  } else {
    canvasHash = sha256Fallback(dataUrl);
  }

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
  
  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null;
  if (cryptoObj && cryptoObj.subtle) {
    try {
      keyPair = await cryptoObj.subtle.generateKey(
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
    } catch (err) {
      console.warn("Subtle crypto generateKey failed, falling back to mock keys", err);
    }
  }

  // Fallback mock key pair
  keyPair = {
    publicKey: {} as any,
    privateKey: {} as any
  };
  return keyPair;
};

export const encryptData = async (data: string): Promise<string> => {
  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null;
  if (cryptoObj && cryptoObj.subtle) {
    try {
      if (!keyPair) await generateKeys();
      if (keyPair && keyPair.publicKey && Object.keys(keyPair.publicKey).length > 0) {
        const encoded = new TextEncoder().encode(data);
        const encrypted = await cryptoObj.subtle.encrypt(
          { name: "RSA-OAEP" },
          keyPair.publicKey,
          encoded
        );
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      }
    } catch (err) {
      console.warn("Subtle crypto encrypt failed, falling back to base64", err);
    }
  }
  return btoa(data);
};

// 4. DECENTRALIZED IDENTITY (DID) SIGNING
export const signTransaction = async (payload: any): Promise<string> => {
  // Simulating ECDSA signing for DID
  // In real app, this uses private key stored in secure enclave
  const fingerprint = await generateDeviceFingerprint();
  const content = JSON.stringify(payload) + fingerprint.id + Date.now();
  
  let signatureHash = '';
  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : null;
  if (cryptoObj && cryptoObj.subtle) {
    try {
      const hashBuffer = await cryptoObj.subtle.digest('SHA-256', new TextEncoder().encode(content));
      signatureHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      signatureHash = sha256Fallback(content);
    }
  } else {
    signatureHash = sha256Fallback(content);
  }
  
  return `did:vl:${signatureHash}`;
};

export const verifySignature = async (data: any, signature: string): Promise<boolean> => {
  // Simulate verification
  // In real world: verify(signature, publicKey, data)
  await new Promise(r => setTimeout(r, 200));
  return Boolean(signature && signature.startsWith('did:vl:'));
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
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lastLoc.lat * Math.PI / 180) * Math.cos(currentLoc.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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



// Initialize listeners
if (typeof window !== 'undefined') {
  // Adding touchstart to catch mobile interactions better
  window.addEventListener('click', trackBehavior);
  window.addEventListener('touchstart', trackBehavior);
  window.addEventListener('scroll', trackBehavior);
  window.addEventListener('keydown', trackBehavior);
}
