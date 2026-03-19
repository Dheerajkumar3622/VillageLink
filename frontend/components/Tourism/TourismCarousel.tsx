import React, { useState, useEffect } from 'react';
import { getNearbyTourismSpots, TourismSpot } from '../../utils/tourism/tourismData';
import { MapPin, ArrowRight, Compass } from 'lucide-react';

interface TourismCarouselProps {
    userLocation?: { lat: number; lng: number };
    onSelectSpot: (spot: TourismSpot & { distance: number }) => void;
}

const DEFAULT_SASARAM_LOC = { lat: 24.9495, lng: 84.0326 };

export const TourismCarousel: React.FC<TourismCarouselProps> = ({ userLocation, onSelectSpot }) => {
    const [spots, setSpots] = useState<(TourismSpot & { distance: number })[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Use user location if available, otherwise default to Sasaram for testing
        const loc = userLocation || DEFAULT_SASARAM_LOC;
        const nearby = getNearbyTourismSpots(loc.lat, loc.lng, 30).slice(0, 10);
        setSpots(nearby);
    }, [userLocation]);

    useEffect(() => {
        if (spots.length <= 1) return;

        // Auto-slide every 10 seconds
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % spots.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [spots.length]);

    if (spots.length === 0) return null;

    return (
        <div className="mt-8 mb-6 animate-fade-in">
            <div className="flex justify-between items-center px-4 mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <div className="bg-luxe-gold p-1.5 rounded-lg text-black shadow-lg shadow-luxe-gold/20">
                        <Compass size={18} />
                    </div>
                    Adventurous Packages
                </h3>
                <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-full border border-brand-200 dark:border-brand-800">Near You</span>
            </div>

            {/* Carousel Container */}
            <div className="relative w-full overflow-hidden px-4 pb-4">
                <div 
                    className="flex transition-transform duration-1000 ease-out gap-4"
                    style={{ transform: `translateX(calc(-${currentIndex * (100 + (16/320)*100)}% + ${currentIndex * 16}px))` }} // Adjusting translation for margins
                >
                    {spots.map((spot, i) => (
                        <div 
                            key={spot.id}
                            className={`min-w-full sm:min-w-[85%] transition-all duration-700 ${i === currentIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}
                        >
                            <div 
                                onClick={() => onSelectSpot(spot)}
                                className={`relative h-56 rounded-[32px] overflow-hidden cursor-pointer group border-2 ${i === currentIndex ? 'border-brand-400 shadow-2xl shadow-brand-500/20' : 'border-white/10 shadow-lg'}`}
                            >
                                {/* Background Image */}
                                <img 
                                    src={spot.images?.[0] || '/images/universal_tourism_fallback.png'} 
                                    alt={spot.name} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.src.includes('universal_tourism_fallback.png')) {
                                            target.src = '/images/universal_tourism_fallback.png';
                                        }
                                    }}
                                />
                                
                                {/* Inner Gradient Overlay for vibrant contrast */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 xl:via-slate-900/40 via-slate-900/60 to-transparent opacity-90"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 to-transparent mix-blend-overlay"></div>

                                {/* Content */}
                                <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                                    <div className="flex justify-between items-end gap-3">
                                        <div className="flex-1">
                                            {/* Type Badge */}
                                            <span className="inline-block px-3 py-1 bg-brand-500/90 backdrop-blur-md rounded-xl text-[9px] font-black text-white uppercase tracking-widest mb-2 border border-brand-400/50 shadow-lg">
                                                {spot.type}
                                            </span>
                                            
                                            <h4 className="text-xl font-black text-white leading-tight drop-shadow-md">
                                                {spot.name}
                                            </h4>
                                            
                                            <p className="text-xs text-brand-200 mt-1.5 flex items-center gap-1.5 font-bold">
                                                <MapPin size={14} className="text-brand-400" />
                                                {spot.distance.toFixed(1)} km away
                                            </p>
                                        </div>
                                        
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const nextIndex = (i + 1) % spots.length;
                                                setCurrentIndex(nextIndex);
                                            }}
                                            className="bg-luxe-gold text-black p-3 rounded-2xl shadow-xl ring-4 ring-black/10 hover:bg-yellow-400 group-hover:-translate-y-1 group-hover:scale-110 transition-transform cursor-pointer"
                                        >
                                            <ArrowRight size={20} className="font-bold" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-2 mt-4 mt-2">
                    {spots.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-luxe-gold' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
