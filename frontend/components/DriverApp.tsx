/**
 * DriverApp - Driver Portal
 * Separate app for drivers to manage rides and earnings
 */

import React, { useState, useEffect, Component, ErrorInfo } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthToken, loginUser, registerUser, logoutUser, getCurrentUser } from '../services/authService';
import { DriverView } from './DriverView';
import { Button } from './Button';
import {
    Loader2, Car, Bus, Bike, Truck, MapPin, DollarSign, Clock, Check,
    Phone, Lock, User as UserIcon, LogOut, Navigation, Star, AlertCircle
} from 'lucide-react';
import { User } from '@villagelink/shared';

// Error Boundary to catch DriverView crashes
class DriverErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('DriverView crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Driver Panel Error</h1>
                    <p className="text-red-400 font-mono text-sm mb-4 max-w-lg break-all">{this.state.error?.message}</p>
                    <p className="text-slate-500 font-mono text-xs mb-6 max-w-lg break-all">{this.state.error?.stack?.split('\n').slice(0,3).join('\n')}</p>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Reload Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

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
    const [user, setUser] = useState<User | null>(null);
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
            // First try to get user from localStorage
            const currentUser = getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setViewState('DASHBOARD');
                return;
            }
            // Fallback: fetch from API
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
            // registerUser(name, role, password, email, phone, capacity?, vehicleType?)
            const result = await registerUser(
                regName,
                'DRIVER',
                password,
                '',  // email (optional)
                regPhone,
                parseInt(regCapacity),
                regVehicleType as any
            );
            if (result.success) {
                setAuthMode('LOGIN');
                alert('Registration successful! Your account is pending verification.');
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
                                    <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone / Email" required />
                                </div>
                                <div>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Password" required />
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
                                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full Name" required />
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone Number" required />

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

                                <input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Seat Capacity" required />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Password" required />

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

    // ==================== DASHBOARD VIEW (Renders DriverView) ====================
    if (!user) return null;
    return (
        <div className="min-h-screen bg-slate-950">
            <DriverErrorBoundary>
                <DriverView user={{...user, isVerified: true}} lang="EN" />
            </DriverErrorBoundary>
        </div>
    );
};

export default DriverApp;
