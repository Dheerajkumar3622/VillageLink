/**
 * UserPanel - Consumer Super App
 * Unified access to all VillageLink services
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthToken, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Bus, Utensils, Wheat, ShoppingBag, Package, Briefcase,
    MapPin, Star, Clock, Phone, ChevronRight, Bell, User as UserIcon, Settings,
    Wallet, Gift, Heart, Search, Home, Ticket, QrCode
} from 'lucide-react';

// Lazy load heavy components
const PassengerBooking = React.lazy(() => import('./PassengerView').then(m => ({ default: m.PassengerView })));
const FoodLinkHome = React.lazy(() => import('./FoodLinkHome').then(m => ({ default: m.default })));
const GramMandiHome = React.lazy(() => import('./GramMandiHome').then(m => ({ default: m.GramMandiHome })));

interface UserPanelProps {
    user: User;
    lang?: 'EN' | 'HI';
    onLogout: () => void;
}

type ActiveModule = 'HOME' | 'YATRA' | 'FOOD' | 'GRAMMANDI' | 'VYAPAR' | 'PARCEL' | 'JOBS' | 'PROFILE';

export const UserPanel: React.FC<UserPanelProps> = ({ user, lang = 'EN', onLogout }) => {
    const [activeModule, setActiveModule] = useState<ActiveModule>('HOME');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<number>(3);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWalletBalance(data.walletBalance || 0);
            }
        } catch (e) {
            console.error('Profile fetch error:', e);
        }
    };

    const services = [
        { id: 'YATRA', name: 'YatraLink', desc: 'Bus, Auto, Taxi', icon: Bus, color: 'from-blue-500 to-indigo-600', emoji: '🚌' },
        { id: 'FOOD', name: 'FoodLink', desc: 'Mess & Restaurant', icon: Utensils, color: 'from-orange-500 to-red-500', emoji: '🍽️' },
        { id: 'GRAMMANDI', name: 'GramMandi', desc: 'Fresh Vegetables', icon: Wheat, color: 'from-green-500 to-emerald-600', emoji: '🌾' },
        { id: 'VYAPAR', name: 'VyaparSaathi', desc: 'Local Shopping', icon: ShoppingBag, color: 'from-purple-500 to-pink-500', emoji: '🛍️' },
        { id: 'PARCEL', name: 'ParcelLink', desc: 'Send Packages', icon: Package, color: 'from-amber-500 to-orange-500', emoji: '📦' },
        { id: 'JOBS', name: 'RojgarLink', desc: 'Find Jobs', icon: Briefcase, color: 'from-teal-500 to-cyan-500', emoji: '💼' },
    ];

    // Render active module
    if (activeModule !== 'HOME' && activeModule !== 'PROFILE') {
        return (
            <React.Suspense fallback={
                <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                    <Loader2 className="animate-spin text-green-600" size={40} />
                </div>
            }>
                {activeModule === 'YATRA' && <PassengerBooking user={user} lang={lang} />}
                {activeModule === 'FOOD' && <FoodLinkHome user={user} onBack={() => setActiveModule('HOME')} />}
                {activeModule === 'GRAMMANDI' && <GramMandiHome user={user} onBack={() => setActiveModule('HOME')} />}
                {/* Add more modules as needed */}
                {(activeModule === 'VYAPAR' || activeModule === 'PARCEL' || activeModule === 'JOBS') && (
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
                        <button onClick={() => setActiveModule('HOME')} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
                            <ArrowLeft size={20} /> Back
                        </button>
                        <div className="text-center py-20">
                            <p className="text-6xl mb-4">{services.find(s => s.id === activeModule)?.emoji}</p>
                            <h2 className="text-xl font-bold dark:text-white">{services.find(s => s.id === activeModule)?.name}</h2>
                            <p className="text-slate-500 mt-2">Coming Soon!</p>
                        </div>
                    </div>
                )}
            </React.Suspense>
        );
    }

    // Profile View
    if (activeModule === 'PROFILE') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-8 pb-16 rounded-b-3xl">
                    <button onClick={() => setActiveModule('HOME')} className="flex items-center gap-2 mb-6">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{user.name}</h1>
                            <p className="text-green-100 text-sm">{user.phone || user.email}</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 -mt-8 space-y-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Wallet className="text-green-500" size={24} />
                            <div>
                                <p className="text-sm text-slate-500">Wallet Balance</p>
                                <p className="text-xl font-bold dark:text-white">₹{walletBalance}</p>
                            </div>
                        </div>
                        <Button className="bg-green-500">Add Money</Button>
                    </div>

                    {[
                        { icon: Ticket, label: 'My Bookings', color: 'text-blue-500' },
                        { icon: Heart, label: 'Favorites', color: 'text-red-500' },
                        { icon: Gift, label: 'Rewards & Offers', color: 'text-purple-500' },
                        { icon: Bell, label: 'Notifications', color: 'text-amber-500' },
                        { icon: Settings, label: 'Settings', color: 'text-slate-500' },
                    ].map((item, idx) => (
                        <button key={idx} className="w-full bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <item.icon className={item.color} size={20} />
                                <span className="dark:text-white font-medium">{item.label}</span>
                            </div>
                            <ChevronRight className="text-slate-400" size={18} />
                        </button>
                    ))}

                    <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl p-4 font-medium">
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    // HOME View
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-green-100 text-sm">Welcome back,</p>
                        <h1 className="text-xl font-bold">{user.name?.split(' ')[0] || 'User'} 👋</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 bg-white/20 rounded-full" onClick={() => setActiveModule('PROFILE')} aria-label="Notifications">
                            <Bell size={20} />
                            {notifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                    {notifications}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setActiveModule('PROFILE')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold" aria-label="User Profile">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search buses, food, products..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
            </div>

            {/* Wallet Card */}
            <div className="px-4 -mt-4">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs">VillageLink Wallet</p>
                        <p className="text-2xl font-bold">₹{walletBalance}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium" aria-label="Add Money to Wallet">Add</button>
                        <button className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium" aria-label="Scan QR Code">
                            <QrCode size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            <div className="p-4 mt-4">
                <h2 className="text-lg font-bold dark:text-white mb-4">Our Services</h2>
                <div className="grid grid-cols-3 gap-3">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => setActiveModule(service.id as ActiveModule)}
                            className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-800"
                        >
                            <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-r ${service.color} rounded-xl flex items-center justify-center text-white`}>
                                <service.icon size={24} />
                            </div>
                            <h3 className="font-bold text-sm dark:text-white">{service.name}</h3>
                            <p className="text-[10px] text-slate-500">{service.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-4">
                <h2 className="text-lg font-bold dark:text-white mb-3">Quick Actions</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { label: 'Book Bus', emoji: '🚌', action: () => setActiveModule('YATRA') },
                        { label: 'Order Food', emoji: '🍽️', action: () => setActiveModule('FOOD') },
                        { label: 'Buy Vegetables', emoji: '🥬', action: () => setActiveModule('GRAMMANDI') },
                        { label: 'Track Order', emoji: '📍', action: () => { } },
                    ].map((action, idx) => (
                        <button
                            key={idx}
                            onClick={action.action}
                            className="min-w-[100px] bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-3 text-center"
                        >
                            <span className="text-xl">{action.emoji}</span>
                            <p className="text-xs mt-1 font-medium">{action.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-around items-center">
                <button onClick={() => setActiveModule('HOME')} className={`flex flex-col items-center gap-1 p-2 ${activeModule === 'HOME' ? 'text-green-600' : 'text-slate-400'}`}>
                    <Home size={22} />
                    <span className="text-xs">Home</span>
                </button>
                <button onClick={() => setActiveModule('YATRA')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Bus size={22} />
                    <span className="text-xs">Yatra</span>
                </button>
                <button onClick={() => setActiveModule('GRAMMANDI')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Wheat size={22} />
                    <span className="text-xs">Mandi</span>
                </button>
                <button onClick={() => setActiveModule('FOOD')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Utensils size={22} />
                    <span className="text-xs">Food</span>
                </button>
                <button onClick={() => setActiveModule('PROFILE')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <UserIcon size={22} />
                    <span className="text-xs">Profile</span>
                </button>
            </div>
        </div>
    );
};

export default UserPanel;
