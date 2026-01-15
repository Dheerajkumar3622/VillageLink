
import { VehicleComponentHealth, MeshPeer } from '../types';

// --- REAL SONIC AUDIO-OVER-DATA ---
// Frequency Shift Keying (FSK) Simulation using High Frequencies (18kHz - 19kHz)
// Humans cannot hear this well, but microphones can pick it up.

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let listenInterval: any = null;

export const playSonicToken = (data: string) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'sine';
  // "Start" bit frequency
  oscillator.frequency.setValueAtTime(18500, ctx.currentTime); 
  // "Data" chirp
  oscillator.frequency.linearRampToValueAtTime(19500, ctx.currentTime + 0.3);
  
  // Envelope to avoid clicking sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.3);
  
  console.log(`🔊 Broadcasting Sonic Token: ${data}`);
};

export const startSonicListening = async (onDetected: (data: string) => void) => {
  if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("Microphone not supported");
      return;
  }

  try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048; // High resolution for frequency analysis
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const targetFreq = 18500; // Target Hz
      const sampleRate = audioCtx.sampleRate;
      const binIndex = Math.floor(targetFreq * analyser.fftSize / sampleRate);
      
      console.log(`👂 Listening for Sonic Signal ~${targetFreq}Hz (Bin ${binIndex})...`);

      listenInterval = setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          
          // Check energy in the 18.5kHz bin and surroundings
          const signalStrength = dataArray[binIndex];
          const noiseFloor = dataArray[binIndex - 50]; // Check lower freq for noise comparison
          
          // If signal is significantly higher than noise floor
          if (signalStrength > 100 && signalStrength > (noiseFloor + 50)) {
              console.log("📶 Sonic Token Signal Detected!");
              // In a real FSK system, we would decode bits here. 
              // For MVP, detection triggers the payload.
              onDetected(`SONIC-PAY-${Date.now().toString().slice(-6)}`);
              
              // Debounce
              stopSonicListening();
              stream.getTracks().forEach(t => t.stop());
          }
      }, 100);

  } catch (e) {
      console.error("Sonic Listen Error:", e);
  }
};

export const stopSonicListening = () => {
    if (listenInterval) clearInterval(listenInterval);
    if (audioCtx) audioCtx.close();
    audioCtx = null;
    analyser = null;
};

// --- DIGITAL TWIN SIMULATOR ---
export const getDigitalTwinData = (): VehicleComponentHealth[] => {
  return [
    { id: 'engine', name: 'Engine Block', status: 'GOOD', healthPercent: 92 },
    { id: 'brakes', name: 'Brake Pads', status: 'WARNING', healthPercent: 45, predictedFailureKm: 2500 },
    { id: 'battery', name: 'Battery Array', status: 'GOOD', healthPercent: 88 },
    { id: 'suspension', name: 'Suspension', status: 'CRITICAL', healthPercent: 20, predictedFailureKm: 150 },
    { id: 'tires', name: 'Tire Pressure', status: 'GOOD', healthPercent: 95 }
  ];
};

// --- MESH NETWORKING SIMULATOR ---
export const scanMeshPeers = async (): Promise<MeshPeer[]> => {
  // Simulate discovery of nearby devices via Bluetooth/WiFi-Direct
  await new Promise(r => setTimeout(r, 1500));
  return [
    { id: 'PEER-1', name: 'Raju\'s Phone', signalStrength: 85, lastSeen: Date.now() },
    { id: 'PEER-2', name: 'Bus Node #404', signalStrength: 60, lastSeen: Date.now() },
    { id: 'PEER-3', name: 'Village Hub', signalStrength: 90, lastSeen: Date.now() }
  ];
};

export const broadcastToMesh = (payload: any) => {
  console.log("📡 Mesh Broadcast:", payload);
  return true;
};

// --- EDGE AI SIMULATOR ---
export const analyzeDriverFace = () => {
  // Simulates drowsiness detection
  // Returns true if "Drowsy"
  return Math.random() > 0.8;
};
