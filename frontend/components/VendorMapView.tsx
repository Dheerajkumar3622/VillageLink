
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Store, MapPin, Navigation, Info, Clock, Star, Phone, ArrowLeft, Filter, Search } from 'lucide-react';
import { Button } from './Button';
import { API_BASE_URL } from '../config';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons for different vendor types
const vendorIcon = L.divIcon({
    html: `<div class="bg-brand-500 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"></path></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

interface Vendor {
    id: string;
    stallName: string;
    stallCategory: string;
    coordinates: { lat: number; lng: number };
    rating: number;
    isOpen: boolean;
    location: string;
    phone?: string;
}

const RecenterMap: React.FC<{ lat: number, lng: number }> = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng]);
    return null;
};

export const VendorMapView: React.FC<{ onBack: () => void, userLocation: { lat: number, lng: number } }> = ({ onBack, userLocation }) => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/food/stalls`);
                if (res.ok) {
                    const data = await res.json();
                    setVendors(data);
                }
            } catch (e) {
                console.error("Failed to fetch vendors:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchVendors();
    }, []);

    const filteredVendors = vendors.filter(v =>
        (categoryFilter === 'ALL' || v.stallCategory === categoryFilter) &&
        (v.stallName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-black overflow-hidden animate-fade-in relative">
            {/* Header Over Map */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} aria-label="Go Back" className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white transition-transform active:scale-95">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search nearby shops..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 shadow-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['ALL', 'STREET_FOOD', 'JUICE_STALL', 'CHAT_CORNER', 'TEA_STALL', 'FOOD_CART', 'DHABA'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all ${categoryFilter === cat ? 'bg-brand-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                            {cat.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <MapContainer
                center={[userLocation.lat, userLocation.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />

                {/* User Location Marker */}
                <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>You are here</Popup>
                </Marker>
                <Circle center={[userLocation.lat, userLocation.lng]} radius={1000} pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.1 }} />

                {/* Vendor Markers */}
                {filteredVendors.map(vendor => (
                    <Marker
                        key={vendor.id}
                        position={[vendor.coordinates.lat, vendor.coordinates.lng]}
                        icon={vendorIcon}
                        eventHandlers={{
                            click: () => setSelectedVendor(vendor),
                        }}
                    >
                        <Popup>
                            <div className="p-2 min-w-[150px]">
                                <h4 className="font-bold text-slate-800">{vendor.stallName}</h4>
                                <p className="text-[10px] text-slate-500 capitalize">{vendor.stallCategory}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-bold">{vendor.rating}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Vendor Detail Card (Appears when marker clicked) */}
            {selectedVendor && (
                <div className="absolute bottom-6 left-4 right-4 z-[1000] bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedVendor.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {selectedVendor.isOpen ? 'OPEN' : 'CLOSED'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedVendor.stallCategory}</span>
                            </div>
                            <h3 className="text-xl font-bold dark:text-white">{selectedVendor.stallName}</h3>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {selectedVendor.location}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl flex flex-col items-center">
                            <Star size={20} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold dark:text-white mt-1">{selectedVendor.rating}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <Button variant="outline" className="gap-2 rounded-2xl py-4" onClick={() => window.open(`tel:${selectedVendor.phone || '9999999999'}`)}>
                            <Phone size={18} /> Call Vendor
                        </Button>
                        <Button className="gap-2 rounded-2xl py-4" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedVendor.coordinates.lat},${selectedVendor.coordinates.lng}`)}>
                            <Navigation size={18} /> Navigate
                        </Button>
                    </div>

                    <button
                        onClick={() => setSelectedVendor(null)}
                        className="absolute -top-12 left-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-800 text-slate-400"
                        aria-label="Close"
                    >
                        <ArrowLeft size={20} className="rotate-[270deg]" />
                    </button>
                </div>
            )}
        </div>
    );
};
