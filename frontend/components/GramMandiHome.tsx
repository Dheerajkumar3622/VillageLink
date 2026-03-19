/**
 * GramMandi Home - Complete Food Ecosystem
 * Farm to Consumer Platform
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Wheat, Milk, Truck, Warehouse, ShoppingCart, Users,
    Plus, Search, MapPin, Star, Clock, Phone, ChevronRight, Filter, Leaf,
    TrendingUp, Package, DollarSign, BarChart3, RefreshCw, Eye, Check,
    ShieldCheck, Map, History, Globe, Sparkles, X, Newspaper
} from 'lucide-react';

const OrganicToggle: React.FC<{ organic: boolean, onChange: (val: boolean) => void }> = ({ organic, onChange }) => {
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.setAttribute('aria-checked', organic ? 'true' : 'false');
        }
    }, [organic]);
    return (
        <button
            ref={ref}
            onClick={() => onChange(!organic)}
            className={`w-12 h-6 rounded-full transition-all ${organic ? 'bg-luxe-teal' : 'bg-slate-300'}`}
            role="switch"
            aria-checked="false"
            aria-label="Toggle organic produce"
        >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${organic ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
        </button>
    );
};

interface GramMandiHomeProps {
    user: User;
    onBack?: () => void;
}

type UserRole = 'FARMER' | 'VENDOR' | 'STORAGE' | 'LOGISTICS' | 'CONSUMER';
type ViewType = 'HOME' | 'FARMER_DASHBOARD' | 'PRODUCE_LIST' | 'CREATE_LISTING' | 'CONSUMER_SHOP' | 'ORDER_DETAIL' | 'STORAGE_BROWSE' | 'GROUP_BUY' | 'TRUST_TRACKER';

interface ProduceListing {
    id: string;
    farmerId: string;
    farmerName: string;
    category: string;
    crop: string;
    variety: string;
    grade: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    harvestDate: string;
    photos: string[];
    location: { village: string; district: string };
    organic: boolean;
    status: string;
    trustChain?: {
        harvestHash: string;
        batchId: string;
        qualityCertificate?: string;
        farmerExperience: number;
    };
}

interface Order {
    id: string;
    items: any[];
    totalAmount: number;
    status: string;
    createdAt: number;
}

export const GramMandiHome: React.FC<GramMandiHomeProps> = ({ user, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<ViewType>('CONSUMER_SHOP');
    const [userRole, setUserRole] = useState<UserRole>('CONSUMER');
    
    // Mandi Segregation State
    const [activeSection, setActiveSection] = useState<'KISAN' | 'KIRANA'>('KISAN');
    const [activeStore, setActiveStore] = useState<any>(null);

    // Checkout & Order Flow State
    const [showCart, setShowCart] = useState(false);
    const [showAddressPrompt, setShowAddressPrompt] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [tempAddress, setTempAddress] = useState('');

    // Data states
    const [listings, setListings] = useState<ProduceListing[]>([]);
    const [myListings, setMyListings] = useState<ProduceListing[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cart, setCart] = useState<{ listing: ProduceListing; quantity: number }[]>([]);
    const [selectedListing, setSelectedListing] = useState<ProduceListing | null>(null);
    const [farmerStats, setFarmerStats] = useState<any>(null);
    const [consumerStats, setConsumerStats] = useState<any>(null);
    const [news, setNews] = useState<any[]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Form states for new listing
    const [newListing, setNewListing] = useState({
        category: 'VEGETABLE',
        crop: '',
        variety: '',
        grade: 'B',
        quantity: 0,
        unit: 'KG',
        pricePerUnit: 0,
        harvestDate: new Date().toISOString().split('T')[0],
        location: { village: '', block: '', district: 'Rohtas', pincode: '' },
        organic: false,
        pickupType: 'FARM_PICKUP'
    });

    useEffect(() => {
        // V5 Parity: Consumers land directly in the shop
        if (user.role === 'CONSUMER' as any) {
            setView('CONSUMER_SHOP');
        }
        fetchData();
    }, [user.role]);

    useEffect(() => {
        const handleBack = () => {
            if (view === 'CREATE_LISTING') setView('FARMER_DASHBOARD');
            else if (view === 'TRUST_TRACKER') setView('CONSUMER_SHOP');
            else if (view === 'FARMER_DASHBOARD' || view === 'CONSUMER_SHOP' || view === 'HOME') {
                if (onBack) onBack();
            }
        };
        window.addEventListener('haat-back', handleBack);
        return () => window.removeEventListener('haat-back', handleBack);
    }, [view, onBack]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all resources concurrently to eliminate waterfall latency
            const [
                listingsRes,
                farmerStatsRes,
                myListingsRes,
                consumerStatsRes,
                ordersRes,
                newsRes
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/api/grammandi/produce/listings`),
                fetch(`${API_BASE_URL}/api/grammandi/dashboard/farmer`, { headers }),
                fetch(`${API_BASE_URL}/api/grammandi/produce/my-listings`, { headers }),
                fetch(`${API_BASE_URL}/api/grammandi/dashboard/consumer`, { headers }),
                fetch(`${API_BASE_URL}/api/grammandi/orders/my`, { headers }),
                fetch(`${API_BASE_URL}/api/grammandi/news`)
            ]);

            if (listingsRes.ok) setListings(await listingsRes.json());
            if (farmerStatsRes.ok) setFarmerStats(await farmerStatsRes.json());
            if (myListingsRes.ok) setMyListings(await myListingsRes.json());
            if (consumerStatsRes.ok) setConsumerStats(await consumerStatsRes.json());
            if (ordersRes.ok) setOrders(await ordersRes.json());
            if (newsRes.ok) setNews(await newsRes.json());

        } catch (e) {
            console.error('GramMandi fetch error:', e);
            // Handle error state if needed
        }
        setLoading(false);
    };

    const createListing = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/grammandi/produce/listing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newListing)
            });
            if (res.ok) {
                alert('Listing created successfully!');
                setView('FARMER_DASHBOARD');
                fetchData();
            }
        } catch (e) {
            console.error('Create listing error:', e);
        }
    };

    const addToCart = (listing: ProduceListing) => {
        setCart(prev => {
            const existing = prev.find(c => c.listing.id === listing.id);
            if (existing) {
                return prev.map(c => c.listing.id === listing.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { listing, quantity: 1 }];
        });
    };

    const placeOrder = async () => {
        try {
            const token = getAuthToken();
            const items = cart.map(c => ({ listingId: c.listing.id, quantity: c.quantity }));
            const res = await fetch(`${API_BASE_URL}/api/grammandi/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    items,
                    deliveryType: 'HOME_DELIVERY',
                    deliveryAddress: { line1: 'Test Address', city: 'Patna', pincode: '802101' },
                    paymentMethod: 'COD'
                })
            });
            if (res.ok) {
                alert('Order placed successfully!');
                setCart([]);
                fetchData();
            }
        } catch (e) {
            console.error('Order error:', e);
        }
    };

    const cartTotal = cart.reduce((sum, c) => sum + (c.listing.pricePerUnit * c.quantity), 0);

    const filteredListings = listings.filter(l => {
        if (categoryFilter && l.category !== categoryFilter) return false;
        if (searchQuery && !l.crop.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const getCropEmoji = (category: string, crop: string) => {
        const map: Record<string, string> = {
            'Onion': '🧅', 'Tomato': '🍅', 'Potato': '🥔', 'Wheat': '🌾', 'Rice': '🍚',
            'Milk': '🥛', 'Fresh Milk': '🥛', 'Apple': '🍎', 'Mango': '🥭', 'Banana': '🍌'
        };
        return map[crop] || (category === 'VEGETABLE' ? '🥬' : category === 'FRUIT' ? '🍇' : category === 'GRAIN' ? '🌾' : category === 'DAIRY' ? '🥛' : '📦');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-deep)] pb-20 p-4 pt-6">
                <div className="flex items-center gap-2 mb-4 animate-pulse">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8 animate-pulse"></div>
                
                {/* Stats Skeleton */}
                <div className="flex gap-3 -mt-2 overflow-x-auto pb-4 mb-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[120px] p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mb-3"></div>
                            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                            <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Skeleton */}
                <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4 animate-pulse"></div>
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/5 rounded-[24px] p-3 border border-white/5 animate-pulse">
                            <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-3"></div>
                            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded mb-3"></div>
                            <div className="flex justify-between items-center mt-3">
                                <div className="w-12 h-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==================== CHECKOUT LOGIC ====================
    const handleAddToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(c => c.listing.name === item.name); // Using name for mock data
            if (existing) {
                return prev.map(c => c.listing.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { listing: item, quantity: 1 }];
        });
    };

    const handleCheckout = () => {
        if (!user.address) {
            setShowAddressPrompt(true);
        } else {
            confirmOrder(user.address.line1 || 'Saved Address');
        }
    };

    const confirmOrder = (address: string) => {
        const orderId = `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const total = cart.reduce((sum, c) => sum + (c.listing.price * c.quantity), 0);
        
        const newOrder = {
            id: orderId,
            items: cart,
            total,
            address,
            date: new Date().toLocaleString(),
            sender: activeStore ? activeStore.name : 'VillageLink Seller',
            qrString: JSON.stringify({ id: orderId, total, sender: activeStore?.name })
        };
        
        setCurrentOrder(newOrder);
        setCart([]);
        setShowAddressPrompt(false);
        setShowCart(false);
        setShowInvoice(true);
    };

    // ==================== STOREFRONT / PROFILE VIEW ====================
    if (activeStore) {
        return (
            <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-[950] pb-24 font-sans relative animate-fade-in z-50">
                {/* Store Cover Image / Gradient */}
                <div className={`w-full h-48 bg-gradient-to-br ${activeStore.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 dark:from-slate-[950] to-transparent"></div>
                    
                    {/* Header Controls */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                        <button onClick={() => setActiveStore(null)} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/30 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/30 transition-colors">
                                <Search size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Profile Details Overlay */}
                <div className="px-5 relative z-10 -mt-16 space-y-6">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-5 border border-white/50 dark:border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-5xl border-4 border-slate-50 dark:border-slate-[950] -mt-10 relative z-20">
                                {activeStore.img}
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
                                <Star size={12} fill="currentColor" />
                                {activeStore.rating}
                            </div>
                        </div>
                        
                        <div className="mt-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{activeStore.name}</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} className="text-emerald-500" />
                                {activeStore.village || activeStore.location} • {activeStore.type || activeStore.crop}
                            </p>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                            <button className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r ${activeStore.color} shadow-lg shadow-${activeStore.color.split('-')[1]}/30`}>
                                Message
                            </button>
                            <button className="flex-1 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                                <Phone size={14} /> Call Call
                            </button>
                        </div>
                    </div>

                    {/* Store Inventory Segment */}
                    <div>
                        <div className="flex justify-between items-end mb-4 px-1">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Full Catalog</h3>
                                <p className="text-xs text-slate-500 font-medium">All items available in store</p>
                            </div>
                            <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                <Filter size={12}/> Sort
                            </button>
                        </div>
                        
                        {/* Mock Inventory specific to the opened store */}
                        <div className="space-y-3">
                            {[1, 2, 3].map((item, idx) => (
                                <div key={idx} className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-[20px] p-3 border border-white/50 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="flex-shrink-0 w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                        📦
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-[15px] truncate pr-2">Sample Product {item}</h4>
                                            <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                                In Stock
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5.truncate">High quality verified product</p>
                                        <div className="mt-3 flex items-end justify-between">
                                            <div>
                                                <span className="text-base font-black text-slate-900 dark:text-white">₹{item.price || `1${item}0`}</span>
                                                <span className="text-[9px] text-slate-500 font-medium ml-0.5">/{item.unit || 'unit'}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleAddToCart({ name: `Sample Product ${item}`, price: Number(`1${item}0`), unit: 'unit' })}
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-xl font-bold text-[11px] hover:scale-105 transition-transform shadow-md"
                                            >
                                                Add +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== MAIN MANDI DASHBOARD ====================
    return (
        <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-[950] pb-24 pt-4 px-4 overflow-y-auto font-sans relative">
            {/* V5 Mesh Background (Nano Banana) */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-1000">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-amber-300 to-orange-500 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 space-y-6 mt-2">
                
                {/* 1. Mandi Segment Selector (Kisan vs Kirana) */}
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-2 flex gap-2 border border-white/40 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                    {/* Sliding Active Indicator */}
                    <div 
                        className={`absolute inset-y-2 w-[calc(50%-12px)] rounded-2xl bg-gradient-to-br transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm
                        ${activeSection === 'KISAN' ? 'left-2 from-emerald-400 to-teal-500 shadow-emerald-500/20' : 'left-[calc(50%+4px)] from-amber-400 to-orange-500 shadow-orange-500/20'}`}
                    ></div>

                    <button 
                        onClick={() => setActiveSection('KISAN')}
                        className={`relative z-10 flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300 ${activeSection === 'KISAN' ? 'text-white' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                    >
                        <Wheat size={20} className={`mb-1 transition-transform duration-300 ${activeSection === 'KISAN' ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-xs font-bold font-sans tracking-wide">Kisan Mandi</span>
                    </button>

                    <button 
                        onClick={() => setActiveSection('KIRANA')}
                        className={`relative z-10 flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300 ${activeSection === 'KIRANA' ? 'text-white' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                    >
                        <ShoppingCart size={20} className={`mb-1 transition-transform duration-300 ${activeSection === 'KIRANA' ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-xs font-bold font-sans tracking-wide">Gramin Bazaar</span>
                    </button>
                </div>
                
                {/* 2. Dynamic Content Area based on Selection */}
                {activeSection === 'KISAN' ? (
                    <div className="animate-fade-in space-y-6">
                        {/* Section Header */}
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-800 dark:from-emerald-400 dark:to-teal-300">
                                    Local Kisans
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Direct from local farms</p>
                            </div>
                            <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                View All
                            </button>
                        </div>

                        {/* Top Farmers Carousel */}
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {[
                                { name: "Ramesh Singh", village: "Dehri", crop: "Organic Vegetables", rating: 4.8, img: "👨🏽‍🌾", color: "from-emerald-400 to-teal-500" },
                                { name: "Sita Devi", village: "Amuar", crop: "Fresh Dairy", rating: 4.9, img: "👩🏽‍🌾", color: "from-blue-400 to-cyan-500" },
                                { name: "Kishan Kumar", village: "Parsa", crop: "Premium Grains", rating: 4.7, img: "👨🏽‍🌾", color: "from-amber-400 to-orange-500" }
                            ].map((farmer, idx) => (
                                <div key={idx} onClick={() => setActiveStore(farmer)} className="min-w-[160px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${farmer.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`}></div>
                                    <div className="text-3xl mb-3 bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {farmer.img}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{farmer.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1"><MapPin size={10}/> {farmer.village}</p>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{farmer.crop}</span>
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <Star size={10} fill="currentColor" />
                                            <span className="text-[10px] font-bold">{farmer.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inventory Grid Header */}
                        <div className="flex justify-between items-end px-1 mt-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fresh Harvest</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Recently listed by farmers</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"><Filter size={14}/></button>
                            </div>
                        </div>

                        {/* Produce Grid - Dynamic from API with mock fallback */}
                        <div className="grid grid-cols-2 gap-3">
                            {(filteredListings.length > 0 ? filteredListings : [
                                { id: 'mock-1', crop: "Red Tomatoes", farmerName: "Ramesh S.", pricePerUnit: 25, unit: "kg", category: 'VEGETABLE', organic: true, quantity: 50, location: { village: 'Dehri', district: 'Rohtas' }, status: 'ACTIVE' },
                                { id: 'mock-2', crop: "Fresh Cow Milk", farmerName: "Sita D.", pricePerUnit: 50, unit: "L", category: 'DAIRY', organic: false, quantity: 15, location: { village: 'Amuar', district: 'Rohtas' }, status: 'ACTIVE' },
                                { id: 'mock-3', crop: "Desi Potatoes", farmerName: "Vinay P.", pricePerUnit: 20, unit: "kg", category: 'VEGETABLE', organic: false, quantity: 100, location: { village: 'Parsa', district: 'Rohtas' }, status: 'ACTIVE' },
                                { id: 'mock-4', crop: "Wheat (Lok1)", farmerName: "Kishan K.", pricePerUnit: 30, unit: "kg", category: 'GRAIN', organic: false, quantity: 200, location: { village: 'Dehri', district: 'Rohtas' }, status: 'ACTIVE' }
                            ] as any[]).map((item: any, idx: number) => (
                                <div key={item.id || idx} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-3 border border-white/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-3xl bg-emerald-50 dark:bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                                {getCropEmoji(item.category, item.crop)}
                                            </div>
                                            <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[8px] font-bold px-2 py-0.5 rounded-full">
                                                {item.organic ? '🌿 Organic' : item.category}
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{item.crop}</h4>
                                        <p className="text-[10px] text-slate-500 font-semibold mb-2">by {item.farmerName} • {item.location?.village}</p>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                                        <div>
                                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{item.pricePerUnit}</span>
                                            <span className="text-[9px] text-slate-500 font-medium">/{item.unit}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAddToCart({ name: item.crop, price: item.pricePerUnit, unit: item.unit })}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
                {activeSection === 'KIRANA' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Section Header */}
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-800 dark:from-amber-400 dark:to-orange-500">
                                    Local Shops
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Kirana & Daily Needs</p>
                            </div>
                            <button className="text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full">
                                View Maps
                            </button>
                        </div>

                        {/* Top Shops Carousel */}
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {[
                                { name: "Gupta Kirana", location: "Main Chowk", type: "Groceries", rating: 4.6, img: "🏪", color: "from-amber-400 to-orange-500" },
                                { name: "Mishra Traders", location: "Station Rd", type: "Wholesale", rating: 4.8, img: "🏬", color: "from-rose-400 to-red-500" },
                                { name: "Daily Needs", location: "Kura Mod", type: "Essentials", rating: 4.5, img: "🛒", color: "from-purple-400 to-fuchsia-500" }
                            ].map((shop, idx) => (
                                <div key={idx} onClick={() => setActiveStore(shop)} className="min-w-[160px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${shop.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`}></div>
                                    <div className="text-3xl mb-3 bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {shop.img}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{shop.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1"><MapPin size={10}/> {shop.location}</p>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{shop.type}</span>
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <Star size={10} fill="currentColor" />
                                            <span className="text-[10px] font-bold">{shop.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inventory Grid Header */}
                        <div className="flex justify-between items-end px-1 mt-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Store Items</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Packaged goods & staples</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"><Filter size={14}/></button>
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { name: "Mustard Oil", shop: "Gupta Kirana", price: 140, unit: "L", image: "🛢️", tag: "Filtered", available: 20 },
                                { name: "Basmati Rice", shop: "Mishra T.", price: 85, unit: "kg", image: "🍚", tag: "Premium", available: 50 },
                                { name: "Tur Dal", shop: "Gupta Kirana", price: 120, unit: "kg", image: "🫘", tag: "Unpolished", available: 30 },
                                { name: "Biscuits", shop: "Daily Needs", price: 40, unit: "pack", image: "🍪", tag: "Combo", available: 15 }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-3 border border-white/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-3xl bg-orange-50 dark:bg-orange-500/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-500/20">
                                                {item.image}
                                            </div>
                                            <div className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[8px] font-bold px-2 py-0.5 rounded-full">
                                                {item.tag}
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{item.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-semibold mb-2">via {item.shop}</p>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                                        <div>
                                            <span className="text-base font-bold text-orange-600 dark:text-orange-400">₹{item.price}</span>
                                            <span className="text-[9px] text-slate-500 font-medium">/{item.unit}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAddToCart({ name: item.name, price: item.price, unit: item.unit })}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                                        >                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mandi Khabar - News Section */}
                {news.length > 0 && (
                    <div className="animate-fade-in space-y-4 mt-2">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Newspaper size={18} className="text-amber-500" />
                                    Mandi Khabar
                                </h3>
                                <p className="text-[11px] text-slate-500 font-medium">Latest market updates</p>
                            </div>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {news.map((item: any, idx: number) => (
                                <div key={idx} className="min-w-[260px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-400 to-orange-500 opacity-10 rounded-bl-full"></div>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full mb-2">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                        Update
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight line-clamp-1">{item.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary || item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Address Verification Prompt Modal */}
            {showAddressPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                                <MapPin size={24} />
                            </div>
                            <button onClick={() => setShowAddressPrompt(false)} className="text-slate-400 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Delivery Details Missing</h3>
                        <p className="text-sm text-slate-500 mt-2 mb-6">Please enter your complete delivery address to finalize this order.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 block mb-1">Full Address</label>
                                <textarea 
                                    rows={3} 
                                    value={tempAddress}
                                    onChange={(e) => setTempAddress(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white resize-none"
                                    placeholder="Enter house no, street, landmark, PIN code..."
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if(tempAddress.length > 5) confirmOrder(tempAddress);
                                }}
                                disabled={tempAddress.length < 5}
                                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Invoice & QR Success Overlay */}
            {showInvoice && currentOrder && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col animate-fade-in overflow-y-auto">
                    <div className="p-4 pt-8 sticky top-0 bg-white dark:bg-slate-950 z-10 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Order Confirmed</h2>
                        <button onClick={() => setShowInvoice(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white">Success!</h3>
                        <p className="text-sm text-slate-500 text-center mt-2 max-w-[250px]">Your order has been routed to the nearest VillageLink delivery partner.</p>
                        
                        {/* Virtual Invoice Card */}
                        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mt-8 shadow-xl relative overflow-hidden">
                            {/* Receipt Notch Effects */}
                            <div className="absolute top-0 inset-x-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] dark:bg-[radial-gradient(circle,transparent_4px,var(--slate-900)_5px)] bg-[length:12px_10px] -mt-2"></div>
                            
                            <div className="flex justify-between items-start border-b border-dashed border-slate-200 dark:border-slate-700 pb-4 mb-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice ID</p>
                                    <p className="font-mono text-sm font-bold text-slate-800 dark:text-white">{currentOrder.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{currentOrder.date.split(',')[0]}</p>
                                </div>
                            </div>
                            
                            <div className="w-full flex justify-center py-4 bg-white rounded-xl mb-4 border border-slate-100 p-2">
                                {/* Simulated QR Code (in real app, use qrcode.react) */}
                                <div className="grid grid-cols-5 gap-1 w-32 h-32 opacity-80 mix-blend-multiply">
                                    {Array.from({length: 25}).map((_, i) => (
                                        <div key={i} className={`bg-slate-900 rounded-sm ${Math.random() > 0.4 ? 'opacity-100' : 'opacity-0'}`}></div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mb-6 px-4">Delivery partner will scan this QR at pickup & dropoff.</p>
                            
                            <div className="space-y-3 mb-4">
                                {currentOrder.items.map((c:any, i:number) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">{c.quantity}x {c.listing.name}</span>
                                        <span className="font-semibold text-slate-800 dark:text-white">₹{c.listing.price * c.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                                <span className="text-slate-500 font-bold">Total Pay (COD)</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{currentOrder.total}</span>
                            </div>
                        </div>

                        <button onClick={() => setShowInvoice(false)} className="mt-8 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-6 py-3 rounded-xl w-full max-w-sm">
                            Continue Shopping
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Cart Button */}
            {cart.length > 0 && !showInvoice && (
                <div className="fixed bottom-24 inset-x-0 flex justify-center z-50 animate-bounce-in px-4">
                    <button 
                        onClick={() => handleCheckout()}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between w-full max-w-md group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Package size={20} />
                                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {cart.length}
                                </span>
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-medium opacity-70">Checkout Now</p>
                                <p className="text-sm font-bold">₹{cart.reduce((s, c) => s + (c.listing.price * c.quantity), 0)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-sm bg-white/20 dark:bg-black/10 px-4 py-2 rounded-xl group-hover:bg-white/30 transition-colors">
                            Pay on Delivery <ChevronRight size={16} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default GramMandiHome;
