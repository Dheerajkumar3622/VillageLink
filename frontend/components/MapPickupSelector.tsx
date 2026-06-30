import React, { useState, useEffect, useRef } from 'react';
import { 
    MapPin, Search, Navigation, Loader2, Home, User, Phone, CheckCircle2, ChevronLeft, Map as MapIcon
} from 'lucide-react';
import { API_BASE_URL } from '../config';

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

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export const MapPickupSelector: React.FC<MapPickupSelectorProps> = ({ 
    onConfirm, 
    onBack,
    initialLat = 24.7913,
    initialLng = 84.9913 
}) => {
    // 1. Map View State
    const [viewState, setViewState] = useState({
        longitude: initialLng,
        latitude: initialLat,
        zoom: 15
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

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

    // Dynamically load Google Maps script if not loaded
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
            setScriptLoaded(true);
            return;
        }

        const scriptId = 'google-maps-script-loader';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initGoogleMapsCallback`;
            script.async = true;
            script.defer = true;

            (window as any).initGoogleMapsCallback = () => {
                setScriptLoaded(true);
            };

            document.head.appendChild(script);
        } else {
            const checkInterval = setInterval(() => {
                if ((window as any).google && (window as any).google.maps) {
                    setScriptLoaded(true);
                    clearInterval(checkInterval);
                }
            }, 100);
            return () => clearInterval(checkInterval);
        }
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!scriptLoaded || !mapContainerRef.current || googleMapRef.current) return;

        const maps = (window as any).google.maps;
        const mapOptions = {
            center: { lat: viewState.latitude, lng: viewState.longitude },
            zoom: viewState.zoom,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false
        };

        const mapInstance = new maps.Map(mapContainerRef.current, mapOptions);
        googleMapRef.current = mapInstance;

        mapInstance.addListener('dragstart', () => {
            setIsDragging(true);
        });

        mapInstance.addListener('dragend', () => {
            setIsDragging(false);
            const center = mapInstance.getCenter();
            const lat = center.lat();
            const lng = center.lng();
            setViewState(prev => ({ ...prev, latitude: lat, longitude: lng }));
            fetchAddressFromCoords(lat, lng);
        });

        // Trigger initial address resolve
        fetchAddressFromCoords(viewState.latitude, viewState.longitude);
    }, [scriptLoaded]);

    // --- REVERSE GEOCODING LOGIC ---
    const fetchAddressFromCoords = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/india/reverse-geocode?lat=${lat}&lng=${lng}`
            );
            const json = await response.json();
            
            if (json.success && json.data?.results && json.data.results.length > 0) {
                setFormattedAddress(json.data.results[0].formatted_address);
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

    // Helper to move center to coordinates
    const flyToLocation = (lat: number, lng: number) => {
        if (googleMapRef.current) {
            const maps = (window as any).google.maps;
            googleMapRef.current.panTo(new maps.LatLng(lat, lng));
            googleMapRef.current.setZoom(16);
        }
        setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 16 }));
        fetchAddressFromCoords(lat, lng);
    };

    // --- FORWARD GEOCODING (SEARCH) LOGIC ---
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/india/places/autocomplete?input=${encodeURIComponent(query)}`
            );
            const json = await response.json();
            if (json.success && json.data?.predictions) {
                setSearchResults(json.data.predictions.map((p: any) => ({
                    text: p.structured_formatting?.main_text || p.description,
                    place_name: p.description,
                    place_id: p.place_id
                })));
            }
        } catch (error) {
            console.error('Search Geocoding Error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchResult = async (result: any) => {
        setIsSearching(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/india/places/details?placeId=${encodeURIComponent(result.place_id)}`);
            const json = await res.json();
            if (json.success && json.data?.result?.geometry?.location) {
                const loc = json.data.result.geometry.location;
                flyToLocation(loc.lat, loc.lng);
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        } finally {
            setIsSearching(false);
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
                    <div className="pointer-events-auto mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden no-swipe">
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
                <div ref={mapContainerRef} className="w-full h-full no-swipe" />

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

                {/* TARGETING RETICLE OVERLAY */}
                {!isDragging && !isGeocoding && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-brand-500/20 rounded-full pointer-events-none animate-pulse"></div>
                )}

                {/* CURRENT LOCATION BUTTON */}
                <button 
                    className="absolute bottom-[280px] right-4 z-10 p-3 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-700 hover:text-brand-600 hover:scale-105 transition-all"
                    onClick={() => {
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                flyToLocation(pos.coords.latitude, pos.coords.longitude);
                            });
                        }
                    }}
                >
                    <Navigation size={22} className="fill-current" />
                </button>
            </div>

            {/* 3. BOTTOM SHEET FORM */}
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
