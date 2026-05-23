import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle } from 'lucide-react';
import { startUltrasonicListener, stopUltrasonicListener } from '../services/UltrasonicVerificationService';

export const AudioQRScanner: React.FC<{ onDecode?: (token: string) => void }> = ({ onDecode }) => {
  const [isListening, setIsListening] = useState(false);
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  
  const startListening = async () => {
    try {
      setIsListening(true);
      setDetectedToken(null);
      await startUltrasonicListener((payload) => {
        console.log("Ultrasonic wave decoded payload successfully:", payload);
        setDetectedToken(payload);
        if (onDecode) onDecode(payload);
        stopListening();
      });
    } catch (err) {
      console.error("Ultrasonic verification error:", err);
      setIsListening(false);
      alert("Microphone access is required to verify tickets.");
    }
  };

  const stopListening = () => {
    setIsListening(false);
    stopUltrasonicListener();
  };

  useEffect(() => {
    return () => stopListening(); // Cleanup on unmount
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col items-center justify-center max-w-sm mx-auto transform transition-all hover:scale-105 duration-300">
      <div className={`p-4 rounded-full mb-4 shadow-inner transition-colors duration-500
        ${detectedToken ? 'bg-green-100 text-green-600' : isListening ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}
      >
        {detectedToken ? <CheckCircle size={36} /> : <Mic size={36} />}
      </div>
      
      <h3 className="font-bold text-xl text-gray-800 mb-2">
        {detectedToken ? 'Ticket Verified!' : 'Audio Scanner'}
      </h3>
      
      <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
        {detectedToken 
          ? `Decoded Token: ${detectedToken}` 
          : 'Listens for silent offline tickets transmitted via near-ultrasound waves.'}
      </p>
      
      {!detectedToken && (
        <button 
          onClick={isListening ? stopListening : startListening}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-md
            ${isListening 
              ? 'bg-red-500 hover:bg-red-400 active:scale-95' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95'}`}
        >
          {isListening ? 'Stop Scanning' : 'Start Scanning'}
        </button>
      )}

      {detectedToken && (
        <button onClick={() => setDetectedToken(null)} className="text-sm text-blue-600 font-medium hover:underline mt-2">
          Scan Another
        </button>
      )}
    </div>
  );
};
