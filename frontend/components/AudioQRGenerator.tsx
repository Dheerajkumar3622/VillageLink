import React, { useState } from 'react';
import { audioLinkService } from '../services/AudioLinkService';
import { ShieldCheck, Volume2 } from 'lucide-react';
import VolumeControl from '../plugins/VolumeControlPlugin';

interface AudioQRGeneratorProps {
  orderId?: string;
}

export const AudioQRGenerator: React.FC<AudioQRGeneratorProps> = ({ orderId = "TEST-123" }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Create a short-lived secure token representation
      const secureToken = `TKT-${orderId}-${Date.now().toString().slice(-4)}`;
      console.log(`Transmitting Offline Token: ${secureToken}`);
      
      // Temporarily maximize volume silently
      try { await VolumeControl.maximize(); } catch (e) { console.log('Volume override skipped', e); }
      
      await audioLinkService.generateUltrasonicToken(secureToken);
      
      // Restore original volume
      try { await VolumeControl.restore(); } catch (e) { console.log('Volume restore skipped', e); }
    } catch (error) {
      console.error("Audio QR failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col items-center justify-center transform transition-all hover:-translate-y-1 duration-300 w-full max-w-sm mx-auto">
      <div className="bg-gradient-to-br from-green-100 to-emerald-50 p-4 rounded-full mb-4 text-emerald-600 shadow-inner">
        <Volume2 size={36} className="animate-pulse" />
      </div>
      
      <h3 className="font-bold text-xl text-gray-800 mb-2">Offline Verification</h3>
      <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
        Hold your device near the scanner. It uses silent near-ultrasound waves to securely transmit the ticket.
      </p>
      
      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`w-full py-4 rounded-xl flex items-center justify-center font-bold text-white transition-all shadow-lg
          ${isGenerating 
            ? 'bg-gray-400 cursor-not-allowed transform-none' 
            : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95'
          }`}
      >
        <ShieldCheck size={22} className="mr-2" />
        {isGenerating ? 'Transmitting audio data...' : 'Send Offline Ticket'}
      </button>
    </div>
  );
};
