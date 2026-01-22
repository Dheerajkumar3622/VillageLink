/**
 * UserAuthView - Consumer App Login/Signup
 * Clean, simple authentication for rural users - defaults to PASSENGER role
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { Button } from './Button';
import { User as UserIcon, Lock, Mail, Phone, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface UserAuthViewProps {
    onSuccess: (user: User) => void;
    lang?: 'EN' | 'HI';
}

const UserAuthView: React.FC<UserAuthViewProps> = ({ onSuccess, lang = 'EN' }) => {
    const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
    const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regName || !regPass || (!regEmail && !regPhone)) {
            setError("Please fill in all required fields");
            return;
        }

        setLoading(true);
        setError(null);
        // Default role is PASSENGER for consumer app
        const res = await registerUser(regName, 'PASSENGER' as UserRole, regPass, regEmail, regPhone);
        setLoading(false);

        if (res.success && res.user) {
            onSuccess(res.user);
        } else {
            setError(res.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Branding */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
                    V
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Village<span className="text-emerald-600 dark:text-emerald-400">Link</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Your Rural Super App
                </p>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 border border-slate-100 dark:border-slate-700">
                {viewState === 'LOGIN' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <h2 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-6">
                            {t('login')}
                        </h2>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="User ID, Email or Phone"
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>

                        <Button type="submit" fullWidth disabled={loading} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-xl font-semibold shadow-lg">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{t('login')}</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                        </Button>

                        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                            New user?{' '}
                            <button type="button" onClick={() => { setViewState('REGISTER'); setError(null); }} className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                                Create Account
                            </button>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <button type="button" onClick={() => { setViewState('LOGIN'); setError(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" aria-label="Back to login">
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </button>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Create Account
                            </h2>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl text-center">
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
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
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
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Email (optional)"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="Create Password"
                                    value={regPass}
                                    onChange={(e) => setRegPass(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" fullWidth disabled={loading} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-xl font-semibold shadow-lg">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                        </Button>
                    </form>
                )}
            </div>

            {/* Provider Link */}
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                Are you a service provider?{' '}
                <a href="/provider.html" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Partner Login →
                </a>
            </p>
        </div>
    );
};

export default UserAuthView;
