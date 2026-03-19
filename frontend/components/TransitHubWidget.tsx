import React, { useState, useEffect } from 'react';
import { Bus, Clock, MapPin, Zap, ChevronRight, Navigation, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface TransitHubWidgetProps {
    fromLocationName?: string;
    lat?: number;
    lng?: number;
}

export const TransitHubWidget: React.FC<TransitHubWidgetProps> = ({ fromLocationName, lat: propLat, lng: propLng }) => {
    const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
    const [dailySchedules, setDailySchedules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [coords, setCoords] = useState<{lat?: number; lng?: number}>({ lat: propLat, lng: propLng });

    useEffect(() => {
        if (propLat && propLng) {
            setCoords({ lat: propLat, lng: propLng });
        } else {
            // Try to resolve location automatically if not provided via props
            if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => {
                        console.warn("TransitHub: GPS fallback failed", err);
                        setIsLoading(false); // Stop loading if no location available
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            } else {
                setIsLoading(false);
            }
        }
    }, [propLat, propLng]);

    useEffect(() => {
        const { lat, lng } = coords;
        if (!lat || !lng) {
            return;
        }

        const fetchTransitData = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('villagelink_token') : null;
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/api/dashboard/transit-hub?lat=${lat}&lng=${lng}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setLiveVehicles(data.live || []);
                    setDailySchedules(data.scheduled || []);
                }
            } catch (err) {
                console.error("Failed to fetch transit hub data", err);
            } finally {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        fetchTransitData();
        const interval = setInterval(fetchTransitData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [coords.lat, coords.lng]);

    if (!coords.lat || !coords.lng) {
         return (
             <div className="mx-4 mt-2 mb-6 p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/30 dark:border-slate-800/50 flex flex-col items-center justify-center gap-2 shadow-sm relative z-10 w-auto animate-fade-in-up">
                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-1">
                    <MapPin size={20} className="text-brand-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">Smart Transit Hub</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[240px]">
                    Enter a pickup point or enable GPS to view live incoming transport.
                </p>
             </div>
         );
    }

    if (isLoading) {
        return (
            <div className="mx-4 mt-2 mb-6 p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/30 dark:border-slate-800/50 flex flex-col items-center justify-center gap-3 shadow-sm animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
        );
    }

    const isEmpty = liveVehicles.length === 0 && dailySchedules.length === 0;

    return (
        <div className="mx-4 mt-2 mb-6 animate-fade-in-up relative z-10">
            {/* Main Widget Container - Glassmorphism */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(20,184,166,0.15)] relative group">
                
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand-500/20 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -ml-10 -mb-10"></div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                                <Zap size={16} className="text-brand-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Smart Transit Hub</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">
                                    Near {fromLocationName || 'Your Location'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] font-bold tracking-wider uppercase">Live</span>
                        </div>
                    </div>
                </div>

                {!isEmpty ? (
                    <>
                        {/* Section A: Live Radar */}
                        {liveVehicles.length > 0 && (
                            <div className="p-4">
                                <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Navigation size={12} className="text-brand-400" />
                                    Approaching Now
                                </h4>
                                
                                <div className="space-y-2.5">
                                    {liveVehicles.map((vehicle) => (
                                        <div key={vehicle.id} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl hover:border-brand-200 dark:hover:border-brand-500/30 transition-colors shadow-sm cursor-pointer group/item">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                                    <Bus size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-bold text-slate-800 dark:text-white group-hover/item:text-brand-600 dark:group-hover/item:text-brand-400 transition-colors">{vehicle.destination}</h5>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                            {vehicle.seats > 0 ? `${vehicle.seats} Seats left` : 'Full'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">{vehicle.distance} away</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-black text-slate-800 dark:text-white">{vehicle.eta}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">ETA</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section B: Daily Timetable */}
                        {dailySchedules.length > 0 && (
                            <div className="p-4 pt-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/60 relative">
                                <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Clock size={12} className="text-blue-400" />
                                    Daily Scheduled Passes
                                </h4>
                                
                                <div className="space-y-2">
                                    {dailySchedules.map((schedule) => (
                                        <div key={schedule.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer group/timer">
                                            <div className="w-12 text-center shrink-0">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{schedule.time.split(' ')[0]}</span>
                                                <span className="text-[9px] font-bold text-slate-400 ml-0.5">{schedule.time.split(' ')[1] || ''}</span>
                                            </div>
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                            <div className="flex-1 flex items-center justify-between">
                                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{vehicleNameMapping(schedule.vehicle)}</p>
                                                {schedule.type === 'AI_PREDICTED' && (
                                                    <div className="flex items-center gap-1 opacity-60" title={`AI Predicted (${schedule.confidence}% match)`}>
                                                        <Sparkles size={10} className="text-purple-500 fill-purple-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover/timer:opacity-100 transition-opacity -ml-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-3">
                            <MapPin size={24} className="text-slate-400" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Scanning your area</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                            No live vehicles or scheduled routes found near your current location yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper inside the same file (optional) to format text
function vehicleNameMapping(name: string) {
    return name;
}
