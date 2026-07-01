/**
 * ProviderApp - Service Provider App Entry Point
 * USS v3.0 - Single app for all service providers (Driver, Farmer, Vendor, Mess, etc.)
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Truck, Wheat, Store, UtensilsCrossed, ShoppingCart, Box, Check,
    Sparkles, X, MessageSquare, LayoutDashboard, Package, Wallet, Film, Settings,
    QrCode, Bell, ChevronDown, Plus, Loader2, Bus, Plane, Wrench
} from 'lucide-react';

// Import Shared Components
import { GramSahayakBubble } from './GramSahayakBubble';
import ChatSection from './ChatSection';
import { ProfilePill } from './ProfilePill';

// Import Role-specific Views
import DriverView from './DriverView';
import { DriverProfileModal } from './DriverProfileModal';
import KisanApp from './KisanApp';
import VendorView from './VendorView';
import MessManagerView from './MessManagerView';
import ShopkeeperView from './ShopkeeperView';
import CargoDriverView from './CargoDriverView';
import ReelsSection from './ReelsSection';
import MyQRCode from './MyQRCode';
import RoleSelector from './RoleSelector';
import { useTranslation } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';

const AdminView = lazy(() => import('./AdminView').then((m) => ({ default: m.AdminView })));

interface ProviderAppProps {
    user: User | null;
    onLogout: () => void;
}

type ProviderRole = 
    | 'DRIVER' 
    | 'FARMER' 
    | 'VENDOR' 
    | 'RETAILER' 
    | 'MESS_OWNER' 
    | 'MESS_MANAGER'
    | 'FOOD_VENDOR'
    | 'SHOPKEEPER' 
    | 'LOGISTICS' 
    | 'CARGO_DRIVER'
    | 'VILLAGE_MANAGER'
    | 'ADMIN';
type TabType = 'bus' | 'cargo' | 'charter' | 'tool';

interface RoleConfig {
    icon: React.ReactNode;
    label: string;
    color: string;
}

const ROLE_CONFIGS: Record<ProviderRole, RoleConfig> = {
    DRIVER: { icon: <Truck className="w-4 h-4" />, label: 'Driver', color: '#3b82f6' },
    FARMER: { icon: <Wheat className="w-4 h-4" />, label: 'Farmer', color: '#22c55e' },
    VENDOR: { icon: <Store className="w-4 h-4" />, label: 'Vendor', color: '#f97316' },
    RETAILER: { icon: <ShoppingCart className="w-4 h-4" />, label: 'Retailer', color: '#8b5cf6' },
    MESS_OWNER: { icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Mess Owner', color: '#ef4444' },
    MESS_MANAGER: { icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Mess Manager', color: '#ef4444' },
    FOOD_VENDOR: { icon: <Store className="w-4 h-4" />, label: 'Food Vendor', color: '#f97316' },
    SHOPKEEPER: { icon: <Store className="w-4 h-4" />, label: 'Shopkeeper', color: '#06b6d4' },
    LOGISTICS: { icon: <Box className="w-4 h-4" />, label: 'Logistics', color: '#84cc16' },
    CARGO_DRIVER: { icon: <Truck className="w-4 h-4" />, label: 'Cargo Driver', color: '#3b82f6' },
    VILLAGE_MANAGER: { icon: <Settings className="w-4 h-4" />, label: 'Village Manager', color: '#e11d48' },
    ADMIN: { icon: <Wrench className="w-4 h-4" />, label: 'Admin', color: '#d97706' }
};

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const ProviderApp: React.FC<ProviderAppProps> = ({ user, onLogout }) => {
    const [showDriverProfile, setShowDriverProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('bus');
    const [activeRole, setActiveRole] = useState<ProviderRole>('DRIVER');
    const [userRoles, setUserRoles] = useState<ProviderRole[]>([]);
    const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
    const [showMyQR, setShowMyQR] = useState(false);
    const [showRoleSelector, setShowRoleSelector] = useState(false);
    const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
    const [pendingOrders, setPendingOrders] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const { t } = useTranslation();

    const ColorIcon: React.FC<{ icon: React.ReactNode; color: string }> = ({ icon, color }) => {
        const iconRef = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (iconRef.current) iconRef.current.style.color = color;
        }, [color]);
        return <div ref={iconRef}>{icon}</div>;
    };

    const ColorStat: React.FC<{ value: string | number; color: string }> = ({ value, color }) => {
        const textRef = React.useRef<HTMLSpanElement>(null);
        React.useEffect(() => {
            if (textRef.current) textRef.current.style.color = color;
        }, [color]);
        return <span ref={textRef} className="text-sm font-extrabold">{value}</span>;
    };

    // Load user's roles
    useEffect(() => {
        if (user) {
            loadUserRoles();

            // 1. Request GPS Permissions via Capacitor explicitly on App Load (native only)
            const requestGPS = async () => {
                // Skip GPS on web - Capacitor Geolocation is not implemented for browser
                if (!Capacitor.isNativePlatform()) {
                    console.log('ℹ️ GPS: Skipping Capacitor GPS on web platform.');
                    return;
                }
                try {
                    const status = await Geolocation.checkPermissions();
                    if (status.location !== 'granted') {
                        await Geolocation.requestPermissions();
                    }
                    // Trigger a dummy fetch to warm up the GPS sensor
                    await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                } catch (e) {
                    console.warn('GPS Init Warning:', e);
                }
            };
            requestGPS();

            // 2. Add Background Pinger (Clicker) to Keep Render Server Awake 
            // Hits the health endpoint every 5 minutes while the app is alive
            const keepAliveInterval = setInterval(() => {
                fetch(`${API_BASE_URL}/api/health`)
                    .then(res => res.json())
                    .then(data => console.log('💓 Keep-Alive Ping Sent (Provider):', data.status))
                    .catch(e => console.error('Keep-Alive Failed (Provider):', e.message));
            }, 5 * 60 * 1000); // 5 minutes

            return () => clearInterval(keepAliveInterval);
        }
    }, [user]);

    const loadUserRoles = async () => {
        setLoadingRoles(true);
        try {
            const token = localStorage.getItem('villagelink_token');
            if (!token) {
                setShowRoleSelector(true);
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/user/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Guard: Check if response is valid JSON before parsing
            if (!res.ok) {
                console.warn(`/api/user/me returned ${res.status}. Using local role fallback.`);
                // Fallback to user's stored role or default
                if (user?.role && user.role !== 'PASSENGER') {
                    setUserRoles([user.role as ProviderRole]);
                    setActiveRole(user.role as ProviderRole);
                } else {
                    setUserRoles(['DRIVER']);
                    setActiveRole('DRIVER');
                }
                return;
            }

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('/api/user/me returned non-JSON response. Using local fallback.');
                setUserRoles(['DRIVER']);
                setActiveRole('DRIVER');
                return;
            }

            const data = await res.json();

            if (data.providerRoles && data.providerRoles.length > 0) {
                const verifiedRoles = data.providerRoles
                    .filter((r: any) => r.status === 'VERIFIED')
                    .map((r: any) => r.roleType);

                setUserRoles(verifiedRoles);
                if (data.activeRole && verifiedRoles.includes(data.activeRole)) {
                    setActiveRole(data.activeRole);
                } else if (verifiedRoles.length > 0) {
                    setActiveRole(verifiedRoles[0]);
                }
            } else {
                // No roles yet, show role selector
                setShowRoleSelector(true);
            }
        } catch (error) {
            console.warn('Load roles (network error, using fallback):', error);
            // Default to driver for existing users
            if (user?.role && user.role !== 'PASSENGER') {
                setUserRoles([user.role as ProviderRole]);
                setActiveRole(user.role as ProviderRole);
            } else {
                setUserRoles(['DRIVER']);
            }
        } finally {
            setLoadingRoles(false);
        }
    };

    const switchRole = async (role: ProviderRole) => {
        setActiveRole(role);
        setShowRoleSwitcher(false);
        setActiveTab('bus');

        // Save to server
        try {
            const token = localStorage.getItem('villagelink_token');
            await fetch(`${API_BASE_URL}/api/user/active-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ activeRole: role })
            });
        } catch (error) {
            console.error('Switch role error:', error);
        }
    };

    const handleRoleRegistration = (selectedRoles: any[]) => {
        setUserRoles(selectedRoles as ProviderRole[]);
        setActiveRole(selectedRoles[0] as ProviderRole);
        setShowRoleSelector(false);
    };

    const renderDashboard = () => {
        switch (activeRole) {
            case 'DRIVER':
                return <DriverView user={user!} lang="EN" />;
            case 'FARMER':
                return <KisanApp />;
            case 'VENDOR':
            case 'RETAILER':
            case 'FOOD_VENDOR':
                return <VendorView user={user!} />;
            case 'MESS_OWNER':
            case 'MESS_MANAGER':
                return <MessManagerView user={user!} onBack={() => { }} />;
            case 'SHOPKEEPER':
                return <ShopkeeperView user={user!} />;
            case 'LOGISTICS':
            case 'CARGO_DRIVER':
                return <CargoDriverView
                    driverId={user?.id || ''}
                    driverName={user?.name || ''}
                    onBack={() => { }}
                />;
            case 'VILLAGE_MANAGER':
            case 'ADMIN':
                return (
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-white/5">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                            <p className="text-sm text-slate-400">Loading Admin Dashboard...</p>
                        </div>
                    }>
                        <AdminView user={user!} />
                    </Suspense>
                );
            default:
                return <DriverView user={user!} lang="EN" />;
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'bus':
                return renderDashboard();
            case 'cargo':
                return <OrdersView role={activeRole} user={user!} />;
            case 'charter':
                return <EarningsView role={activeRole} user={user!} />;
            case 'tool':
                return <SettingsView user={user!} onLogout={onLogout} />;
            default:
                return null;
        }
    };

    if (!user) {
        return (
            <div className="provider-app-loading">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>Loading...</p>
            </div>
        );
    }

    if (loadingRoles) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-slate-400">Loading partner profile...</p>
            </div>
        );
    }

    if (user.role === 'ADMIN') {
        return (
            <Suspense
                fallback={
                    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-950 text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                        <p className="text-sm opacity-70">Loading admin…</p>
                    </div>
                }
            >
                <AdminView user={user} />
            </Suspense>
        );
    }

    // Show role selector if no roles registered
    if (showRoleSelector) {
        return (
            <RoleSelector
                user={user}
                onComplete={handleRoleRegistration}
                onCancel={() => setShowRoleSelector(false)}
            />
        );
    }

    // Show Verification Pending screen if user has no verified roles
    if (userRoles.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
                <div className="v5-mesh-bg fixed inset-0 z-0 opacity-40"></div>
                <div className="v5-grain"></div>
                
                <div className="liquid-glass-card p-8 rounded-3xl border border-white/10 max-w-md w-full text-center relative z-10 backdrop-blur-3xl bg-slate-900/60 shadow-2xl">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                    
                    <h2 className="text-2xl font-extrabold font-space mb-3 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                        {t('auth.verificationPending')}
                    </h2>
                    
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        Welcome to the VillageLink Partner network, <span className="text-white font-semibold">{user.name}</span>! Your profile details are currently being reviewed by our verification team. 
                    </p>
                    
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 text-left">
                        <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                            <span>Partner ID</span>
                            <span className="font-mono text-white">{user.id}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>Status</span>
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Pending Review
                            </span>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-6">
                        You will receive a notification and SMS once your account is activated. Usually takes 24-48 hours.
                    </p>
                    
                    <Button
                        variant="glow"
                        onClick={onLogout}
                        className="w-full py-3 rounded-2xl font-bold bg-rose-600 hover:bg-rose-500 border-none text-white"
                    >
                        {t('auth.signOut')}
                    </Button>
                </div>
            </div>
        );
    }

    const currentRoleConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS['DRIVER'];

    const headerRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        if (headerRef.current) {
            headerRef.current.style.borderBottom = `2px solid ${currentRoleConfig.color}44`;
        }
    }, [currentRoleConfig.color]);

    return (
        <div className="v5-app-shell">
            {/* Mesh Background */}
            <div className="v5-mesh-bg fixed inset-0 z-0"></div>
            <div className="v5-grain"></div>

            {/* Header */}
            <header ref={headerRef} className="v5-header">
                <div className="flex items-center gap-3">
                    <button
                        className="role-switcher-btn liquid-glass-card px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10 hover:border-white/20 transition-all font-bold"
                        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                    >
                        <ColorIcon icon={currentRoleConfig.icon} color={currentRoleConfig.color} />
                        <span className="text-sm">{currentRoleConfig.label} Mode</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                    </button>

                    {/* Role Dropdown */}
                    {showRoleSwitcher && (
                        <div className="role-dropdown absolute top-full left-5 mt-2 liquid-glass-card p-2 rounded-2xl border border-white/10 z-[200] animate-fade-in backdrop-blur-3xl bg-black/60 min-w-[200px]">
                            {userRoles.map(role => (
                                <button
                                    key={role}
                                    className={`role-option flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors ${role === activeRole ? 'text-[var(--accent-primary)]' : 'text-white'}`}
                                    onClick={() => switchRole(role)}
                                >
                                    <ColorIcon
                                        icon={(ROLE_CONFIGS[role] || ROLE_CONFIGS['DRIVER']).icon}
                                        color={role === activeRole ? 'inherit' : (ROLE_CONFIGS[role] || ROLE_CONFIGS['DRIVER']).color}
                                    />
                                    <span className="text-sm font-semibold">{(ROLE_CONFIGS[role] || ROLE_CONFIGS['DRIVER']).label}</span>
                                    {role === activeRole && <Check className="w-4 h-4 ml-auto" />}
                                </button>
                            ))}
                            <button
                                className="role-option flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors border-t border-white/5 mt-1 text-white/50"
                                onClick={() => setShowRoleSelector(true)}
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm font-semibold">Add New Role</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <LanguageSelector />
                    <ProfilePill
                        name={user?.name || 'Provider'}
                        balance={user?.walletBalance || 0}
                        onClick={() => {
                            if (activeRole === 'DRIVER') {
                                setShowDriverProfile(true);
                            }
                        }}
                    />
                    <button className="relative w-10 h-10 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center hover:border-[var(--border-glow)] transition-colors" title="Notifications">
                        <Bell size={18} className="opacity-70" />
                        {pendingOrders > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-hot)] rounded-full text-[8px] font-bold flex items-center justify-center border-2 border-[var(--bg-deep)]">
                                {pendingOrders}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3 px-5 my-4">
                {[
                    { label: 'Today', value: `₹${earnings.today}`, icon: <Wallet size={12} />, color: 'var(--accent-primary)' },
                    { label: 'Weekly', value: `₹${earnings.week}`, icon: <Sparkles size={12} />, color: 'var(--accent-secondary)' },
                    { label: 'Pending', value: pendingOrders, icon: <Package size={12} />, color: 'var(--accent-warm)' }
                ].map((stat, i) => (
                    <div key={i} className="v5-card p-3 flex flex-col items-center justify-center bg-white/5">
                        <ColorStat value={stat.value} color={stat.color} />
                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5 font-bold">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            {showDriverProfile && activeRole === 'DRIVER' && user && (
                <DriverProfileModal user={user} onClose={() => setShowDriverProfile(false)} />
            )}
            
            <main className="v5-scroll-view flex-1 pb-24 relative z-10 px-5">
                {renderContent()}
            </main>

            {/* Floating My QR Button */}
            <button
                className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-hot)] flex items-center justify-center shadow-lg transform hover:scale-110 active:scale-95 transition-all z-50 text-white"
                onClick={() => setShowMyQR(true)}
                title="My QR Code"
            >
                <QrCode size={24} />
            </button>

            {/* Bottom Navigation */}
            <nav className="v5-bottom-nav">
                <ProviderNavItem
                    icon={<Bus size={22} />}
                    label="Bus"
                    active={activeTab === 'bus'}
                    onClick={() => setActiveTab('bus')}
                />
                <ProviderNavItem
                    icon={<Truck size={22} />}
                    label="Cargo"
                    active={activeTab === 'cargo'}
                    onClick={() => setActiveTab('cargo')}
                    badge={pendingOrders}
                />
                <ProviderNavItem
                    icon={<Plane size={22} />}
                    label="Charter"
                    active={activeTab === 'charter'}
                    onClick={() => setActiveTab('charter')}
                />
                <ProviderNavItem
                    icon={<Wrench size={22} />}
                    label="Tool"
                    active={activeTab === 'tool'}
                    onClick={() => setActiveTab('tool')}
                />
            </nav>

            {/* Gram Sahayak Floating Assistant */}
            <GramSahayakBubble
                user={user!}
                onOpenChat={() => {
                    setActiveTab('bus'); // Shift focus back safely
                    setShowAIChat(true);
                }}
            />

            {/* AI Chat Drawer */}
            {showAIChat && (
                <div className="fixed inset-0 z-[200] bg-[var(--bg-void)]/90 backdrop-blur-xl animate-fade-in h-[100dvh]">
                    <div className="flex flex-col h-full max-w-lg mx-auto bg-[var(--bg-surface)] shadow-2xl">
                        <header className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                                    <Sparkles size={20} className="text-black" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Gram Sahayak Pro</span>
                                    <span className="text-[10px] text-[var(--accent-primary)] animate-pulse">Business Advisor Active</span>
                                </div>
                            </div>
                            <button onClick={() => setShowAIChat(false)} className="p-2 rounded-xl bg-white/5" title="Close AI Assistant">
                                <X size={20} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-hidden">
                            <ChatSection user={user!} isAIAssistant={true} />
                        </div>
                    </div>
                </div>
            )}

            {/* My QR Modal */}
            {showMyQR && (
                <MyQRCode
                    user={user}
                    role={activeRole}
                    onClose={() => setShowMyQR(false)}
                />
            )}
        </div>
    );
};

