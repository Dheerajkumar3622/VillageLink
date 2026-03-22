import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { ViewStateChangeEvent, MapRef } from 'react-map-gl';
import { 
    MapPin, Search, Navigation, Loader2, Home, User, Phone, CheckCircle2, ChevronLeft, Map as MapIcon
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.dummy_mapbox_token_replace_me';

export interface PickupLocationDetails {
    lat: number;
    lng: number;
    formattedAddress: string;
    houseNo: string;
    name: string;
    mobile: string;
}

interface MapPickupSelectorProps {
    onConfirm: (details: PickupLocationDetails) => void;
    onBack?: () => void;
    initialLat?: number;
    initialLng?: number;
}

export const MapPickupSelector: React.FC<MapPickupSelectorProps> = ({ 
    onConfirm, 
    onBack,
    initialLat = 24.7913, // Default fallback (e.g., somewhere in Bihar)
    initialLng = 84.9913 
}) => {
    // 1. Map View State
    const [viewState, setViewState] = useState({
        longitude: initialLng,
        latitude: initialLat,
        zoom: 15,
        pitch: 0,
        bearing: 0
    });

    const mapRef = useRef<MapRef | null>(null);

    // 2. Geocoding & Address State
    const [isDragging, setIsDragging] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [formattedAddress, setFormattedAddress] = useState('Fetching location...');

    // 3. Form State
    const [houseNo, setHouseNo] = useState('');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- REVERSE GEOCODING LOGIC ---
    const fetchAddressFromCoords = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            // If dummy token, simulate a small delay and mock address
            if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('dummy')) {
                setTimeout(() => {
                    setFormattedAddress(`Pinned Location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                    setIsGeocoding(false);
                }, 800);
                return;
            }

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,neighborhood,locality,place`
            );
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                setFormattedAddress(data.features[0].place_name);
            } else {
                setFormattedAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
            }
        } catch (error) {
            console.error('Reverse Geocoding Error:', error);
            setFormattedAddress('Unable to fetch address. Please check your network.');
        } finally {
            setIsGeocoding(false);
        }
    };

    // Trigger geocoding when map stops moving
    const handleMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
        setIsDragging(false);
        const center = evt.viewState;
        fetchAddressFromCoords(center.latitude, center.longitude);
    }, []);

    // Initial Geocode and Auto-Locate
    useEffect(() => {
        // Try to get user current location cleanly
        if (navigator.geolocation && (initialLat === 24.7913 && initialLng === 84.9913)) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewState(prev => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                    fetchAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    fetchAddressFromCoords(initialLat, initialLng);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            fetchAddressFromCoords(initialLat, initialLng);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- FORWARD GEOCODING (SEARCH) LOGIC ---
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('dummy')) {
                 setSearchResults([
                     { place_name: 'Mock City Center, Bihar', center: [85.0, 24.8] },
                     { place_name: 'Mock Railway Station', center: [85.01, 24.81] }
                 ]);
                 setIsSearching(false);
                 return;
            }

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=in`
            );
            const data = await response.json();
            
            if (data.features) {
                setSearchResults(data.features);
            }
        } catch (error) {
            console.error('Search Geocoding Error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchResult = (result: any) => {
        const [lng, lat] = result.center;
        setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 16 }));
        setSearchQuery('');
        setSearchResults([]);
        setFormattedAddress(result.place_name);
        
        // Optional: Fly to location
        if (mapRef.current) {
             mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
        }
    };

    const handleConfirm = () => {
        if (!name || !mobile) {
            alert('Please enter Name and Mobile number.');
            return;
        }
        onConfirm({
            lat: viewState.latitude,
            lng: viewState.longitude,
            formattedAddress,
            houseNo,
            name,
            mobile
        });
    };

    return (
        <div className="relative w-full h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            
            {/* 1. TOP SAFE AREA & SEARCH BAR (Glassmorphism / Whisk 3.0) */}
            <div className="absolute top-0 left-0 right-0 z-20 pt-12 pb-4 px-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3 w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 p-2 transition-all">
                    {onBack && (
                        <button onClick={onBack} className="p-2 bg-slate-100/50 rounded-xl hover:bg-slate-200 text-slate-700">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    
                    <div className="flex-1 flex items-center gap-2 px-2 text-slate-700">
                        <Search size={18} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Where is your pickup?" 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-transparent outline-none placeholder-slate-400 text-sm font-medium"
                        />
                        {isSearching && <Loader2 size={16} className="animate-spin text-brand-500" />}
                    </div>
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                    <div className="pointer-events-auto mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        {searchResults.map((result, idx) => (
                            <div 
                                key={idx} 
                                className="px-4 py-3 flex items-start gap-3 hover:bg-brand-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                onClick={() => handleSelectSearchResult(result)}
                            >
                                <MapIcon size={18} className="text-brand-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{result.text}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{result.place_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. INTERACTIVE MAP LAYER */}
            <div className="flex-1 relative">
                <Map
                    {...viewState}
                    ref={mapRef}
                    onMove={(evt) => {
                        setViewState(evt.viewState);
                        setIsDragging(true);
                    }}
                    onMoveEnd={handleMoveEnd}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    style={{ width: '100%', height: '100%' }}
                />

                {/* ABSOLUTE CENTER FIXED PIN UI */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
                    <div className={`transition-transform duration-200 ${isDragging ? '-translate-y-4 scale-110 drop-shadow-2xl' : 'translate-y-0 drop-shadow-md'}`}>
                        {/* Custom Animated Pin */}
                        <div className="relative flex flex-col items-center">
                            <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(34,197,94,0.4)] border-2 border-white">
                                <MapPin size={22} className="fill-brand-400 text-white" />
                            </div>
                            {/* Pin Tail */}
                            <div className="w-1.5 h-4 bg-brand-600 rounded-b-full -mt-1 shadow-sm"></div>
                            {/* Ground Shadow effect */}
                            {!isDragging && (
                                <div className="absolute -bottom-1 w-4 h-1.5 bg-black/20 rounded-[100%] blur-[2px]"></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TARGETING RETICLE OVERLAY (Optional Extra Design Polish) */}
                {!isDragging && !isGeocoding && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-brand-500/20 rounded-full pointer-events-none animate-pulse"></div>
                )}

                {/* CURRENT LOCATION BUTTON */}
                <button 
                    className="absolute bottom-[280px] right-4 z-10 p-3 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-700 hover:text-brand-600 hover:scale-105 transition-all"
                    onClick={() => {
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16 });
                            });
                        }
                    }}
                >
                    <Navigation size={22} className="fill-current" />
                </button>
            </div>

            {/* 3. BOTTOM SHEET FORM (Whisk 3.0 / 3D Layout) */}
            <div className="relative z-30 bg-white shadow-[0_-12px_40px_-15px_rgba(0,0,0,0.1)] rounded-t-3xl p-5 pt-6 pb-8 transition-transform transform translate-y-0">
                {/* Drag Handle */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full"></div>

                {/* Dynamic Address Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                        {isGeocoding ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <MapPin size={24} className="fill-brand-200" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1 line-clamp-1">
                            {isGeocoding ? 'Locating...' : 'Pickup Address'}
                        </h3>
                        <p className={`text-[15px] font-medium leading-snug line-clamp-2 transition-opacity ${isGeocoding ? 'opacity-50 text-slate-500' : 'text-slate-700'}`}>
                            {formattedAddress}
                        </p>
                    </div>
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-5"></div>

                {/* Input Fields Grid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                        <Home size={18} className="text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="House No, Building, Landmark" 
                            value={houseNo}
                            onChange={(e) => setHouseNo(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder-slate-400"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                            <User size={18} className="text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Your Name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-1 w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder-slate-400"
                            />
                        </div>

                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                            <Phone size={18} className="text-slate-400" />
                            <input 
                                type="tel" 
                                maxLength={10}
                                placeholder="Mobile No" 
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="flex-1 w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleConfirm}
                    disabled={isGeocoding || !name || mobile.length < 10}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:from-slate-300 disabled:to-slate-200 text-white font-bold text-[15px] p-4 rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.3)] disabled:shadow-none transition-all transform active:scale-[0.98]"
                >
                    <CheckCircle2 size={20} />
                    Confirm Pickup Details
                </button>
            </div>
            
        </div>
    );
};

export default MapPickupSelector;
