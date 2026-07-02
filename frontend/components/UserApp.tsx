/**
 * UserApp - Consumer App Entry Point
 * VillageLink Ultimate V5 - Premium Rural Tech Experience
 */

import React, { useState, useEffect } from 'react';
import { User as UserType, Ticket } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { Bell, Loader2, Sparkles, X, Bike, ShieldCheck, ArrowLeft, LogOut, Settings, Edit3, Camera, KeyRound, MapPin, Mail, Languages, Check, Phone, Paperclip, Send, Search } from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';
import { LiveTracker } from './LiveTracker';

// Import V5 Shared Components
import { BentoCard } from './BentoCard';
import { ProfilePill } from './ProfilePill';
import { StatRing } from './StatRing';
import V5BottomNav from './V5BottomNav';
// Extended TabType for User App
export type UserTabType = 'home' | 'rides' | 'haat' | 'food' | 'cargo' | 'reels' | 'profile' | 'chat' | 'scan';

import { Moon, Sun } from 'lucide-react';

// Lazy Load Heavy Views for Zero Latency Start
const PassengerView = React.lazy(() => import('./PassengerView'));
const GramMandiHome = React.lazy(() => import('./GramMandiHome'));
const ReelsSection = React.lazy(() => import('./ReelsSection'));
const ChatSection = React.lazy(() => import('./ChatSection'));
const UniversalQRScanner = React.lazy(() => import('./UniversalQRScanner'));
const UserProfile = React.lazy(() => import('./UserProfile'));
const ScratchCard = React.lazy(() => import('./ScratchCard'));
const FoodLinkHome = React.lazy(() => import('./FoodLinkHome'));
const LogisticsApp = React.lazy(() => import('./LogisticsApp'));

interface UserAppProps {
    user: UserType | any;
    onLogout: () => void;
    lang?: 'EN' | 'HI';
    darkMode?: boolean;
    toggleTheme?: () => void;
    toggleLang?: () => void;
}

