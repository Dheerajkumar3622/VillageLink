
import React, { useRef, useState, useEffect } from 'react';
import { MapPin, Navigation, Search, X, Mic, MicOff, History } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { LocationData } from '../types';

interface LocationSelectorProps {
  label: string;
  onSelect: (data: LocationData) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  label, onSelect, icon, disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [recentSearches, setRecentSearches] = useState<LocationData[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const stored = localStorage.getItem('villagelink_recent_locations');
      if (stored) {
          try { setRecentSearches(JSON.parse(stored)); } catch (e) {}
      }
  }, []);

  const saveRecent = (location: LocationData) => {
      const updated = [location, ...recentSearches.filter(r => r.name !== location.name)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('villagelink_recent_locations', JSON.stringify(updated));
  };

  // DATABASE-ONLY SEARCH ALGORITHM
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        setErrorMsg(null);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

          const res = await fetch(`${API_BASE_URL}/api/locations/search?q=${encodeURIComponent(searchTerm)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                setSearchResults(data);
            } else {
                setSearchResults([]);
            }
          } else {
            console.error("Server Error");
            setErrorMsg("Server Unavailable");
            setSearchResults([]);
          }
        } catch (error) {
          console.warn("Search Error:", error);
          setErrorMsg("Connection Failed");
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
        setLoading(false);
      }
    }, 400); // 400ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (location: LocationData) => {
    setSearchTerm(location.name);
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
    recognition.onstart = () => { setIsListening(true); setSearchTerm('Listening...'); };
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
        try {
            // SMART DETECT: Query backend for the nearest valid village/stop
            const res = await fetch(`${API_BASE_URL}/api/locations/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
            if (res.ok) {
                const village = await res.json();
                handleSelect(village);
            } else {
                // Fallback to raw GPS if no village matches in DB
                handleSelect({
                    name: "Current Location",
                    address: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    block: "Detected",
                    panchayat: "GPS",
                    villageCode: "GPS-001"
                });
            }
        } catch (e) {
            // Fallback on error
            handleSelect({
                name: "Current Location",
                address: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                block: "Detected",
                panchayat: "GPS",
                villageCode: "GPS-001"
            });
        } finally {
            setIsLocating(false);
        }
      },
      (err) => { setIsLocating(false); alert("GPS access denied."); }
    );
  };

  return (
    <div className={`relative space-y-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`} ref={wrapperRef}>
      <div className="flex justify-between items-center pl-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
        {!disabled && (
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAutoDetect(); }}
              className="text-[10px] flex items-center gap-1 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-full hover:bg-brand-100 transition-colors"
            >
              {isLocating ? <span className="animate-spin">⌛</span> : <Navigation size={10} />}
              {isLocating ? 'Locating...' : 'Auto-detect'}
            </button>
          </div>
        )}
      </div>
      
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 dark:text-neon-cyan transition-colors z-10">
          {icon || <MapPin size={18} />}
        </div>
        
        <input
          type="text"
          placeholder={isListening ? "Speak now..." : "Search Village, Block, District..."}
          value={searchTerm}
          onChange={(e) => {
             setSearchTerm(e.target.value);
             if (!isOpen) setIsOpen(true);
          }}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full pl-12 pr-12 py-4 bg-white/50 dark:bg-slate-900/50 border ${isListening ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-white/60 dark:border-slate-700'} rounded-xl text-lg font-medium shadow-sm focus:border-brand-500 outline-none transition-all backdrop-blur-sm text-slate-900 dark:text-white`}
          disabled={disabled}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchTerm && !disabled && !isListening && (
            <button onClick={handleClear} className="p-1 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
          {!disabled && (
            <button 
              onClick={handleVoiceSearch} 
              className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800'}`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        {isOpen && !disabled && (
          <div 
            className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in max-h-64 overflow-y-auto overscroll-contain"
            onTouchStart={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            
            {loading && (
                <div className="px-4 py-3 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                    <span className="animate-spin">⌛</span> Searching Database...
                </div>
            )}

            {errorMsg && !loading && (
                <div className="px-4 py-3 text-xs text-red-500 text-center font-bold bg-red-50 dark:bg-red-900/10">
                    ⚠️ {errorMsg}
                </div>
            )}

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
                            <p className="text-[10px] text-slate-500">{loc.block}, {loc.district || 'Bihar'}</p>
                        </div>
                    ))}
                </>
            )}

            {searchResults.map((loc) => (
                <div 
                    key={`${loc.villageCode}-${loc.name}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
                    className="px-4 py-3 hover:bg-brand-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex justify-between items-center"
                >
                    <div className="flex flex-col">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{loc.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {loc.block}, {loc.district || 'Bihar'}
                        </p>
                    </div>
                </div>
            ))}
            
            {searchTerm.length >= 2 && searchResults.length === 0 && !loading && !errorMsg && (
               <div className="px-4 py-3 text-center text-sm text-slate-400">
                  No match found. Try adding Block or District name.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
