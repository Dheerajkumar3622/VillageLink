/**
 * StorageApp - Cold Storage Operator Portal
 * Separate app for cold storage operators to manage facilities and bookings
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Snowflake, Warehouse, DollarSign, Package, Clock, Check, X,
    Phone, Lock, User, LogOut, Plus, ChevronRight, MapPin, Thermometer, BarChart3
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'FACILITY_DETAILS' | 'BOOKINGS' | 'INVENTORY';

interface StorageUser {
    id: string;
    name: string;
    phone?: string;
    facilityName?: string;
}

interface StorageBooking {
    id: string;
    farmerName: string;
    crop: string;
    quantity: number;
    unit: string;
    startDate: string;
    endDate: string;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
    dailyRate: number;
}

export const StorageApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<StorageUser | null>(null);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regFacilityName, setRegFacilityName] = useState('');
    const [regCapacity, setRegCapacity] = useState('');
    const [regAddress, setRegAddress] = useState('');

    // Bookings
    const [bookings, setBookings] = useState<StorageBooking[]>([]);

    // Stats
    const [stats, setStats] = useState({
        totalCapacity: 500,
        usedCapacity: 320,
        pendingRequests: 5,
        monthlyRevenue: 45000,
        temperature: -18
    });

    const occupancyPercentage = Math.round((stats.usedCapacity / stats.totalCapacity) * 100);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.setProperty('--progress', `${occupancyPercentage}%`);
            progressRef.current.setAttribute('aria-valuenow', String(stats.usedCapacity));
            progressRef.current.setAttribute('aria-valuemin', '0');
            progressRef.current.setAttribute('aria-valuemax', String(stats.totalCapacity));
        }
    }, [occupancyPercentage, stats.usedCapacity, stats.totalCapacity]);

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
                regFacilityName,
                'STORAGE_OPERATOR',
                password,
                '', // email
                regPhone,
                parseFloat(regCapacity),
                undefined,
                regAddress
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

            // Fetch facility details & stats
            const facilityRes = await fetch(`${API_BASE_URL}/api/grammandi/storage/facility`, { headers });
            if (facilityRes.ok) {
                const data = await facilityRes.json();
                setStats(data.stats || stats);
            }

            // Fetch bookings
            const bookingsRes = await fetch(`${API_BASE_URL}/api/grammandi/storage/my-bookings`, { headers });
            if (bookingsRes.ok) setBookings(await bookingsRes.json());

        } catch (e) {
            console.error('Fetch error:', e);
            // Minimal fallback
            setStats(prev => ({ ...prev, pendingRequests: 0 }));
        }
    };


    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-slate-950 dark:to-cyan-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Snowflake className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">StorageApp</h1>
                        <p className="text-slate-500 text-sm">Cold Storage Management</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required aria-label="Login ID (Phone or Email)" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required aria-label="Password" />
                                <Button type="submit" fullWidth disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New operator? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-cyan-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regFacilityName} onChange={e => setRegFacilityName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Facility Name" required aria-label="Facility Name" />
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Owner Name" required aria-label="Owner Name" />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required aria-label="Phone Number" />
                                <input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Capacity (Tons)" required aria-label="Capacity in Tons" />
                                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Full Address" required aria-label="Address" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required aria-label="Password" />
                                <Button type="submit" fullWidth disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register Facility'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-cyan-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== BOOKINGS VIEW ====================
    if (viewState === 'BOOKINGS') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                    <button onClick={() => setViewState('DASHBOARD')} className="flex items-center gap-2 mb-4">
                        <ChevronRight className="rotate-180" size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">📋 Storage Bookings</h1>
                </div>

                <div className="px-4 mt-4 space-y-3">
                    {bookings.map(booking => (
                        <div key={booking.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold dark:text-white">{booking.crop}</h3>
                                    <p className="text-sm text-slate-500">{booking.quantity} {booking.unit}</p>
                                    <p className="text-xs text-slate-400">by {booking.farmerName}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {booking.status}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                                {booking.startDate} → {booking.endDate || 'Ongoing'}
                            </div>
                            {booking.status === 'PENDING' && (
                                <div className="mt-3 flex gap-2">
                                    <Button className="bg-green-500 flex-1"><Check size={14} /> Accept</Button>
                                    <Button className="bg-red-500 flex-1"><X size={14} /> Reject</Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-hidden">
            <div className="animated-bg opacity-40"></div>

            {/* Header - Glassmorphism */}
            <div className="glass-panel sticky top-0 z-30 px-4 py-4 rounded-b-3xl border-b-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-glow-sm">
                            <Snowflake size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{user?.facilityName || user?.name || 'Cold Storage'}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-black text-cyan-600 uppercase tracking-widest">
                                <Thermometer size={10} /> Active Cooling: {stats.temperature}°C
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors" aria-label="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <div className="px-4 mt-6 animate-fadeInUp">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Warehouse className="text-cyan-500" /> Storage Portal
                </h2>

                {/* Capacity Bar - Premium */}
                <div className="premium-card p-6 mb-8 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Space Utilization</span>
                        <span className="text-sm font-black dark:text-white">{stats.usedCapacity} / {stats.totalCapacity} Tons</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            ref={progressRef}
                            aria-valuenow="0"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label="Storage capacity utilization"
                            role="progressbar"
                            className={`h-full rounded-full transition-all duration-1000 admin-progress-bar ${occupancyPercentage > 85 ? 'bg-red-500 shadow-glow-sm' : occupancyPercentage > 65 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{stats.totalCapacity - stats.usedCapacity} Tons Available</p>
                        <p className="text-sm font-black text-cyan-600">{occupancyPercentage}% Full</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <Clock className="text-amber-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">{stats.pendingRequests}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Pending Approval</p>
                    </div>
                    <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                        <DollarSign className="text-emerald-500 mb-2" size={24} />
                        <p className="text-2xl font-black dark:text-white">₹{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Revenue/Mo</p>
                    </div>
                </div>

                {/* Primary Action Button - Premium */}
                <div className="mb-8">
                    <button
                        onClick={() => setViewState('BOOKINGS')}
                        className="btn-cta w-full flex items-center justify-between group py-6 !from-cyan-600 !to-blue-700"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                                <Package size={28} />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-xl text-white">Manage Bookings</p>
                                <p className="text-xs text-cyan-100 font-medium">Review and accept crop storage requests</p>
                            </div>
                        </div>
                        <ChevronRight className="opacity-50" />
                    </button>
                </div>

                {/* Inventory Report Area */}
                <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Quick Reports</h2>
                    <button className="text-cyan-600 text-[10px] font-black uppercase tracking-widest">
                        Inventory Audit
                    </button>
                </div>

                <div className="premium-card p-6 flex items-center justify-between hover:border-cyan-500/50 transition-all cursor-pointer" role="button" tabIndex={0} aria-label="Download Inventory Report Summary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="font-black dark:text-white">Download Inventory Report</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">January 2026 Summary</p>
                        </div>
                    </div>
                    <ChevronRight className="text-slate-300" />
                </div>
            </div>
        </div>
    );
};

export default StorageApp;
