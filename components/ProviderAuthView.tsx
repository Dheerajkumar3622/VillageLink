/**
 * ProviderAuthView - Service Provider App Login/Signup
 * Professional authentication with role selection for drivers, farmers, vendors, etc.
 */

import React, { useState } from 'react';
import { User, UserRole, VehicleType } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { Button } from './Button';
import {
    User as UserIcon, Lock, Mail, Phone, ArrowRight, Loader2, ArrowLeft,
    Truck, Wheat, Store, UtensilsCrossed, Package, Building
} from 'lucide-react';

interface ProviderAuthViewProps {
    onSuccess: (user: User) => void;
}

type ProviderRoleOption = {
    id: UserRole;
    label: string;
    icon: React.ReactNode;
    color: string;
};

const PROVIDER_ROLES: ProviderRoleOption[] = [
    { id: 'DRIVER', label: 'Driver', icon: <Truck className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' },
    { id: 'FARMER', label: 'Farmer', icon: <Wheat className="w-5 h-5" />, color: 'from-green-500 to-green-600' },
    { id: 'SHOPKEEPER', label: 'Shopkeeper', icon: <Store className="w-5 h-5" />, color: 'from-orange-500 to-orange-600' },
    { id: 'MESS_MANAGER', label: 'Mess Owner', icon: <UtensilsCrossed className="w-5 h-5" />, color: 'from-red-500 to-red-600' },
    { id: 'FOOD_VENDOR', label: 'Food Vendor', icon: <UtensilsCrossed className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
    { id: 'LOGISTICS_PARTNER', label: 'Logistics', icon: <Package className="w-5 h-5" />, color: 'from-purple-500 to-purple-600' },
];

const ProviderAuthView: React.FC<ProviderAuthViewProps> = ({ onSuccess }) => {
    const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER' | 'ROLE_SELECT'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Login State
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');

    // Register State
    const [regName, setRegName] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regRole, setRegRole] = useState<UserRole>('DRIVER');
    const [regCapacity, setRegCapacity] = useState('40');
    const [regVehicleType, setRegVehicleType] = useState<VehicleType>('BUS');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId || !password) {
            setError("Please enter both ID and Password");
            return;
        }

        setLoading(true);
        setError(null);
        const res = await loginUser(loginId, password);
        setLoading(false);

        if (res.success && res.user) {
            onSuccess(res.user);
        } else {
            setError(res.message || 'Login failed');
        }
    };

    const handleRoleSelect = (role: UserRole) => {
        setRegRole(role);
        setViewState('REGISTER');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regName || !regPass || (!regEmail && !regPhone)) {
            setError("Please fill in all required fields");
            return;
        }

        setLoading(true);
        setError(null);
        const capacity = regRole === 'DRIVER' ? parseInt(regCapacity) : undefined;
        const vehicleType = regRole === 'DRIVER' ? regVehicleType : undefined;
        const res = await registerUser(regName, regRole, regPass, regEmail, regPhone, capacity, vehicleType);
        setLoading(false);

        if (res.success && res.user) {
            onSuccess(res.user);
        } else {
            setError(res.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
            {/* Branding */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
                    V
                </div>
                <h1 className="text-2xl font-bold text-white">
                    Village<span className="text-blue-400">Link</span> <span className="text-slate-400 font-normal">Partner</span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Service Provider Portal
                </p>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-sm bg-slate-800 rounded-3xl shadow-xl p-6 border border-slate-700">
                {viewState === 'LOGIN' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <h2 className="text-xl font-bold text-center text-white mb-6">
                            Partner Login
                        </h2>

                        {error && (
                            <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-xl text-center border border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Partner ID, Email or Phone"
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <Button type="submit" fullWidth disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Login</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                        </Button>

                        <p className="text-center text-sm text-slate-400">
                            New partner?{' '}
                            <button type="button" onClick={() => { setViewState('ROLE_SELECT'); setError(null); }} className="text-blue-400 font-semibold hover:underline">
                                Register Now
                            </button>
                        </p>
                    </form>
                ) : viewState === 'ROLE_SELECT' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <button type="button" onClick={() => { setViewState('LOGIN'); setError(null); }} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" aria-label="Back to login">
                                <ArrowLeft className="w-5 h-5 text-slate-300" />
                            </button>
                            <h2 className="text-xl font-bold text-white">
                                Select Your Role
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {PROVIDER_ROLES.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role.id)}
                                    className={`p-4 rounded-xl bg-gradient-to-br ${role.color} text-white flex flex-col items-center gap-2 hover:scale-105 transition-transform shadow-lg`}
                                >
                                    {role.icon}
                                    <span className="text-sm font-semibold">{role.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <button type="button" onClick={() => { setViewState('ROLE_SELECT'); setError(null); }} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" aria-label="Back to role selection">
                                <ArrowLeft className="w-5 h-5 text-slate-300" />
                            </button>
                            <h2 className="text-xl font-bold text-white">
                                Register as {PROVIDER_ROLES.find(r => r.id === regRole)?.label}
                            </h2>
                        </div>

                        {error && (
                            <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-xl text-center border border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    value={regPhone}
                                    onChange={(e) => setRegPhone(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Email (optional)"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="Create Password"
                                    value={regPass}
                                    onChange={(e) => setRegPass(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>

                            {regRole === 'DRIVER' && (
                                <>
                                    <select
                                        value={regVehicleType}
                                        onChange={(e) => setRegVehicleType(e.target.value as VehicleType)}
                                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        aria-label="Vehicle Type"
                                    >
                                        <option value="BUS">Bus</option>
                                        <option value="AUTO">Auto Rickshaw</option>
                                        <option value="TAXI">Taxi</option>
                                        <option value="BIKE">Bike</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Vehicle Capacity"
                                        value={regCapacity}
                                        onChange={(e) => setRegCapacity(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </>
                            )}
                        </div>

                        <Button type="submit" fullWidth disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Register</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                        </Button>
                    </form>
                )}
            </div>

            {/* User Link */}
            <p className="mt-6 text-sm text-slate-400">
                Looking to book a ride or order food?{' '}
                <a href="/user.html" className="text-emerald-400 font-semibold hover:underline">
                    User App →
                </a>
            </p>
        </div>
    );
};

export default ProviderAuthView;
