import React, { useState, useEffect } from 'react';
import { Ticket } from '@villagelink/shared';
import { X, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { FloatingVehicle } from './FloatingVehicle';

interface FlashPassProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    userName: string;
}

const colorCycles = [
    'bg-emerald-500 text-white',
    'bg-blue-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-500 text-white',
    'bg-amber-500 text-slate-900',
    'bg-indigo-600 text-white'
];

export const FlashPass: React.FC<FlashPassProps> = ({ isOpen, onClose, ticket, userName }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isOpen]);

    if (!isOpen || !ticket) return null;

    // Time-based rotating logic
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    // Color changes every hour to prevent screenshots
    const currentTheme = colorCycles[hour % colorCycles.length];
    
    // Short code updates every minute for OTP-style security
    const generateShortCode = (id: string, min: number) => {
        let hash = 0;
        const str = id + min.toString();
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
        }
        const num = Math.abs(hash) % 100;
        return num.toString().padStart(2, '0');
    };
    
    const shortCode = generateShortCode(ticket.id, minute);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`relative w-full h-full md:w-[400px] md:h-[800px] max-h-screen overflow-hidden ${currentTheme} transition-colors duration-1000 flex flex-col md:rounded-3xl shadow-2xl`}>
                
                {/* Close Button CAUTION: ensure visibility on all colors */}
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 z-50 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors"
                >
                    <X size={24} color="white" />
                </button>

                {/* Moving Watermark Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden flex flex-col justify-center items-center">
                    <div className="animate-[spin_20s_linear_infinite] w-[150%] h-[150%] border-[20px] border-dashed rounded-full" />
                </div>
                
                {/* Scrolling Name Watermark */}
                <div className="absolute inset-x-0 top-1/3 opacity-5 pointer-events-none whitespace-nowrap overflow-hidden">
                    <div className="animate-[scroll_10s_linear_infinite] text-8xl font-black uppercase tracking-tighter mix-blend-overlay">
                        {userName} • FLASH PASS • {userName} • FLASH PASS •
                    </div>
                </div>

                <div className="relative z-10 flex flex-col h-full p-8 pt-16">
                    
                    {/* Header - Route */}
                    <div className="text-center mb-6">
                        <div className="inline-block p-1 px-4 rounded-full bg-black/20 backdrop-blur-md text-xs font-bold uppercase tracking-widest mb-4">
                            Active Journey
                        </div>
                        <h2 className="text-3xl font-black leading-tight flex items-center justify-center gap-2">
                            <span>{ticket.from}</span>
                            <span className="opacity-50">→</span>
                            <span>{ticket.to}</span>
                        </h2>
                        <p className="mt-2 text-sm opacity-80 uppercase tracking-widest font-bold font-mono">
                            ID: {ticket.id.slice(-6).toUpperCase()}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Dynamic Avatar/Animation */}
                        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/20 rounded-full animate-ping opacity-20 duration-1000"></div>
                            <div className="absolute inset-0 border-4 border-dotted rounded-full animate-[spin_10s_linear_infinite] opacity-50"></div>
                            {/* Simple dynamic avatar using FloatingVehicle wrapped in a circle wrapper to look animated */}
                            <div className="bg-black/10 w-full h-full rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden border-2 border-white/20">
                                <FloatingVehicle size="120px" className="animate-pulse" />
                            </div>
                        </div>

                        {/* Passenger Count (The most important visual check for driver) */}
                        <div className="bg-white text-slate-900 rounded-[3rem] px-10 py-6 text-center transform hover:scale-105 transition-transform shadow-2xl">
                            <div className="text-6xl font-black tracking-tighter flex items-center justify-center gap-2">
                                {ticket.passengerCount}
                                <UserIcon size={40} className="text-slate-400" />
                            </div>
                            <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
                                Passengers
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: OTP & Clock */}
                    <div className="mt-auto pt-6 space-y-4">
                        
                        {/* 2-Digit Audio/Voice Code Check */}
                        <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 text-center shadow-inner">
                            <div className="text-xs uppercase font-bold tracking-widest opacity-80 mb-2">Driver Verification Code</div>
                            <div className="text-7xl font-black font-mono tracking-widest drop-shadow-lg">
                                {shortCode}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest opacity-60 mt-2">
                                Changes every 60s
                            </div>
                        </div>

                        {/* Live Clock with Seconds */}
                        <div className="flex items-center justify-center gap-2 text-lg font-mono font-bold bg-black/10 py-3 rounded-full backdrop-blur-sm">
                            <Clock size={20} className="opacity-70 animate-pulse" />
                            <span>{currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scroll {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}} />
        </div>
    );
};
