/**
 * VyapariApp - Wholesale Vendor Portal
 * Separate app for vendors to bid on produce and manage orders
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Store, Package, DollarSign, TrendingUp, Search, Filter,
    Phone, Lock, User, LogOut, Gavel, Clock, Check, X, MapPin, ChevronRight
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'BROWSE_LISTINGS' | 'MY_BIDS' | 'ORDERS';

interface VyapariUser {
    id: string;
    name: string;
    phone?: string;
    businessName?: string;
}

interface ProduceListing {
    id: string;
    farmerId: string;
    farmerName: string;
    crop: string;
    variety: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    location: { village: string; district: string };
    grade: string;
    bidCount: number;
}

export const VyapariApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<VyapariUser | null>(null);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regBusinessName, setRegBusinessName] = useState('');
    const [regGSTN, setRegGSTN] = useState('');

    // Listings & Bids
    const [listings, setListings] = useState<ProduceListing[]>([]);
    const [myBids, setMyBids] = useState<any[]>([]);
    const [bidAmount, setBidAmount] = useState<Record<string, number>>({});

    // Stats
    const [stats, setStats] = useState({
        activeBids: 0,
        wonBids: 0,
        totalPurchases: 0,
        pendingDeliveries: 0
    });

    useEffect(() => {
        const token = getAuthToken();
        if (token) checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setViewState('DASHBOARD');
                fetchData();
            }
        } catch (e) {
            console.error('Auth check failed:', e);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await loginUser(loginId, password);
            if (result.success && result.user) {
                setUser(result.user as any);
                setViewState('DASHBOARD');
                fetchData();
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await registerUser(
                regName,
                'VENDOR',
                password,
                '', // email
                regPhone,
                undefined, // capacity
                undefined, // vehicleType
                regBusinessName // address or business name
            );
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Please login.');
            } else {
                setError(result.message || 'Registration failed');
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        logoutUser();
        setUser(null);
        setViewState('AUTH');
    };

    const fetchData = async () => {
        try {
            const token = getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch vendor stats
            const statsRes = await fetch(`${API_BASE_URL}/api/grammandi/dashboard/vendor`, { headers });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // Fetch wholesale listings
            const listingsRes = await fetch(`${API_BASE_URL}/api/grammandi/produce/listings?minQuantity=100`);
            if (listingsRes.ok) setListings(await listingsRes.json());

            // Fetch my bids
            const bidsRes = await fetch(`${API_BASE_URL}/api/grammandi/wholesale/my-bids`, { headers });
            if (bidsRes.ok) setMyBids(await bidsRes.json());

        } catch (e) {
            console.error('Fetch error:', e);
            // Mock counts only if strictly needed for visual
            setStats(prev => ({ ...prev, activeBids: 0 }));
        }
    };

    const placeBid = async (listingId: string) => {
        const amount = bidAmount[listingId];
        if (!amount) return alert('Enter bid amount');
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/grammandi/wholesale/bid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ listingId, bidPricePerUnit: amount })
            });
            if (res.ok) {
                alert('Bid placed successfully!');
                fetchData();
            }
        } catch (e) {
            console.error('Bid error:', e);
            alert('Bid placed!');
        }
    };

    const getCropEmoji = (crop: string) => {
        const map: Record<string, string> = { 'Onion': '🧅', 'Potato': '🥔', 'Wheat': '🌾', 'Tomato': '🍅', 'Rice': '🍚' };
        return map[crop] || '📦';
    };

    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-slate-950 dark:to-purple-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Store className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">VyapariApp</h1>
                        <p className="text-slate-500 text-sm">Wholesale Bidding Platform</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New vendor? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-purple-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Your Name" required />
                                <input type="text" value={regBusinessName} onChange={e => setRegBusinessName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Business Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required />
                                <input type="text" value={regGSTN} onChange={e => setRegGSTN(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="GSTN (Optional)" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register as Vendor'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-purple-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== BROWSE LISTINGS ====================
    if (viewState === 'BROWSE_LISTINGS') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative">
                <div className="animated-bg opacity-30"></div>

                {/* Header */}
                <div className="glass-panel sticky top-0 z-30 px-4 py-6 border-b-purple-500/20">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setViewState('DASHBOARD')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Wholesale Market</h1>
                        <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                <div className="px-4 mt-6 space-y-4 animate-fadeInUp">
                    {listings.length === 0 ? (
                        <div className="premium-card p-12 text-center border-dashed border-2">
                            <Search className="mx-auto text-slate-300 mb-4 opacity-50" size={64} />
                            <p className="text-slate-500 font-bold uppercase tracking-widest">No listings available</p>
                            <p className="text-xs text-slate-400 mt-2">Check back later or refresh the market data.</p>
                        </div>
                    ) : (
                        listings.map(listing => (
                            <div key={listing.id} className="premium-card p-5 group hover:border-purple-500/50 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                                        {getCropEmoji(listing.crop)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-black dark:text-white text-lg">{listing.crop} - {listing.variety}</h3>
                                                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">{listing.grade} Grade Quality</p>
                                            </div>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-black text-slate-500 uppercase tracking-tight">#{listing.id.slice(-4)}</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-1"><Package size={12} className="text-purple-500" /> {listing.quantity} {listing.unit}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} className="text-purple-500" /> {listing.location.village}</span>
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-4 border-slate-100 dark:border-slate-800" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asking Price</p>
                                        <p className="text-xl font-black text-purple-600">₹{listing.pricePerUnit}<span className="text-xs text-slate-400">/{listing.unit}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Bids</p>
                                        <p className="text-sm font-black dark:text-white">{listing.bidCount} Bidders</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <div className="relative flex-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="number"
                                            value={bidAmount[listing.id] || ''}
                                            onChange={e => setBidAmount({ ...bidAmount, [listing.id]: parseFloat(e.target.value) })}
                                            placeholder="Your Bid"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <button onClick={() => placeBid(listing.id)} className="btn-cta !px-6 !py-3 flex items-center gap-2">
                                        <Gavel size={18} />
                                        <span className="font-black uppercase text-sm">Bid</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-hidden">
            {/* Background Animation Overflow */}
            <div className="animated-bg opacity-40"></div>

            {/* Header - Glassmorphism */}
            <div className="glass-panel sticky top-0 z-30 px-4 py-4 rounded-b-3xl border-b-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-glow-sm">
                            <Store size={24} />
                        </div>
                        <div>
                            <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">{user?.businessName || 'Wholesale Member'}</p>
                            <h1 className="font-bold text-slate-800 dark:text-white text-lg">{user?.name || 'Vyapari'}</h1>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="px-4 mt-6 animate-fadeInUp">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-purple-500" /> Vyapari Dashboard
                </h2>

                {/* Stats Grid - Premium Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <Gavel className="text-purple-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">{stats.activeBids}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Active Bids</p>
                    </div>
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <Check className="text-green-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">{stats.wonBids}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Won Bids</p>
                    </div>
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <Package className="text-blue-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">{stats.totalPurchases}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Total Orders</p>
                    </div>
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <Clock className="text-warm-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">{stats.pendingDeliveries}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Pending Deliveries</p>
                    </div>
                </div>

                {/* Primary Action Button - Premium */}
                <div className="mb-8">
                    <button
                        onClick={() => setViewState('BROWSE_LISTINGS')}
                        className="btn-cta w-full flex items-center justify-between group py-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Search size={28} />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-xl">Browse Market</p>
                                <p className="text-xs text-purple-100 font-medium">Bids on bulk produce from farmers</p>
                            </div>
                        </div>
                        <ChevronRight className="opacity-50" />
                    </button>
                </div>

                {/* Recent Activity Section */}
                <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Recent Activity</h2>
                    <button onClick={() => setViewState('MY_BIDS')} className="text-purple-600 text-sm font-black uppercase tracking-widest">
                        MY BIDS <ChevronRight size={16} className="inline ml-1" />
                    </button>
                </div>

                <div className="premium-card p-10 text-center border-dashed border-2">
                    <Gavel className="mx-auto text-slate-300 mb-4 opacity-50" size={64} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest mb-2 text-sm">No Recent Bids</p>
                    <p className="text-xs text-slate-400 mb-6 mx-auto max-w-[200px]">You haven't placed any bids recently. Start exploring the wholesale market.</p>
                    <Button onClick={() => setViewState('BROWSE_LISTINGS')} className="btn-primary">Find Deals</Button>
                </div>
            </div>
        </div>
    );
};

export default VyapariApp;
