/**
 * UserApp - Consumer App Entry Point
 * VillageLink Ultimate V5 - Premium Rural Tech Experience
 */

import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { API_BASE_URL } from '../config';
import { Bell, Loader2 } from 'lucide-react';

// Import V5 Shared Components
import { BentoCard } from './BentoCard';
import { ProfilePill } from './ProfilePill';
import { StatRing } from './StatRing';
import V5BottomNav, { TabType } from './V5BottomNav';

// Import Views
import PassengerView from './PassengerView';
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

    const renderHomeContent = () => (
        <div className="v5-home-content animate-fade-in">
            {/* Hero Section */}
            <section className="px-5 pt-4 pb-6">
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                    Good Morning, {user?.name || 'User'} 👋
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight mb-6">
                    Your <span className="v5-gradient-text">Rural Command</span><br />Center Awaits
                </h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { value: '12', label: 'Buses', color: 'var(--accent-primary)' },
                        { value: '847', label: 'Parcels', color: 'var(--accent-secondary)' },
                        { value: '156', label: 'Meals', color: 'var(--accent-tertiary)' },
                        { value: '₹2.4L', label: 'Mandi', color: 'var(--accent-warm)' }
                    ].map((stat, i) => (
                        <div key={i} className="v5-stat-ring">
                            <span className="text-lg font-extrabold font-mono">{stat.value}</span>
                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Actions Bento Grid */}
            <div className="v5-section-header">
                <h2 className="v5-section-title">
                    <span className="w-7 h-7 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-sm">⚡</span>
                    Quick Actions
                </h2>
                <span className="v5-section-action">View All →</span>
            </div>

            <div className="v5-bento-grid mb-6">
                <BentoCard
                    icon="🚌"
                    title="Book Ride"
                    description="12 buses available now"
                    colorClass="v5-icon-emerald"
                    badge="Live"
                    onClick={() => { }}
                />
                <BentoCard
                    icon="🌾"
                    title="Gram Mandi"
                    description="Fresh harvest deals"
                    colorClass="v5-icon-warm"
                    onClick={() => setActiveTab('haat' as TabType)}
                />
                <BentoCard
                    icon="🍽️"
                    title="Mess Menu"
                    description="Today's special ₹60"
                    colorClass="v5-icon-hot"
                    onClick={() => { }}
                />
                <BentoCard
                    icon="📦"
                    title="Cargo"
                    description="Track 3 parcels"
                    colorClass="v5-icon-cyan"
                    onClick={() => { }}
                />
            </div>

            {/* Passenger View Content */}
            <PassengerView user={user!} lang={lang} />
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return renderHomeContent();
            case 'reels': return <ReelsSection user={user!} />;
            case 'haat' as TabType: return <GramMandiHome user={user!} onBack={() => setActiveTab('home')} />;
            case 'chat': return <ChatSection user={user!} />;
            case 'profile': return <UserProfile user={user!} onBack={() => setActiveTab('home')} />;
            default: return null;
        }
    };

    if (!user) {
        return (
            <div className="v5-loading-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Loading VillageLink...</p>
            </div>
        );
    }

    return (
        <div className="v5-app-shell">
            {/* Mesh Background */}
            <div className="v5-mesh-bg fixed inset-0 z-0"></div>

            {/* V5 Header */}
            <header className="v5-header">
                <div className="flex items-center gap-3">
                    <div className="v5-brand-mark">V</div>
                    <div className="flex flex-col">
                        <span className="text-base font-extrabold tracking-tight">Village<span className="v5-gradient-text">Link</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ProfilePill
                        name={user?.name || 'User'}
                        balance={user?.balance || 2440}
                    />
                    <button className="relative w-10 h-10 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center hover:border-[var(--border-glow)] transition-colors" aria-label="Notifications">
                        <Bell size={18} className="opacity-70" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-hot)] rounded-full text-[8px] font-bold flex items-center justify-center border-2 border-[var(--bg-deep)]">3</span>
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="v5-scroll-view v5-main-content pb-24">
                {renderContent()}
            </main>

            {/* V5 Bottom Navigation */}
            <V5BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onCenterAction={() => setShowQRScanner(true)}
                notificationBadge={unreadMessages}
            />

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <UniversalQRScanner user={user} onClose={() => setShowQRScanner(false)} onResult={() => setShowQRScanner(false)} />
            )}

            <style>{`
                .v5-loading-screen {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-deep);
                    gap: 1rem;
                    color: var(--text-primary);
                }
                .animate-fade-in {
                    animation: v5FadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes v5FadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default UserApp;
