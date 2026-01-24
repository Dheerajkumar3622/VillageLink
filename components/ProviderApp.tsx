/**
 * ProviderApp - Service Provider App Entry Point
 * USS v3.0 - Single app for all service providers (Driver, Farmer, Vendor, Mess, etc.)
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Truck, Wheat, Store, UtensilsCrossed, ShoppingCart, Box, Check,
    Sparkles, X, MessageSquare, LayoutDashboard, Package, Wallet, Film, Settings,
    QrCode, Bell, ChevronDown, Plus, Loader2
} from 'lucide-react';

// Import Shared Components
import { GramSahayakBubble } from './GramSahayakBubble';
import ChatSection from './ChatSection';
import { ProfilePill } from './ProfilePill';

// Import Role-specific Views
import DriverView from './DriverView';
import KisanApp from './KisanApp';
import VendorView from './VendorView';
import MessManagerView from './MessManagerView';
import ShopkeeperView from './ShopkeeperView';
import CargoDriverView from './CargoDriverView';
import ReelsSection from './ReelsSection';
import MyQRCode from './MyQRCode';
import RoleSelector from './RoleSelector';

interface ProviderAppProps {
    user: User | null;
    onLogout: () => void;
}

type ProviderRole = 'DRIVER' | 'FARMER' | 'VENDOR' | 'RETAILER' | 'MESS_OWNER' | 'SHOPKEEPER' | 'LOGISTICS';
type TabType = 'dashboard' | 'orders' | 'earnings' | 'reels' | 'settings';

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
    SHOPKEEPER: { icon: <Store className="w-4 h-4" />, label: 'Shopkeeper', color: '#06b6d4' },
    LOGISTICS: { icon: <Box className="w-4 h-4" />, label: 'Logistics', color: '#84cc16' }
};

const ProviderApp: React.FC<ProviderAppProps> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [activeRole, setActiveRole] = useState<ProviderRole>('DRIVER');
    const [userRoles, setUserRoles] = useState<ProviderRole[]>([]);
    const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
    const [showMyQR, setShowMyQR] = useState(false);
    const [showRoleSelector, setShowRoleSelector] = useState(false);
    const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
    const [pendingOrders, setPendingOrders] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);

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
        }
    }, [user]);

    const loadUserRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
            console.error('Load roles error:', error);
            // Default to driver for existing users
            setUserRoles(['DRIVER']);
        }
    };

    const switchRole = async (role: ProviderRole) => {
        setActiveRole(role);
        setShowRoleSwitcher(false);
        setActiveTab('dashboard');

        // Save to server
        try {
            const token = localStorage.getItem('token');
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
                return <VendorView user={user!} />;
            case 'MESS_OWNER':
                return <MessManagerView user={user!} onBack={() => { }} />;
            case 'SHOPKEEPER':
                return <ShopkeeperView user={user!} />;
            case 'LOGISTICS':
                return <CargoDriverView
                    driverId={user?.id || ''}
                    driverName={user?.name || ''}
                    onBack={() => { }}
                />;
            default:
                return <DriverView user={user!} lang="EN" />;
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'orders':
                return <OrdersView role={activeRole} user={user!} />;
            case 'earnings':
                return <EarningsView role={activeRole} user={user!} />;
            case 'reels':
                return <ReelsSection user={user!} isCreator={true} />;
            case 'settings':
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

    const currentRoleConfig = ROLE_CONFIGS[activeRole];

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
                                        icon={ROLE_CONFIGS[role].icon}
                                        color={role === activeRole ? 'inherit' : ROLE_CONFIGS[role].color}
                                    />
                                    <span className="text-sm font-semibold">{ROLE_CONFIGS[role].label}</span>
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
                    <ProfilePill
                        name={user?.name || 'Provider'}
                        balance={user?.walletBalance || 0}
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
                    icon={<LayoutDashboard size={22} />}
                    label="Dashboard"
                    active={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                />
                <ProviderNavItem
                    icon={<Package size={22} />}
                    label="Orders"
                    active={activeTab === 'orders'}
                    onClick={() => setActiveTab('orders')}
                    badge={pendingOrders}
                />
                <ProviderNavItem
                    icon={<Wallet size={22} />}
                    label="Earnings"
                    active={activeTab === 'earnings'}
                    onClick={() => setActiveTab('earnings')}
                />
                <ProviderNavItem
                    icon={<Film size={22} />}
                    label="Reels"
                    active={activeTab === 'reels'}
                    onClick={() => setActiveTab('reels')}
                />
                <ProviderNavItem
                    icon={<Settings size={22} />}
                    label="Settings"
                    active={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                />
            </nav>

            {/* Gram Sahayak Floating Assistant */}
            <GramSahayakBubble
                user={user!}
                onOpenChat={() => {
                    setActiveTab('reels'); // Shift focus to chat
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
const OrdersView: React.FC<{ role: ProviderRole; user: User }> = ({ role, user }) => (
    <div className="orders-view">
        <h2 className="view-title">
            Orders & Requests
        </h2>
        <p className="view-empty-text">No pending orders for {ROLE_CONFIGS[role].label}</p>
    </div>
);

// Earnings View Component  
const EarningsView: React.FC<{ role: ProviderRole; user: User }> = ({ role, user }) => (
    <div className="earnings-view">
        <h2 className="view-title">
            Earnings Dashboard
        </h2>
        <p className="view-empty-text">Earnings data for {ROLE_CONFIGS[role].label}</p>
    </div>
);

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
