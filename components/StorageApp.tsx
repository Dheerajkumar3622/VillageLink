/**
 * StorageApp - Cold Storage Operator Portal
 * Separate app for cold storage operators to manage facilities and bookings
 */

import React, { useState, useEffect } from 'react';
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
                role: 'STORAGE_OPERATOR',
                businessName: regFacilityName,
                address: regAddress
            });
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Your facility is pending verification.');
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
        setBookings([
            { id: 'b1', farmerName: 'Ramesh Kumar', crop: 'Potato', quantity: 100, unit: 'Tons', startDate: '2026-01-01', endDate: '2026-03-01', status: 'ACTIVE', dailyRate: 5 },
            { id: 'b2', farmerName: 'Suresh Yadav', crop: 'Onion', quantity: 50, unit: 'Tons', startDate: '2026-01-10', endDate: '2026-02-10', status: 'ACTIVE', dailyRate: 6 },
            { id: 'b3', farmerName: 'Mohan Singh', crop: 'Apple', quantity: 30, unit: 'Tons', startDate: '2026-01-15', endDate: '', status: 'PENDING', dailyRate: 8 },
        ]);
    };

    const occupancyPercentage = Math.round((stats.usedCapacity / stats.totalCapacity) * 100);

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
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New operator? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-cyan-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regFacilityName} onChange={e => setRegFacilityName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Facility Name" required />
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Owner Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required />
                                <input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Capacity (Tons)" required />
                                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Full Address" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Snowflake size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold">{user?.facilityName || user?.name || 'Cold Storage'}</h1>
                            <div className="flex items-center gap-2 text-xs text-cyan-100">
                                <Thermometer size={12} /> {stats.temperature}°C
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full">
                        <LogOut size={18} />
                    </button>
                </div>
                <h2 className="text-xl font-bold">❄️ Storage Dashboard</h2>
            </div>

            {/* Capacity Bar */}
            <div className="px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium dark:text-white">Capacity</span>
                        <span className="text-sm text-slate-500">{stats.usedCapacity}/{stats.totalCapacity} Tons</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${occupancyPercentage > 80 ? 'bg-red-500' : occupancyPercentage > 60 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${occupancyPercentage}%` }}></div>
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-2">{occupancyPercentage}% Full</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 px-4 mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Clock className="text-amber-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.pendingRequests}</p>
                    <p className="text-xs text-slate-500">Pending Requests</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <DollarSign className="text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">₹{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-slate-500">Monthly Revenue</p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 mt-6 space-y-3">
                <Button onClick={() => setViewState('BOOKINGS')} fullWidth className="bg-cyan-500">
                    <Package size={18} /> View Bookings
                </Button>
                <Button fullWidth className="bg-blue-500">
                    <BarChart3 size={18} /> Inventory Report
                </Button>
            </div>
        </div>
    );
};

export default StorageApp;
