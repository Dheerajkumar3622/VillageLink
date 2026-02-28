/**
 * UserApp - Consumer App Entry Point
 * VillageLink Ultimate V5 - Premium Rural Tech Experience
 */

import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { API_BASE_URL } from '../config';
import { Bell, Loader2, Sparkles, X, Bike, ShieldCheck } from 'lucide-react';

// Import V5 Shared Components
import { BentoCard } from './BentoCard';
import { ProfilePill } from './ProfilePill';
import { StatRing } from './StatRing';
import V5BottomNav from './V5BottomNav';
import FoodLinkHome from './FoodLinkHome';
import LogisticsApp from './LogisticsApp';

// Extended TabType for User App
export type UserTabType = 'home' | 'rides' | 'haat' | 'food' | 'cargo' | 'reels' | 'profile' | 'chat' | 'scan';

// Import Views
import PassengerView from './PassengerView';
import GramMandiHome from './GramMandiHome';
import ReelsSection from './ReelsSection';
import ChatSection from './ChatSection';
import UniversalQRScanner from './UniversalQRScanner';
import UserProfile from './UserProfile';
import ScratchCard from './ScratchCard';
import { Moon, Sun } from 'lucide-react';

interface UserAppProps {
    user: UserType | any;
    onLogout: () => void;
    lang?: 'EN' | 'HI';
    darkMode?: boolean;
    toggleTheme?: () => void;
}

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, lang = 'EN', darkMode, toggleTheme }) => {
    const [activeTab, setActiveTab] = useState<UserTabType>('rides');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);
    const [contextualAdvice, setContextualAdvice] = useState<{ icon: string; text: string } | null>(null);
    const [showScratchCard, setShowScratchCard] = useState(false);
    const [gramSetuMode, setGramSetuMode] = useState(false);
    const [didiMode, setDidiMode] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

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
            const token = localStorage.getItem('villagelink_token');
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

    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollContainer = document.querySelector('.v5-main-content');
            if (scrollContainer && scrollContainer.scrollTop > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        const scrollContainer = document.querySelector('.v5-main-content');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [activeTab]);

    const renderHomeContent = () => (
        <div className="v5-home-content animate-fade-in px-5 bg-transparent min-h-screen" style={{ color: '#1A1035' }}>

            {/* Quick Actions Row (Empty) */}

            {/* Reference Spacer Line - Harvest Gold matching theme */}
            <div className={`h-[2px] w-full bg-[#FFCE1B]/20 rounded-full mx-2 transition-all duration-300 ${isScrolled ? 'mb-2 opacity-0' : 'mb-6 opacity-100'}`}></div>

            {/* Support Pill Buttons - Right Aligned as per image */}
            <div className={`flex justify-end gap-2 px-2 pr-4 transition-all duration-300 overflow-hidden ${isScrolled ? 'max-h-0 mb-0 opacity-0' : 'max-h-20 mb-8 opacity-100'}`}>
                <button 
                    onClick={() => setGramSetuMode(!gramSetuMode)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[9px] font-[900] uppercase tracking-wider transition-all shadow-sm ${gramSetuMode ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                    <Bike size={12} strokeWidth={3} />
                    Feeder Mode
                </button>
                <button 
                    onClick={() => setDidiMode(!didiMode)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[9px] font-[900] uppercase tracking-wider transition-all shadow-sm ${didiMode ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                    <ShieldCheck size={12} strokeWidth={3} />
                    Didi Rath
                </button>
            </div>

            {/* Passenger View Content */}
            <PassengerView user={user!} lang={lang} isScrolled={isScrolled} />
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'rides': return <PassengerView user={user!} lang={lang} isScrolled={isScrolled} />;
            case 'reels': return <ReelsSection user={user!} />;
            case 'haat': return <GramMandiHome user={user!} onBack={() => setActiveTab('rides')} />;
            case 'food': return <FoodLinkHome user={user!} onBack={() => setActiveTab('rides')} />;
            case 'cargo': return <LogisticsApp />;
            case 'profile': return <UserProfile user={user!} onBack={() => setActiveTab('rides')} />;
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
            {/* Mesh Background - Prismatic Luxe */}
            <div className={`v5-mesh-bg fixed inset-0 z-0 transition-all duration-1000 ${darkMode ? 'bg-[#0A0705]' : 'bg-[#FFF9F5]'}`}>
                <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] blur-[120px] rounded-full animate-pulse ${darkMode ? 'bg-[#BE5103]/20' : 'bg-[#BE5103]/10'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] blur-[120px] rounded-full animate-pulse ${darkMode ? 'bg-[#FFCE1B]/15' : 'bg-[#FFCE1B]/10'}`} style={{ animationDelay: '1s' }}></div>
                <div className={`absolute top-[40%] right-[-5%] w-[30%] h-[30%] blur-[100px] rounded-full animate-pulse ${darkMode ? 'bg-[#069494]/15' : 'bg-[#069494]/10'}`} style={{ animationDelay: '2s' }}></div>
            </div>

            {/* V5 Header */}
            <header className={`v5-header glass-panel px-6 py-4 flex items-center justify-between z-50 transition-all duration-500 max-w-md mx-auto ${isScrolled ? '![border-radius:0_0_50%_50%/0_0_24px_24px] !shadow-lg border-b-border-subtle backdrop-blur-2xl' : '![border-radius:32px_32px_0_0] !border-b-transparent !shadow-none'}`}>
                <div className="flex items-center gap-3 animate-[pulseGlow_3s_ease-in-out_infinite] rounded-full transition-all duration-500">
                    {/* V5 Holographic Prism Logo */}
                    <div className="v5-logo-holographic">
                        <span className="v5-logo-sparkle"></span>
                        <span className="v5-logo-sparkle"></span>
                        <span className="v5-logo-sparkle"></span>
                        <span>V</span>
                    </div>
                </div>
                <div className="v5-living-header">
                    {/* Breathing Avatar */}
                    <div className="v5-avatar-ecosystem" onClick={() => setActiveTab('profile')}>
                        <div className="v5-breathing-ring"></div>
                        <div className="v5-avatar-core">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </div>
                    
                    {/* User Info + Wallet */}
                    <div className="v5-user-info">
                        <span className="v5-user-name">{user?.name?.split(' ')[0] || 'User'}</span>
                        <div className="v5-wallet-section">
                            <span className="v5-wallet-amount">₹{(user?.balance || 2440).toLocaleString()}</span>
                            <div className="v5-wallet-health">
                                <div className="v5-wallet-health-fill" style={{ width: '75%' }}></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="v5-header-divider"></div>
                    
                    {/* Notification Orb */}
                    <div className="relative">
                        <button 
                            className="v5-notification-orb" 
                            aria-label="Notifications"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={16} />
                            {unreadMessages > 0 && <span className="v5-notification-badge">{unreadMessages}</span>}
                        </button>
                        
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-[100] animate-fade-in overflow-hidden">
                                <div className="p-3 border-b flex justify-between items-center dark:border-slate-800">
                                    <h3 className="font-bold text-sm">Notifications</h3>
                                    <button onClick={() => setShowNotifications(false)}><X size={14}/></button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {contextualAdvice ? (
                                        <div className="p-3 border-b dark:border-slate-800 text-xs flex gap-2 items-start bg-blue-50/50 dark:bg-blue-900/20">
                                            <span className="text-xl">{contextualAdvice.icon}</span>
                                            <div>
                                                <p className="font-medium">System Alert</p>
                                                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{contextualAdvice.text}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="p-3 border-b dark:border-slate-800 text-xs flex gap-2 items-start">
                                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center">
                                            <Sparkles size={14} />
                                        </div>
                                        <div>
                                            <p className="font-medium">Welcome to VillageLink v5</p>
                                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Explore the new unified Super App!</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 text-center border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <button className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mark all as read</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Eclipse Theme Toggle */}
                    <button 
                        className={`v5-eclipse-toggle ${darkMode ? 'dark' : 'light'}`}
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        <Sun size={16} className="v5-sun-icon text-amber-400" />
                        <Moon size={16} className="v5-moon-icon text-indigo-400" />
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="v5-scroll-view v5-main-content pb-24 overflow-y-auto h-screen" style={{ scrollBehavior: 'smooth' }}>
                {renderContent()}
            </main>

            {/* V5 Bottom Navigation - Integrated Quick Actions */}
            <V5BottomNav
                activeTab={activeTab as any}
                onTabChange={(tab) => {
                    if (tab === 'scan') {
                        setShowQRScanner(true);
                    } else {
                        setActiveTab(tab as any);
                    }
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
