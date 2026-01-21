/**
 * DriverApp - Driver Portal
 * Separate app for drivers to manage rides and earnings
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Car, Bus, Bike, Truck, MapPin, DollarSign, Clock, Check,
    Phone, Lock, User, LogOut, Navigation, Star, AlertCircle
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'ACTIVE_TRIP';

interface DriverUser {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    capacity?: number;
}

export const DriverApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<DriverUser | null>(null);
    const [isOnline, setIsOnline] = useState(false);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regVehicleType, setRegVehicleType] = useState('BUS');
    const [regCapacity, setRegCapacity] = useState('40');

    // Stats
    const [stats, setStats] = useState({
        todayTrips: 0,
        todayEarnings: 0,
        weekEarnings: 0,
        rating: 4.8,
        totalTrips: 0
    });

    // Pending requests
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

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
                role: 'DRIVER',
                vehicleType: regVehicleType,
                capacity: parseInt(regCapacity)
            });
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Your account is pending verification.');
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
        // Mock data for demo
        setStats({
            todayTrips: 5,
            todayEarnings: 1250,
            weekEarnings: 8500,
            rating: 4.8,
            totalTrips: 234
        });
    };

    const toggleOnline = () => {
        setIsOnline(!isOnline);
    };

    const vehicleIcons: Record<string, React.ReactNode> = {
        BUS: <Bus size={20} />,
        TAXI: <Car size={20} />,
        AUTO: <Truck size={20} />,
        BIKE: <Bike size={20} />
    };

    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-indigo-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Car className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">DriverApp</h1>
                        <p className="text-slate-500 text-sm">Drive with VillageLink</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required />
                                </div>
                                <div>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                </div>
                                <Button type="submit" fullWidth disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New driver? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-blue-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Full Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required />

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Vehicle Type</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['BUS', 'TAXI', 'AUTO', 'BIKE'].map(type => (
                                            <button key={type} type="button" onClick={() => setRegVehicleType(type)} className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${regVehicleType === type ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 text-slate-500'}`}>
                                                {vehicleIcons[type]}
                                                <span className="text-xs">{type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Seat Capacity" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />

                                <Button type="submit" fullWidth disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register as Driver'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-blue-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className={`text-white p-4 pt-6 pb-8 rounded-b-3xl transition-all ${isOnline ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-slate-600 to-slate-700'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Car size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold">{user?.name || 'Driver'}</h1>
                            <div className="flex items-center gap-1 text-xs">
                                <Star className="text-yellow-400" size={12} />
                                <span>{stats.rating}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full" aria-label="Logout">
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Online Toggle */}
                <button onClick={toggleOnline} className={`w-full p-4 rounded-xl flex items-center justify-between ${isOnline ? 'bg-white/20' : 'bg-red-500/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        <span className="font-bold">{isOnline ? 'You are Online' : 'You are Offline'}</span>
                    </div>
                    <span className="text-sm">{isOnline ? 'Tap to go offline' : 'Tap to go online'}</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center shadow-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.todayTrips}</p>
                    <p className="text-xs text-slate-500">Today Trips</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center shadow-lg">
                    <p className="text-2xl font-bold text-blue-600">₹{stats.todayEarnings}</p>
                    <p className="text-xs text-slate-500">Today</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center shadow-lg">
                    <p className="text-2xl font-bold text-purple-600">₹{stats.weekEarnings}</p>
                    <p className="text-xs text-slate-500">This Week</p>
                </div>
            </div>

            {/* No requests message */}
            {isOnline && pendingRequests.length === 0 && (
                <div className="px-4 mt-8">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
                        <Navigation className="mx-auto text-blue-500 mb-4 animate-pulse" size={48} />
                        <h2 className="font-bold dark:text-white text-lg">Waiting for Rides...</h2>
                        <p className="text-slate-500 text-sm mt-2">Stay online to receive ride requests</p>
                    </div>
                </div>
            )}

            {!isOnline && (
                <div className="px-4 mt-8">
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200">You're Offline</p>
                            <p className="text-sm text-amber-600 dark:text-amber-300">Go online to start receiving ride requests and earn money.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverApp;
