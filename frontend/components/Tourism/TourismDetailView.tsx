import React, { useState } from 'react';
import { TourismSpot, TourismPackage } from '../../utils/tourism/tourismData';
import { ArrowLeft, Clock, MapPin, IndianRupee, Map, Car, Share2, Navigation2 } from 'lucide-react';
import { Button } from '../Button';

interface TourismDetailViewProps {
    spot: TourismSpot & { distance: number };
    onClose: () => void;
    onBookPackage: (pkg: TourismPackage, spot: TourismSpot) => void;
    userLocation?: { lat: number; lng: number };
}

export const TourismDetailView: React.FC<TourismDetailViewProps> = ({ spot, onClose, onBookPackage, userLocation }) => {
    const [confirmBooking, setConfirmBooking] = useState<TourismPackage | null>(null);

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-y-auto animate-fade-in pb-24">
            
            {/* Hero Image Section */}
            <div className="relative h-[45vh] w-full">
                <img 
                    src={spot.images?.[0] || '/images/universal_tourism_fallback.png'} 
                    alt={spot.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('universal_tourism_fallback.png')) {
                            target.src = '/images/universal_tourism_fallback.png';
                        }
                    }}
                />
                
                {/* Gradient Top -> Down for back button */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent"></div>
                
                {/* Gradient Bottom -> Up for text */}
                <div className="absolute -bottom-1 left-0 right-0 h-40 bg-gradient-to-t from-slate-900 to-transparent"></div>

                {/* Back Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 left-4 z-[9999] w-10 h-10 flex flex-col items-center justify-center rounded-[14px] bg-black/40 backdrop-blur-md border border-white/20 shadow-lg hover:bg-black/60 hover:scale-105 active:scale-95 transition-all"
                >
                    <ArrowLeft size={24} className="drop-shadow-md" style={{ color: '#ffffff' }} />
                </button>

                {/* Content over image */}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                    <span className="inline-block px-3 py-1 bg-brand-500/80 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-brand-400/50 shadow-lg" style={{ color: '#ffffff' }}>
                        {spot.type}
                    </span>
                    <h1 className="text-4xl font-black leading-none mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ color: '#ffffff' }}>{spot.name}</h1>
                    <div className="flex items-center gap-4 text-sm font-bold drop-shadow-md" style={{ color: '#e0e7ff' }}>
                        <span className="flex items-center gap-1.5"><MapPin size={16} className="text-brand-400" /> {spot.distance.toFixed(1)} km from you</span>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-6 py-6 space-y-8 relative z-20 -mt-8 rounded-t-[32px] bg-slate-900/80 backdrop-blur-xl border-t border-white/20 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                {/* Layout Note: Navigate and Packages buttons moved inside the Package cards */}

                {/* Special Packages Section */}
                <div id="packages-section" className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black flex-1" style={{ color: '#ffffff' }}>Available Packages</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md" style={{ color: '#FFCE1B', backgroundColor: 'rgba(255, 206, 27, 0.1)', border: '1px solid rgba(255, 206, 27, 0.2)' }}>{spot.packages.length} Options</span>
                    </div>

                    <div className="space-y-4">
                        {spot.packages.map((pkg) => (
                            <div 
                                key={pkg.id} 
                                className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-5 rounded-[32px] shadow-xl hover:bg-slate-800/80 transition-all group relative overflow-hidden"
                            >
                                {/* Glassmorphism Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="pr-4 border-r w-2/3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                                        <h4 className="text-lg font-black mb-1 leading-tight" style={{ color: '#ffffff' }}>{pkg.title}</h4>
                                        <div className="space-y-1 mt-2">
                                            {pkg.providerName && (
                                                <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: '#a5b4fc' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                    {pkg.providerName}
                                                </p>
                                            )}
                                            {pkg.vehicleType && (
                                                <p className="text-[11px] font-medium flex items-center gap-1.5 mt-1" style={{ color: '#d1d5db' }}>
                                                    <Car size={10} className="text-slate-400" />
                                                    {pkg.vehicleType} {pkg.capacity ? `(${pkg.capacity} Seats)` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right pl-4 w-1/3">
                                        <span className="text-[9px] font-black block uppercase tracking-widest mb-1" style={{ color: '#a5b4fc' }}>Total Cost</span>
                                        <span className="text-2xl font-black drop-shadow-md" style={{ color: '#FFCE1B' }}>₹{pkg.price}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                                    {pkg.includes.map((item, idx) => (
                                        <span key={idx} className="text-[10px] bg-slate-700/50 px-2.5 py-1 rounded-md font-bold uppercase flex items-center gap-1.5 shadow-sm" style={{ color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ backgroundColor: '#34d399' }}></div> {item}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2.5 mt-3 relative z-10">
                                    <a 
                                        href={`https://maps.google.com/?q=${spot.location.lat},${spot.location.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-slate-700 rounded-2xl border border-slate-600 hover:bg-slate-600 transition-all shadow-lg active:scale-95"
                                        style={{ color: '#ffffff' }}
                                    >
                                        <Navigation2 size={20} />
                                    </a>

                                    <button 
                                        className="btn-cta flex-1 h-12 text-[13px] font-black uppercase tracking-wider leading-none rounded-2xl shadow-[0_4px_15px_rgba(var(--brand-500),0.4)] hover:scale-[1.02] active:scale-95 transition-all"
                                        onClick={() => setConfirmBooking(pkg)}
                                        style={{ color: '#ffffff' }}
                                    >
                                        Book Now
                                    </button>
                                    
                                    <button 
                                        className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-slate-700 rounded-2xl border border-slate-600 hover:bg-slate-600 transition-all shadow-lg active:scale-95"
                                        style={{ color: '#ffffff' }}
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({ title: pkg.title, text: pkg.description, url: window.location.href });
                                            }
                                        }}
                                    >
                                        <Share2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-white/10" />

                {/* Description - Moved to bottom */}
                <div className="space-y-3 pb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>About This Place</h3>
                    <p className="leading-relaxed text-sm font-medium" style={{ color: '#d1d5db' }}>
                        {spot.description}
                    </p>
                </div>

            </div>

            {/* Confirmation Modal */}
            {confirmBooking && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative">
                        {/* Decorative Top Banner */}
                        <div className="h-2 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-emerald-400"></div>
                        
                        <div className="p-6">
                            <h2 className="text-xl font-black mb-2" style={{ color: '#ffffff' }}>Confirm Booking?</h2>
                            <p className="text-sm font-medium mb-6 leading-relaxed" style={{ color: '#d1d5db' }}>
                                You are about to book the <span className="font-bold" style={{ color: '#60a5fa' }}>{confirmBooking.title}</span> package for <span className="font-bold" style={{ color: '#ffffff' }}>{spot.name}</span>.<br/><br/>
                                Total amount: <span className="font-black text-lg" style={{ color: '#34d399' }}>₹{confirmBooking.price}</span>
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 transition-colors"
                                    style={{ color: '#d1d5db' }}
                                    onClick={() => setConfirmBooking(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="flex-1 py-3.5 rounded-xl font-black text-sm text-white shadow-[0_4px_15px_rgba(var(--brand-500),0.4)] hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ backgroundColor: '#FFCE1B', color: '#000000' }}
                                    onClick={() => {
                                        onBookPackage(confirmBooking, spot);
                                        setConfirmBooking(null);
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
