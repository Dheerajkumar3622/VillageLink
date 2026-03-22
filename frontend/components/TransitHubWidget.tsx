import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Navigation, Sparkles, ChevronRight, Zap, Target, ArrowLeft, ArrowRight, CheckCircle2, QrCode, Coins, WifiOff } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Ticket } from '@villagelink/shared';
import { isOnline, queueAction } from '../services/offlineService';

interface TransitHubWidgetProps {
    fromLocationName?: string;
    lat?: number;
    lng?: number;
    onTicketBooked?: (ticket: Ticket) => void;
}

export const TransitHubWidget: React.FC<TransitHubWidgetProps> = ({ fromLocationName, lat: propLat, lng: propLatLng, onTicketBooked }) => {
    const token = getAuthToken();
    const [radarStatus, setRadarStatus] = useState<'IDLE' | 'SCANNING' | 'ACTIVE'>('SCANNING');
    const [corridors, setCorridors] = useState<any[]>([]);
    
    // UI State
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
    const [bookingState, setBookingState] = useState<'IDLE' | 'CONFIRMING' | 'BOOKING' | 'FLIPPING' | 'DONE'>('IDLE');
    const [bookedTicket, setBookedTicket] = useState<any | null>(null);
    const [coords, setCoords] = useState<{lat?: number; lng?: number}>({ lat: propLat || 24.9442, lng: propLatLng || 83.9822 });
    const [useGramCoin, setUseGramCoin] = useState(false);

    const fetchRadar = async () => {
        try {
            if (!coords.lat || !coords.lng) return;
            setRadarStatus('SCANNING');
            const res = await fetch(`${API_BASE_URL}/api/dashboard/transit-hub/precision-radar?lat=${coords.lat}&lng=${coords.lng}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCorridors(data.approachingCorridors || []);
                setRadarStatus('ACTIVE');
            }
        } catch (e) {
            console.error(e);
            setRadarStatus('IDLE');
        }
    };

    useEffect(() => {
        if (!propLat || !propLatLng) {
            navigator.geolocation?.getCurrentPosition(
                (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { console.log('Geolocation unavailable, using default coords'); }
            );
        }
    }, [propLat, propLatLng]);

    useEffect(() => {
        if (coords.lat && coords.lng) {
            fetchRadar();
            const interval = setInterval(fetchRadar, 15000); // 15s refresh
            return () => clearInterval(interval);
        }
    }, [coords.lat, coords.lng]);

    // Slider UI Logic
    const [sliderValue, setSliderValue] = useState(0);

    const handleSlideEnd = async () => {
        if (sliderValue > 95) {
            await handleHyperBook();
        } else {
            setSliderValue(0);
        }
    };

    const handleHyperBook = async () => {
        if (!selectedVehicle || !selectedDestination) return;
        setBookingState('BOOKING');
        const fare = selectedVehicle.dynamicFareMap[selectedDestination] || 15;
        const paymentMethod = useGramCoin ? 'GRAMCOIN' : 'ONLINE';

        // OFFLINE QUEUEING LOGIC
        if (!isOnline()) {
            const provisionalTicketId = `TKT-OFF-${Date.now().toString(36)}`;
            const provisionalTicket = {
                id: provisionalTicketId,
                from: fromLocationName || 'Current Location',
                to: selectedDestination,
                routeId: selectedVehicle.routeId,
                passengerCount: 1,
                totalPrice: fare,
                paymentMethod,
                status: 'PAID',
                timestamp: Date.now(),
                isOfflineSync: true,
                qrPayload: btoa(JSON.stringify({ t: provisionalTicketId, off: 1 }))
            };
            
            queueAction({
                type: 'BOOK_TICKET',
                payload: provisionalTicket
            });
            
            triggerFlippingAndSuccess(provisionalTicket, true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/dashboard/transit-hub/hyper-book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    from: fromLocationName || 'Current Location',
                    to: selectedDestination,
                    routeId: selectedVehicle.routeId,
                    passengerCount: 1,
                    paymentMethod,
                    fare
                })
            });
            const data = await res.json();
            if (data.success) {
                triggerFlippingAndSuccess(data.ticket, false);
            }
        } catch (e) {
            console.error(e);
            setBookingState('IDLE');
            setSliderValue(0);
        }
    };

    const triggerFlippingAndSuccess = (ticketPayload: any, isOffline: boolean) => {
        setBookedTicket(ticketPayload);
        setBookingState('FLIPPING');
        setTimeout(() => {
            setBookingState('DONE');
            if (onTicketBooked) {
                const userIdx = selectedVehicle.userStopIndex;
                const destIdx = selectedVehicle.stopsInBetween.indexOf(selectedDestination);
                let subPath = [];
                if (userIdx !== -1 && destIdx !== -1 && destIdx > userIdx) {
                     subPath = selectedVehicle.stopsInBetween.slice(userIdx, destIdx + 1);
                } else {
                     subPath = selectedVehicle.stopsInBetween;
                }
                ticketPayload.routePath = subPath;
                if(isOffline) ticketPayload.isProvisional = true;
                onTicketBooked(ticketPayload);
            }
        }, 800); // 3D flip duration
    };

    if (radarStatus === 'IDLE' || corridors.length === 0) {
         return (
             <div className="mx-4 mt-2 mb-6 p-6 bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/10 flex flex-col items-center shadow-2xl relative overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-500/10"></div>
                <Zap size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-300">Scanning Radar...</p>
             </div>
         );
    }

    // 3D Flip Container CSS Class depends on bookingState
    const isFlipping = bookingState === 'FLIPPING' || bookingState === 'DONE';

    return (
        <div className="mx-4 mt-2 mb-6 relative z-10 perspective-[1000px]">
             {/* The Flippable Card */}
             <div className={`relative transition-transform duration-700 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
                 
                 {/* FRONT FACE (Radar & Booking) */}
                 <div className={`backface-hidden ${isFlipping ? 'pointer-events-none' : ''}`}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
                        
                        {/* Decorative Radar Sweep Background - Only show in Radar Mode */}
                        {!selectedVehicle && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl opacity-10 dark:opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(20,184,166,0.3), transparent 60%)' }}>
                                <div className="absolute top-0 left-1/2 w-[200%] h-[200%] border border-brand-500/20 rounded-full -translate-x-1/2 -translate-y-[80%] animate-[spin_10s_linear_infinite]"></div>
                                <div className="absolute top-0 left-1/2 w-[150%] h-[150%] border-t border-brand-400/30 rounded-full -translate-x-1/2 -translate-y-[80%] animate-[spin_8s_linear_infinite]"></div>
                            </div>
                        )}

                        {/* HEAD */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 relative z-10">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-3 items-center">
                                    {selectedVehicle ? (
                                        <button onClick={() => { setSelectedVehicle(null); setSelectedDestination(null); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer">
                                            <ArrowLeft size={16} className="text-slate-700 dark:text-slate-300" />
                                        </button>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                                            <Target size={16} className="text-brand-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-wide">
                                            {selectedVehicle ? 'SELECT DESTINATION' : 'SMART RADAR'}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 dark:text-brand-300/70 font-bold uppercase">
                                            {selectedVehicle ? `Current Stop: ${selectedVehicle.stopsInBetween[selectedVehicle.userStopIndex] || 'Unknown'}` : (fromLocationName || 'Current Stop')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="relative z-10">
                            {!selectedVehicle ? (
                                // View 1: Radar Corridors
                                <div className="p-2 space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide pb-4 overscroll-contain touch-pan-y">
                                    {corridors.map(corridor => (
                                        <div key={corridor.directionName} className="space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-3 flex items-center gap-2">
                                                <CompassArrow direction={corridor.directionName.includes('East') ? 'right' : 'left'} />
                                                {corridor.directionName}
                                            </h4>
                                            {corridor.vehicles.map((v: any) => (
                                                <div key={v.id} onClick={() => setSelectedVehicle(v)} className="bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700/80 transition-all border border-white/40 dark:border-slate-600/50 p-3 rounded-2xl mx-2 cursor-pointer group shadow-sm hover:shadow-lg relative overflow-hidden backdrop-blur-md">
                                                    
                                                    {v.aiPrediction === 'HIGH_CROWD_EXPECTED' && (
                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all"></div>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-inner border border-white/20 dark:border-slate-600">
                                                            <Bus size={18} className="text-slate-700 dark:text-slate-300" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h5 className="font-bold text-sm text-slate-800 dark:text-white">{v.name}</h5>
                                                                <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-500/30">
                                                                    {Math.round(v.etaSeconds/60)} MIN
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{v.liveSeats.available} Seats left</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{v.distanceMeters}m away</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // View 2: Route Node Cinematic Selector
                                <div className="p-4 relative">
                                    <div className="absolute top-0 bottom-0 left-8 w-1 bg-gradient-to-b from-brand-500 via-blue-500 to-slate-200 dark:to-slate-800 rounded-full z-0 opacity-100"></div>

                                    <h4 className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2 hidden">
                                        Select Destination <Sparkles size={12} className="text-amber-400" />
                                    </h4>

                                    <div className="space-y-4 relative z-10 max-h-[300px] overflow-y-auto scrollbar-hide py-2 overscroll-contain touch-pan-y">
                                        {selectedVehicle.stopsInBetween.map((stop: string, idx: number) => {
                                            const isUserHere = idx === selectedVehicle.userStopIndex;
                                            const isPast = idx < selectedVehicle.userStopIndex;
                                            const isDest = stop === selectedDestination;
                                            const isDestReady = !isPast && !isUserHere;

                                            return (
                                                <div 
                                                    key={stop} 
                                                    onClick={() => { if(isDestReady) setSelectedDestination(stop); }}
                                                    className={`flex items-center gap-4 transition-all duration-300 ${isPast ? 'opacity-40 grayscale' : 'cursor-pointer'} ${isDest ? 'scale-105' : ''}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-[3px] shadow-md flex items-center justify-center bg-white dark:bg-slate-900 z-10 
                                                        ${isUserHere ? 'border-brand-500 bg-brand-500/20' : isDest ? 'border-blue-500 scale-125 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'border-slate-300 dark:border-slate-600'}
                                                    `}>
                                                        {isUserHere && <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>}
                                                        {isDest && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                    </div>
                                                    
                                                    <div className={`flex-1 p-2.5 rounded-xl border transition-all ${isDest ? 'bg-blue-500/10 border-blue-500/40' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                                                        <div className="flex justify-between items-center">
                                                            <h5 className={`font-bold text-sm ${isDest ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'} ${isUserHere ? 'text-brand-500' : ''}`}>
                                                                {stop} {isUserHere && '(You)'}
                                                            </h5>
                                                            {isDestReady && !isDest && (
                                                                <span className="text-[10px] font-bold text-slate-400">₹{selectedVehicle.dynamicFareMap[stop] || 15}</span>
                                                            )}
                                                            {isDest && (
                                                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20 px-2 py-0.5 rounded shadow-sm">
                                                                    ₹{selectedVehicle.dynamicFareMap[stop] || 15}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SLIDE TO BOOK DRAWER (Shows when destination selected) */}
                        <div className={`transition-all duration-500 ease-out overflow-hidden bg-slate-100/80 dark:bg-slate-800/90 backdrop-blur-xl border-t border-white/20 dark:border-slate-700/50 ${selectedDestination ? 'opacity-100 mt-0 h-auto p-4 scale-y-100 origin-bottom' : 'opacity-0 h-0 p-0 scale-y-0 origin-bottom'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">Total Fare</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-black text-slate-800 dark:text-white">₹{selectedVehicle?.dynamicFareMap[selectedDestination || ''] || 15}</p>
                                        <button 
                                            onClick={() => setUseGramCoin(!useGramCoin)}
                                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${useGramCoin ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500'}`}
                                        >
                                            <Coins size={12} />
                                            {useGramCoin ? 'GRAMCOIN ON' : 'USE GRAMCOIN'}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">ETA</p>
                                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{Math.round((selectedVehicle?.etaSeconds || 0)/60)} min</p>
                                </div>
                            </div>
                            
                            {!isOnline() && (
                                <div className="mb-3 flex items-center gap-2 text-[10px] text-amber-500 font-bold bg-amber-500/10 p-2 rounded-lg">
                                    <WifiOff size={12} /> Offline Mode - Booking will be queued
                                </div>
                            )}

                            {/* Slider Component */}
                            <div className="relative h-12 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner flex items-center border border-white/20 dark:border-slate-700 select-none">
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-blue-500 transition-all opacity-20" style={{ width: `${sliderValue}%` }}></div>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 tracking-wider mix-blend-difference pointer-events-none">
                                    {bookingState === 'BOOKING' ? 'BOOKING...' : 'SLIDE TO BOOK'}
                                </span>
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={sliderValue} 
                                    onChange={(e) => setSliderValue(Number(e.target.value))}
                                    onMouseUp={handleSlideEnd}
                                    onTouchEnd={handleSlideEnd}
                                    disabled={bookingState !== 'IDLE'}
                                    className="w-full h-full opacity-0 cursor-pointer absolute z-20"
                                />
                                <div 
                                    className="h-10 w-10 bg-white rounded-full shadow-lg absolute flex items-center justify-center transition-all pointer-events-none z-10" 
                                    style={{ left: `calc(${sliderValue}% - ${(sliderValue/100)*40}px)`, marginLeft: '4px' }}
                                >
                                    {bookingState === 'BOOKING' ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div> : <ArrowRight size={16} className="text-slate-800" />}
                                </div>
                            </div>
                        </div>

                     </div>
                 </div>

                 {/* BACK FACE (Ticket Activated Message) */}
                 <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-brand-500 to-blue-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 text-white border border-white/20">
                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 border border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                         <CheckCircle2 size={32} className="text-white animate-[bounce_1s_ease-out]" />
                     </div>
                     <h3 className="text-2xl font-black mb-1">Booked instantly!</h3>
                     <p className="text-sm font-medium text-white/80 text-center mb-6">Your Zero-Latency Ticket is active.</p>
                     
                     <div className="w-full bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/20 flex items-center gap-3">
                         <QrCode size={24} className="opacity-80" />
                         <div className="flex-1">
                             <p className="text-[10px] uppercase font-bold text-white/60">Ticket ID</p>
                             <p className="text-sm font-mono font-bold tracking-wider">{bookedTicket?.id ? bookedTicket.id.split('-').slice(-2).join('-') : '...'}</p>
                         </div>
                     </div>
                 </div>

             </div>

            {/* Injected CSS for 3D Transforms */}
            <style dangerouslySetInnerHTML={{__html: `
                .perspective-\\[1000px\\] { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

// SVG Compass Icon helper
const CompassArrow = ({ direction }: { direction: 'left' | 'right' }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === 'right' ? 'rotate(45deg)' : 'rotate(-135deg)' }}>
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
        <path d="M12 2v20" />
        <path d="M2 12h20" />
    </svg>
);