// Orders View Component
const OrdersView: React.FC<{ role: ProviderRole; user: User }> = ({ role, user }) => {
    const config = ROLE_CONFIGS[role] || ROLE_CONFIGS['DRIVER'];
    return (
        <div className="orders-view">
            <h2 className="view-title">
                Orders & Requests
            </h2>
            <p className="view-empty-text">No pending orders for {config.label}</p>
        </div>
    );
};

// Earnings View Component  
const EarningsView: React.FC<{ role: ProviderRole; user: User }> = ({ role, user }) => {
    const config = ROLE_CONFIGS[role] || ROLE_CONFIGS['DRIVER'];
    return (
        <div className="earnings-view">
            <h2 className="view-title">
                Earnings Dashboard
            </h2>
            <p className="view-empty-text">Earnings data for {config.label}</p>
        </div>
    );
};

// Settings View Component
const SettingsView: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
    <div className="settings-view">
        <h2 className="view-title">
            Settings
        </h2>
        <Button variant="danger" onClick={onLogout} className="mt-4">
            Logout
        </Button>
    </div>
);

// Provider Nav Item Component
const ProviderNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    badge?: number;
}> = ({ icon, label, active, onClick, badge }) => (
    <button
        className={`v5-nav-item ${active ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="relative">
            <span className={`text-xl ${active ? 'opacity-100' : 'opacity-40'}`}>{icon}</span>
            {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-hot)] rounded-full text-[8px] font-bold flex items-center justify-center text-white">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </div>
        <span className={`text-[10px] font-semibold mt-1 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
            {label}
        </span>
    </button>
);

export default ProviderApp;
