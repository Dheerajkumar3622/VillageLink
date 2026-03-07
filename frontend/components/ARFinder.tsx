
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Navigation } from 'lucide-react';

interface ARFinderProps {
  onClose: () => void;
  targetName: string;
}

export const ARFinder: React.FC<ARFinderProps> = ({ onClose, targetName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permission, setPermission] = useState(false);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    // 1. Camera Feed
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setPermission(true);
        }
      })
      .catch(err => console.error("AR Error:", err));

    // 2. Device Orientation (Simulated for Desktop)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha) setHeading(e.alpha);
    };
    
    // Simulate movement for desktop demo
    const interval = setInterval(() => {
        setHeading(prev => (prev + 1) % 360);
    }, 50);

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {!permission && <div className="text-white text-center pt-20">Accessing Camera for AR...</div>}
      
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover opacity-80"
      />

      {/* AR Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center perspective-1000">
         {/* Floating Marker */}
         <div 
            className="transition-transform duration-200 ease-linear flex flex-col items-center"
            style={{ transform: `rotateY(${heading}deg) translateZ(-50px)` }}
         >
            <div className="bg-brand-600 text-white px-4 py-2 rounded-xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
                <Navigation size={20} fill="currentColor" />
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Approaching</p>
                    <p className="text-lg font-bold">{targetName}</p>
                </div>
            </div>
            <div className="w-1 h-20 bg-gradient-to-b from-brand-600 to-transparent"></div>
         </div>
      </div>

      {/* HUD Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
         <div className="bg-black/50 backdrop-blur-md p-3 rounded-xl text-white border border-white/20">
            <p className="text-xs text-emerald-400 font-mono">AR SYSTEM: ONLINE</p>
            <p className="text-[10px] opacity-70">Compass: {Math.round(heading)}° N</p>
         </div>
         <button onClick={onClose} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20">
            <X size={24} />
         </button>
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
         <p className="text-white text-sm font-bold shadow-black drop-shadow-md">Point camera towards road</p>
      </div>
    </div>
  );
};
