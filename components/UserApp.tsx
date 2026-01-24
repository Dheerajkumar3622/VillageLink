/**
 * UserApp - Consumer App Entry Point
 * VillageLink Ultimate V5 - Premium Rural Tech Experience
 */

import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { API_BASE_URL } from '../config';
import { Bell, Loader2, Sparkles, X } from 'lucide-react';

// Import V5 Shared Components
import { BentoCard } from './BentoCard';
import { ProfilePill } from './ProfilePill';
import { StatRing } from './StatRing';
import V5BottomNav from './V5BottomNav';
import FoodLinkHome from './FoodLinkHome';
import LogisticsApp from './LogisticsApp';

// Extended TabType for User App
type UserTabType = 'home' | 'rides' | 'haat' | 'food' | 'cargo' | 'reels' | 'profile' | 'chat';

// Import Views
import PassengerView from './PassengerView';
import GramMandiHome from './GramMandiHome';
import ReelsSection from './ReelsSection';
import ChatSection from './ChatSection';
import UniversalQRScanner from './UniversalQRScanner';
import UserProfile from './UserProfile';
import { GramSahayakBubble } from './GramSahayakBubble';
import ScratchCard from './ScratchCard';

interface UserAppProps {
    user: UserType | any;
    onLogout: () => void;
    lang?: 'EN' | 'HI';
}

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, lang = 'EN' }) => {
    const [activeTab, setActiveTab] = useState<UserTabType>('home');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);
    const [contextualAdvice, setContextualAdvice] = useState<{ icon: string; text: string } | null>(null);
    const [showScratchCard, setShowScratchCard] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        if (user) fetchUnreadCount(controller.signal);

        // Simulate Contextual AI Insights (V5 Parity)
        const insights = [
            { icon: '⛈️', text: 'Rain predicted tonight. Book your commute for tomorrow early?' },
            { icon: '🥛', text: 'Fresh milk from Nasirganj Hub is selling out fast!' },
            { icon: '🎁', text: 'Mystery Scratch Card available! Claim your daily reward.' },
            { icon: '🌾', text: 'New organic tomatoes harvested at Dehri Village.' }
        ];
        setContextualAdvice(insights[Math.floor(Math.random() * insights.length)]);

        return () => controller.abort();
    }, [user]);

    const fetchUnreadCount = async (signal?: AbortSignal) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
                headers: { Authorization: `Bearer ${token}` },
                signal
            });
            const data = await res.json();
            if (data.success) setUnreadMessages(data.unreadCount);
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Fetch unread error:', error);
        }
    };

    const StatCard: React.FC<{ value: string | number; label: string; color: string }> = ({ value, label, color }) => {
        const textRef = React.useRef<HTMLSpanElement>(null);
        React.useEffect(() => {
            if (textRef.current) textRef.current.style.color = color;
        }, [color]);

        return (
            <div className="v5-card p-3 flex flex-col items-center justify-center border-none shadow-whisk-float bg-white/5 border border-white/5 group hover:scale-105 transition-all">
                <span ref={textRef} className="text-xl font-extrabold font-mono filter drop-shadow-[0_0_8px_currentColor]">{value}</span>
                <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mt-1 font-black group-hover:text-white transition-colors">{label}</span>
            </div>
        );
    };

    const renderHomeContent = () => (
        <div className="v5-home-content animate-fade-in px-5">
            {/* Stats Grid - Premium HUD style */}
            <div className="grid grid-cols-4 gap-3 my-6">
                {[
                    { value: user?.heroLevel || '1', label: 'Level', color: 'var(--accent-primary)' },
                    { value: user?.dailyStreak || '0', label: 'Streak', color: 'var(--accent-warm)' },
                    { value: user?.heroPoints || '0', label: 'Points', color: 'var(--accent-tertiary)' },
                    { value: 'B+', label: 'Grade', color: 'var(--accent-secondary)' }
                ].map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {/* V5 Voice Bar (Inspired by Demo) */}
            <div className="v5-voice-bar mb-6" onClick={() => setShowAIChat(true)}>
                <span className="v5-voice-icon text-indigo-400 text-lg">🎙️</span>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">"Order organic milk from Nasirganj..."</span>
                <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            </div>

            {/* Contextual AI Advisor (V5 Parity) */}
            {contextualAdvice && (
                <div
                    className="v5-ai-peek mb-8 group cursor-pointer"
                    onClick={() => {
                        if (contextualAdvice.icon === '🎁') setShowScratchCard(true);
                        else setShowAIChat(true);
                    }}
                >
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {contextualAdvice.icon}
                    </div>
                    <div className="flex-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Gram Insight</p>
                        <p className="text-[11px] font-bold text-slate-200 leading-relaxed">{contextualAdvice.text}</p>
                    </div>
                </div>
            )}

            {/* Quick Actions Bento Grid */}
            <div className="v5-section-header px-0">
                <h2 className="v5-section-title">
                    <span className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">⚡</span>
                    Quick Actions
                </h2>
                <span className="v5-section-action">Explore</span>
            </div>

            <div className="v5-bento-grid mb-8">
                <BentoCard
                    icon="🚌"
                    title="Book Ride"
                    description="Hero Drivers nearby"
                    colorClass="v5-icon-emerald"
                    badge="5m away"
                    onClick={() => setActiveTab('rides')}
                />
                <BentoCard
                    icon="🌾"
                    title="Gram Mandi"
                    description="Direct from Farm"
                    colorClass="v5-icon-warm"
                    badge="FRESH"
                    onClick={() => setActiveTab('haat')}
                />
                <BentoCard
                    icon="🍽️"
                    title="Mess Master"
                    description="Live Kitchen Hub"
                    colorClass="v5-icon-hot"
                    badge="LIVE"
                    onClick={() => setActiveTab('food')}
                />
                <BentoCard
                    icon="📦"
                    title="CargoLink"
                    description="Track your parcel"
                    colorClass="v5-icon-cyan"
                    onClick={() => setActiveTab('cargo')}
                />
                <BentoCard
                    icon="💊"
                    title="Medicine"
                    description="Express Pharmacy"
                    colorClass="v5-icon-rose"
                />
                <BentoCard
                    icon="🛠️"
                    title="Services"
                    description="Plumber, Electrician"
                    colorClass="v5-icon-blue"
                />
                <BentoCard
                    icon="🏷️"
                    title="Offers"
                    description="Daily Mandi Deals"
                    colorClass="v5-icon-gold"
                />
                <BentoCard
                    icon="⭐"
                    title="Favorites"
                    description="Quick book routes"
                    colorClass="v5-icon-purple"
                />
                <BentoCard
                    icon="🥛"
                    title="Daily Needs"
                    description="Milk & Bread"
                    colorClass="v5-icon-sky"
                />
                <BentoCard
                    icon="🤝"
                    title="Community"
                    description="Village Board"
                    colorClass="v5-icon-indigo"
                />
                <BentoCard
                    icon="🏥"
                    title="Care"
                    description="Doctor Consult"
                    colorClass="v5-icon-emerald"
                />
                <BentoCard
                    icon="💰"
                    title="Finance"
                    description="Micro-loans"
                    colorClass="v5-icon-warm"
                />
            </div>

            {/* Passenger View Content */}
            <PassengerView user={user!} lang={lang} />
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return renderHomeContent();
            case 'rides': return <PassengerView user={user!} lang={lang} />;
            case 'reels': return <ReelsSection user={user!} />;
            case 'haat': return <GramMandiHome user={user!} onBack={() => setActiveTab('home')} />;
            case 'food': return <FoodLinkHome user={user!} onBack={() => setActiveTab('home')} />;
            case 'cargo': return <LogisticsApp />;
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
                activeTab={activeTab as 'home' | 'reels' | 'haat' | 'chat' | 'profile'}
                onTabChange={(tab) => setActiveTab(tab as UserTabType)}
                onCenterAction={() => setShowQRScanner(true)}
                notificationBadge={unreadMessages}
            />

            {/* Gram Sahayak Floating Assistant */}
            <GramSahayakBubble
                user={user}
                onOpenChat={() => {
                    setActiveTab('chat');
                    setShowAIChat(true);
                }}
            />

            {/* AI Chat Drawer - Simplified integration */}
            {showAIChat && (
                <div className="fixed inset-0 z-[200] bg-[var(--bg-void)]/90 backdrop-blur-xl animate-fade-in h-[100dvh]">
                    <div className="flex flex-col h-full max-w-lg mx-auto bg-[var(--bg-surface)] shadow-2xl">
                        <header className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                                    <Sparkles size={20} className="text-black" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black">Gram Sahayak Pro</span>
                                    <span className="text-[10px] text-[var(--accent-primary)] animate-pulse font-bold tracking-tighter uppercase">V5 Business Engine Active</span>
                                </div>
                            </div>
                            <button onClick={() => setShowAIChat(false)} className="p-2 rounded-xl bg-white/5" title="Close AI Assistant">
                                <X size={20} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-hidden">
                            {/* Temporarily removing isAIAssistant until ChatSection is updated */}
                            <ChatSection user={user} />
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <UniversalQRScanner user={user} onClose={() => setShowQRScanner(false)} onResult={() => setShowQRScanner(false)} />
            )}

            {/* Mystery Scratch Card (V5 Parity) */}
            {showScratchCard && (
                <ScratchCard
                    onClose={() => setShowScratchCard(false)}
                    onClaim={(reward) => {
                        alert(`Success! ${reward} added to your VillageLink Wallet.`);
                        setShowScratchCard(false);
                    }}
                />
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
