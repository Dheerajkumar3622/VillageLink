
import React, { useState, useEffect } from 'react';
import { User, Shop, Product, ShopCategory } from '../types';
import { getShops, getAllProducts } from '../services/marketingService';
import { Shop3DView } from './Shop3DView';
import { Search, Store, Tag, HardHat, MapPin } from 'lucide-react';

interface MarketingViewProps {
    user: User;
    onBookDelivery: (product: Product, shop: Shop) => void;
    onShowMap?: () => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ user, onBookDelivery, onShowMap }) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getShops().then(data => {
            setShops(data);
        });
    }, [user.id]);

    const filteredShops = shops.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.location.toLowerCase().includes(search.toLowerCase())
    );

    // If viewing a 3D shop, render that component FULL SCREEN
    if (selectedShop) {
        return (
            <Shop3DView
                shop={selectedShop}
                onBack={() => setSelectedShop(null)}
                onBuy={(p) => {
                    if (confirm(`Book delivery for ${p.name} (₹${p.price})?`)) {
                        onBookDelivery(p, selectedShop);
                        setSelectedShop(null); // Return to market
                    }
                }}
            />
        );
    }

    return (
        <div className="pb-24 animate-fade-in min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="p-4 sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-600 to-slate-900 dark:from-slate-400 dark:to-white flex items-center gap-2">
                        <HardHat size={24} className="text-orange-600" />
                        Construction
                        <span className="text-xs text-slate-500 font-normal ml-1">Mandi</span>
                    </h2>
                    {onShowMap && (
                        <button onClick={onShowMap} className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform">
                            <MapPin size={12} className="text-orange-500" /> Map View
                        </button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search Materials, Shops..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                    />
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Shop Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredShops.map(shop => (
                        <div
                            key={shop.id}
                            onClick={() => setSelectedShop(shop)}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-md bg-slate-600`}>
                                    <Store size={24} />
                                </div>
                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 transition-colors">Enter Shop &rarr;</span>
                            </div>
                            <h3 className="font-bold text-lg dark:text-white">{shop.name}</h3>
                            <p className="text-xs text-slate-500 mb-2">{shop.location}</p>
                            <div className="flex gap-2 text-[10px] font-bold text-slate-400">
                                <span className="flex items-center gap-1"><Tag size={10} /> {shop.category}</span>
                                <span>⭐ {shop.rating}</span>
                            </div>
                        </div>
                    ))}
                    {filteredShops.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <Store size={48} className="mx-auto mb-2 opacity-20" />
                            <p>No construction shops found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
