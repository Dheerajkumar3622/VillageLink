/**
 * UserApp - Consumer App Entry Point
 * USS v3.0 - Single app for all consumers
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Activity, Shield, Menu, MessageSquare, User, Search, MapPin,
    ArrowRight, Bell, Zap, TrendingUp, Globe
} from 'lucide-react';

// Import Views
import PassengerView from './PassengerView';
import FoodLinkHome from './FoodLinkHome';
import GramMandiHome from './GramMandiHome';
import ReelsSection from './ReelsSection';
import ChatSection from './ChatSection';
import UniversalQRScanner from './UniversalQRScanner';
import UserProfile from './UserProfile';

interface OrbitalNodeProps {
    icon: string;
    label: string;
    angle: number;
    onClick: () => void;
}

const OrbitalNode: React.FC<OrbitalNodeProps> = ({ icon, label, angle, onClick }) => {
    const nodeRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (nodeRef.current) {
            nodeRef.current.style.setProperty('--node-angle', `${angle}deg`);
            nodeRef.current.style.setProperty('--node-angle-neg', `-${angle}deg`);
        }
    }, [angle]);

    return (
        <div
            ref={nodeRef}
            className="orbital-node orbital-node-dynamic"
            onClick={onClick}
        >
            <span className="node-icon">{icon}</span>
            <span className="node-label">{label}</span>
        </div>
    );
};

interface UserAppProps {
    user: any;
    onLogout: () => void;
    lang?: 'EN' | 'HI';
}

type TabType = 'home' | 'reels' | 'profile' | 'admin' | 'services' | 'haat' | 'chat';

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, lang = 'EN' }) => {
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [viewMode, setViewMode] = useState<'hub' | 'detail'>('hub');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [notifications, setNotifications] = useState(0);

    // Fetch unread message count
    useEffect(() => {
        if (user) {
            fetchUnreadCount();
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setUnreadMessages(data.unreadCount);
            }
        } catch (error) {
            console.error('Fetch unread error:', error);
        }
    };

    const handleQRResult = (result: any) => {
        setShowQRScanner(false);
        // Navigate based on QR type
        if (result.navigateTo) {
            // Handle navigation
            console.log('Navigate to:', result.navigateTo);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="user-app-home">
                        {/* 3D Orbital Hub - Vision 2.0 */}
                        <div className="orbital-hub">
                            <div className="orbit-belt">
                                {[
                                    { icon: '🚌', label: 'Ride', angle: 0 },
                                    { icon: '🍽️', label: 'Mess', angle: 90 },
                                    { icon: '🛒', label: 'Haat', angle: 180 },
                                    { icon: '📦', label: 'Cargo', angle: 270 }
                                ].map((node, i) => (
                                    <OrbitalNode
                                        key={i}
                                        icon={node.icon}
                                        label={node.label}
                                        angle={node.angle}
                                        onClick={() => node.label === 'Ride' ? null : setActiveTab('haat')}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Main Content - PassengerView */}
                        <PassengerView user={user!} lang={lang} />
                    </div>
                );
            case 'reels':
                return <ReelsSection user={user!} />;
            case 'haat':
                return <GramMandiHome user={user!} onBack={() => setActiveTab('home')} />;
            case 'chat':
                return <ChatSection user={user!} />;
            case 'profile':
                return <UserProfile user={user!} onBack={() => setActiveTab('home')} />;
            default:
                return null;
        }
    };

    if (!user) {
        return (
            <div className="user-app-loading">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="user-app min-h-screen">
            {/* Vision 2.0        return (*/}
            <div className={`vision-bg ${activeTab === 'home' ? 'mode-kisan' : ''}`}>
                <div className="vision-aurora"></div>

                {/* 100x HOLO-TICKER HUD */}
                <div className="vision-ticker">
                    <div className="ticker-content">
                        <span>• SYNC STATUS: OPTIMAL • VILLAGE PULSE: ACTIVE • WEATHER: SUNNY 28°C • HAAT UPDATE: TOMATO PRICES UP 5% • RIDE ALERT: 3 BUSES ON ROUTE 4 • MESS: DINNER SPECIALS POSTED • HAAT: NEW SEED SHIPMENT ARRIVED • </span>
                        <span>• SYNC STATUS: OPTIMAL • VILLAGE PULSE: ACTIVE • WEATHER: SUNNY 28°C • HAAT UPDATE: TOMATO PRICES UP 5% • RIDE ALERT: 3 BUSES ON ROUTE 4 • MESS: DINNER SPECIALS POSTED • HAAT: NEW SEED SHIPMENT ARRIVED • </span>
                    </div>
                </div>

                <div className="vision-container mobile-narrow">
                    <header className="vision-header liquid-glass-card">
                        <div className="logo-section">
                            <div className="vision-logo pulse-glow">V</div>
                            <div className="logo-text">
                                <span className="logo-main">VILLAGELINK</span>
                                <span className="logo-sub">CYBER-RURAL FRONTIER</span>
                            </div>
                        </div>

                        <div className="header-actions">
                            <div className="hud-metric">
                                <TrendingUp size={12} className="text-emerald-400" />
                                <span>₹{user?.balance || '0'}</span>
                            </div>
                            <button className="vision-icon-btn" aria-label="Notifications">
                                <Bell size={18} />
                                <span className="notification-dot"></span>
                            </button>
                            <div className="user-profile-vision group">
                                <div className="user-avatar-ring">
                                    <div className="avatar-content">{user?.name?.charAt(0) || 'U'}</div>
                                    <svg className="ring-svg"><circle cx="20" cy="20" r="18" /></svg>
                                </div>
                                <span className="user-name-label">{user?.name || 'User'}</span>
                            </div>
                        </div>
                    </header>

                    <div className="orbital-main">
                        <div className="vision-mode-selector liquid-glass-card">
                            <div className="hub-status items-center px-4 py-2 flex justify-between">
                                <span className="text-[10px] font-black text-emerald-400 opacity-60 flex items-center gap-1">
                                    <Zap size={10} /> SYSTEM NOMINAL
                                </span>
                                <span className="text-[10px] font-black text-emerald-400 opacity-60">
                                    {lang === 'EN' ? 'FRONTIER MODE' : 'सीमावर्ती मोड'}
                                </span>
                            </div>
                        </div>

                        {/* Main Content */}
                        <main className="user-app-content">
                            {renderContent()}
                        </main>

                        {/* Floating QR Scanner Button */}
                        <button
                            className="floating-qr-btn"
                            onClick={() => setShowQRScanner(true)}
                            title="Scan QR Code"
                        >
                            <QrCode className="w-6 h-6" />
                        </button>

                        {/* Bottom Navigation */}
                        <nav className="user-app-nav">
                            <NavItem
                                icon={<Home />}
                                label="Home"
                                active={activeTab === 'home'}
                                onClick={() => setActiveTab('home')}
                            />
                            <NavItem
                                icon={<Film />}
                                label="Reels"
                                active={activeTab === 'reels'}
                                onClick={() => setActiveTab('reels')}
                            />
                            <NavItem
                                icon={<ShoppingBag />}
                                label="Haat"
                                active={activeTab === 'haat'}
                                onClick={() => setActiveTab('haat')}
                            />
                            <NavItem
                                icon={<MessageCircle />}
                                label="Chat"
                                active={activeTab === 'chat'}
                                onClick={() => setActiveTab('chat')}
                                badge={unreadMessages}
                            />
                            <NavItem
                                icon={<UserIcon />}
                                label="Profile"
                                active={activeTab === 'profile'}
                                onClick={() => setActiveTab('profile')}
                            />
                        </nav>

                        {/* QR Scanner Modal */}
                        {showQRScanner && (
                            <UniversalQRScanner
                                user={user}
                                onClose={() => setShowQRScanner(false)}
                                onResult={handleQRResult}
                            />
                        )}

                        <style>{`
        .user-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-primary, #f5f7fa);
        }

        .user-app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .app-title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .header-right {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 8px;
          padding: 8px;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255,255,255,0.3);
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
          min-width: 16px;
          text-align: center;
        }

        .user-app-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 80px;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 12px;
          background: white;
          margin-bottom: 8px;
        }

        .floating-qr-btn {
          position: fixed;
          bottom: 90px;
          right: 16px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
          cursor: pointer;
          z-index: 50;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .floating-qr-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(139, 92, 246, 0.5);
        }

        .user-app-nav {
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
      `}</style>
                    </div>
                    );
};

                    // Quick Action Card Component
                    const QuickActionCard: React.FC<{
    icon: string;
                    label: string;
                    sublabel: string;
    onClick: () => void;
}> = ({icon, label, sublabel, onClick}) => (
                    <button className="quick-action-card" onClick={onClick}>
                        <span className="quick-icon">{icon}</span>
                        <span className="quick-label">{label}</span>
                        <style>{`
      .quick-action-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 4px;
        background: #f9fafb;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .quick-action-card:hover {
        background: #f3f4f6;
        transform: translateY(-2px);
      }
      .quick-icon {
        font-size: 1.5rem;
        margin-bottom: 4px;
      }
      .quick-label {
        font-size: 0.75rem;
        color: #374151;
        font-weight: 500;
      }
    `}</style>
                    </button>
                    );

                    // Navigation Item Component
                    const NavItem: React.FC<{
    icon: React.ReactNode;
                    label: string;
                    active: boolean;
    onClick: () => void;
                    badge?: number;
}> = ({icon, label, active, onClick, badge}) => (
                    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
                        <div className="nav-icon-wrapper">
                            {icon}
                            {badge && badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
                        </div>
                        <span className="nav-label">{label}</span>
                        <style>{`
      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 6px 12px;
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        transition: color 0.2s;
      }
      .nav-item.active {
        color: #22c55e;
      }
      .nav-item:hover {
        color: #16a34a;
      }
      .nav-icon-wrapper {
        position: relative;
      }
      .nav-icon-wrapper svg {
        width: 24px;
        height: 24px;
      }
      .nav-badge {
        position: absolute;
        top: -6px;
        right: -10px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 10px;
        min-width: 14px;
        text-align: center;
      }
      .nav-label {
        font-size: 0.65rem;
        font-weight: 500;
      }
    `}</style>
                    </button>
                    );

                    export default UserApp;
