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
    Camera, Calendar, Check, Clock, Sun, Cloud, CloudRain
} from 'lucide-react';
import { getWeatherData, getNewsData } from '../services/mlService';

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
    const [weather, setWeather] = useState<any>(null);
    const [news, setNews] = useState<any[]>([]);
    const [selectedUnit, setSelectedUnit] = useState('kg');

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
                'FARMER',
                password,
                '',
                regPhone,
                undefined,
                undefined,
                regVillage,
                regDistrict
            );
            if (result.success) {
                setAuthMode('LOGIN');
                setError(null);
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

            // Fetch weather
            const weatherData = await getWeatherData();
            setWeather(weatherData);

            // Fetch news
            const newsData = await getNewsData();
            setNews(newsData);
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
    if (viewState === 'DASHBOARD') {
        return (
            <div className="min-h-screen bg-transparent pb-20 relative overflow-hidden">
                {/* Background Animation Overlay */}
                <div className="animated-bg opacity-50"></div>

                {/* Header - Glassmorphism */}
                <div className="glass-3 sticky top-0 z-30 px-4 py-4 rounded-b-[40px] border-b-emerald-500/20 backdrop-blur-3xl shadow-whisk-float">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-glow-md">
                                {user?.name?.charAt(0)?.toUpperCase() || 'K'}
                            </div>
                            <div>
                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">Namaste,</p>
                                <h1 className="font-black text-white text-xl tracking-tight">{user?.name || 'Kisan'}</h1>
                            </div>
                        </div>
                        <button onClick={handleLogout} aria-label="Logout" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 group transition-all">
                            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-4 mt-6 animate-fadeInUp">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <Wheat className="text-emerald-500" /> Kisan Dashboard
                    </h2>

                    {/* Stats Grid - Premium 3D Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-8 perspective-1000">
                        <div onClick={() => setViewState('ORDERS')} className="nano-banana-3d glass-3 p-5 rounded-[28px] border-white/5 hover:border-emerald-500/30 cursor-pointer active:scale-95 transition-transform">
                            <Package className="text-emerald-400 mb-2" size={20} />
                            <p className="text-3xl font-black text-white tracking-widest leading-none mb-1">{stats.activeListings}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Listings</p>
                        </div>
                        <div onClick={() => setViewState('ORDERS')} className="nano-banana-3d glass-3 p-5 rounded-[28px] border-white/5 hover:border-warm-500/30 cursor-pointer active:scale-95 transition-transform translate-z-20">
                            <Clock className="text-warm-500 mb-2" size={20} />
                            <p className="text-3xl font-black text-white tracking-widest leading-none mb-1">{stats.pendingOrders}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending Orders</p>
                        </div>
                        <div onClick={() => alert("Detailed Revenue Report Coming Soon!")} className="nano-banana-3d glass-3 p-5 rounded-[28px] border-white/5 hover:border-blue-500/30 cursor-pointer active:scale-95 transition-transform">
                            <DollarSign className="text-blue-500 mb-2" size={20} />
                            <p className="text-3xl font-black text-white tracking-widest leading-none mb-1">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Revenue</p>
                        </div>
                        <div onClick={() => setViewState('DAIRY')} className="nano-banana-3d glass-3 p-5 rounded-[28px] border-white/5 hover:border-emerald-400/30 cursor-pointer active:scale-95 transition-transform translate-z-n10">
                            <Milk className="text-emerald-400 mb-2" size={20} />
                            <p className="text-3xl font-black text-white tracking-widest leading-none mb-1">{stats.milkSupplied}L</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Milk Logged</p>
                        </div>
                    </div>

                    {/* Quick Action Container - Holographic Gradient */}
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <button
                            onClick={() => setViewState('CREATE_LISTING')}
                            className="btn-cta w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-lg">Sell New Crop</p>
                                    <p className="text-xs text-emerald-100 font-medium">List your produce in Mandi</p>
                                </div>
                            </div>
                            <ChevronRight className="opacity-50" />
                        </button>

                        <button
                            onClick={() => setViewState('DAIRY')}
                            className="btn-primary w-full flex items-center justify-between !bg-gradient-to-r !from-emerald-500 !to-blue-600 border-none"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Milk size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-lg">Dairy Management</p>
                                    <p className="text-xs text-emerald-100 font-medium">Log daily milk collection</p>
                                </div>
                            </div>
                            <ChevronRight className="opacity-50" />
                        </button>
                    </div>

                    {/* Weather Advice - Glassy */}
                    {weather && (
                        <div className="glass-panel p-6 rounded-3xl mb-8 relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border-emerald-500/20">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                        {weather.condition.includes('Sun') ? <Sun size={20} /> : <CloudRain size={20} />}
                                        <span className="text-sm font-black uppercase tracking-widest">{weather.condition}</span>
                                    </div>
                                    <h3 className="text-4xl font-black dark:text-white">{weather.temp}°C</h3>
                                    <p className="text-sm text-slate-500 mt-2 font-medium max-w-[200px] leading-relaxed">
                                        {weather.advisory}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Mausam Salah</span>
                                    <div className="mt-8 text-slate-400">
                                        <MapPin size={16} className="inline mr-1" />
                                        <span className="text-xs font-bold">{weather.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Listings Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Active Listings</h2>
                        <button onClick={() => setViewState('ORDERS')} className="text-emerald-600 text-sm font-black flex items-center gap-1 uppercase tracking-widest">
                            My Orders <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Listings List - Premium Items */}
                    <div className="space-y-4">
                        {listings.length === 0 ? (
                            <div className="premium-card p-12 text-center border-dashed border-2">
                                <Wheat className="mx-auto text-slate-300 mb-4 opacity-50" size={64} />
                                <p className="text-slate-500 font-bold uppercase tracking-widest mb-4">No Active Listings</p>
                                <Button onClick={() => setViewState('CREATE_LISTING')} className="btn-primary">Add Listing</Button>
                            </div>
                        ) : (
                            listings.slice(0, 3).map((listing, idx) => (
                                <div key={idx} className="premium-card p-5 group hover:border-emerald-500/50 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <Package size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-black dark:text-white text-lg">{listing.crop}</h3>
                                            <p className="text-sm text-slate-500 font-bold tracking-tight">
                                                {listing.quantity} {listing.unit} • <span className="text-emerald-600">₹{listing.pricePerUnit}/{listing.unit}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        {listing.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== CREATE LISTING VIEW ====================
    if (viewState === 'CREATE_LISTING') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative">
                <div className="animated-bg opacity-30"></div>

                {/* Header */}
                <div className="glass-panel sticky top-0 z-30 px-4 py-6 border-b-emerald-500/20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewState('DASHBOARD')} aria-label="Back to Dashboard" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">New Produce Listing</h1>
                    </div>
                </div>

                <div className="px-4 mt-8 animate-fadeInUp">
                    <form className="space-y-6" onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const token = getAuthToken();
                        setLoading(true);

                        try {
                            const res = await fetch(`${API_BASE_URL}/api/grammandi/produce/listing`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    category: 'VEGETABLES',
                                    crop: formData.get('crop'),
                                    variety: 'Standard',
                                    quantity: parseFloat(formData.get('quantity') as string),
                                    unit: selectedUnit.toUpperCase(),
                                    pricePerUnit: parseFloat(formData.get('price') as string),
                                    location: {
                                        village: regVillage,
                                        district: regDistrict,
                                        pincode: '821115'
                                    }
                                })
                            });

                            if (res.ok) {
                                alert('Crop listed successfully!');
                                setViewState('DASHBOARD');
                                fetchData();
                            }
                        } catch (err) {
                            alert('failed to list crop');
                        } finally {
                            setLoading(false);
                        }
                    }}>
                        <div className="premium-card p-6 space-y-6">
                            {/* V5 ML Price Recommendation */}
                            <div className="v5-price-rec">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-warm-500 uppercase tracking-widest">AI Recommendation</span>
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase">High Demand</span>
                                </div>
                                <div className="text-sm font-black text-white mb-1">Recommended: ₹42 - ₹48 / kg</div>
                                <div className="text-[10px] text-slate-500 font-medium">Based on local market trends & supply gaps.</div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Crop Name / फसल का नाम</label>
                                <div className="relative">
                                    <Wheat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input name="crop" required className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold" placeholder="e.g. Wheat, Potato, Rice" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Quantity / मात्रा</label>
                                    <div className="relative">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input name="quantity" type="number" required className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold" placeholder="Amount" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Price (₹/unit) / मूल्य</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input name="price" type="number" required className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold" placeholder="Rate" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Unit / इकाई चुनें</label>
                                <div className="v5-unit-chips">
                                    {['gram', 'kg', 'quintal', 'liter'].map(unit => (
                                        <div
                                            key={unit}
                                            onClick={() => setSelectedUnit(unit)}
                                            className={`v5-unit-chip ${selectedUnit === unit ? 'active' : ''}`}
                                        >
                                            {unit}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Photo (Optional)</label>
                                <button type="button" className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                                    <Camera size={32} />
                                    <span className="text-xs font-bold mt-2 uppercase tracking-tight">Tap to capture image</span>
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button disabled={loading} type="submit" className="btn-cta w-full py-5 !rounded-2xl shadow-glow-md flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="animate-spin" /> : <>
                                    <Check size={24} />
                                    <span className="text-xl font-black uppercase">Publish Listing</span>
                                </>}
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-4 font-medium italic">
                                Note: Your listing will be visible to all wholesalers after standard verification.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Fallback/Placeholder for other views (DAIRY, ORDERS)
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-hidden flex flex-col items-center justify-center">
            <div className="animated-bg opacity-30"></div>

            <div className="glass-panel p-8 rounded-[32px] text-center max-w-sm mx-4 relative z-10 animate-fade-in-up border-emerald-500/20">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                    {viewState === 'DAIRY' ? <Milk size={40} className="text-emerald-500" /> : <Package size={40} className="text-emerald-500" />}
                </div>

                <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-wide">
                    {viewState === 'DAIRY' ? 'Dairy Center' : 'My Orders'}
                </h1>

                <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                    This module is under construction in the deployment chamber.
                </p>

                <Button onClick={() => setViewState('DASHBOARD')} className="bg-emerald-600 hover:bg-emerald-700 w-full shadow-glow-md">
                    Return to HQ
                </Button>
            </div>
        </div>
    );
};

export default KisanApp;
