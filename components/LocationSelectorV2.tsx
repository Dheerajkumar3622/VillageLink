/**
 * Enhanced Location Selector V2
 * Features: Hierarchy browsing, POI categories, favorites, recent locations,
 * fuzzy search with India Location Hub API integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MapPin, Navigation, Search, X, Mic, MicOff, History,
    ChevronRight, Star, StarOff, Building2, Train, School,
    Hospital, Landmark, Church, Fuel, Wallet, Package
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { LocationData } from '../types';

interface LocationSelectorV2Props {
    label: string;
    onSelect: (data: LocationData) => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    showCategories?: boolean;
    showFavorites?: boolean;
    lang?: 'EN' | 'HI';
}

interface POICategory {
    icon: string;
    label: string;
    labelHi: string;
    types: string[];
}

// Storage keys
const FAVORITES_KEY = 'vl_favorite_locations';
const RECENT_KEY = 'vl_recent_locations';
const MAX_RECENT = 10;
const MAX_FAVORITES = 20;

// POI Categories with icons
const POI_CATEGORIES: Record<string, POICategory> = {
    TRANSPORT: { icon: '🚉', label: 'Transport', labelHi: 'परिवहन', types: ['RAILWAY_STATION', 'BUS_STAND'] },
    HEALTHCARE: { icon: '🏥', label: 'Healthcare', labelHi: 'स्वास्थ्य', types: ['HOSPITAL', 'PHC', 'CHC'] },
    EDUCATION: { icon: '🏫', label: 'Education', labelHi: 'शिक्षा', types: ['SCHOOL', 'COLLEGE'] },
    GOVERNMENT: { icon: '🏛️', label: 'Government', labelHi: 'सरकारी', types: ['BLOCK_OFFICE', 'TEHSIL_OFFICE', 'COURT'] },
    RELIGIOUS: { icon: '🛕', label: 'Religious', labelHi: 'धार्मिक', types: ['TEMPLE', 'MOSQUE', 'CHURCH'] },
    FINANCE: { icon: '🏦', label: 'Finance', labelHi: 'वित्त', types: ['BANK', 'ATM', 'POST_OFFICE'] },
    UTILITIES: { icon: '⛽', label: 'Utilities', labelHi: 'उपयोगिता', types: ['PETROL_PUMP'] },
    COMMERCE: { icon: '🏪', label: 'Markets', labelHi: 'बाज़ार', types: ['MARKET', 'MANDI'] }
};

export const LocationSelectorV2: React.FC<LocationSelectorV2Props> = ({
    label,
    onSelect,
    icon,
    disabled = false,
    showCategories = true,
    showFavorites = true,
    lang = 'EN'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<LocationData[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedValue, setSelectedValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'categories' | 'favorites'>('search');
    const [favorites, setFavorites] = useState<LocationData[]>([]);
    const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [nearbyLocations, setNearbyLocations] = useState<LocationData[]>([]);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchDebounce = useRef<NodeJS.Timeout>();

    // Load favorites and recent on mount
    useEffect(() => {
        const storedFavorites = localStorage.getItem(FAVORITES_KEY);
        const storedRecent = localStorage.getItem(RECENT_KEY);
        if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
        if (storedRecent) setRecentLocations(JSON.parse(storedRecent));
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedCategory(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search with India Location Hub API
    const searchLocations = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/india/search?q=${encodeURIComponent(searchQuery)}&limit=15`
            );
            const data = await response.json();

            if (data.success && data.data) {
                setResults(data.data.map((item: any) => ({
                    name: item.name,
                    lat: item.coordinates?.lat || 0,
                    lng: item.coordinates?.lng || 0,
                    type: item.type,
                    district: item.district,
                    state: item.state,
                    pincode: item.pincode
                })));
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error('Location search error:', error);
            // Fallback to existing API
            try {
                const fallbackResponse = await fetch(
                    `${API_BASE_URL}/api/locations/search?q=${encodeURIComponent(searchQuery)}`
                );
                const fallbackData = await fallbackResponse.json();
                if (Array.isArray(fallbackData)) {
                    setResults(fallbackData);
                }
            } catch {
                setResults([]);
            }
        }
        setIsLoading(false);
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            if (query) searchLocations(query);
        }, 300);
        return () => clearTimeout(searchDebounce.current);
    }, [query, searchLocations]);

    // Get nearby locations
    const fetchNearbyLocations = async () => {
        if (!navigator.geolocation) return;

        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/india/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radius=5`
                    );
                    const data = await response.json();
                    if (data.success && data.data) {
                        setNearbyLocations(data.data.slice(0, 5).map((item: any) => ({
                            name: item.name,
                            lat: item.coordinates?.lat || position.coords.latitude,
                            lng: item.coordinates?.lng || position.coords.longitude,
                            type: item.type
                        })));
                    }
                } catch (error) {
                    console.error('Nearby locations error:', error);
                }
                setIsLoading(false);
            },
            () => setIsLoading(false),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    // Search by category
    const searchByCategory = async (category: string) => {
        setSelectedCategory(category);
        setIsLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/india/poi/category/${category}?limit=20`
            );
            const data = await response.json();

            if (data.success && data.data) {
                setResults(data.data.map((item: any) => ({
                    name: item.name,
                    lat: item.coordinates?.lat || 0,
                    lng: item.coordinates?.lng || 0,
                    type: item.type
                })));
            }
        } catch (error) {
            console.error('Category search error:', error);
            setResults([]);
        }
        setIsLoading(false);
    };

    // Handle selection
    const handleSelect = (location: LocationData) => {
        setSelectedValue(location.name);
        setQuery('');
        setIsOpen(false);
        setSelectedCategory(null);
        onSelect(location);
        saveToRecent(location);
    };

    // Save to recent
    const saveToRecent = (location: LocationData) => {
        const updated = [location, ...recentLocations.filter(l => l.name !== location.name)].slice(0, MAX_RECENT);
        setRecentLocations(updated);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    };

    // Toggle favorite
    const toggleFavorite = (location: LocationData, e: React.MouseEvent) => {
        e.stopPropagation();
        const isFavorite = favorites.some(f => f.name === location.name);
        let updated: LocationData[];

        if (isFavorite) {
            updated = favorites.filter(f => f.name !== location.name);
        } else {
            updated = [location, ...favorites].slice(0, MAX_FAVORITES);
        }

        setFavorites(updated);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    };

    // Voice search
    const handleVoiceSearch = () => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            alert(lang === 'EN' ? 'Voice search not supported' : 'वॉयस सर्च उपलब्ध नहीं है');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    // Auto-detect current location
    const handleAutoDetect = () => {
        if (!navigator.geolocation) {
            alert(lang === 'EN' ? 'Geolocation not supported' : 'लोकेशन उपलब्ध नहीं है');
            return;
        }

        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/india/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
                    );
                    const data = await response.json();

                    if (data.success && data.data) {
                        const location: LocationData = {
                            name: data.data.name,
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        handleSelect(location);
                    } else {
                        // Use coordinates as name
                        handleSelect({
                            name: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    }
                } catch {
                    handleSelect({
                        name: `Current Location`,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }
                setIsLoading(false);
            },
            () => {
                alert(lang === 'EN' ? 'Location access denied' : 'लोकेशन अनुमति अस्वीकृत');
                setIsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Clear selection
    const handleClear = () => {
        setSelectedValue('');
        setQuery('');
        setResults([]);
    };

    const isFavorite = (location: LocationData) => favorites.some(f => f.name === location.name);

    // Render location item
    const renderLocationItem = (location: LocationData, showFavButton = true) => (
        <div
            key={location.name + (location.lat || 0)}
            className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
            onClick={() => handleSelect(location)}
        >
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-lg">
                {location.type === 'RAILWAY_STATION' ? '🚉' :
                    location.type === 'BUS_STAND' ? '🚌' :
                        location.type === 'HOSPITAL' ? '🏥' :
                            location.type === 'SCHOOL' ? '🏫' :
                                location.type === 'TEMPLE' ? '🛕' :
                                    location.type === 'BANK' ? '🏦' :
                                        location.type === 'VILLAGE' ? '🏘️' :
                                            location.type === 'CITY' ? '🏙️' : '📍'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{location.name}</p>
                {(location.district || location.state) && (
                    <p className="text-xs text-slate-400 truncate">
                        {[location.district, location.state].filter(Boolean).join(', ')}
                    </p>
                )}
            </div>
            {showFavButton && showFavorites && (
                <button
                    onClick={(e) => toggleFavorite(location, e)}
                    className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label={isFavorite(location) ? "Remove from Favorites" : "Add to Favorites"}
                >
                    {isFavorite(location) ? (
                        <Star size={18} className="text-amber-500 fill-amber-500" />
                    ) : (
                        <StarOff size={18} className="text-slate-300" />
                    )}
                </button>
            )}
        </div>
    );

    return (
        <div ref={containerRef} className="relative">
            {/* Input Field */}
            <div
                className={`flex items-center gap-2 bg-white rounded-2xl border-2 px-4 py-3 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-300'}
          ${isOpen ? 'border-brand-500 shadow-lg' : 'border-slate-200'}
          transition-all duration-200`}
                onClick={() => !disabled && setIsOpen(true)}
            >
                {icon || <MapPin size={20} className="text-brand-500" />}

                <input
                    type="text"
                    placeholder={selectedValue || label}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveTab('search'); }}
                    disabled={disabled}
                    className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
                    onFocus={() => { setIsOpen(true); fetchNearbyLocations(); }}
                    aria-label={label}
                />

                <div className="flex items-center gap-1">
                    {selectedValue && (
                        <button onClick={(e) => { e.stopPropagation(); handleClear(); }} className="p-1.5 rounded-full hover:bg-slate-100" aria-label="Clear Selection">
                            <X size={16} className="text-slate-400" />
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); handleVoiceSearch(); }}
                        className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        aria-label="Voice Search"
                    >
                        {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleAutoDetect(); }}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                        aria-label="Detect Current Location"
                    >
                        <Navigation size={16} />
                    </button>
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-[70vh] flex flex-col">

                    {/* Tabs */}
                    {(showCategories || showFavorites) && (
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'search' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-500'}`}
                            >
                                <Search size={14} className="inline mr-1" />
                                {lang === 'EN' ? 'Search' : 'खोजें'}
                            </button>
                            {showCategories && (
                                <button
                                    onClick={() => setActiveTab('categories')}
                                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'categories' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-500'}`}
                                >
                                    <Building2 size={14} className="inline mr-1" />
                                    {lang === 'EN' ? 'Browse' : 'ब्राउज़'}
                                </button>
                            )}
                            {showFavorites && (
                                <button
                                    onClick={() => setActiveTab('favorites')}
                                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'favorites' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-500'}`}
                                >
                                    <Star size={14} className="inline mr-1" />
                                    {lang === 'EN' ? 'Saved' : 'सहेजे'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1">
                        {/* Search Tab */}
                        {activeTab === 'search' && (
                            <div className="p-2">
                                {isLoading && (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {!isLoading && !query && nearbyLocations.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">
                                            {lang === 'EN' ? '📍 Nearby' : '📍 आसपास'}
                                        </p>
                                        {nearbyLocations.map(loc => renderLocationItem(loc))}
                                    </div>
                                )}

                                {!isLoading && !query && recentLocations.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">
                                            <History size={12} className="inline mr-1" />
                                            {lang === 'EN' ? 'Recent' : 'हाल के'}
                                        </p>
                                        {recentLocations.slice(0, 5).map(loc => renderLocationItem(loc))}
                                    </div>
                                )}

                                {!isLoading && query && results.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">
                                            {lang === 'EN' ? 'Results' : 'परिणाम'} ({results.length})
                                        </p>
                                        {results.map(loc => renderLocationItem(loc))}
                                    </div>
                                )}

                                {!isLoading && query && results.length === 0 && (
                                    <div className="py-8 text-center text-slate-400">
                                        <Search size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>{lang === 'EN' ? 'No locations found' : 'कोई स्थान नहीं मिला'}</p>
                                        <p className="text-xs mt-1">{lang === 'EN' ? 'Try a different search' : 'कुछ और खोजें'}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                            <div className="p-2">
                                {!selectedCategory ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(POI_CATEGORIES).map(([key, cat]) => (
                                            <button
                                                key={key}
                                                onClick={() => searchByCategory(key)}
                                                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                                            >
                                                <span className="text-2xl">{cat.icon}</span>
                                                <span className="font-medium text-slate-700">
                                                    {lang === 'EN' ? cat.label : cat.labelHi}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => { setSelectedCategory(null); setResults([]); }}
                                            className="flex items-center gap-2 text-brand-600 text-sm mb-3 px-2"
                                            aria-label="Back to Categories"
                                        >
                                            <ChevronRight size={16} className="rotate-180" />
                                            {lang === 'EN' ? 'Back to categories' : 'वापस श्रेणियों में'}
                                        </button>

                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : results.length > 0 ? (
                                            results.map(loc => renderLocationItem(loc))
                                        ) : (
                                            <p className="text-center text-slate-400 py-8">
                                                {lang === 'EN' ? 'No places found in this category' : 'इस श्रेणी में कोई स्थान नहीं'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Favorites Tab */}
                        {activeTab === 'favorites' && (
                            <div className="p-2">
                                {favorites.length > 0 ? (
                                    <>
                                        <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">
                                            <Star size={12} className="inline mr-1" />
                                            {lang === 'EN' ? 'Favorites' : 'पसंदीदा'} ({favorites.length})
                                        </p>
                                        {favorites.map(loc => renderLocationItem(loc, true))}
                                    </>
                                ) : (
                                    <div className="py-8 text-center text-slate-400">
                                        <Star size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>{lang === 'EN' ? 'No favorites yet' : 'अभी तक कोई पसंदीदा नहीं'}</p>
                                        <p className="text-xs mt-1">{lang === 'EN' ? 'Tap ⭐ to save locations' : '⭐ टैप करें स्थान सहेजने के लिए'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationSelectorV2;