import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const preloadLazyComponent = (importFn: () => Promise<any>) => {
    importFn().catch(() => {});
};

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, lang = 'EN', darkMode, toggleTheme, toggleLang }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<UserTabType>('rides');
    
    // Swipe gesture states (Touch tracking)
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchStartY, setTouchStartY] = useState(0);
    const [touchMoveX, setTouchMoveX] = useState(0);
    const [touchMoveY, setTouchMoveY] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [swipeDirection, setSwipeDirection] = useState<'none' | 'horizontal' | 'vertical'>('none');

    // Hardware exit back-tap state
    const [showExitToast, setShowExitToast] = useState(false);
    const lastBackPress = React.useRef<number>(0);
    
    useEffect(() => {
        // Preload heavy modules in background after 1.5 seconds to ensure instant tab switching
        const preloadTimer = setTimeout(() => {
            preloadLazyComponent(() => import('./GramMandiHome'));
            preloadLazyComponent(() => import('./FoodLinkHome'));
            preloadLazyComponent(() => import('./ReelsSection'));
            preloadLazyComponent(() => import('./ChatSection'));
            preloadLazyComponent(() => import('./UserProfile'));
            preloadLazyComponent(() => import('./LogisticsApp'));
            preloadLazyComponent(() => import('./UniversalQRScanner'));
        }, 1500);

        return () => clearTimeout(preloadTimer);
    }, []);

    const [showQRScanner, setShowQRScanner] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);
    const [contextualAdvice, setContextualAdvice] = useState<{ icon: string; text: string } | null>(null);
    const [showScratchCard, setShowScratchCard] = useState(false);
    const [gramSetuMode, setGramSetuMode] = useState(false);
    const [didiMode, setDidiMode] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileDetails, setShowProfileDetails] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editAddress, setEditAddress] = useState(user?.address || '');
    const [editPhone, setEditPhone] = useState(user?.phone || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');
    const [activeTourismTracker, setActiveTourismTracker] = useState<Ticket | null>(null);
    const [passengerViewMode, setPassengerViewMode] = useState('DASHBOARD');

    const handleSaveProfile = () => {
        // Mock save for now
        alert("Profile details updated successfully!");
        setShowEditProfile(false);
    };

    const handleUpdatePhoto = () => alert("Choose a photo from gallery...");
    const handleChangePassword = () => alert("A link to reset your password has been sent to your registered mobile number.");

    useEffect(() => {
        const controller = new AbortController();
        if (user) {
            fetchUnreadCount(controller.signal);
            
            // 1. Request GPS Permissions via Capacitor explicitly on App Load
            const requestGPS = async () => {
                try {
                    const status = await Geolocation.checkPermissions();
                    if (status.location !== 'granted') {
                        await Geolocation.requestPermissions();
                    }
                    // Trigger a dummy fetch to warm up the GPS sensor
                    try {
                        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                    } catch (posErr) {
                        console.warn("GPS Init: Device could not fetch location.");
                    }
                } catch (e) {
                    console.warn("GPS Permissions deferred or denied by user (Safe to ignore).");
                }
            };
            requestGPS();

            // 2. Add Background Pinger (Clicker) to Keep Render Server Awake 
            // Hits the health endpoint every 5 minutes while the app is alive
            const keepAliveInterval = setInterval(() => {
                fetch(`${API_BASE_URL}/api/health`)
                    .then(res => res.json())
                    .then(data => console.log('💓 Keep-Alive Ping Sent:', data.status))
                    .catch(e => console.error('Keep-Alive Failed:', e.message));
            }, 5 * 60 * 1000); // 5 minutes

            return () => {
                controller.abort();
                clearInterval(keepAliveInterval);
            };
        }

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

    useEffect(() => {
        const handlePvState = (e: Event) => {
            const customEvent = e as CustomEvent;
            setPassengerViewMode(customEvent.detail);
        };
        window.addEventListener('passenger-view-state', handlePvState);
        return () => window.removeEventListener('passenger-view-state', handlePvState);
    }, []);

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

    // Ref-based state cache to handle events in Capacitor listeners without re-binding
    const stateRef = React.useRef({
        activeTab,
        passengerViewMode,
        showQRScanner,
        showAIChat,
        showProfileDetails,
        showSettings,
        showEditProfile
    });

    useEffect(() => {
        stateRef.current = {
            activeTab,
            passengerViewMode,
            showQRScanner,
            showAIChat,
            showProfileDetails,
            showSettings,
            showEditProfile
        };
    }, [activeTab, passengerViewMode, showQRScanner, showAIChat, showProfileDetails, showSettings, showEditProfile]);

    const handleGlobalBack = () => {
        const {
            activeTab: curTab,
            passengerViewMode: curPvMode,
            showQRScanner: curQR,
            showAIChat: curAI,
            showProfileDetails: curProfile,
            showSettings: curSettings,
            showEditProfile: curEdit
        } = stateRef.current;

        if (curQR) {
            setShowQRScanner(false);
            return;
        }
        if (curAI) {
            setShowAIChat(false);
            return;
        }
        if (curProfile) {
            if (curSettings) {
                setShowSettings(false);
            } else if (curEdit) {
                setShowEditProfile(false);
            } else {
                setShowProfileDetails(false);
            }
            return;
        }

        if (curTab === 'haat') {
            window.dispatchEvent(new Event('haat-back'));
        } else if (curTab === 'food') {
            window.dispatchEvent(new Event('food-back'));
        } else if (curTab === 'rides') {
            if (curPvMode !== 'DASHBOARD') {
                window.dispatchEvent(new Event('passenger-back'));
            } else {
                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    App.minimizeApp();
                } else {
                    lastBackPress.current = now;
                    setShowExitToast(true);
                    setTimeout(() => setShowExitToast(false), 2000);
                }
            }
        } else {
            setActiveTab('rides');
        }
    };

    useEffect(() => {
        let backHandler: any = null;

        const setupListener = async () => {
            if (Capacitor.isNativePlatform()) {
                backHandler = await App.addListener('backButton', () => {
                    handleGlobalBack();
                });
            }
        };
        setupListener();

        return () => {
            if (backHandler) {
                backHandler.then((l: any) => l.remove()).catch(() => {});
            }
        };
    }, []);

    // Swipe gesture touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!['rides', 'haat', 'food'].includes(activeTab)) return;
        if (activeTab === 'rides' && passengerViewMode !== 'DASHBOARD') return;

        // Disable swipe transitions entirely if any modal or overlay is currently active/open in the DOM
        if (
            document.querySelector('.fixed.inset-0.z-\\[100\\]') ||
            document.querySelector('.fixed.inset-0.z-\\[200\\]') ||
            document.querySelector('.fixed.inset-0.z-\\[300\\]') ||
            document.querySelector('.fixed.inset-0.z-\\[500\\]')
        ) {
            return;
        }

        // Edge-only swipe validation to eliminate accidental swipes inside scroll views, maps, and sliders
        const startX = e.touches[0].clientX;
        const edgeThreshold = 40;
        if (startX > edgeThreshold && startX < window.innerWidth - edgeThreshold) {
            return;
        }

        const target = e.target as HTMLElement;
        if (
            target.closest('.no-swipe') ||
            target.closest('.leaflet-container') ||
            target.closest('.mapboxgl-map') ||
            target.closest('.map-container') ||
            target.closest('input') ||
            target.closest('textarea') ||
            target.closest('button') ||
            target.closest('a') ||
            target.closest('[role="slider"]') ||
            target.closest('.overflow-x-auto')
        ) {
            return;
        }

        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
        setTouchMoveX(e.touches[0].clientX);
        setTouchMoveY(e.touches[0].clientY);
        setIsSwiping(true);
        setSwipeDirection('none');
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;

        if (swipeDirection === 'none') {
            const threshold = 8;
            if (Math.abs(diffX) > threshold || Math.abs(diffY) > threshold) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    setSwipeDirection('horizontal');
                } else {
                    setSwipeDirection('vertical');
                    setIsSwiping(false);
                }
            }
        }

        if (swipeDirection === 'horizontal') {
            if (e.cancelable) e.preventDefault();
            setTouchMoveX(currentX);
            setTouchMoveY(currentY);
        }
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);

        if (swipeDirection === 'horizontal') {
            const diffX = touchMoveX - touchStartX;
            const swipeThreshold = window.innerWidth * 0.25;

            const swipeableTabs: UserTabType[] = ['rides', 'haat', 'food'];
            const currentIdx = swipeableTabs.indexOf(activeTab);

            if (currentIdx !== -1) {
                if (diffX < -swipeThreshold && currentIdx < swipeableTabs.length - 1) {
                    setActiveTab(swipeableTabs[currentIdx + 1]);
                } else if (diffX > swipeThreshold && currentIdx > 0) {
                    setActiveTab(swipeableTabs[currentIdx - 1]);
                }
            }
        }

        setTouchStartX(0);
        setTouchStartY(0);
        setTouchMoveX(0);
        setTouchMoveY(0);
        setSwipeDirection('none');
    };

    const getSwipeStyle = () => {
        const swipeableTabs: UserTabType[] = ['rides', 'haat', 'food'];
        const currentIdx = swipeableTabs.indexOf(activeTab);
        if (currentIdx === -1) return {};

        let dragOffset = 0;
        if (isSwiping && swipeDirection === 'horizontal') {
            const diffX = touchMoveX - touchStartX;
            if ((currentIdx === 0 && diffX > 0) || (currentIdx === 2 && diffX < 0)) {
                dragOffset = diffX * 0.25;
            } else {
                dragOffset = diffX;
            }
        }

        return {
            transform: `translate3d(calc(${-currentIdx * 100}vw + ${dragOffset}px), 0, 0)`,
            transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        };
    };

    const getSwipeProgress = () => {
        const swipeableTabs: UserTabType[] = ['rides', 'haat', 'food'];
        const currentIdx = swipeableTabs.indexOf(activeTab);
        if (currentIdx === -1) return 0;

        if (isSwiping && swipeDirection === 'horizontal') {
            const diffX = touchMoveX - touchStartX;
            let dragOffset = diffX;
            if ((currentIdx === 0 && diffX > 0) || (currentIdx === 2 && diffX < 0)) {
                dragOffset = diffX * 0.25;
            }
            return currentIdx - (dragOffset / window.innerWidth);
        }
        return currentIdx;
    };

    const getMeshColors = () => {
        const swipeableTabs: UserTabType[] = ['rides', 'haat', 'food'];
        const currentIdx = swipeableTabs.indexOf(activeTab);
        if (currentIdx === -1) {
            return {
                orb1: darkMode ? 'rgba(190, 81, 3, 0.2)' : 'rgba(190, 81, 3, 0.1)',
                orb2: darkMode ? 'rgba(255, 206, 27, 0.15)' : 'rgba(255, 206, 27, 0.1)',
                orb3: darkMode ? 'rgba(6, 148, 148, 0.15)' : 'rgba(6, 148, 148, 0.1)',
            };
        }

        const dragOffset = isSwiping && swipeDirection === 'horizontal' ? touchMoveX - touchStartX : 0;
        let progress = currentIdx - (dragOffset / window.innerWidth);
        progress = Math.max(0, Math.min(2, progress));

        const colors = [
            {
                orb1: [190, 81, 3, darkMode ? 0.2 : 0.1],
                orb2: [255, 206, 27, darkMode ? 0.15 : 0.1],
                orb3: [6, 148, 148, darkMode ? 0.15 : 0.1]
            },
            {
                orb1: [16, 185, 129, darkMode ? 0.2 : 0.1],
                orb2: [6, 148, 148, darkMode ? 0.2 : 0.1],
                orb3: [190, 81, 3, darkMode ? 0.1 : 0.05]
            },
            {
                orb1: [194, 65, 12, darkMode ? 0.25 : 0.15],
                orb2: [217, 119, 6, darkMode ? 0.2 : 0.1],
                orb3: [255, 206, 27, darkMode ? 0.15 : 0.1]
            }
        ];

        const phase1 = isNaN(progress) ? 0 : Math.floor(progress);
        const phase2 = Math.min(2, phase1 + 1);
        const weight = isNaN(progress) ? 0 : progress - phase1;

        const interpolate = (c1: number[], c2: number[]) => {
            if (!c1 || !c2) return 'rgba(0,0,0,0)';
            const r = Math.round(c1[0] + (c2[0] - c1[0]) * weight);
            const g = Math.round(c1[1] + (c2[1] - c1[1]) * weight);
            const b = Math.round(c1[2] + (c2[2] - c1[2]) * weight);
            const a = c1[3] + (c2[3] - c1[3]) * weight;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        };

        const c1 = colors[phase1] || colors[0];
        const c2 = colors[phase2] || colors[0];

        return {
            orb1: interpolate(c1.orb1, c2.orb1),
            orb2: interpolate(c1.orb2, c2.orb2),
            orb3: interpolate(c1.orb3, c2.orb3)
        };
    };

    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.currentTarget as HTMLElement;
            if (target && target.scrollTop > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        const scrollContainer = ['rides', 'haat', 'food'].includes(activeTab)
            ? document.querySelector(`.v5-swipe-slide[data-tab="${activeTab}"]`)
            : document.querySelector('.v5-main-content');

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            setIsScrolled(scrollContainer.scrollTop > 10);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [activeTab]);

    // Mandi Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = [
        "Search 'Organic Potatoes' 🥔",
        "Find 'Dehri Traders' 🏪",
        "Looking for 'Dairy Products' 🥛",
        "Ask AI: 'Cheapest Wheat' 🌾"
    ];

    // Predictive search placeholder animation
    useEffect(() => {
        if (!searchFocused && activeTab === 'haat') {
            const interval = setInterval(() => {
                setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [searchFocused, activeTab]);

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
            <PassengerView user={user!} lang={lang} isScrolled={isScrolled} onLogout={onLogout} activeTourismTracker={activeTourismTracker} setActiveTourismTracker={setActiveTourismTracker} />
        </div>
    );

    // renderContent removed to support offscreen layout caching


    if (!user) {
        return (
            <div className="v5-loading-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Loading VillageLink...</p>
            </div>
        );
    }

    const meshColors = getMeshColors();

    return (
        <div className="v5-app-shell">
            {/* Mesh Background - Prismatic Luxe */}
            <div className={`v5-mesh-bg fixed inset-0 z-[-20] pointer-events-none transition-all duration-1000 ${darkMode ? 'bg-[#0A0705]' : 'bg-[#FFF9F5]'}`}>
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] blur-[120px] rounded-full" style={{ backgroundColor: meshColors.orb1, transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] blur-[120px] rounded-full" style={{ backgroundColor: meshColors.orb2, transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}></div>
                <div className="absolute top-[40%] right-[-5%] w-[30%] h-[30%] blur-[100px] rounded-full" style={{ backgroundColor: meshColors.orb3, transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}></div>
            </div>

            {/* V5 Header */}
            <header className="v5-header glass-panel px-6 py-4 flex items-center justify-between z-50 transition-all duration-500 max-w-md mx-auto border-b-border-subtle backdrop-blur-2xl">
                <div className="flex items-center gap-3 animate-[pulseGlow_3s_ease-in-out_infinite] rounded-full transition-all duration-500">
                    {/* V5 Holographic Prism Logo or Back Button */}
                    {(activeTab === 'profile' || activeTab === 'haat' || activeTab === 'food' || (activeTab === 'rides' && passengerViewMode !== 'DASHBOARD')) ? (
                        <button onClick={() => {
                            handleGlobalBack();
                        }} className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm" aria-label="Go Back">
                            <ArrowLeft size={20} className="text-slate-900 dark:text-white" />
                        </button>
                    ) : (
                        <div className="v5-logo-holographic">
                            <span className="v5-logo-sparkle"></span>
                            <span className="v5-logo-sparkle"></span>
                            <span className="v5-logo-sparkle"></span>
                            <span>V</span>
                        </div>
                    )}
                    
                    {/* Integrated Mandi Search Bar (Only visible in 'haat' tab) */}
                    {activeTab === 'haat' && (
                        <div className="relative group flex-1 max-w-[200px] ml-2">
                            {/* Search Input Container */}
                            <div className={`relative flex items-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl px-3 py-2 border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-20 overflow-hidden ${searchFocused ? 'border-amber-400/50 shadow-[0_4px_15px_rgba(251,191,36,0.15)] scale-[1.02]' : 'border-white/40 dark:border-slate-800/60'}`}>
                                
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none"></div>

                                {/* Search Icon */}
                                <Search className={`w-4 h-4 transition-colors duration-300 ${searchFocused ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                                
                                {/* Input Field */}
                                <input 
                                    type="text"
                                    className="flex-1 bg-transparent border-none outline-none px-2 text-[11px] font-[800] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 z-10 w-full"
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                
                                {/* Animated Predictive Placeholder */}
                                {!searchQuery && !searchFocused && (
                                    <div className="absolute left-8 pointer-events-none transition-all duration-300 transform -translate-y-1/2 top-1/2 overflow-hidden right-8">
                                        <span className="text-[10px] whitespace-nowrap font-[800] text-slate-400 dark:text-slate-500 truncate block animate-[fadeSlideUp_3s_ease-in-out_infinite]">
                                            {placeholders[placeholderIndex]}
                                        </span>
                                    </div>
                                )}

                                {/* AI Sparkle / Clear Button */}
                                {searchQuery ? (
                                    <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 shrink-0">
                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500 dark:text-slate-400">✕</div>
                                    </button>
                                ) : (
                                    <div className="p-1 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-500 dark:text-amber-400 shrink-0">
                                        <Sparkles size={12} className="animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <LanguageSelector />
                    
                    <div className="v5-living-header flex items-center gap-2">
                        {/* Breathing Avatar */}
                    <div className="v5-avatar-ecosystem" onClick={() => {
                        if (activeTab === 'profile') {
                            setShowProfileDetails(true);
                        } else {
                            setActiveTab('profile');
                        }
                    }}>
                        <div className="v5-breathing-ring"></div>
                        <div className="v5-avatar-core">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </div>
                    
                    {/* User Info + Wallet (Hidden in Mandi view) */}
                    {activeTab !== 'haat' && (
                        <div className="v5-user-info">
                            <span className="v5-user-name">{user?.name?.split(' ')[0] || 'User'}</span>
                            <div className="v5-wallet-section">
                                <span className="v5-wallet-amount">₹{(user?.balance || 2440).toLocaleString()}</span>
                                <div className="v5-wallet-health">
                                    <div className="v5-wallet-health-fill" style={{ width: '75%' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab !== 'haat' && <div className="v5-header-divider"></div>}
                    
                    {/* Notification Orb (Hidden in Mandi view) */}
                    {activeTab !== 'haat' && (
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
                    )}
                    
                    {/* Eclipse Theme Toggle or Sign Out */}
                    {activeTab === 'profile' && (
                        <button onClick={onLogout} className="bg-red-500 text-white p-2 rounded-full shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center shrink-0" aria-label="Sign Out">
                            <LogOut size={16} strokeWidth={3} className="text-white" />
                        </button>
                    )}
                </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className={`v5-scroll-view v5-main-content pb-24 h-screen ${['rides', 'haat', 'food'].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto'}`} style={{ scrollBehavior: 'smooth' }}>
                <React.Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-8 mt-32 opacity-60 animate-[pulse_2s_ease-in-out_infinite]">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mb-4" />
                        <p className="text-[10px] uppercase font-[900] tracking-widest text-[#0F172A] dark:text-[#F8FAFC]">Loading Module...</p>
                    </div>
                }>
                    {/* Sliding Swipe Container for Rides, Mandi, and Food tabs */}
                    {['rides', 'haat', 'food'].includes(activeTab) ? (
                        <div 
                            className="v5-swipe-viewport"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div 
                                className="v5-swipe-container animate-fade-in"
                                style={getSwipeStyle()}
                            >
                                <div className="v5-swipe-slide" data-tab="rides">
                                    <PassengerView user={user!} lang={lang} isScrolled={isScrolled} onLogout={onLogout} activeTourismTracker={activeTourismTracker} setActiveTourismTracker={setActiveTourismTracker} />
                                </div>
                                <div className="v5-swipe-slide" data-tab="haat">
                                    <GramMandiHome user={user!} onBack={() => setActiveTab('rides')} />
                                </div>
                                <div className="v5-swipe-slide" data-tab="food">
                                    <FoodLinkHome user={user!} onBack={() => setActiveTab('rides')} />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Other Tabs (rendered normally) */}
                    <div className={activeTab === 'reels' ? 'block animate-fade-in' : 'hidden'}>
                        <ReelsSection user={user!} />
                    </div>
                    <div className={activeTab === 'cargo' ? 'block animate-fade-in' : 'hidden'}>
                        <LogisticsApp />
                    </div>
                    <div className={activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'}>
                        <UserProfile user={user!} onBack={() => setActiveTab('rides')} onLogout={onLogout} />
                    </div>
                </React.Suspense>
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
                progress={getSwipeProgress()}
                isSwiping={isSwiping && swipeDirection === 'horizontal'}
            />

            {/* Double Tap to Exit Toast */}
            {showExitToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] animate-[v5FadeIn_0.3s_ease-out_forwards] pointer-events-none">
                    <div className="bg-slate-900/90 dark:bg-black/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 text-white text-xs font-bold shadow-lg flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Press back again to exit</span>
                    </div>
                </div>
            )}

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

            {/* Profile Details Modal */}
            {showProfileDetails && (
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        {/* Header Area */}
                        <div className="bg-gradient-to-br from-[#BE5103] to-[#FFCE1B] p-6 text-white text-center relative shrink-0">
                            <button onClick={() => { setShowProfileDetails(false); setShowSettings(false); setShowEditProfile(false); }} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                            {!showSettings && !showEditProfile && (
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <button onClick={() => setShowSettings(true)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                                        <Settings size={20} />
                                    </button>
                                    <button onClick={() => setShowEditProfile(true)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                                        <Edit3 size={20} />
                                    </button>
                                </div>
                            )}
                            {(showSettings || showEditProfile) && (
                                <button onClick={() => { setShowSettings(false); setShowEditProfile(false); }} className="absolute top-4 left-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                            )}

                            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white overflow-hidden shadow-xl mb-3 relative group">
                                {user?.name?.charAt(0)?.toUpperCase()}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleUpdatePhoto}>
                                    <Camera size={24} className="text-white" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold">{showSettings ? 'Settings' : showEditProfile ? 'Edit Profile' : user?.name}</h2>
                            <p className="opacity-90 text-sm">{user?.role}</p>
                        </div>
                        
                        {/* Content Area - Scrollable */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {showSettings ? (
                                // Settings View
                                <div className="space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Dark Mode</p>
                                                <p className="text-[10px] text-slate-500">Toggle app theme</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={toggleTheme}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <Languages size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Language</p>
                                                <p className="text-[10px] text-slate-500">{lang === 'EN' ? 'English' : 'हिंदी'}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={toggleLang}
                                            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 shadow border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    
                                    <button onClick={handleChangePassword} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                <KeyRound size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-slate-800 dark:text-white">Change Password</p>
                                                <p className="text-[10px] text-slate-500">Secure your account</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            ) : showEditProfile ? (
                                // Edit Profile View
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={editPhone} 
                                            onChange={e => setEditPhone(e.target.value)}
                                            className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white focus:outline-none focus:border-brand-500"
                                            placeholder="Enter phone..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={editEmail} 
                                            onChange={e => setEditEmail(e.target.value)}
                                            className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white focus:outline-none focus:border-brand-500"
                                            placeholder="Enter email..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Address</label>
                                        <textarea 
                                            value={editAddress} 
                                            onChange={e => setEditAddress(e.target.value)}
                                            rows={3}
                                            className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm dark:text-white focus:outline-none focus:border-brand-500 resize-none"
                                            placeholder="Enter your full address..."
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSaveProfile}
                                        className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        <Check size={18} /> Save Details
                                    </button>
                                </div>
                            ) : (
                                // Standard Profile Details View
                                <>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                                            <span>User ID</span>
                                        </p>
                                        <p className="font-mono text-slate-800 dark:text-white font-medium">{user?.id}</p>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                                            <p className="font-medium text-slate-800 dark:text-white truncate">{user?.phone || editPhone || 'Not provided'}</p>
                                        </div>
                                        <div className="flex-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                            <p className="font-medium text-slate-800 dark:text-white truncate">{user?.email || editEmail || 'Not provided'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
                                        <p className="font-medium text-slate-800 dark:text-white text-sm leading-relaxed">
                                            {user?.address || editAddress ? (
                                                <span className="flex items-start gap-2">
                                                    <MapPin size={16} className="text-brand-500 shrink-0 mt-0.5" /> 
                                                    {user?.address || editAddress}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">No address added yet. Click Edit to add.</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button onClick={handleUpdatePhoto} className="py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                                            <Camera size={14} /> Update Photo
                                        </button>
                                        <button onClick={handleChangePassword} className="py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                                            <KeyRound size={14} /> Password
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
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
                .v5-swipe-viewport {
                    width: 100vw;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    touch-action: pan-y;
                }
                .v5-swipe-container {
                    display: flex;
                    width: 300vw;
                    height: 100%;
                    will-change: transform;
                    backface-visibility: hidden;
                }
                .v5-swipe-slide {
                    width: 100vw;
                    flex-shrink: 0;
                    height: 100%;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-bottom: 88px;
                    box-sizing: border-box;
                    -webkit-overflow-scrolling: touch;
                }
            `}</style>
        </div>
    );
};

export default UserApp;
