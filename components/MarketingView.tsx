
import React, { useState, useEffect } from 'react';
import { User, Shop, Product, ShopCategory } from '../types';
import { getShops, getAllProducts } from '../services/marketingService';
import { Shop3DView } from './Shop3DView';
import {
    Search, Store, Tag, HardHat, MapPin, Leaf, Milk, Utensils,
    Cpu, ShoppingBasket, Shirt, MoreHorizontal, LayoutGrid
} from 'lucide-react';

interface MarketingViewProps {
    user: User;
    onBookDelivery: (product: Product, shop: Shop) => void;
    onShowMap?: () => void;
}

const CATEGORIES: { id: ShopCategory | 'ALL'; label: string; icon: any; color: string }[] = [
    { id: 'ALL', label: 'All Shops', icon: LayoutGrid, color: 'text-brand-600' },
    { id: 'AGRICULTURE', label: 'Agri', icon: Leaf, color: 'text-emerald-600' },
    { id: 'MESS', label: 'Mess', icon: Utensils, color: 'text-orange-600' },
    { id: 'DAIRY', label: 'Dairy', icon: Milk, color: 'text-blue-600' },
    { id: 'CONSTRUCTION', label: 'Hard-Goods', icon: HardHat, color: 'text-slate-600' },
    { id: 'GROCERY', label: 'Grocery', icon: ShoppingBasket, color: 'text-amber-600' },
    { id: 'ELECTRONICS', label: 'Electronic', icon: Cpu, color: 'text-indigo-600' },
    { id: 'CLOTHING', label: 'Apparel', icon: Shirt, color: 'text-pink-600' },
];

export const MarketingView: React.FC<MarketingViewProps> = ({ user, onBookDelivery, onShowMap }) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ShopCategory | 'ALL'>('ALL');

    useEffect(() => {
        getShops().then(data => {
            setShops(data);
        });
    }, [user.id]);

    const filteredShops = shops.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.location.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const activeCategoryInfo = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

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
            {/* Premium Header with Glassmorphism */}
            <div className="p-4 sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-2xl bg-white dark:bg-slate-800 shadow-glow-sm ${activeCategoryInfo.color}`}>
                            <activeCategoryInfo.icon size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white leading-none">
                                {activeCategoryInfo.label}
                                <span className="text-brand-600">.</span>
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Village Haat Discovery</p>
                        </div>
                    </div>
                    {onShowMap && (
                        <button onClick={onShowMap} className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 group">
                            <MapPin size={14} className="text-brand-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-tight dark:text-white">Map</span>
                        </button>
                    )}
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search materials, shops, services..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-100/50 dark:bg-slate-800/50 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-brand-500 dark:text-white transition-all"
                    />
                </div>

                {/* Category Picker - Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategory === cat.id
                                ? 'bg-brand-600 border-brand-500 text-white shadow-glow-sm -translate-y-0.5'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-brand-200'
                                }`}
                        >
                            <cat.icon size={14} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Shop Grid with Premium Cards */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredShops.map((shop, idx) => (
                        <div
                            key={shop.id}
                            onClick={() => setSelectedShop(shop)}
                            className="premium-card p-5 animate-fade-in-up"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg bg-gradient-to-br from-slate-700 to-slate-900 relative z-10">
                                            <Store size={28} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg dark:text-white leading-tight">{shop.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                            <MapPin size={10} className="text-brand-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider">{shop.location}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 group-hover:border-brand-200 transition-colors">
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        Enter <MoreHorizontal size={14} />
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-3">
                                    <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800">
                                        <Tag size={12} className="text-brand-600" />
                                        <span className="text-[10px] font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest">{shop.category}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-800">
                                        <span className="text-[10px] font-black text-amber-600 uppercase">⭐ {shop.rating}</span>
                                    </div>
                                </div>
                                {shop.isOpen && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Now</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredShops.length === 0 && (
                        <div className="text-center py-24 px-8">
                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white dark:border-slate-900 shadow-xl">
                                <Store size={48} className="text-slate-300" />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">No Shops Found</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                We couldn't find any {selectedCategory !== 'ALL' ? selectedCategory.toLowerCase() : ''} shops matching "{search}".
                            </p>
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory('ALL'); }}
                                className="mt-8 text-brand-600 font-black uppercase text-xs tracking-widest hover:underline"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
