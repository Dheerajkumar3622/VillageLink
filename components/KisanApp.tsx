/**
 * KisanApp - Farmer Portal
 * Separate app for farmers to manage produce and earnings
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Wheat, Milk, Plus, Package, DollarSign, BarChart3,
    TrendingUp, MapPin, Phone, Mail, Lock, User, Leaf, ChevronRight, LogOut,
    Camera, Calendar, Check, Clock
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'CREATE_LISTING' | 'DAIRY' | 'ORDERS';

interface KisanUser {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

export const KisanApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<KisanUser | null>(null);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regVillage, setRegVillage] = useState('');
    const [regDistrict, setRegDistrict] = useState('Rohtas');

    // Stats
    const [stats, setStats] = useState({
        activeListings: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        milkSupplied: 0,
        dairyEarnings: 0
    });

    // Listings
    const [listings, setListings] = useState<any[]>([]);

    useEffect(() => {
        // Check if already logged in
        const token = getAuthToken();
        if (token) {
            checkAuth();
        }
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
                role: 'FARMER', // Special role for farmers
                address: regVillage,
                pincode: regDistrict
            });
            if (result.success) {
                setAuthMode('LOGIN');
                setError(null);
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

            // Fetch farmer stats
            const statsRes = await fetch(`${API_BASE_URL}/api/grammandi/dashboard/farmer`, { headers });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // Fetch listings
            const listingsRes = await fetch(`${API_BASE_URL}/api/grammandi/produce/my-listings`, { headers });
            if (listingsRes.ok) {
                setListings(await listingsRes.json());
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
    };

    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-950 dark:to-emerald-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Wheat className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">KisanApp</h1>
                        <p className="text-slate-500 text-sm">अपनी फसल बेचें, सीधे ग्राहक को</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
                        )}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Phone / Email</label>
                                    <div className="relative mt-1">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={loginId}
                                            onChange={e => setLoginId(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                            placeholder="Enter phone or email"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" fullWidth disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New farmer? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-green-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1" placeholder="Your name" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                                    <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1" placeholder="Mobile number" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Village</label>
                                        <input type="text" value={regVillage} onChange={e => setRegVillage(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1" placeholder="Village" required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">District</label>
                                        <input type="text" value={regDistrict} onChange={e => setRegDistrict(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1" placeholder="District" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1" placeholder="Create password" required />
                                </div>
                                <Button type="submit" fullWidth disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register as Farmer'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-green-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-6">
                        Part of VillageLink Ecosystem
                    </p>
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || 'K'}
                        </div>
                        <div>
                            <p className="text-green-100 text-xs">Namaste,</p>
                            <h1 className="font-bold">{user?.name || 'Kisan'}</h1>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full">
                        <LogOut size={18} />
                    </button>
                </div>
                <h2 className="text-xl font-bold">👨‍🌾 Kisan Dashboard</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Package className="text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.activeListings}</p>
                    <p className="text-xs text-slate-500">Active Listings</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Clock className="text-orange-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.pendingOrders}</p>
                    <p className="text-xs text-slate-500">Pending Orders</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <DollarSign className="text-emerald-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-slate-500">Total Revenue</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Milk className="text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.milkSupplied}L</p>
                    <p className="text-xs text-slate-500">Milk Supplied</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-6">
                <h2 className="font-bold dark:text-white mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button className="bg-green-500 text-white rounded-xl p-4 flex items-center gap-3">
                        <Plus size={24} />
                        <div className="text-left">
                            <p className="font-bold">Add Listing</p>
                            <p className="text-xs text-green-100">Sell your produce</p>
                        </div>
                    </button>
                    <button className="bg-blue-500 text-white rounded-xl p-4 flex items-center gap-3">
                        <Milk size={24} />
                        <div className="text-left">
                            <p className="font-bold">Log Milk</p>
                            <p className="text-xs text-blue-100">Daily collection</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* My Listings */}
            <div className="px-4 mt-6">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold dark:text-white">My Listings</h2>
                    <button className="text-green-600 text-sm font-medium">View All</button>
                </div>
                {listings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
                        <Wheat className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No listings yet</p>
                        <Button className="mt-4 bg-green-500"><Plus size={16} /> Add First Listing</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {listings.slice(0, 3).map((listing, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold dark:text-white">{listing.crop}</h3>
                                    <p className="text-xs text-slate-500">{listing.quantity} {listing.unit} @ ₹{listing.pricePerUnit}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {listing.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KisanApp;
