
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Search, X, Mic, MicOff, History, Building2, TrainTrack } from 'lucide-react';
import { LocationData } from '@villagelink/shared';
import { API_BASE_URL } from '../config';

interface LocationSelectorProps {
  label: string;
  onSelect: (data: LocationData) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  defaultAutoDetect?: boolean;
  placeholder?: string;
  labelClassName?: string;
  value?: LocationData | null;
  onMapTrigger?: () => void;
}

async function fetchGoogleGeocoding(query: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/india/geocode?address=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !json.data) return [];
    const data = json.data;
    return (data.results ?? []).slice(0, 4).map((r: any, idx: number) => {
      const addressComponents = r.address_components || [];
      const pinComp = addressComponents.find((c: any) => c.types.includes('postal_code'));
      const stateComp = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
      const distComp = addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'));
      const blockComp = addressComponents.find((c: any) => c.types.includes('sublocality') || c.types.includes('locality'));

      return {
        name: r.formatted_address.split(',')[0] || query,
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        district: distComp ? distComp.long_name : 'Verified',
        block: blockComp ? blockComp.long_name : 'Google Map',
        state: stateComp ? stateComp.long_name : 'India',
        pincode: pinComp ? pinComp.long_name : '',
        villageCode: `google-${idx}-${Date.now()}`,
        isLgd: true,
        type: '[VERIFIED]'
      };
    });
  } catch(e) {
    console.error("Google Geocoding error in LocationSelector", e);
    return [];
  }
}

async function fetchGooglePlacesAutocomplete(query: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/india/places/autocomplete?input=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !json.data) return [];
    
    const predictions = json.data.predictions || [];
    return predictions.map((p: any) => ({
      name: p.structured_formatting?.main_text || p.description,
      address: p.description,
      lat: 0,
      lng: 0,
      district: p.structured_formatting?.secondary_text || p.description || '',
      block: '',
      state: '',
      pincode: '',
      villageCode: `google-place-${p.place_id}`,
      isLgd: true,
      type: '[PLACE]'
    }));
  } catch(e) {
    console.error("Google Places Autocomplete error in LocationSelector", e);
    return [];
  }
}

