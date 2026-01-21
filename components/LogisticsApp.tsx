/**
 * LogisticsApp - Delivery Partner Portal
 * Separate app for logistics partners to manage pickups and deliveries
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Truck, Package, DollarSign, MapPin, Clock, Check, Navigation,
    Phone, Lock, User, LogOut, ChevronRight, Camera, AlertCircle, BarChart3
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'ACTIVE_TRIP' | 'TRIP_HISTORY';

interface LogisticsUser {
    id: string;
    name: string;
    phone?: string;
    vehicleNumber?: string;
}

interface Trip {
    id: string;
    pickups: { location: string; crop: string; quantity: string; completed: boolean }[];
    deliveries: { location: string; customerName: string; completed: boolean }[];
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    totalDistance: number;
    estimatedEarnings: number;
}

export const LogisticsApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<LogisticsUser | null>(null);
    const [isOnline, setIsOnline] = useState(false);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regVehicleNumber, setRegVehicleNumber] = useState('');
    const [regVehicleType, setRegVehicleType] = useState('TEMPO');

    // Active Trip
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

    // Stats
    const [stats, setStats] = useState({
        todayTrips: 0,
        todayEarnings: 0,
        weekEarnings: 0,
        totalDeliveries: 0
    });
    const onlineToggleRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (onlineToggleRef.current) {
            onlineToggleRef.current.setAttribute('aria-pressed', isOnline ? 'true' : 'false');
        }
    }, [isOnline]);

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
                'LOGISTICS_PARTNER',
                password,
                '', // email
                regPhone,
                undefined,
                regVehicleType as any,
                regVehicleNumber
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

            // Fetch logistics stats/trips
            const res = await fetch(`${API_BASE_URL}/api/grammandi/logistics/my-trips`, { headers });
            if (res.ok) {
                const data = await res.json();
                // If it returns a list, we can use it to derive stats
                setStats({
                    todayTrips: data.length,
                    todayEarnings: data.reduce((acc: number, t: any) => acc + (t.earnings || 0), 0),
                    weekEarnings: 0, // Mock for now
                    totalDeliveries: data.length * 2
                });

                // Set first pending trip as active if online
                if (isOnline) {
                    const pending = data.find((t: any) => t.status === 'PENDING');
                    if (pending) setActiveTrip(pending);
                }
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
    };

    const toggleOnline = () => {
        setIsOnline(!isOnline);
        if (!isOnline) {
            fetchData();
        } else {
            setActiveTrip(null);
        }
    };

    const startTrip = async (tripId: string) => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/grammandi/logistics/trip/${tripId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'IN_PROGRESS' })
            });
            if (res.ok) {
                setActiveTrip(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
                setViewState('ACTIVE_TRIP');
            }
        } catch (e) {
            console.error('Start trip error:', e);
        }
    };

    const completePickup = (index: number) => {
        if (activeTrip) {
            const updatedPickups = [...activeTrip.pickups];
            updatedPickups[index].completed = true;
            setActiveTrip({ ...activeTrip, pickups: updatedPickups });
        }
    };

    const completeDelivery = (index: number) => {
        if (activeTrip) {
            const updatedDeliveries = [...activeTrip.deliveries];
            updatedDeliveries[index].completed = true;
            setActiveTrip({ ...activeTrip, deliveries: updatedDeliveries });
        }
    };

    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-electric-50 to-indigo-100 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-electric-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Truck className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">LogisticsApp</h1>
                        <p className="text-slate-500 text-sm">Delivery Partner Portal</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required aria-label="Login ID" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required aria-label="Password" />
                                <Button type="submit" fullWidth disabled={loading} className="bg-electric-600 hover:bg-electric-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New partner? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-electric-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Your Name" required aria-label="Your Name" />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required aria-label="Phone Number" />
                                <input type="text" value={regVehicleNumber} onChange={e => setRegVehicleNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Vehicle Number" required aria-label="Vehicle Number" />
                                <select value={regVehicleType} onChange={e => setRegVehicleType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" aria-label="Vehicle Type">
                                    <option value="TEMPO">Tempo / Mini Truck</option>
                                    <option value="BIKE">Bike</option>
                                    <option value="TRUCK">Heavy Truck</option>
                                </select>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required aria-label="Password" />
                                <Button type="submit" fullWidth disabled={loading} className="bg-electric-600 hover:bg-electric-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register Vehicle'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-electric-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    if (viewState === 'DASHBOARD') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative overflow-hidden">
                <div className="animated-bg opacity-40"></div>
                <div className="morphing-blob bg-electric-500/20 top-[-10%] right-[-10%]"></div>

                {/* Header - Glassmorphism */}
                <div className="glass-panel sticky top-0 z-30 px-4 py-4 rounded-b-3xl border-b-electric-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-electric-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-glow-sm">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{user?.name || 'Partner'}</h1>
                                <p className="text-[10px] font-black text-electric-600 uppercase tracking-widest">{user?.vehicleNumber || 'Vehicle Verified'}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors" aria-label="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                <div className="px-4 mt-6 animate-fadeInUp">
                    {/* Online Toggle - Premium */}
                    <button
                        ref={onlineToggleRef}
                        aria-pressed="false"
                        aria-label={isOnline ? "Go Offline" : "Go Online"}
                        onClick={toggleOnline}
                        className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all relative overflow-hidden group mb-8 ${isOnline ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-glow-sm' : 'bg-slate-800'}`}
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
                            <div className="text-left">
                                <p className="font-black text-white text-lg leading-none uppercase tracking-tighter">{isOnline ? 'System Online' : 'System Offline'}</p>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">{isOnline ? 'Scanning for assignments...' : 'Tap to start shift'}</p>
                            </div>
                        </div>
                        <Navigation className={`relative z-10 text-white/50 group-hover:text-white transition-colors ${isOnline ? 'animate-bounce' : ''}`} />
                    </button>

                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 className="text-electric-500" size={20} /> Shift Insights
                    </h2>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                            <Package className="text-electric-500 mb-2" size={24} />
                            <p className="text-2xl font-black dark:text-white">{stats.todayTrips}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Today Trips</p>
                        </div>
                        <div className="premium-card p-4 hover:shadow-glow-sm hover:-translate-y-1 transition-all">
                            <DollarSign className="text-emerald-500 mb-2" size={24} />
                            <p className="text-2xl font-black dark:text-white">₹{stats.todayEarnings}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Today Earnings</p>
                        </div>
                    </div>

                    {/* Active/Pending Trip Card */}
                    {activeTrip ? (
                        <div className="mb-8">
                            <div className="premium-card p-6 bg-gradient-to-br from-electric-600 to-indigo-700 text-white border-none shadow-glow-md relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                                    <Truck size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black mb-1">New Assignment</h3>
                                    <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-electric-100 mb-6">
                                        <span className="flex items-center gap-1"><MapPin size={10} /> {activeTrip.totalDistance} KM</span>
                                        <span className="flex items-center gap-1"><Clock size={10} /> 45 MINS</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-electric-200 uppercase tracking-widest mb-1">Potential Pay</p>
                                            <p className="text-4xl font-black">₹{activeTrip.estimatedEarnings}</p>
                                        </div>
                                        <button
                                            onClick={() => startTrip(activeTrip.id)}
                                            className="btn-cta !px-8 !py-4 shadow-xl active:scale-95 transition-all text-sm font-black uppercase tracking-tighter"
                                        >
                                            Accept & Navigate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        isOnline && (
                            <div className="premium-card p-12 text-center border-dashed border-2 mb-8">
                                <div className="relative inline-block mb-6">
                                    <Loader2 className="animate-spin text-electric-500" size={64} />
                                    <Truck className="absolute inset-0 m-auto text-slate-400" size={28} />
                                </div>
                                <p className="text-slate-500 font-black uppercase tracking-widest">Waiting for Orders</p>
                                <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto">Stay in this area for better assignment priority.</p>
                            </div>
                        )
                    )}

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="premium-card p-6 flex flex-col items-center justify-center gap-3 hover:border-electric-500 transition-all group">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-electric-500 transition-colors">
                                <Clock size={24} />
                            </div>
                            <p className="font-black text-[10px] uppercase tracking-widest dark:text-white text-center">History</p>
                        </button>
                        <button className="premium-card p-6 flex flex-col items-center justify-center gap-3 hover:border-electric-500 transition-all group">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-electric-500 transition-colors">
                                <Lock size={24} />
                            </div>
                            <p className="font-black text-[10px] uppercase tracking-widest dark:text-white text-center">Earnings Hub</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default Fallback
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center uppercase">
            <h1 className="text-4xl font-black text-electric-500 mb-4">{viewState}</h1>
            <p className="text-slate-500 font-bold mb-8">Premium View Coming Soon</p>
            <Button onClick={() => setViewState('DASHBOARD')} className="btn-primary !bg-electric-600">Back to Dashboard</Button>
        </div>
    );
};

export default LogisticsApp;
