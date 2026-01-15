/**
 * LogisticsApp - Delivery Partner Portal
 * Separate app for logistics partners to manage pickups and deliveries
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Truck, Package, DollarSign, MapPin, Clock, Check, Navigation,
    Phone, Lock, User, LogOut, ChevronRight, Camera, AlertCircle
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
                role: 'LOGISTICS_PARTNER',
                vehicleNumber: regVehicleNumber,
                vehicleType: regVehicleType
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
        // Mock data
        setStats({ todayTrips: 3, todayEarnings: 850, weekEarnings: 5200, totalDeliveries: 156 });
    };

    const toggleOnline = () => {
        setIsOnline(!isOnline);
        if (!isOnline) {
            // Simulate getting a trip assignment
            setTimeout(() => {
                setActiveTrip({
                    id: 'trip1',
                    pickups: [
                        { location: 'Kotha Village', crop: 'Onion', quantity: '50 KG', completed: false },
                        { location: 'Dehri Farm', crop: 'Tomato', quantity: '30 KG', completed: false },
                    ],
                    deliveries: [
                        { location: 'Patna Market', customerName: 'Sharma Traders', completed: false },
                        { location: 'Ara Mandi', customerName: 'Local Vendor', completed: false },
                    ],
                    status: 'PENDING',
                    totalDistance: 45,
                    estimatedEarnings: 450
                });
            }, 2000);
        } else {
            setActiveTrip(null);
        }
    };

    const startTrip = () => {
        if (activeTrip) {
            setActiveTrip({ ...activeTrip, status: 'IN_PROGRESS' });
            setViewState('ACTIVE_TRIP');
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
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-slate-950 dark:to-teal-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Truck className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">LogisticsApp</h1>
                        <p className="text-slate-500 text-sm">Earn with Farm Deliveries</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New partner? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-teal-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Your Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required />
                                <input type="text" value={regVehicleNumber} onChange={e => setRegVehicleNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Vehicle Number (BR01XX1234)" required />
                                <select value={regVehicleType} onChange={e => setRegVehicleType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <option value="TEMPO">Tempo</option>
                                    <option value="PICKUP">Pickup Truck</option>
                                    <option value="MINI_TRUCK">Mini Truck</option>
                                    <option value="BIKE">Bike (Small Parcels)</option>
                                </select>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register as Partner'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-teal-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== ACTIVE TRIP VIEW ====================
    if (viewState === 'ACTIVE_TRIP' && activeTrip) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                    <button onClick={() => setViewState('DASHBOARD')} className="flex items-center gap-2 mb-4">
                        <ChevronRight className="rotate-180" size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">🚛 Active Trip</h1>
                    <p className="text-teal-100 text-sm">{activeTrip.totalDistance} km • ₹{activeTrip.estimatedEarnings} earnings</p>
                </div>

                <div className="px-4 mt-4">
                    {/* Pickups */}
                    <h2 className="font-bold dark:text-white mb-3">📦 Pickups</h2>
                    <div className="space-y-2 mb-6">
                        {activeTrip.pickups.map((pickup, idx) => (
                            <div key={idx} className={`bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between ${pickup.completed ? 'opacity-50' : ''}`}>
                                <div>
                                    <h3 className="font-medium dark:text-white">{pickup.crop} - {pickup.quantity}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {pickup.location}</p>
                                </div>
                                {pickup.completed ? (
                                    <Check className="text-green-500" size={24} />
                                ) : (
                                    <Button onClick={() => completePickup(idx)} className="bg-teal-500"><Camera size={14} /> Picked</Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Deliveries */}
                    <h2 className="font-bold dark:text-white mb-3">🏠 Deliveries</h2>
                    <div className="space-y-2">
                        {activeTrip.deliveries.map((delivery, idx) => (
                            <div key={idx} className={`bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between ${delivery.completed ? 'opacity-50' : ''}`}>
                                <div>
                                    <h3 className="font-medium dark:text-white">{delivery.customerName}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {delivery.location}</p>
                                </div>
                                {delivery.completed ? (
                                    <Check className="text-green-500" size={24} />
                                ) : (
                                    <Button onClick={() => completeDelivery(idx)} className="bg-green-500"><Check size={14} /> Delivered</Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DASHBOARD VIEW ====================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <div className={`text-white p-4 pt-6 pb-8 rounded-b-3xl transition-all ${isOnline ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-slate-600 to-slate-700'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold">{user?.name || 'Partner'}</h1>
                            <p className="text-xs opacity-80">{user?.vehicleNumber || 'Vehicle'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full">
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
            <div className="grid grid-cols-2 gap-3 px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Package className="text-teal-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.todayTrips}</p>
                    <p className="text-xs text-slate-500">Today Trips</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <DollarSign className="text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">₹{stats.todayEarnings}</p>
                    <p className="text-xs text-slate-500">Today</p>
                </div>
            </div>

            {/* Active Trip Card */}
            {activeTrip && (
                <div className="px-4 mt-6">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl p-4">
                        <h2 className="font-bold mb-2">🚛 New Trip Available!</h2>
                        <p className="text-sm text-teal-100 mb-3">
                            {activeTrip.pickups.length} pickups • {activeTrip.deliveries.length} deliveries • {activeTrip.totalDistance} km
                        </p>
                        <div className="flex justify-between items-center">
                            <p className="text-xl font-bold">₹{activeTrip.estimatedEarnings}</p>
                            <Button onClick={startTrip} className="bg-white text-teal-600">
                                <Navigation size={16} /> Start Trip
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {!isOnline && (
                <div className="px-4 mt-8">
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200">You're Offline</p>
                            <p className="text-sm text-amber-600 dark:text-amber-300">Go online to receive delivery requests.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticsApp;