function highlightText(text: string, query: string): string {
  if (!text || !query) return text;
  const tokens = query.toLowerCase().split(' ').filter(Boolean);
  if (tokens.length === 0) return text;
  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  return text.replace(regex, `<span class="bg-amber-400 text-slate-950 font-black rounded px-1">$1</span>`);
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  label, onSelect, value, onMapTrigger, icon, disabled = false, defaultAutoDetect = false, placeholder = "Search Village, Block, District...", labelClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [recentSearches, setRecentSearches] = useState<LocationData[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Use a ref to strictly maintain a single worker instance
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
      const stored = localStorage.getItem('villagelink_recent_locations');
      if (stored) {
          try { setRecentSearches(JSON.parse(stored)); } catch (e) {}
      }
      
      // Coarse Location Interceptor
      const cachedLoc = localStorage.getItem('coarse_gps_cache');
      if (cachedLoc) {
          try {
              const parsed = JSON.parse(cachedLoc);
              if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) { // 2 hour TTL
                 setUserLocation({lat: parsed.lat, lng: parsed.lng});
              }
          } catch(e) {}
      }

      // Initialize Web Worker safely
      if (!workerRef.current) {
         workerRef.current = new Worker(new URL('./locationSearchWorker.ts', import.meta.url), { type: 'module' });
         
         workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'READY') {
                setLoading(false);
             } else if (type === 'RESULTS') {
                 setSearchResults(prev => {
                     const googleItems = prev.filter((p: any) => p.villageCode?.startsWith('google-'));
                     return [...googleItems, ...payload].slice(0, 10);
                 });
             } else if (type === 'NEAREST_RESULT' && payload) {
                 // Instantly auto-populate the selector with the closest village!
                 handleSelect(payload);
             }
          };
         
         workerRef.current.postMessage({ type: 'INIT' });
      }

      return () => {
         if (workerRef.current) {
             workerRef.current.terminate();
             workerRef.current = null;
         }
      };
  }, []);

  useEffect(() => {
      if (value) {
          setSearchTerm(value.name || value.rawName || '');
      }
  }, [value]);

  // Web Worker Powered Zero-Latency Search Algorithm + Google Geocoding Autocomplete
  useEffect(() => {
    if (!isOpen) return;
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Throttle slightly to prevent spam, but worker handles it well
    if (workerRef.current && !loading) {
       workerRef.current.postMessage({
           type: 'SEARCH',
           payload: {
               searchTerm,
               userLat: userLocation?.lat,
               userLng: userLocation?.lng
           }
       });
    }

    // Call Google Maps Places Autocomplete API in parallel
    const delayDebounce = setTimeout(async () => {
        const googleResults = await fetchGooglePlacesAutocomplete(searchTerm);
        if (googleResults.length > 0) {
            setSearchResults(prev => {
                const workerItems = prev.filter((p: any) => !p.villageCode?.startsWith('google-'));
                return [...googleResults, ...workerItems].slice(0, 10);
            });
        }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, loading, userLocation, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (defaultAutoDetect) {
        handleAutoDetect();
    }
  }, []);

  const saveRecent = (location: LocationData) => {
      const updated = [location, ...recentSearches.filter(r => r.name !== location.name)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('villagelink_recent_locations', JSON.stringify(updated));
  };

  const handleSelect = async (location: any) => {
    const originalSearchTerm = `${location.rawName || location.name}, ${location.district || ''}`;
    setSearchTerm(originalSearchTerm);
    saveRecent(location);
    setIsOpen(false);

    const resolvedLocation = { ...location };

    if (!resolvedLocation.lat || !resolvedLocation.lng || resolvedLocation.lat === 0 || resolvedLocation.lng === 0) {
        setSearchTerm("Resolving coordinates...");
        try {
            if (resolvedLocation.villageCode?.startsWith('google-place-')) {
                const placeId = resolvedLocation.villageCode.replace('google-place-', '');
                const res = await fetch(`${API_BASE_URL}/api/india/places/details?placeId=${encodeURIComponent(placeId)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.result) {
                        const result = json.data.result;
                        resolvedLocation.lat = result.geometry.location.lat;
                        resolvedLocation.lng = result.geometry.location.lng;
                        resolvedLocation.address = result.formatted_address;
                        
                        // Parse address components
                        const comps = result.address_components || [];
                        const pinComp = comps.find((c: any) => c.types.includes('postal_code'));
                        const stateComp = comps.find((c: any) => c.types.includes('administrative_area_level_1'));
                        const distComp = comps.find((c: any) => c.types.includes('administrative_area_level_2'));
                        const blockComp = comps.find((c: any) => c.types.includes('sublocality') || c.types.includes('locality'));
                        
                        resolvedLocation.district = distComp ? distComp.long_name : '';
                        resolvedLocation.block = blockComp ? blockComp.long_name : '';
                        resolvedLocation.state = stateComp ? stateComp.long_name : '';
                        resolvedLocation.pincode = pinComp ? pinComp.long_name : '';
                    }
                }
            } else {
                const query = `${resolvedLocation.name}, ${resolvedLocation.block || ''}, ${resolvedLocation.district || ''}, ${resolvedLocation.state || 'India'}`;
                const res = await fetch(`${API_BASE_URL}/api/india/geocode?address=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.results?.length > 0) {
                        const loc = json.data.results[0].geometry.location;
                        resolvedLocation.lat = loc.lat;
                        resolvedLocation.lng = loc.lng;
                        resolvedLocation.address = json.data.results[0].formatted_address;
                    }
                }
            }
        } catch (e) {
            console.error("Geocoding fallback failed", e);
        }
        setSearchTerm(originalSearchTerm);
    }

    onSelect(resolvedLocation);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(true);
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice search not supported.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => { setIsListening(true); setSearchTerm(''); };
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setSearchTerm(speechResult);
      setIsListening(false);
      setIsOpen(true);
    };
    recognition.start();
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({lat, lng});
        
        // Cache coarse loc
        localStorage.setItem('coarse_gps_cache', JSON.stringify({lat, lng, timestamp: Date.now()}));
        
        // Request the nearest village directly from the high-speed data worker
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'NEAREST', payload: { userLat: lat, userLng: lng } });
        } else {
            // Fallback to raw GPS 
            handleSelect({
                name: "Current Location",
                address: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                lat: lat,
                lng: lng,
                block: "Detected",
                panchayat: "GPS",
                villageCode: "GPS-001"
            } as LocationData);
        }
      },
      (err) => { setIsLocating(false); alert("GPS access denied."); }
    );
  };

  return (
    <div className={`relative space-y-1.5 ${disabled ? 'opacity-60 pointer-events-none' : ''}`} ref={wrapperRef}>
      <div className="flex justify-between items-center px-1">
        <label className={`uppercase text-xs font-bold ${labelClassName || 'drop-shadow-md'}`} style={labelClassName ? {} : { color: 'white', textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>{label}</label>
      </div>
      
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center z-20">
          {!disabled ? (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVoiceSearch(); }} 
                title="Voice Search"
                className={`transition-all ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-[#4F46E5] hover:scale-110'}`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
          ) : (
              <MapPin size={18} className="text-slate-400" />
          )}
        </div>
        
        <input
          type="text"
          placeholder={isListening ? "Speak now..." : placeholder}
          value={searchTerm}
          onChange={(e) => {
             setSearchTerm(e.target.value);
             if (!isOpen) setIsOpen(true);
          }}
          onClick={() => !disabled && setIsOpen(true)}
          className="w-full pl-12 pr-12 py-3.5 bg-slate-900 border-2 border-amber-400/50 rounded-2xl text-base font-black shadow-md focus:border-amber-400 outline-none transition-all text-white placeholder:text-slate-400"
          disabled={disabled || loading}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
          {searchTerm && !disabled && !isListening && (
            <button onClick={handleClear} className="p-1 text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          )}
          {!disabled && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onMapTrigger) {
                   onMapTrigger();
                } else {
                   handleAutoDetect(); 
                }
              }}
              className={`p-1.5 rounded-full transition-all text-amber-400 hover:text-amber-300 hover:bg-amber-400/20`}
              title={onMapTrigger ? "Select on Map" : "Auto Detect Location"}
            >
              {isLocating ? <span className="animate-spin inline-block text-[14px]">⌛</span> : <Navigation size={18} />}
            </button>
          )}
        </div>

        {isOpen && !disabled && (
          <div 
            className="absolute z-[200] left-0 right-0 top-full mt-2 bg-[#0b0f19] rounded-2xl shadow-2xl border-2 border-amber-400/60 overflow-hidden animate-fade-in max-h-64 overflow-y-auto overscroll-contain no-swipe"
            onTouchStart={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {!searchTerm && recentSearches.length > 0 && (
                <>
                    <div className="px-4 py-2 bg-slate-900/90 text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1 border-b border-white/10">
                        <History size={12} /> Recent Selections
                    </div>
                    {recentSearches.map((loc) => (
                        <div 
                            key={`recent-${loc.villageCode}-${loc.name}`}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
                            className="px-4 py-3 bg-[#111827] hover:bg-slate-800 cursor-pointer border-b border-white/10 last:border-0 flex items-start gap-3 transition-colors"
                        >
                            {/* Left Icon Container */}
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                <History size={14} />
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-white truncate">{loc.name}</p>
                                <p className="text-xs font-bold text-slate-300 mt-0.5 truncate leading-normal">
                                    {loc.block ? `${loc.block}, ` : ''}{loc.district ? `${loc.district}, ` : ''}{loc.state || 'India'}
                                </p>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {searchResults.map((loc: any) => {
                const titleText = loc.rawName || loc.name;
                const subtitleText = loc.isStation ? (
                   `${loc.name}, ${loc.state}`
                ) : loc.villageCode?.startsWith('google-') ? (
                   loc.district || loc.address
                ) : (
                   `${loc.block ? `${loc.block}, ` : ''}${loc.district ? `${loc.district}, ` : ''}${loc.state} ${loc.pincode || ''}`.trim()
                );

                return (
                <div 
                    key={`${loc.villageCode}-${loc.name}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
                    className="px-4 py-3 bg-[#111827] hover:bg-slate-800 cursor-pointer border-b border-white/10 last:border-0 flex items-start gap-3 transition-colors"
                >
                    {/* Left Icon Container */}
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        {loc.isStation ? (
                            <TrainTrack size={14} className="text-amber-400" />
                        ) : (
                            <MapPin size={14} className="text-amber-400" />
                        )}
                    </div>

                    {/* Right Address Content */}
                    <div className="flex-1 min-w-0">
                        <p 
                           className="text-base font-black text-white truncate"
                           dangerouslySetInnerHTML={{ __html: highlightText(titleText, searchTerm) }}
                        />
                        <p 
                           className="text-xs font-bold text-slate-300 mt-0.5 truncate leading-normal"
                           dangerouslySetInnerHTML={{ __html: highlightText(subtitleText, searchTerm) }}
                        />
                    </div>
                </div>
                );
            })}
            
            {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
               <div className="px-4 py-3 bg-[#111827] text-center text-xs font-black text-amber-300">
                  No place matched. Try different spelling.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

