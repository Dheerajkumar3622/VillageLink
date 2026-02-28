import * as tf from '@tensorflow/tfjs';

/**
 * 🎧 VillageLink Ultrasonic Verification Service 
 * Phase 1: Acoustic Engineering & Signal Processing
 * 
 * Uses Frequency Shift Keying (FSK) to encode digital payloads (userId, ticketId) 
 * into high-frequency, inaudible sound waves (18kHz - 20kHz).
 * Uses ML/DSP to filter noise and decode the payload on the receiver side.
 */

const AUDIO_CTX = new (window.AudioContext || (window as any).webkitAudioContext)();
const BAUD_RATE = 32; // Bits per second (Slow, but robust against echoes/noise in a bus)
const FREQ_0 = 18500; // 18.5 kHz represents binary 0
const FREQ_1 = 19500; // 19.5 kHz represents binary 1
const BIT_DURATION = 1 / BAUD_RATE;

let isListening = false;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;

// --- 1. SENDER: ENCODING AND PLAYBACK ---

/**
 * Converts a string payload into a binary string for FSK modulation.
 */
function stringToBinary(str: string): string {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
}

/**
 * Generates and plays the high-frequency ultrasonic payload.
 * (Used by PassengerView to broadcast ticket info)
 */
export async function broadcastUltrasonicTicket(payload: string): Promise<void> {
    if (AUDIO_CTX.state === 'suspended') {
        await AUDIO_CTX.resume();
    }

    // Add start and end markers (11111111 start, 00000000 end for robustness)
    const binaryPayload = '11111111' + stringToBinary(payload) + '00000000';
    console.log(`[Acoustic TX] Broadcasting Payload length: ${binaryPayload.length} bits`);

    const oscillator = AUDIO_CTX.createOscillator();
    oscillator.type = 'sine';
    
    // Smooth volume to prevent audible "clicking" at high frequencies
    const gainNode = AUDIO_CTX.createGain();
    gainNode.gain.setValueAtTime(0, AUDIO_CTX.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(AUDIO_CTX.destination);
    
    oscillator.start();

    // Fade in
    gainNode.gain.linearRampToValueAtTime(1, AUDIO_CTX.currentTime + 0.05);

    let time = AUDIO_CTX.currentTime + 0.05;

    for (let i = 0; i < binaryPayload.length; i++) {
        const bit = binaryPayload[i];
        const freq = bit === '1' ? FREQ_1 : FREQ_0;
        
        // FSK: Instantly change frequency for this bit's duration
        oscillator.frequency.setValueAtTime(freq, time);
        time += BIT_DURATION;
    }

    // Fade out and stop
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.linearRampToValueAtTime(0, time + 0.05);
    oscillator.stop(time + 0.05);

    return new Promise(resolve => setTimeout(resolve, (time + 0.05 - AUDIO_CTX.currentTime) * 1000));
}

// --- 2. RECEIVER: LISTENING AND DSP (AI/ML) ---

export interface AcousticMatchResult {
    success: boolean;
    payload?: string;
    confidence: number;
}

/**
 * Starts the background acoustic listener.
 * (Used by DriverView to constantly listen for boarding passengers)
 */
export async function startUltrasonicListener(onPayloadReceived: (payload: string) => void) {
    if (isListening) return;
    
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: false, 
                noiseSuppression: false, // Turn off OS noise suppression (it blocks high freq)
                autoGainControl: false
            } 
        });

        if (AUDIO_CTX.state === 'suspended') {
            await AUDIO_CTX.resume();
        }

        const source = AUDIO_CTX.createMediaStreamSource(mediaStream);
        analyser = AUDIO_CTX.createAnalyser();
        analyser.fftSize = 2048; // High frequency resolution
        analyser.smoothingTimeConstant = 0.2; // Fast response for FSK
        
        source.connect(analyser);
        isListening = true;
        
        console.log("[Acoustic RX] ML DSP Listener Active. Waiting for ultrasonic handshake...");
        runDSPPipeline(onPayloadReceived);

    } catch (err) {
        console.error("Microphone access denied or error:", err);
    }
}

export function stopUltrasonicListener() {
    isListening = false;
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
}

/**
 * Continuous loop evaluating FFT data to isolate FREQ_0 and FREQ_1
 */
function runDSPPipeline(onPayloadReceived: (payload: string) => void) {
    if (!isListening || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = AUDIO_CTX.sampleRate;

    // Calculate array indices for our target frequencies
    const binSize = sampleRate / 2 / bufferLength;
    const index0 = Math.round(FREQ_0 / binSize);
    const index1 = Math.round(FREQ_1 / binSize);

    let bitBuffer = '';
    let isReceiving = false;
    let lastDecodeTime = 0;

    const processFrame = () => {
        if (!isListening || !analyser) return;

        analyser.getFloatFrequencyData(dataArray);

        // ML/DSP Step 1: Extract magnitude at specific frequency bins
        const mag0 = dataArray[index0];
        const mag1 = dataArray[index1];

        // ML/DSP Step 2: Noise floor calculation (Dynamic Thresholding)
        // Average surrounding bins to define the noise floor
        let localNoise = 0;
        for(let i=index0-10; i<index1+10; i++) {
            if(i !== index0 && i !== index1) {
                localNoise += dataArray[i];
            }
        }
        localNoise /= 20;

        const threshold = localNoise + 30; // Must be significantly higher than noise

        // ML/DSP Step 3: Peak Detection & Decision Making
        if (mag1 > threshold && mag1 > mag0) {
            // Received a '1'
            if (!isReceiving) {
                isReceiving = true;
                bitBuffer = '';
            }
            bitBuffer += '1';
        } else if (mag0 > threshold && mag0 > mag1) {
            // Received a '0'
            if (!isReceiving) {
                isReceiving = true;
                bitBuffer = '';
            }
            bitBuffer += '0';
        } else {
            // Silence or Noise
            if (isReceiving) {
                // End of transmission burst
                isReceiving = false;
                if (bitBuffer.length > 32 && Date.now() - lastDecodeTime > 2000) {
                     const decoded = processBitstream(bitBuffer);
                     if (decoded) {
                         lastDecodeTime = Date.now();
                         onPayloadReceived(decoded);
                     }
                }
            }
        }

        // Run next frame request synced to bit duration
        setTimeout(processFrame, BIT_DURATION * 1000 / 2); // Oversample by 2x
    };

    processFrame();
}

/**
 * Decodes the raw binary bitstream back into a string, handling start/end markers.
 */
function processBitstream(bits: string): string | null {
    // 1. Find start marker (rough heuristic for oversampled data)
    const startIndex = bits.indexOf('111111');
    if (startIndex === -1) return null;

    // 2. Downsample (we oversampled by 2x)
    let consensusBits = '';
    for(let i=startIndex + 8; i<bits.length; i+=2) {
        // Take majority vote of the 2 samples
        const sample = bits.slice(i, i+2);
        if (sample === '11' || sample === '10' || sample === '01') {
            consensusBits += '1'; // biased towards 1s for safety in fading
        } else {
            consensusBits += '0';
        }
    }

    // 3. Binary to ASCII
    let output = '';
    for (let i = 0; i < consensusBits.length; i += 8) {
        const byte = consensusBits.slice(i, i + 8);
        if (byte.length === 8) {
            if (byte === '00000000') break; // End marker
            output += String.fromCharCode(parseInt(byte, 2));
        }
    }

    return output.trim() || null;
}
