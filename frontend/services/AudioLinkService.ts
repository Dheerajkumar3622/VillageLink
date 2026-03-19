// AudioLinkService.ts
export class AudioLinkService {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    // Cross-browser support for AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioContext = new AudioContextClass();
    }
  }

  /**
   * Generates a near-ultrasonic Data-over-Sound token using Frequency Shift Keying (FSK).
   * Range: 18kHz - 19kHz (Inaudible to most humans, audible to phone microphones)
   */
  async generateUltrasonicToken(token: string): Promise<void> {
    if (!this.audioContext) {
      console.error("Audio Web API not globally supported on this device.");
      return;
    }

    // Must resume context if it was suspended (Browser Autoplay Policy Requirement)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // FSK Constants
    const BASE_FREQ = 18000; // Represents binary '0'
    const BIT_1_FREQ = 19000; // Represents binary '1'
    const BAUDRATE = 50; // Milliseconds per bit duration
    
    // Convert string token to binary string (e.g., '101010')
    const binaryStr = token.split('').map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain(); // Controls volume over time
    
    osc.type = 'sine';
    
    // Avoid audio "popping" artifacts by ramping gain up
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.02);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    let startTime = this.audioContext.currentTime;
    
    // Frequency sequencing
    for (let i = 0; i < binaryStr.length; i++) {
      const bit = binaryStr[i];
      const freq = bit === '1' ? BIT_1_FREQ : BASE_FREQ;
      osc.frequency.setValueAtTime(freq, startTime + (i * BAUDRATE) / 1000);
    }
    
    const durationSeconds = (binaryStr.length * BAUDRATE) / 1000;
    const endTime = startTime + durationSeconds;
    
    osc.start(startTime);
    // Ramp volume down slightly before stop to prevent 'pop'
    gainNode.gain.linearRampToValueAtTime(0, endTime - 0.02);
    osc.stop(endTime);

    return new Promise((resolve) => {
      osc.onended = () => {
        resolve();
      };
    });
  }
}

export const audioLinkService = new AudioLinkService();
