
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Search, X, Mic, MicOff, History, Building2, TrainTrack } from 'lucide-react';
import { LocationData } from '@villagelink/shared';

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
                setSearchResults(payload);
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

  // Web Worker Powered Zero-Latency Search Algorithm
  useEffect(() => {
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
  }, [searchTerm, loading, userLocation]);

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

  const handleSelect = (location: any) => {
    setSearchTerm(`${location.rawName || location.name}, ${location.district || ''}`);
    saveRecent(location);
    setIsOpen(false);
    onSelect(location);
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
          className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#4F46E5]/30 rounded-2xl text-base font-bold shadow-sm focus:bg-white focus:border-[#4F46E5] outline-none transition-all text-slate-900 placeholder:text-slate-500"
          disabled={disabled || loading}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
          {searchTerm && !disabled && !isListening && (
            <button onClick={handleClear} className="p-1 text-slate-400 hover:text-slate-700">
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
              className={`p-1.5 rounded-full transition-all text-[#4F46E5]/70 hover:text-[#4F46E5] hover:bg-[#4F46E5]/10`}
              title={onMapTrigger ? "Select on Map" : "Auto Detect Location"}
            >
              {isLocating ? <span className="animate-spin inline-block text-[14px]">⌛</span> : <Navigation size={18} />}
            </button>
          )}
        </div>

        {isOpen && !disabled && (
          <div 
            className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in max-h-64 overflow-y-auto overscroll-contain"
            onTouchStart={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {!searchTerm && recentSearches.length > 0 && (
                <>
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <History size={10} /> Recent Selections
                    </div>
                    {recentSearches.map((loc) => (
                        <div 
                            key={`recent-${loc.villageCode}-${loc.name}`}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
                            className="px-4 py-3 hover:bg-brand-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{loc.name}</p>
                            <p className="text-[10px] text-slate-500">{loc.district || loc.block || 'India'} {loc.pincode ? `• ${loc.pincode}` : ''}</p>
                        </div>
                    ))}
                </>
            )}

            {searchResults.map((loc: any) => {
                // Highlight matches in the name
                const rawName = loc.rawName || loc.name;
                const searchTokens = searchTerm.toLowerCase().split(' ').filter(Boolean);
                
                // Extremely simple and fast highlight (can be refined further)
                let highlightedName = rawName;
                if (searchTokens.length > 0) {
                   const regex = new RegExp(`(${searchTokens.join('|')})`, 'gi');
                   highlightedName = rawName.replace(regex, `<span class="bg-yellow-200/80 dark:bg-yellow-500/30 text-black dark:text-white rounded-sm px-0.5">$1</span>`);
                }

                return (
                <div 
                    key={`${loc.villageCode}-${loc.name}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
                    className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex justify-between items-center ${loc.isStation ? 'bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-900/10' : loc.isLgd ? 'bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10' : 'hover:bg-brand-50 dark:hover:bg-slate-800'}`}
                >
                    <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2 mb-1">
                            {loc.isStation ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 rounded flex items-center gap-1 uppercase tracking-wider">
                                    <TrainTrack size={10} /> STATION
                                </span>
                            ) : loc.isLgd ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-[#4F46E5] dark:bg-indigo-900/40 dark:text-indigo-300 rounded flex items-center gap-1 uppercase tracking-wider">
                                    <Building2 size={10} /> {loc.type.replace(/[\[\]]/g, '')}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded flex items-center gap-1 uppercase tracking-wider" style={{display: searchTerm.length > 4 ? 'flex' : 'none'}}>
                                   <MapPin size={10} /> VILLAGE
                                </span>
                            )}
                            <p 
                               className={`text-sm md:text-base font-[800] tracking-tight ${loc.isStation ? 'text-orange-900 dark:text-orange-100' : loc.isLgd ? 'text-[#4F46E5] dark:text-indigo-200' : 'text-slate-800 dark:text-white'}`}
                               dangerouslySetInnerHTML={{ __html: highlightedName }}
                            />
                        </div>
                        {/* The Breadcrumb */}
                        <div className="pl-1 border-l-2 border-slate-200 dark:border-slate-700 ml-1 mt-0.5">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {loc.isStation ? (
                                   <span className="flex items-center gap-1">↳ {loc.name} • {loc.state}</span>
                                ) : (
                                   <span className="flex items-center gap-1">↳ {loc.block} (Block), {loc.district} (Dist), {loc.state} {loc.pincode ? `• ${loc.pincode}` : ''}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                );
            })}
            
            {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
               <div className="px-4 py-3 text-center text-sm text-slate-400">
                  No place matched. Try different spelling.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

