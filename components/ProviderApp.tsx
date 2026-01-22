/**
 * ProviderApp - Service Provider App Entry Point
 * USS v3.0 - Single app for all service providers (Driver, Farmer, Vendor, Mess, etc.)
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    LayoutDashboard, Package, Wallet, Film, Settings,
    QrCode, Bell, ChevronDown, Plus, Loader2, ArrowLeft,
    Truck, Wheat, Store, UtensilsCrossed, ShoppingCart, Box, Check
} from 'lucide-react';

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
            headerRef.current.style.background = `linear-gradient(135deg, ${currentRoleConfig.color} 0%, ${currentRoleConfig.color}dd 100%)`;
        }
    }, [currentRoleConfig.color]);

    return (
        <div className="provider-app">
            {/* Header */}
            <header ref={headerRef} className="provider-app-header">
                <div className="header-left">
                    <button
                        className="role-switcher-btn"
                        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                    >
                        {currentRoleConfig.icon}
                        <span>{currentRoleConfig.label} Mode</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Role Dropdown */}
                    {showRoleSwitcher && (
                        <div className="role-dropdown">
                            {userRoles.map(role => (
                                <button
                                    key={role}
                                    className={`role-option ${role === activeRole ? 'active' : ''}`}
                                    onClick={() => switchRole(role)}
                                >
                                    {ROLE_CONFIGS[role].icon}
                                    <span>{ROLE_CONFIGS[role].label}</span>
                                    {role === activeRole && <Check className="w-4 h-4 ml-auto" />}
                                </button>
                            ))}
                            <button
                                className="role-option add-role"
                                onClick={() => setShowRoleSelector(true)}
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add New Role</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="header-right">
                    <button className="icon-btn" title="Notifications">
                        <Bell className="w-5 h-5" />
                        {pendingOrders > 0 && <span className="badge">{pendingOrders}</span>}
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">₹{earnings.today}</span>
                    <span className="stat-label">Today</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-value">₹{earnings.week}</span>
                    <span className="stat-label">This Week</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <span className="stat-value">{pendingOrders}</span>
                    <span className="stat-label">Pending</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="provider-app-content">
                {renderContent()}
            </main>

            {/* Floating My QR Button */}
            <button
                className="floating-qr-btn"
                onClick={() => setShowMyQR(true)}
                title="My QR Code"
            >
                <QrCode className="w-6 h-6" />
            </button>

            {/* Bottom Navigation */}
            <nav className="provider-app-nav">
                <ProviderNavItem
                    icon={<LayoutDashboard />}
                    label="Dashboard"
                    active={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                />
                <ProviderNavItem
                    icon={<Package />}
                    label="Orders"
                    active={activeTab === 'orders'}
                    onClick={() => setActiveTab('orders')}
                    badge={pendingOrders}
                />
                <ProviderNavItem
                    icon={<Wallet />}
                    label="Earnings"
                    active={activeTab === 'earnings'}
                    onClick={() => setActiveTab('earnings')}
                />
                <ProviderNavItem
                    icon={<Film />}
                    label="Reels"
                    active={activeTab === 'reels'}
                    onClick={() => setActiveTab('reels')}
                />
                <ProviderNavItem
                    icon={<Settings />}
                    label="Settings"
                    active={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                />
            </nav>

            {/* My QR Modal */}
            {showMyQR && (
                <MyQRCode
                    user={user}
                    role={activeRole}
                    onClose={() => setShowMyQR(false)}
                />
            )}

            <style>{`
        .provider-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-primary, #f5f7fa);
        }

        .provider-app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          color: white;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .role-switcher-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .role-switcher-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .role-dropdown {
          position: absolute;
          top: 100%;
          left: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          padding: 8px;
          min-width: 200px;
          z-index: 1000;
        }

        .role-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: #374151;
          transition: background 0.2s;
        }

        .role-option:hover {
          background: #f3f4f6;
        }

        .role-option.active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .role-option.add-role {
          border-top: 1px solid #e5e7eb;
          margin-top: 4px;
          padding-top: 12px;
          color: #6b7280;
        }

        .stats-bar {
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: white;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #6b7280;
        }

        .stat-divider {
          width: 1px;
          height: 30px;
          background: #e5e7eb;
        }

        .provider-app-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 80px;
        }

        .floating-qr-btn {
          position: fixed;
          bottom: 90px;
          right: 16px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4);
          cursor: pointer;
          z-index: 50;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .floating-qr-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(249, 115, 22, 0.5);
        }

        .provider-app-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 8px 0 env(safe-area-inset-bottom, 8px);
          z-index: 100;
        }

        .icon-btn {
          position: relative;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 8px;
          padding: 8px;
          color: white;
          cursor: pointer;
        }

        .icon-btn .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          padding: 2px 5px;
          border-radius: 10px;
        }
      `}</style>
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
        className={`provider-nav-item ${active ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="relative">
            {icon}
            {badge && badge > 0 && (
                <span className="badge-round">{badge}</span>
            )}
        </div>
        <span className="text-[0.65rem] font-medium">{label}</span>
    </button>
);

export default ProviderApp;
