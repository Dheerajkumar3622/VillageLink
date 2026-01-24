/**
 * GramMandi Home - Complete Food Ecosystem
 * Farm to Consumer Platform
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Wheat, Milk, Truck, Warehouse, ShoppingCart, Users,
    Plus, Search, MapPin, Star, Clock, Phone, ChevronRight, Filter, Leaf,
    TrendingUp, Package, DollarSign, BarChart3, RefreshCw, Eye, Check,
    ShieldCheck, Map, History, Globe
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
            className={`w-12 h-6 rounded-full transition-all ${organic ? 'bg-green-500' : 'bg-slate-300'}`}
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
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ViewType>('HOME');
    const [userRole, setUserRole] = useState<UserRole>('CONSUMER');

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
        if (user.role === 'CONSUMER') {
            setView('CONSUMER_SHOP');
        }
        fetchData();
    }, [user.role]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch public listings
            const listingsRes = await fetch(`${API_BASE_URL}/api/grammandi/produce/listings`);
            if (listingsRes.ok) setListings(await listingsRes.json());

            // Fetch farmer stats
            const farmerStatsRes = await fetch(`${API_BASE_URL}/api/grammandi/dashboard/farmer`, { headers });
            if (farmerStatsRes.ok) setFarmerStats(await farmerStatsRes.json());

            // Fetch my listings
            const myListingsRes = await fetch(`${API_BASE_URL}/api/grammandi/produce/my-listings`, { headers });
            if (myListingsRes.ok) setMyListings(await myListingsRes.json());

            // Fetch consumer stats
            const consumerStatsRes = await fetch(`${API_BASE_URL}/api/grammandi/dashboard/consumer`, { headers });
            if (consumerStatsRes.ok) setConsumerStats(await consumerStatsRes.json());

            // Fetch orders
            const ordersRes = await fetch(`${API_BASE_URL}/api/grammandi/orders/my`, { headers });
            if (ordersRes.ok) setOrders(await ordersRes.json());

            // Fetch news
            const newsRes = await fetch(`${API_BASE_URL}/api/grammandi/news`);
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
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="animate-spin text-green-600" size={40} />
            </div>
        );
    }

    // ==================== CREATE LISTING VIEW ====================
    if (view === 'CREATE_LISTING') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-6">
                    <button onClick={() => setView('FARMER_DASHBOARD')} className="flex items-center gap-2 mb-4" aria-label="Go Back">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">List Your Produce</h1>
                </div>
                <div className="p-4 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="category-select">Category</label>
                        <select id="category-select" value={newListing.category} onChange={e => setNewListing({ ...newListing, category: e.target.value })} className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" aria-label="Select Category">
                            <option value="VEGETABLE">🥬 Vegetable</option>
                            <option value="FRUIT">🍎 Fruit</option>
                            <option value="GRAIN">🌾 Grain</option>
                            <option value="DAIRY">🥛 Dairy</option>
                            <option value="SPICE">🌶️ Spice</option>
                        </select>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Crop Name</label>
                        <input type="text" value={newListing.crop} onChange={e => setNewListing({ ...newListing, crop: e.target.value })} placeholder="e.g., Onion, Tomato, Wheat" className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="quantity-input">Quantity</label>
                            <input id="quantity-input" type="number" value={newListing.quantity} onChange={e => setNewListing({ ...newListing, quantity: parseFloat(e.target.value) })} className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="unit-select">Unit</label>
                            <select id="unit-select" value={newListing.unit} onChange={e => setNewListing({ ...newListing, unit: e.target.value })} className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" aria-label="Select Unit">
                                <option value="KG">KG</option>
                                <option value="QUINTAL">Quintal</option>
                                <option value="TON">Ton</option>
                                <option value="LITER">Liter</option>
                                <option value="DOZEN">Dozen</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="price-input">Price per Unit (₹)</label>
                            <input id="price-input" type="number" value={newListing.pricePerUnit} onChange={e => setNewListing({ ...newListing, pricePerUnit: parseFloat(e.target.value) })} className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" />
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="grade-select">Grade</label>
                            <select id="grade-select" value={newListing.grade} onChange={e => setNewListing({ ...newListing, grade: e.target.value })} className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" aria-label="Select Grade">
                                <option value="A">Grade A (Premium)</option>
                                <option value="B">Grade B (Standard)</option>
                                <option value="C">Grade C (Economy)</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Village/Location</label>
                        <input type="text" value={newListing.location.village} onChange={e => setNewListing({ ...newListing, location: { ...newListing.location, village: e.target.value } })} placeholder="Your village name" className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Leaf className="text-green-500" size={18} /> Organic Produce?</span>
                        <OrganicToggle organic={newListing.organic} onChange={(val) => setNewListing({ ...newListing, organic: val })} />
                    </div>
                    <Button onClick={createListing} className="w-full bg-green-600 hover:bg-green-700" disabled={!newListing.crop || !newListing.quantity || !newListing.pricePerUnit}>
                        <Plus size={18} /> Create Listing
                    </Button>
                </div>
            </div>
        );
    }

    // ==================== FARMER DASHBOARD ====================
    if (view === 'FARMER_DASHBOARD') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-6">
                    <button onClick={() => setView('HOME')} className="flex items-center gap-2 mb-4">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">👨‍🌾 Farmer Dashboard</h1>
                    <p className="text-green-100 text-sm">Sell your produce directly</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center">
                        <Package className="mx-auto text-green-500 mb-1" size={24} />
                        <p className="text-2xl font-bold dark:text-white">{farmerStats?.activeListings || 0}</p>
                        <p className="text-xs text-slate-500">Active Listings</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center">
                        <ShoppingCart className="mx-auto text-orange-500 mb-1" size={24} />
                        <p className="text-2xl font-bold dark:text-white">{farmerStats?.pendingOrders || 0}</p>
                        <p className="text-xs text-slate-500">Pending Orders</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center">
                        <DollarSign className="mx-auto text-emerald-500 mb-1" size={24} />
                        <p className="text-2xl font-bold dark:text-white">₹{((farmerStats?.totalRevenue || 0) / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 mb-4">
                    <Button onClick={() => setView('CREATE_LISTING')} className="w-full bg-green-600 hover:bg-green-700">
                        <Plus size={18} /> Add New Listing
                    </Button>
                </div>

                {/* My Listings */}
                <div className="px-4">
                    <h2 className="font-bold dark:text-white mb-3">My Listings</h2>
                    {myListings.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
                            <Wheat className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">No listings yet. Add your first produce!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myListings.map(listing => (
                                <div key={listing.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold dark:text-white">{getCropEmoji(listing.category, listing.crop)} {listing.crop}</h3>
                                            <p className="text-sm text-slate-500">{listing.quantity} {listing.unit} @ ₹{listing.pricePerUnit}/{listing.unit}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{listing.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==================== CONSUMER SHOP ====================
    if (view === 'CONSUMER_SHOP') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                    <button onClick={() => setView('HOME')} className="flex items-center gap-2 mb-4">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">🛒 Fresh from Farm</h1>
                    <p className="text-orange-100 text-sm">Direct from farmers, no middlemen</p>

                    {/* Search */}
                    <div className="relative mt-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vegetables, fruits, grains..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400" />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                    {[
                        { value: '', label: 'All', emoji: '🍽️' },
                        { value: 'VEGETABLE', label: 'Vegetables', emoji: '🥬' },
                        { value: 'FRUIT', label: 'Fruits', emoji: '🍎' },
                        { value: 'GRAIN', label: 'Grains', emoji: '🌾' },
                        { value: 'DAIRY', label: 'Dairy', emoji: '🥛' }
                    ].map(cat => (
                        <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${categoryFilter === cat.value ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>

                {/* V5 Recipe Combos (Inspired by Demo) */}
                <div className="px-4 mb-6">
                    <div className="v5-section-header px-0 mb-4">
                        <h2 className="v5-section-title text-base">
                            <span className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 text-lg">🎁</span>
                            Recipe Combo Kits
                        </h2>
                    </div>
                    <div className="v5-combo-card group">
                        <div className="flex gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-whisk-float group-hover:scale-110 transition-transform">🥘</div>
                            <div className="flex-1">
                                <h3 className="font-black text-white text-lg">Aalu Gobhi Kit</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Dry Sabji Masterclass Bundle</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase">🌱 Veg</span>
                                    <span className="px-2 py-0.5 bg-white/5 text-slate-400 rounded text-[8px] font-black uppercase">4 Servings</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['🥔 Potato 500g', '🥦 Cauliflower 1pc', '🌶️ Chilli 50g', '🧅 Onion 250g'].map((item, idx) => (
                                <div key={idx} className="v5-ingredient-chip">{item}</div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-emerald-400">₹80</span>
                                    <span className="text-sm text-slate-500 line-through">₹95</span>
                                </div>
                                <div className="v5-combo-savings inline-block">Save ₹15</div>
                            </div>
                            <button className="px-6 py-2.5 bg-orange-500 text-white text-[11px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Add Combo</button>
                        </div>
                    </div>
                </div>

                {/* Listings Grid - Whisk Adaptive Elevation */}
                <div className="px-4 grid grid-cols-2 gap-3 pb-24">
                    {filteredListings.map(listing => (
                        <div key={listing.id} className="group bg-white dark:bg-slate-900 rounded-[24px] p-3 border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:shadow-whisk-float hover:-translate-y-1 hover:border-[var(--accent-primary)]/30">
                            {/* Product Image Holder */}
                            <div className="w-full h-32 bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)] rounded-2xl flex items-center justify-center text-4xl mb-3 transition-transform group-hover:scale-105 relative overflow-hidden">
                                {getCropEmoji(listing.category, listing.crop)}
                                {listing.trustChain && (
                                    <div className="absolute top-2 right-2 p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg backdrop-blur-md border border-emerald-500/20" title="Trust Chain Verified">
                                        <ShieldCheck size={14} />
                                    </div>
                                )}
                                {/* Scarcity Badge (V5 Parity) */}
                                {listing.quantity < 50 && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase v5-soft-pulse">
                                        Only {listing.quantity}{listing.unit} Left
                                    </div>
                                )}
                            </div>

                            <div className="px-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-extrabold text-sm text-[var(--text-primary)]">{listing.crop}</h3>
                                    {/* Social Proof (V5 Parity) */}
                                    <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[7px] text-slate-400 font-bold">
                                        <Users size={8} /> 12 neighbors
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-2">
                                    <MapPin size={10} className="text-rose-400" />
                                    {listing.location.village}
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                    <div>
                                        <p className="text-base font-black text-[var(--accent-warm)] font-mono">₹{listing.pricePerUnit}<span className="text-[10px] text-[var(--text-muted)]">/{listing.unit}</span></p>
                                    </div>
                                    <button onClick={() => addToCart(listing)} className="w-10 h-10 bg-[var(--accent-warm)] hover:bg-[var(--accent-hot)] text-white rounded-xl shadow-lg transition-all active:scale-90 flex items-center justify-center" aria-label="Add to Cart">
                                        <Plus size={18} />
                                    </button>
                                </div>

                                {/* Trust Chain Snippet */}
                                {listing.trustChain && (
                                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between opacity-60">
                                        <div className="flex items-center gap-1">
                                            <History size={10} />
                                            <span className="text-[8px] font-mono font-bold tracking-tighter">BATCH #{listing.trustChain.batchId.slice(-4)}</span>
                                        </div>
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                                            onClick={() => { setSelectedListing(listing); setView('TRUST_TRACKER'); }}
                                        >
                                            <Globe size={10} />
                                            <span className="text-[8px] font-bold uppercase">Trace</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Village Circles - Cluster Discovery */}
                <div className="px-4 mb-12">
                    <div className="bg-[var(--bg-elevated)] rounded-[32px] p-6 border border-[var(--border-glow)] shadow-whisk-float overflow-hidden relative">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--accent-secondary)]/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                                <Map className="w-4 h-4 text-[var(--accent-secondary)]" />
                                Village Circles
                            </h3>
                            <span className="px-2 py-0.5 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] rounded-md text-[8px] font-black uppercase">Live Clusters</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed mb-6">Discovery mode enabled. You are seeing produce from 5 nearby village clusters.</p>
                        <div className="relative h-24 flex items-center justify-center">
                            <div className="absolute w-20 h-20 border border-[var(--accent-secondary)]/30 rounded-full animate-ping"></div>
                            <div className="absolute w-12 h-12 border border-[var(--accent-secondary)]/50 rounded-full bg-[var(--accent-secondary)]/5 shadow-glow-sm"></div>
                            <div className="flex gap-8 relative z-10">
                                <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-full backdrop-blur-md border border-white/5">Cluster A</span>
                                <span className="text-xs font-bold text-white px-3 py-1 bg-white/5 rounded-full backdrop-blur-md border border-white/5">Cluster B</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cart Footer */}
                {cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-orange-500 text-white p-4 flex justify-between items-center shadow-lg">
                        <div>
                            <p className="font-bold">{cart.reduce((s, c) => s + c.quantity, 0)} items</p>
                            <p className="text-orange-100 text-sm">₹{cartTotal} + ₹30 delivery</p>
                        </div>
                        <Button onClick={placeOrder} className="bg-white text-orange-500 hover:bg-orange-50">
                            Place Order <ChevronRight size={16} />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // ==================== TRUST CHAIN TRACKER VIEW ====================
    if (view === 'TRUST_TRACKER') {
        return (
            <div className="min-h-screen bg-[var(--bg-deep)] pb-24">
                <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 text-white p-4 pt-6 pb-20 rounded-b-[40px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <button onClick={() => setView('CONSUMER_SHOP')} className="flex items-center gap-2 mb-6 relative z-10 font-bold" aria-label="Back to Shop">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Authenticated Batch</p>
                        <h1 className="text-2xl font-black tracking-tight mb-2">Trust Chain™ Visual</h1>
                        <p className="text-xs font-medium text-emerald-100 italic">"Verified through VillageLink Infrastructure"</p>
                    </div>
                </div>

                <div className="px-6 -mt-10 relative z-20">
                    <div className="v5-card p-6 rounded-[32px] border-white/10 shadow-whisk-float bg-slate-900/40 backdrop-blur-xl relative">
                        <div className="v5-trust-line"></div>
                        <div className="v5-trust-active h-[70%]"></div>

                        <div className="space-y-10">
                            {/* Node 1: Harvest */}
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-0 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-xl shadow-glow-sm z-10 border-2 border-slate-950">🌱</div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Harvested</h4>
                                        <span className="text-[10px] font-bold text-slate-500">05:12 AM</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium mb-3 line-clamp-2">Direct from Nasirganj Organic Hub. Farmer: Ramesh K.</p>
                                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-xl">
                                        <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center p-0.5">
                                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=20x20&data=verified_harvest" alt="QR" />
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Farmer Verified ✓</span>
                                    </div>
                                </div>
                            </div>

                            {/* Node 2: Quality Check */}
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-0 w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-glow-sm z-10 border-2 border-slate-950">📦</div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Quality Check</h4>
                                        <span className="text-[10px] font-bold text-slate-500">06:30 AM</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium mb-3">Dehri Collection Center. Grade A Certification.</p>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[8px] font-black uppercase border border-blue-500/20">🌡️ 22°C</span>
                                        <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[8px] font-black uppercase border border-rose-500/20">💧 65% Hum</span>
                                    </div>
                                </div>
                            </div>

                            {/* Node 3: Transit */}
                            <div className="relative pl-12 opacity-50">
                                <div className="absolute left-0 top-0 w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl z-10 border-2 border-slate-950">🏍️</div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">In Transit</h4>
                                        <span className="text-[10px] font-bold text-slate-500">Expected 09:15 AM</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">Out for delivery with Hero Driver: Suresh M.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 glass-3 p-6 rounded-[32px] border-white/5">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Pricing Transparency</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">Farmer Proceeds (80%)</span>
                                <span className="text-white">₹{((selectedListing?.pricePerUnit || 0) * 0.8).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">Logistics & Safety Fee</span>
                                <span className="text-white">₹{((selectedListing?.pricePerUnit || 0) * 0.15).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-white/5">
                                <span className="text-emerald-400 font-black text-sm uppercase">Total Trust Paid</span>
                                <span className="text-emerald-400 font-black text-sm font-mono">₹{selectedListing?.pricePerUnit}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== HOME VIEW (V5 DESIGN) ====================
    return (
        <div className="min-h-screen bg-[var(--bg-deep)] pb-20">
            {/* V5 Mesh Background */}
            <div className="v5-mesh-bg fixed inset-0 z-0"></div>

            {/* Header - V5 Premium */}
            <div className="relative z-10 p-4 pt-6 pb-8">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 mb-4 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                        <ArrowLeft size={20} /> Back
                    </button>
                )}
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">🌾 <span className="v5-gradient-text">GramMandi</span></h1>
                <p className="text-[var(--text-muted)] font-medium">Farm to Kitchen Marketplace</p>
            </div>

            {/* V5 Quick Stats */}
            <div className="flex gap-3 px-4 -mt-2 overflow-x-auto pb-4 relative z-10">
                {[
                    { icon: <Wheat className="text-[var(--accent-warm)]" size={24} />, value: listings.length.toString(), label: 'Products' },
                    { icon: <Users className="text-[var(--accent-secondary)]" size={24} />, value: '50+', label: 'Farmers' },
                    { icon: <TrendingUp className="text-[var(--accent-primary)]" size={24} />, value: '70%+', label: 'Earnings' }
                ].map((stat, i) => (
                    <div key={i} className="min-w-[120px] v5-card p-4 rounded-2xl">
                        {stat.icon}
                        <p className="text-xl font-extrabold text-[var(--text-primary)] mt-2">{stat.value}</p>
                        <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* V5 Role Selection Bento Grid */}
            <div className="p-4 relative z-10">
                <h2 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-xs">👤</span>
                    I am a...
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setView('FARMER_DASHBOARD')} className="v5-bento-card p-4 text-left group">
                        <div className="w-10 h-10 v5-icon-emerald rounded-xl flex items-center justify-center text-white mb-3">
                            <Wheat size={22} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">Farmer</h3>
                        <p className="text-xs text-[var(--text-muted)]">Sell crops, dairy, produce</p>
                    </button>
                    <button onClick={() => setView('CONSUMER_SHOP')} className="v5-bento-card p-4 text-left group">
                        <div className="w-10 h-10 v5-icon-warm rounded-xl flex items-center justify-center text-white mb-3">
                            <ShoppingCart size={22} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-warm)] transition-colors">Consumer</h3>
                        <p className="text-xs text-[var(--text-muted)]">Buy fresh from farms</p>
                    </button>
                    <button className="v5-bento-card p-4 text-left group">
                        <div className="w-10 h-10 v5-icon-cyan rounded-xl flex items-center justify-center text-white mb-3">
                            <Package size={22} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)]">Vendor</h3>
                        <p className="text-xs text-[var(--text-muted)]">Wholesale buying</p>
                    </button>
                    <button className="v5-bento-card p-4 text-left group">
                        <div className="w-10 h-10 v5-icon-purple rounded-xl flex items-center justify-center text-white mb-3">
                            <Warehouse size={22} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)]">Cold Storage</h3>
                        <p className="text-xs text-[var(--text-muted)]">Rent storage space</p>
                    </button>
                </div>
            </div>

            {/* V5 Featured Produce */}
            <div className="px-4 relative z-10">
                <div className="v5-section-header px-0 mb-3">
                    <h2 className="v5-section-title text-base">
                        <span className="w-6 h-6 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-xs">🔥</span>
                        Fresh Today
                    </h2>
                    <button onClick={() => setView('CONSUMER_SHOP')} className="v5-section-action">View All →</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {listings.slice(0, 4).map(listing => (
                        <div key={listing.id} className="min-w-[150px] v5-product-card p-4">
                            <div className="text-3xl mb-2">{getCropEmoji(listing.category, listing.crop)}</div>
                            <h3 className="font-bold text-sm text-[var(--text-primary)]">{listing.crop}</h3>
                            <p className="text-xs text-[var(--text-muted)]">{listing.location.village}</p>
                            <p className="text-[var(--accent-warm)] font-bold mt-2 font-mono">₹{listing.pricePerUnit}<span className="text-xs text-[var(--text-muted)]">/{listing.unit}</span></p>
                            {listing.organic && <span className="text-[9px] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] px-1.5 py-0.5 rounded mt-1 inline-block">🌿 Organic</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* V5 How It Works */}
            <div className="px-4 mt-4 relative z-10">
                <h2 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-xs">📋</span>
                    How It Works
                </h2>
                <div className="v5-card rounded-2xl p-4 space-y-3">
                    {[
                        { icon: '👨‍🌾', title: 'Farmer Lists', desc: 'Post your harvest with price' },
                        { icon: '🛒', title: 'Buyer Orders', desc: 'Consumers/vendors place orders' },
                        { icon: '🚛', title: 'We Deliver', desc: 'Direct farm pickup & delivery' },
                        { icon: '💰', title: 'Farmer Earns', desc: '70-80% of sale price' }
                    ].map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--bg-elevated)] rounded-xl flex items-center justify-center text-lg">{step.icon}</div>
                            <div>
                                <h3 className="font-medium text-[var(--text-primary)] text-sm">{step.title}</h3>
                                <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* V5 Mandi Khabar */}
            {news.length > 0 && (
                <div className="px-4 mt-6 relative z-10">
                    <h2 className="font-bold text-[var(--text-primary)] mb-3">📰 Mandi Khabar</h2>
                    <div className="flex gap-3 overflow-x-auto pb-4">
                        {news.map((item, idx) => (
                            <div key={idx} className="min-w-[260px] v5-card rounded-2xl p-4">
                                <span className="v5-live-badge inline-flex mb-2">Update</span>
                                <h4 className="font-bold text-sm text-[var(--text-primary)] line-clamp-1">{item.title}</h4>
                                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GramMandiHome;
