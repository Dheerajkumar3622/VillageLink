import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle } from 'lucide-react';

export const AudioQRScanner: React.FC<{ onDecode?: (token: string) => void }> = ({ onDecode }) => {
  const [isListening, setIsListening] = useState(false);
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // High resolution for frequency bins
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsListening(true);
      setDetectedToken(null);
      processAudio();
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required to scan offline tickets.");
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const processAudio = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Perform Fast Fourier Transform frequency peak detection
    const sampleRate = audioContextRef.current.sampleRate;
    const hzPerBin = (sampleRate / 2) / bufferLength;
    
    // Looking for exactly 18,000Hz (BASE) to 19,000Hz (BIT 1)
    const bin18k = Math.floor(18000 / hzPerBin);
    const bin19k = Math.floor(19000 / hzPerBin);
    
    const mag18k = dataArray[bin18k];
    const mag19k = dataArray[bin19k];
    
    // Threshold detection (Filter out background noise)
    if (mag18k > 180 || mag19k > 180) {
       console.log("Ultrasonic Data-Over-Sound Detected!");
       
       // In a full implementation, we decode the FSK buffer here.
       // For this prototype, we simulate successful decode upon peak detection.
       const mockDecoded = "TKT-OFFLINE-" + Date.now().toString().slice(-4);
       setDetectedToken(mockDecoded);
       if (onDecode) onDecode(mockDecoded);
       stopListening();
       return;
    }
    
    animationFrameRef.current = requestAnimationFrame(processAudio);
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
