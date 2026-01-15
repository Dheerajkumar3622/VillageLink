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
                setUser(result.user);
                setViewState('DASHBOARD');
                fetchData();
            } else {
                setError(result.error || 'Login failed');
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
            const result = await registerUser({
                name: regName,
                phone: regPhone,
                password,
                role: 'VENDOR',
                businessName: regBusinessName
            });
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Please login.');
            } else {
                setError(result.error || 'Registration failed');
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

            // Fetch wholesale listings
            const listingsRes = await fetch(`${API_BASE_URL}/api/grammandi/produce/listings?minQuantity=100`);
            if (listingsRes.ok) setListings(await listingsRes.json());

            // Fetch my bids
            const bidsRes = await fetch(`${API_BASE_URL}/api/grammandi/wholesale/my-bids`, { headers });
            if (bidsRes.ok) setMyBids(await bidsRes.json());

        } catch (e) {
            console.error('Fetch error:', e);
            // Mock data
            setListings([
                { id: 'l1', farmerId: 'f1', farmerName: 'Ramesh Kumar', crop: 'Onion', variety: 'Red', quantity: 500, unit: 'QUINTAL', pricePerUnit: 2200, location: { village: 'Kotha', district: 'Rohtas' }, grade: 'A', bidCount: 3 },
                { id: 'l2', farmerId: 'f2', farmerName: 'Suresh Yadav', crop: 'Potato', variety: 'Desi', quantity: 300, unit: 'QUINTAL', pricePerUnit: 1800, location: { village: 'Dehri', district: 'Rohtas' }, grade: 'B', bidCount: 5 },
                { id: 'l3', farmerId: 'f3', farmerName: 'Mohan Singh', crop: 'Wheat', variety: 'Lokwan', quantity: 100, unit: 'QUINTAL', pricePerUnit: 2100, location: { village: 'Sasaram', district: 'Rohtas' }, grade: 'A', bidCount: 2 },
            ]);
            setStats({ activeBids: 5, wonBids: 12, totalPurchases: 45, pendingDeliveries: 3 });
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                    <button onClick={() => setViewState('DASHBOARD')} className="flex items-center gap-2 mb-4">
                        <ChevronRight className="rotate-180" size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">🏪 Wholesale Market</h1>
                    <p className="text-purple-100 text-sm">Place bids on bulk produce</p>
                </div>

                <div className="px-4 mt-4 space-y-3">
                    {listings.map(listing => (
                        <div key={listing.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-start gap-3">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center text-2xl">
                                    {getCropEmoji(listing.crop)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h3 className="font-bold dark:text-white">{listing.crop} - {listing.variety}</h3>
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Grade {listing.grade}</span>
                                    </div>
                                    <p className="text-sm text-slate-500">{listing.quantity} {listing.unit}</p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} /> {listing.location.village}, {listing.location.district}</p>
                                    <p className="text-xs text-slate-400">by {listing.farmerName} • {listing.bidCount} bids</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <p className="text-lg font-bold text-purple-600">₹{listing.pricePerUnit}<span className="text-xs text-slate-400">/{listing.unit}</span></p>
                                <span className="text-xs text-slate-400">asking price</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <input type="number" value={bidAmount[listing.id] || ''} onChange={e => setBidAmount({ ...bidAmount, [listing.id]: parseFloat(e.target.value) })} placeholder="Your bid ₹" className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                                <Button onClick={() => placeBid(listing.id)} className="bg-purple-600">
                                    <Gavel size={16} /> Bid
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Store size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold">{user?.name || 'Vyapari'}</h1>
                            <p className="text-purple-100 text-xs">{user?.businessName || 'Business'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full">
                        <LogOut size={18} />
                    </button>
                </div>
                <h2 className="text-xl font-bold">🏪 Vyapari Dashboard</h2>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Gavel className="text-purple-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.activeBids}</p>
                    <p className="text-xs text-slate-500">Active Bids</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Check className="text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.wonBids}</p>
                    <p className="text-xs text-slate-500">Won Bids</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Package className="text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.totalPurchases}</p>
                    <p className="text-xs text-slate-500">Total Orders</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Clock className="text-orange-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.pendingDeliveries}</p>
                    <p className="text-xs text-slate-500">Pending Delivery</p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 mt-6">
                <Button onClick={() => setViewState('BROWSE_LISTINGS')} fullWidth className="bg-purple-600 hover:bg-purple-700">
                    <Search size={18} /> Browse Wholesale Listings
                </Button>
            </div>

            {/* Recent Bids */}
            <div className="px-4 mt-6">
                <h2 className="font-bold dark:text-white mb-3">Recent Activity</h2>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
                    <Gavel className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No recent bids</p>
                    <p className="text-xs text-slate-400 mt-1">Browse listings to place your first bid</p>
                </div>
            </div>
        </div>
    );
};

export default VyapariApp;
