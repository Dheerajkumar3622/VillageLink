/**
 * MessApp - Mess Manager Portal
 * Separate app for mess owners to manage menu, bookings, and subscriptions
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, Utensils, Calendar, DollarSign, Users, Clock, Star,
    Phone, Lock, User, LogOut, Plus, Edit, Trash2, ChevronRight, Check
} from 'lucide-react';

type ViewState = 'AUTH' | 'DASHBOARD' | 'MENU_MANAGER' | 'BOOKINGS' | 'SUBSCRIPTIONS';

interface MessUser {
    id: string;
    name: string;
    phone?: string;
    messName?: string;
    address?: string;
}

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: 'VEG' | 'NON_VEG';
    available: boolean;
}

export const MessApp: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('AUTH');
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<MessUser | null>(null);

    // Auth form
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regMessName, setRegMessName] = useState('');
    const [regAddress, setRegAddress] = useState('');
    const [regPincode, setRegPincode] = useState('');

    // Menu items
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    // Stats
    const [stats, setStats] = useState({
        todayBookings: 0,
        activeSubscribers: 0,
        todayRevenue: 0,
        rating: 4.5
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
                name: regMessName,
                phone: regPhone,
                password,
                role: 'MESS_MANAGER',
                address: regAddress,
                pincode: regPincode
            });
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Your mess is pending verification.');
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
        setMenuItems([
            { id: 'm1', name: 'Dal Rice', price: 50, category: 'VEG', available: true },
            { id: 'm2', name: 'Roti Sabzi', price: 40, category: 'VEG', available: true },
            { id: 'm3', name: 'Thali', price: 80, category: 'VEG', available: true },
            { id: 'm4', name: 'Chicken Curry', price: 120, category: 'NON_VEG', available: false },
        ]);
        setStats({ todayBookings: 45, activeSubscribers: 28, todayRevenue: 3500, rating: 4.5 });
    };

    const toggleItemAvailability = (id: string) => {
        setMenuItems(prev => prev.map(item => item.id === id ? { ...item, available: !item.available } : item));
    };

    // ==================== AUTH VIEW ====================
    if (viewState === 'AUTH') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-950 dark:to-orange-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Utensils className="text-white" size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">MessApp</h1>
                        <p className="text-slate-500 text-sm">Manage Your Mess Business</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
                        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                        {authMode === 'LOGIN' ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone / Email" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Login'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    New mess? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-orange-600 font-bold">Register</button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <input type="text" value={regMessName} onChange={e => setRegMessName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Mess Name" required />
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Owner Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Phone Number" required />
                                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Full Address" required />
                                <input type="text" value={regPincode} onChange={e => setRegPincode(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Pincode" maxLength={6} required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Password" required />
                                <Button type="submit" fullWidth disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Register Mess'}
                                </Button>
                                <p className="text-center text-sm text-slate-500">
                                    Already registered? <button type="button" onClick={() => setAuthMode('LOGIN')} className="text-orange-600 font-bold">Login</button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== MENU MANAGER ====================
    if (viewState === 'MENU_MANAGER') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                    <button onClick={() => setViewState('DASHBOARD')} className="flex items-center gap-2 mb-4">
                        <ChevronRight className="rotate-180" size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">📋 Menu Manager</h1>
                </div>

                <div className="px-4 mt-4">
                    <Button fullWidth className="bg-orange-500 mb-4"><Plus size={16} /> Add Menu Item</Button>

                    <div className="space-y-3">
                        {menuItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${item.category === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div>
                                        <h3 className="font-bold dark:text-white">{item.name}</h3>
                                        <p className="text-sm text-slate-500">₹{item.price}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleItemAvailability(item.id)} className={`px-3 py-1 rounded-full text-xs font-medium ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.available ? 'Available' : 'Out'}
                                    </button>
                                    <button className="p-2 text-slate-400"><Edit size={16} /></button>
                                </div>
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
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Utensils size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold">{user?.messName || user?.name || 'Mess'}</h1>
                            <div className="flex items-center gap-1 text-xs">
                                <Star className="text-yellow-400" size={12} />
                                <span>{stats.rating}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full">
                        <LogOut size={18} />
                    </button>
                </div>
                <h2 className="text-xl font-bold">🍽️ Mess Dashboard</h2>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 px-4 -mt-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Calendar className="text-orange-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.todayBookings}</p>
                    <p className="text-xs text-slate-500">Today Bookings</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <Users className="text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">{stats.activeSubscribers}</p>
                    <p className="text-xs text-slate-500">Subscribers</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg col-span-2">
                    <DollarSign className="text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold dark:text-white">₹{stats.todayRevenue}</p>
                    <p className="text-xs text-slate-500">Today's Revenue</p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 mt-6 space-y-3">
                <Button onClick={() => setViewState('MENU_MANAGER')} fullWidth className="bg-orange-500">
                    <Edit size={18} /> Manage Menu
                </Button>
                <Button fullWidth className="bg-blue-500">
                    <Calendar size={18} /> View Bookings
                </Button>
                <Button fullWidth className="bg-purple-500">
                    <Users size={18} /> Subscribers
                </Button>
            </div>
        </div>
    );
};

export default MessApp;
