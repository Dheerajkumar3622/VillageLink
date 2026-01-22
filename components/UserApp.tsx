/**
 * UserApp - Consumer App Entry Point
 * USS v3.0 - The Cyber-Rural Frontier
 */

import React, { useState, useEffect, useRef } from 'react';
import { User as UserType } from '../types';
import { API_BASE_URL } from '../config';
import {
    Home, Film, ShoppingBag, MessageCircle, User as UserIcon,
    QrCode, Bell, Search, Menu, X, Loader2, ArrowLeft,
    TrendingUp, Zap, MapPin, ArrowRight, Shield, Activity
} from 'lucide-react';

// Import Views
import PassengerView from './PassengerView';
import FoodLinkHome from './FoodLinkHome';
import GramMandiHome from './GramMandiHome';
import ReelsSection from './ReelsSection';
import ChatSection from './ChatSection';
import UniversalQRScanner from './UniversalQRScanner';
import UserProfile from './UserProfile';

interface UserAppProps {
    user: UserType | any;
    onLogout: () => void;
    lang?: 'EN' | 'HI';
}

type TabType = 'home' | 'reels' | 'haat' | 'chat' | 'profile';

// ========================================
// SUB-COMPONENTS
// ========================================

const OrbitalNode: React.FC<{
    icon: string;
    label: string;
    angle: number;
    onClick: () => void;
}> = ({ icon, label, angle, onClick }) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (nodeRef.current) {
            nodeRef.current.style.setProperty('--node-angle', `${angle}deg`);
            nodeRef.current.style.setProperty('--node-angle-neg', `-${angle}deg`);
        }
    }, [angle]);

    return (
        <div ref={nodeRef} className="orbital-node orbital-node-dynamic" onClick={onClick}>
            <span className="node-icon-3d">{icon}</span>
            <span className="node-label">{label}</span>
        </div>
    );
};

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    badge?: number;
}> = ({ icon, label, active, onClick, badge }) => (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
        <div className="nav-icon-wrapper">
            {icon}
            {badge && badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
        </div>
        <span className="nav-label">{label}</span>
    </button>
);

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, lang = 'EN' }) => {
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        if (user) fetchUnreadCount();
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setUnreadMessages(data.unreadCount);
        } catch (error) {
            console.error('Fetch unread error:', error);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="user-app-home animate-fade-in">
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
                                        onClick={() => node.label === 'Haat' ? setActiveTab('haat') : null}
                                    />
                                ))}
                            </div>
                        </div>
                        <PassengerView user={user!} lang={lang} />
                    </div>
                );
            case 'reels': return <ReelsSection user={user!} />;
            case 'haat': return <GramMandiHome user={user!} onBack={() => setActiveTab('home')} />;
            case 'chat': return <ChatSection user={user!} />;
            case 'profile': return <UserProfile user={user!} onBack={() => setActiveTab('home')} />;
            default: return null;
        }
    };

    if (!user) {
        return (
            <div className="user-app-loading">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="font-hud uppercase tracking-widest text-xs opacity-50">Syncing Frontier...</p>
            </div>
        );
    }

    return (
        <div className="user-app-frontier min-h-screen overflow-x-hidden">
            {/* 100x DYNAMIC BACKGROUND ENGINE */}
            <div className={`vision-bg mode-${activeTab}`}>
                <div className="vision-aurora"></div>
            </div>

            {/* HOLO-TICKER HUD */}
            <div className="vision-ticker">
                <div className="ticker-content">
                    <span>• SYNC STATUS: OPTIMAL • VILLAGE PULSE: ACTIVE • WEATHER: SUNNY 28°C • HAAT UPDATE: TOMATO PRICES UP 5% • RIDE ALERT: 3 BUSES ON ROUTE 4 • MESS: DINNER SPECIALS POSTED • </span>
                    <span>• SYNC STATUS: OPTIMAL • VILLAGE PULSE: ACTIVE • WEATHER: SUNNY 28°C • HAAT UPDATE: TOMATO PRICES UP 5% • RIDE ALERT: 3 BUSES ON ROUTE 4 • MESS: DINNER SPECIALS POSTED • </span>
                </div>
            </div>

            <div className="vision-container max-w-md mx-auto relative z-10">
                {/* UNIFIED GLASS HUD HEADER */}
                <header className="vision-header liquid-glass-card mx-4 mt-4 rounded-2xl flex justify-between items-center p-4">
                    <div className="logo-section flex items-center gap-3">
                        <div className="vision-logo pulse-glow w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-xl">V</div>
                        <div className="logo-text flex flex-col">
                            <span className="text-sm font-black tracking-tighter leading-tight">VILLAGELINK</span>
                            <span className="text-[8px] font-bold text-emerald-400 opacity-60 tracking-[0.2em]">FRONTIER v3.0</span>
                        </div>
                    </div>

                    <div className="header-actions flex items-center gap-4">
                        <div className="hud-metric flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                            <TrendingUp size={10} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-tight">₹{user?.balance || '244'}</span>
                        </div>
                        <button className="relative text-white/60 hover:text-emerald-400 transition-colors" aria-label="Notifications">
                            <Bell size={18} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                        </button>
                        <div className="user-profile-frontier flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 p-0.5">
                                <div className="w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {user?.name?.charAt(0) || 'D'}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="hud-sub-status mx-5 mt-2 flex justify-between items-center px-1">
                    <div className="flex items-center gap-1.5">
                        <Zap size={10} className="text-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">System Nominal</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{lang === 'EN' ? 'Frontier Mode' : 'सीमावर्ती मोड'}</span>
                </div>

                {/* MAIN CINEMATIC CONTENT */}
                <main className="user-app-content py-6 px-4">
                    {renderContent()}
                </main>

                {/* LIQUID GLASS NAV */}
                <nav className="user-app-nav-frontier liquid-glass-card fixed bottom-4 left-4 right-4 h-16 rounded-2xl flex justify-around items-center px-2 z-50">
                    <NavItem icon={<Home size={20} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <NavItem icon={<Film size={20} />} label="Reels" active={activeTab === 'reels'} onClick={() => setActiveTab('reels')} />
                    <NavItem icon={<ShoppingBag size={20} />} label="Haat" active={activeTab === 'haat'} onClick={() => setActiveTab('haat')} />
                    <NavItem icon={<MessageCircle size={20} />} label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} badge={unreadMessages} />
                    <NavItem icon={<UserIcon size={20} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                </nav>

                {/* FLOATING ACTION SCANNER */}
                <button className="frontier-scan-btn fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-emerald-400 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-2xl z-40 hover:scale-110 active:scale-95 transition-transform" onClick={() => setShowQRScanner(true)}>
                    <QrCode size={24} />
                </button>
            </div>

            {/* MODALS */}
            {showQRScanner && (
                <UniversalQRScanner user={user} onClose={() => setShowQRScanner(false)} onResult={(r) => setShowQRScanner(false)} />
            )}

            <style>{`
                .user-app-frontier { font-family: var(--font-hud); color: white; -webkit-font-smoothing: antialiased; }
                .vision-container { min-height: 100vh; display: flex; flex-direction: column; }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .user-app-loading {
                    height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: var(--obsidian-deep); gap: 1rem; color: white;
                }
            `}</style>
        </div>
    );
};

export default UserApp;
