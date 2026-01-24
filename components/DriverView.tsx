
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStoredTickets, subscribeToUpdates, broadcastBusLocation, registerDriverOnNetwork, disconnectDriver, driverCollectTicket, driverWithdraw, getRentalRequests, getAllParcels, suggestLocation, getPathDemand, getAheadVehicles } from '../services/transportService';
import { fetchSmartRoute } from '../services/graphService';
import { getRoutes } from '../services/adminService';
import { getWallet } from '../services/blockchainService';
import { Ticket, TicketStatus, User, LocationData, DeviationProposal, RentalBooking, VehicleComponentHealth, RouteDefinition, ParcelBooking, LedgerEntry, FuelAdvice } from '../types';
import { checkForRouteDeviations, analyzeDriverDrowsiness, analyzeBusAudioOccupancy, initFatigueMonitoring, stopFatigueMonitoring } from '../services/mlService';
import { startPotholeMonitoring, stopPotholeMonitoring } from '../services/iotService';
import { playSonicToken } from '../services/advancedFeatures';
import { Button } from './Button';
import { Camera, Activity, Check, MapPin, Clock, Mic, AlertOctagon, ScanLine, Coins, Wifi, Car, Package, ShieldAlert, Wallet as WalletIcon, Banknote, Volume2, VolumeX, Plus, CreditCard, Users, TrendingDown, Info, ShoppingCart, ChevronRight } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { TRANSLATIONS } from '../constants';
import { API_BASE_URL } from '../config';
import CargoDriverView from './CargoDriverView';

interface DriverViewProps {
    user: User;
    lang: 'EN' | 'HI';
}

// ... (Interface definitions remain the same) ...
interface TripConfig {
    isActive: boolean;
    startLocation: LocationData | null;
    endLocation: LocationData | null;
    path: string[];
    pathDetails: { name: string, lat: number, lng: number }[];
    totalDistance: number;
}

export const DriverView: React.FC<DriverViewProps> = ({ user, lang }) => {
    const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
    const [viewMode, setViewMode] = useState<'BUS' | 'CHARTER' | 'CARGO' | 'UTILITIES'>('BUS');
    const [showCargoPanel, setShowCargoPanel] = useState(false);

    const [voiceAssist, setVoiceAssist] = useState(true);

    const HeatmapBar: React.FC<{ intensity: number }> = ({ intensity }) => {
        const barRef = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (barRef.current) barRef.current.style.width = `${intensity * 10}%`;
        }, [intensity]);
        return <div ref={barRef} className="h-full bg-rose-500 transition-all duration-500 ease-out"></div>;
    };

    const LevelBar: React.FC<{ widthPercent: number }> = ({ widthPercent }) => {
        const ref = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (ref.current) ref.current.style.setProperty('--xp-width', `${widthPercent}%`);
        }, [widthPercent]);
        return (
            <div className="v5-xp-bar">
                <div ref={ref} className="v5-xp-fill"></div>
            </div>
        );
    };

    const HeatPulse: React.FC<{ top: number; left: number; opacity: number }> = ({ top, left, opacity }) => {
        const ref = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (ref.current) {
                ref.current.style.setProperty('--heat-top', `${top}%`);
                ref.current.style.setProperty('--heat-left', `${left}%`);
                ref.current.style.setProperty('--heat-opacity', `${opacity}`);
            }
        }, [top, left, opacity]);
        return <div ref={ref} className="v5-heatmap-pulse"></div>;
    };

    if (!user.isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-slate-50 dark:bg-black">
                {/* ... (Unchanged verification UI) ... */}
                <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Clock size={48} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white mb-2">Verification Pending</h2>
                {/* ... */}
                <button onClick={() => window.location.reload()} className="mt-8 text-brand-600 font-bold text-sm">Refresh Status</button>
            </div>
        );
    }

    // Bus Mode State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);

    // Wallet State
    const [walletBalance, setWalletBalance] = useState(user.walletBalance || 0);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');

    // Charter & Cargo
    const [isCharterAvailable, setIsCharterAvailable] = useState(false);
    const [rentalRequests, setRentalRequests] = useState<RentalBooking[]>([]);
    const [parcels, setParcels] = useState<ParcelBooking[]>([]);

    // Features
    const [deviation, setDeviation] = useState<DeviationProposal | null>(null);
    const [isSafetyMonitorActive, setIsSafetyMonitorActive] = useState(false);
    const [fatigueAlert, setFatigueAlert] = useState(false);
    const [potholeDetected, setPotholeDetected] = useState(false);

    // Utilities
    const [isMobileATM, setIsMobileATM] = useState(false);
    const [isDataMuleActive, setIsDataMuleActive] = useState(false);

    // Real Hardware Feature
    const [isRoadAIActive, setIsRoadAIActive] = useState(false);
    const [isCountingAudio, setIsCountingAudio] = useState(false);

    const [officialRoutes, setOfficialRoutes] = useState<RouteDefinition[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [routeMode, setRouteMode] = useState<'CUSTOM' | 'OFFICIAL'>('OFFICIAL');
    const [tripConfig, setTripConfig] = useState<TripConfig>({ isActive: false, startLocation: null, endLocation: null, path: [], pathDetails: [], totalDistance: 0 });
    const [isOnline, setIsOnline] = useState(false);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [currentGPS, setCurrentGPS] = useState<{ lat: number, lng: number } | null>(null);
    const [pathDemand, setPathDemand] = useState<Record<string, number>>({});
    const [aheadCompetitors, setAheadCompetitors] = useState<any[]>([]);
    const [profitWarning, setProfitWarning] = useState<string | null>(null);
    const [logisticsAdvice, setLogisticsAdvice] = useState<any>(null);
    const [demandHeatmap, setDemandHeatmap] = useState<any[]>([]);
    const [heroStats, setHeroStats] = useState<any>(null);
    const routeListRef = useRef<HTMLDivElement>(null);

    const currentOccupancy = useMemo(() => {
        return tickets.filter(t => t.status === TicketStatus.BOARDED).reduce((acc, t) => acc + t.passengerCount, 0);
    }, [tickets]);

    // --- Didi Style Voice Assistant ---
    const announce = (text: string) => {
        if (!voiceAssist || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    // ... (Keep existing Effects: Pothole, GPS Watcher, Ticket Listener) ...
    useEffect(() => {
        if (isRoadAIActive && isOnline) {
            startPotholeMonitoring((severity) => {
                console.log(`⚠️ Pothole Detected! Severity: ${severity}`);
                setPotholeDetected(true);
                announce("Bad road ahead. Slow down.");
                setTimeout(() => setPotholeDetected(false), 3000);
            });
        } else {
            stopPotholeMonitoring();
        }
        return () => stopPotholeMonitoring();
    }, [isRoadAIActive, isOnline]);

    useEffect(() => {
        let watchId: number;
        let safetyInterval: any;

        if (isOnline && tripConfig.isActive) {
            initFatigueMonitoring();
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setCurrentGPS({ lat: latitude, lng: longitude });
                        broadcastBusLocation({
                            driverId: user.id,
                            isOnline: true,
                            activePath: tripConfig.path,
                            currentStopIndex: currentStopIndex,
                            status: 'EN_ROUTE',
                            location: { lat: latitude, lng: longitude, timestamp: Date.now() },
                            capacity: user.vehicleCapacity || 40,
                            occupancy: currentOccupancy,
                            isATM: isMobileATM
                        });
                        if (tripConfig.pathDetails.length > 0) {
                            const dev = checkForRouteDeviations({ lat: latitude, lng: longitude }, tripConfig.pathDetails);
                            if (dev) {
                                if (!deviation) { announce("Warning. You are off route."); }
                                setDeviation(dev);
                            } else {
                                setDeviation(null);
                            }
                        }

                        // Smart Profit Analysis
                        const demand = getPathDemand(tripConfig.path);
                        setPathDemand(demand);

                        const competitors = getAheadVehicles(tripConfig.path, currentStopIndex, user.id);
                        setAheadCompetitors(competitors);

                        // Profitability Logic
                        const upcomingStops = tripConfig.path.slice(currentStopIndex + 1);
                        const totalUpcomingDemand = upcomingStops.reduce((acc, stop) => acc + (demand[stop] || 0), 0);
                        const competitorCapacity = competitors.reduce((acc, c) => acc + ((c.capacity || 40) - (c.occupancy || 0)), 0);

                        if (totalUpcomingDemand > 0 && competitorCapacity >= totalUpcomingDemand) {
                            if (!profitWarning) {
                                setProfitWarning(`Market Saturated: ${competitors.length} vehicles ahead have enough capacity for all waiting passengers. Highly recommend switching to Cargo or picking up GramMandi logistics.`);
                                announce("Warning. Demand ahead is low. Consider cargo pickup.");
                            }
                        } else {
                            setProfitWarning(null);
                        }

                        // Suggest Logistics (Intersects with Path)
                        const nearbyLogistics = parcels.find(p =>
                            p.status === 'PENDING' &&
                            upcomingStops.includes(p.from) &&
                            (p.weightKg || 1) <= ((user.vehicleCapacity || 100) - currentOccupancy) // Simple capacity check
                        );
                        if (nearbyLogistics) {
                            setLogisticsAdvice(nearbyLogistics);
                        } else {
                            setLogisticsAdvice(null);
                        }
                    },
                    (err) => console.error("GPS Error", err),
                    { enableHighAccuracy: true, distanceFilter: 10 } as any
                );
            }
            safetyInterval = setInterval(() => {
                if (analyzeDriverDrowsiness()) {
                    setFatigueAlert(true);
                    playSonicToken('WAKE-UP-ALERT');
                    announce("Wake up! Stop the vehicle immediately.");
                }
            }, 1000);
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (safetyInterval) clearInterval(safetyInterval);
            stopFatigueMonitoring();
        };
    }, [isOnline, tripConfig, user.id, currentStopIndex, isMobileATM, currentOccupancy, deviation]);

    useEffect(() => {
        setTickets(getStoredTickets());
        subscribeToUpdates((updatedTickets) => {
            if (updatedTickets) {
                if (updatedTickets.length > tickets.length) {
                    const newTicket = updatedTickets[0];
                    if (newTicket.status === 'PENDING') {
                        announce(`New passenger. ${newTicket.from} to ${newTicket.to}.`);
                    }
                }
                setTickets(updatedTickets);
            }
        }, () => { });

        const loadRoutes = async () => { const routes = await getRoutes(); setOfficialRoutes(routes); }; loadRoutes();
        const loadParcels = async () => { const p = await getAllParcels(); setParcels(p); }; loadParcels();
        const loadWallet = async () => { const w = await getWallet(user.id); if (w) setWalletBalance(w.balance); }; loadWallet();

        const loadHeatmap = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/fleet/demand-heatmap`);
                const data = await res.json();
                if (data.success) setDemandHeatmap(data.heatmap);
            } catch (e) { console.error("Heatmap fetch error", e); }
        };

        const loadHeroStats = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/fleet/hero-stats/${user.id}`);
                const data = await res.json();
                if (data.success) setHeroStats(data.stats);
            } catch (e) { console.error("Hero stats fetch error", e); }
        };

        const rentalInterval = setInterval(async () => {
            if (viewMode === 'CHARTER' && isCharterAvailable) { const reqs = await getRentalRequests(); setRentalRequests(reqs); }
            if (viewMode === 'CARGO') { loadParcels(); }
            loadWallet();
            loadHeatmap();
            loadHeroStats();
        }, 5000);

        loadHeatmap();
        loadHeroStats();

        return () => { disconnectDriver(user.id); clearInterval(rentalInterval); };
    }, [user.id, viewMode, isCharterAvailable, tickets.length]);

    // ... (Keep existing Handlers: StartTrip, EndTrip, AudioCount, MarkChowk, Withdraw) ...
    const handleStartTrip = async () => {
        let start = tripConfig.startLocation;
        let end = tripConfig.endLocation;
        if (routeMode === 'OFFICIAL') {
            const route = officialRoutes.find(r => r.id === selectedRouteId);
            if (!route) return alert("Select a route from the list");
            start = { name: route.from, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' };
            end = { name: route.to, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' };
        } else {
            if (!start || !end) return alert("Select Start and End points");
        }
        try {
            const routeData = await fetchSmartRoute(start!, end!);
            setTripConfig(prev => ({ ...prev, isActive: true, path: routeData.path, pathDetails: routeData.pathDetails, totalDistance: routeData.distance, startLocation: start, endLocation: end }));
            setIsOnline(true); setIsSafetyMonitorActive(true); registerDriverOnNetwork(user); announce("Trip started. Drive safely.");
        } catch (e) { alert("Failed to calculate route. Check connection."); }
    };

    const handleEndTrip = () => {
        announce("Trip ended. Total earnings calculated.");
        setTripConfig({ isActive: false, startLocation: null, endLocation: null, path: [], pathDetails: [], totalDistance: 0 });
        setIsOnline(false); setIsSafetyMonitorActive(false); disconnectDriver(user.id);
    };

    const handleAudioCount = async () => {
        setIsCountingAudio(true);
        const count = await analyzeBusAudioOccupancy();
        announce(`Estimated ${count} passengers on board.`);
        alert(`AI Estimate based on noise: ${count} passengers.`);
        setIsCountingAudio(false);
    };

    const handleWithdraw = async () => {
        const amt = parseInt(withdrawAmount);
        if (isNaN(amt) || amt <= 0 || amt > walletBalance) { alert("Invalid Amount"); return; }
        const res = await driverWithdraw(user.id, amt);
        if (res.success) {
            setWalletBalance(res.balance);
            announce(`Withdrawal of ${amt} rupees successful.`);
            alert(`Success! ₹${amt} transferred to your bank account.`);
            setShowWithdrawModal(false); setWithdrawAmount('');
        } else { alert("Withdrawal failed: " + res.error); }
    };

    const handleMarkChowk = async () => {
        if (!currentGPS) return alert("Waiting for GPS...");
        const name = prompt("Enter Name of this Stop (Chowk):");
        if (!name) return;
        const res = await suggestLocation({ name, lat: currentGPS.lat, lng: currentGPS.lng });
        if (res.success) { announce("Location marked. Thank you."); alert("Chowk suggestion sent to community map."); }
    };

    const handleManualVerify = async () => {
        let idToCheck = verifyId.trim().toUpperCase();
        if (!idToCheck) return;

        // Robust Handling: Extract number and re-format
        // Example: "tk 7700" -> "7700" -> "TK-7700"
        // Example: "7700" -> "7700" -> "TK-7700"
        const numericPart = idToCheck.replace(/[^0-9]/g, '');
        if (numericPart.length >= 4) {
            idToCheck = `TK-${numericPart}`;
        }

        setVerifyLoading(true);
        setVerifyResult(null);

        const result = await driverCollectTicket(idToCheck, user.id);

        setVerifyLoading(false);
        setVerifyResult(result);
        if (result.success) {
            setWalletBalance(result.balance);
            // Determine announcement based on logic
            if (result.paymentMethod === 'CASH') {
                announce(`Cash Collected. Platform fee deducted.`);
            } else {
                announce(`Ticket Verified. Earnings Added.`);
            }
            setVerifyId(''); // Clear input on success
        } else {
            announce("Invalid Ticket.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-32 animate-fade-in font-sans relative">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Journey Timeline */}
                {tripConfig.isActive && (
                    <aside className="w-full lg:w-80 glass-3 p-6 rounded-[32px] border-white/5 shadow-yhisk-float h-fit sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shadow-glow-sm">🚀</div>
                            <div>
                                <h1 className="font-black text-white text-lg tracking-tight">Trip VL-{user.id.slice(-3).toUpperCase()}</h1>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Route: {officialRoutes.find(r => r.id === selectedRouteId)?.name || 'Custom'}</p>
                            </div>
                        </div>

                        <div className="space-y-0 relative">
                            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-800/50"></div>
                            {tripConfig.path.map((stop, idx) => {
                                const isCurrent = idx === currentStopIndex;
                                const isPassed = idx < currentStopIndex;
                                const waitingCount = pathDemand[stop] || 0;
                                const aheadBusesAtStop = aheadCompetitors.filter(c => (c.activePath || [])[c.currentStopIndex || 0] === stop);

                                return (
                                    <div key={idx} className={`relative pl-8 pb-6 last:pb-0 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 ${isCurrent ? 'border-indigo-400 bg-indigo-500/20 shadow-glow-sm' : (isPassed ? 'border-slate-700 bg-slate-800' : 'border-slate-800')}`}>
                                            {isCurrent && <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>}
                                            {isPassed && <Check size={12} className="text-slate-500" />}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-xs font-black ${isCurrent ? 'text-white' : 'text-slate-400'}`}>{stop}</span>
                                            {!isPassed && waitingCount > 0 && (
                                                <div className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-[8px] font-black text-emerald-400 animate-pulse uppercase tracking-tighter">
                                                    {waitingCount} WAITING
                                                </div>
                                            )}
                                        </div>
                                        {isCurrent && (
                                            <div className="mt-2 flex gap-2">
                                                <button onClick={handleMarkChowk} className="text-[9px] font-black bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded-lg border border-white/10 uppercase tracking-widest transition-all">Mark Chowk</button>
                                            </div>
                                        )}
                                        {!isPassed && aheadBusesAtStop.length > 0 && (
                                            <p className="text-[8px] font-black text-rose-400 uppercase mt-1">Bus {aheadBusesAtStop[0].driverId.slice(-3).toUpperCase()} is here</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                )}

                {/* Right Side: Main Display */}
                <div className="flex-1 space-y-6">
                    {/* Overlays (Fatigue & Pothole) */}
                    {fatigueAlert && (
                        <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center text-white animate-pulse">
                            <AlertOctagon size={80} className="mb-4 animate-bounce" />
                            <h1 className="text-3xl font-black mb-2 uppercase tracking-widest text-center px-4">Driver Fatigue Detected!</h1>
                            <p className="text-lg font-bold mb-8 opacity-90 text-center px-6">Microsleep pattern identified by sensors. Please stop.</p>
                            <button onClick={() => setFatigueAlert(false)} className="bg-white text-red-600 px-8 py-3 rounded-full font-bold shadow-xl">I am Awake</button>
                        </div>
                    )}
                    {potholeDetected && (
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl z-[90] animate-bounce flex items-center gap-2 font-bold">
                            <Activity size={20} /> Pothole Detected & Logged!
                        </div>
                    )}

                    {/* Header HUD */}
                    <div className="glass-3 p-5 rounded-[32px] border-white/10 shadow-whisk-float relative overflow-hidden">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center font-black text-xl text-white shadow-glow-md">{user.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight leading-none mb-1">Cpt. {user.name.split(' ')[0]}</h2>
                                    <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                                        <span>{viewMode} Mode</span>
                                        {isMobileATM && <span className="text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Coins size={10} /> ATM Active</span>}
                                    </div>
                                    {/* Village Legend Leveling (V5 Parity) */}
                                    <div className="w-48">
                                        <div className="flex justify-between text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                            <span>Village Legend</span>
                                            <span>Lvl {heroStats?.heroLevel || 1} • 1,200 XP</span>
                                        </div>
                                        <LevelBar widthPercent={75} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div onClick={() => setVoiceAssist(!voiceAssist)} className={`cursor-pointer w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${voiceAssist ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-glow-sm' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                                    {voiceAssist ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                </div>
                                <div onClick={() => setShowWithdrawModal(true)} className="cursor-pointer glass-3 px-4 py-2 rounded-2xl border border-white/5 flex flex-col items-end hover:bg-white/10 transition-colors shadow-whisk-float">
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Wallet</p>
                                    <div className="flex items-center gap-1 font-black text-emerald-400 text-lg">
                                        <WalletIcon size={14} /> ₹{walletBalance.toFixed(0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex glass-3 p-1.5 rounded-[20px] mt-6 border-white/5 overflow-x-auto gap-2">
                            <button onClick={() => setViewMode('BUS')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'BUS' ? 'bg-indigo-600 text-white shadow-glow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Bus</button>
                            <button onClick={() => setViewMode('CARGO')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'CARGO' ? 'bg-indigo-600 text-white shadow-glow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Logistics</button>
                            <button onClick={() => setViewMode('CHARTER')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'CHARTER' ? 'bg-indigo-600 text-white shadow-glow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Charter</button>
                            <button onClick={() => setViewMode('UTILITIES')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'UTILITIES' ? 'bg-brand-700 text-white shadow-glow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Tools</button>
                        </div>
                    </div>

                    {/* Hero Stats Card */}
                    {heroStats && (
                        <div className="glass-3 p-6 rounded-[32px] border-white/5 shadow-yhisk-float animate-fade-in mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-[var(--accent-primary)] rotate-180" />
                                    Hero Performance
                                </h3>
                                <div className="px-3 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-[10px] font-black uppercase">
                                    Grade: {heroStats.heroLevel > 5 ? 'A+' : 'B'}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <span className="block text-2xl font-black text-white">{heroStats.totalTrips}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Trips</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-black text-[var(--accent-warm)]">{heroStats.heroPoints}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Points</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-2xl font-black text-emerald-400">₹{heroStats.totalEarnings}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Revenue</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Demand Heatmap Visualization */}
                    {demandHeatmap.length > 0 && (
                        <div className="glass-3 p-6 rounded-[32px] border-white/5 shadow-yhisk-float animate-fade-in mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                Live Demand Heatmap
                            </h3>
                            <div className="relative h-48 bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                {/* Pulse Overlays for Heatmap (V5 Parity) */}
                                {demandHeatmap.slice(0, 3).map((point, i) => (
                                    <HeatPulse key={i} top={20 + i * 25} left={30 + i * 20} opacity={point.intensity / 10} />
                                ))}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/80 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                                        NavIC Grid Overlay Active
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">You are here</span>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4">
                                {demandHeatmap.slice(0, 4).map((point, i) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${point.intensity > 7 ? 'bg-rose-500 animate-pulse' : point.intensity > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{point.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <HeatmapBar intensity={point.intensity} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{point.intensity}/10</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'UTILITIES' && (
                        <div className="space-y-6 animate-fade-in shadow-whisk-float rounded-[32px]">
                            <div className="grid grid-cols-2 gap-4">
                                <div onClick={() => setIsMobileATM(!isMobileATM)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isMobileATM ? 'bg-emerald-500/10 border-emerald-500/50 shadow-glow-sm' : 'glass-3 border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isMobileATM ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500'}`}><Coins size={24} /></div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-widest">Mobile ATM</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isMobileATM ? 'Broadcast Active' : 'Enable Cash-Out'}</p>
                                </div>
                                <div onClick={() => setIsDataMuleActive(!isDataMuleActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isDataMuleActive ? 'bg-blue-500/10 border-blue-500/50 shadow-glow-sm' : 'glass-3 border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDataMuleActive ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-500'}`}><Wifi size={24} /></div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-widest">Data Mule</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isDataMuleActive ? 'Hosting Content' : 'Sync Content'}</p>
                                </div>
                                <div onClick={() => setIsRoadAIActive(!isRoadAIActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isRoadAIActive ? 'bg-amber-500/10 border-amber-500/50 shadow-glow-sm' : 'glass-3 border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isRoadAIActive ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/5 text-slate-500'}`}><Activity size={24} /></div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-widest">Road AI</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isRoadAIActive ? 'Sensor Active' : 'Detect Potholes'}</p>
                                </div>
                                <div onClick={handleAudioCount} className="p-6 rounded-3xl border glass-3 border-white/5 cursor-pointer hover:bg-white/5 transition-all group">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 mb-4 group-hover:text-white transition-colors">
                                        {isCountingAudio ? <span className="animate-spin text-2xl">⌛</span> : <Mic size={24} />}
                                    </div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-widest">Count Crowd</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">Use Audio AI Analysis</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!tripConfig.isActive && viewMode !== 'UTILITIES' && (
                        <div className="glass-3 p-8 rounded-[40px] shadow-whisk-float border-white/5 relative overflow-hidden animate-fade-in-up">
                            <h3 className="text-2xl font-black text-white mb-6 text-center tracking-tight">Begin Shift</h3>
                            <div className="flex bg-white/5 p-1.5 rounded-2xl mb-8">
                                <button onClick={() => setRouteMode('OFFICIAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${routeMode === 'OFFICIAL' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`}>Official Route</button>
                                <button onClick={() => setRouteMode('CUSTOM')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${routeMode === 'CUSTOM' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500'}`}>Custom Path</button>
                            </div>
                            {routeMode === 'OFFICIAL' ? (
                                <div className="mb-8">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Assigned Route</label>
                                    <div className="relative">
                                        <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl appearance-none outline-none text-white font-black text-sm tracking-tight" aria-label="Select Route">
                                            <option value="" className="bg-slate-950">-- Select Hub Route --</option>
                                            {officialRoutes.map(route => (<option key={route.id} value={route.id} className="bg-slate-950">{route.name} ({route.from} - {route.to})</option>))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 mb-8">
                                    <LocationSelector label="Start Village" onSelect={(loc) => setTripConfig(prev => ({ ...prev, startLocation: loc }))} />
                                    <LocationSelector label="End Village" onSelect={(loc) => setTripConfig(prev => ({ ...prev, endLocation: loc }))} />
                                </div>
                            )}
                            <Button variant="primary" fullWidth onClick={handleStartTrip} className="h-16 text-lg font-black uppercase tracking-[0.2em] rounded-[24px] shadow-glow-md">Initialize NavIC</Button>
                        </div>
                    )}

                    {tripConfig.isActive && viewMode !== 'UTILITIES' && (
                        <div className="space-y-6 animate-fade-in relative">
                            {/* Main Active HUD */}
                            <div className="glass-3 rounded-[40px] p-8 shadow-whisk-float border-white/5 relative overflow-hidden flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-12">
                                    <div className="flex gap-4">
                                        <div className="glass-3 border-white/5 bg-white/5 py-3 px-6 rounded-2xl">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Occupancy</p>
                                            <h3 className="text-xl font-black text-white tracking-widest">{currentOccupancy} / <span className="text-slate-600">{user.vehicleCapacity || 40}</span></h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setVerifyId(''); setVerifyResult(null); setShowVerifyModal(true); }}
                                        className="bg-emerald-600 px-8 py-4 rounded-2xl text-[10px] font-black flex items-center gap-3 hover:bg-emerald-500 transition-all shadow-glow-sm uppercase tracking-widest text-white"
                                    >
                                        <ScanLine size={18} /> Collect Ticket
                                    </button>
                                </div>

                                {/* Center: Biometric Authorizer */}
                                <div className="relative mb-8 group">
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-center w-48 pointer-events-none transition-all group-hover:-translate-y-2 opacity-0 group-hover:opacity-100">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Depart Now</p>
                                        <div className="h-4 w-px bg-indigo-500/50 mx-auto mt-2"></div>
                                    </div>

                                    <div
                                        className="w-48 h-48 rounded-full glass-3 border-indigo-500/30 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-glow-md relative overflow-hidden border-4"
                                        onClick={() => setCurrentStopIndex(i => Math.min(i + 1, tripConfig.path.length - 1))}
                                    >
                                        <div className="scan-line-anim" />
                                        <div className="text-5xl mb-2">🖐️</div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center leading-relaxed">Identity<br />Verified</p>

                                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                            <circle cx="96" cy="96" r="92" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                                            <circle cx="96" cy="96" r="92" fill="none" stroke="theme('colors.indigo.500')" strokeWidth="8" strokeDasharray="578" strokeDashoffset="578" className="transition-all duration-1000 ease-linear" />
                                        </svg>
                                    </div>
                                </div>

                                {/* HUD Bottom Bar */}
                                <div className="w-full flex justify-center gap-12 mt-4">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">NavIC Satellites</p>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={`w-1.5 h-4 rounded-full ${i <= 4 ? 'bg-emerald-500 shadow-glow-sm' : 'bg-slate-800'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Network Sync</p>
                                        <span className="text-xs font-black text-white tracking-widest">REAL-TIME</span>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Notifications */}
                            {deviation && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-6 rounded-[32px] flex items-center gap-4 animate-pulse shadow-glow-sm">
                                    <ShieldAlert size={28} />
                                    <div>
                                        <p className="font-black text-xs uppercase tracking-widest">Off-Route Critical</p>
                                        <p className="text-[11px] font-bold opacity-80">{deviation.extraDistance.toFixed(2)}km deviation from assigned grid path.</p>
                                    </div>
                                </div>
                            )}

                            {profitWarning && (
                                <div className="glass-3 profit-alert-glow p-8 rounded-[40px] flex gap-8 items-center bg-indigo-900/10 border-white/5 shadow-yhisk-float animate-fade-in-up">
                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-3xl shadow-glow-md">🤖</div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">AI Profitability Advisor</p>
                                        <h2 className="text-xl font-black text-white leading-tight">Switch to <span className="text-emerald-400">Cargo Link</span> mode</h2>
                                        <p className="text-[11px] font-bold text-slate-500 mt-2 leading-relaxed">Estimated passenger load is low. Converting to logistics will yield ₹800 additional per trip.</p>
                                    </div>
                                    <button onClick={() => setViewMode('CARGO')} className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] shadow-glow-md">Optimize</button>
                                </div>
                            )}

                            {logisticsAdvice && (
                                <div
                                    onClick={() => { setViewMode('CARGO'); setLogisticsAdvice(null); }}
                                    className="bg-brand-600 text-white p-6 rounded-[32px] flex items-center justify-between gap-4 shadow-glow-sm cursor-pointer hover:scale-[1.02] transition-all transform active:scale-95"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                                            <ShoppingCart size={28} />
                                        </div>
                                        <div>
                                            <p className="font-black text-[10px] uppercase tracking-[0.3em] opacity-70 mb-1">Fill Capacity Gap</p>
                                            <h4 className="font-black text-lg tracking-tight">Pickup {logisticsAdvice.itemType}</h4>
                                            <p className="text-[11px] font-bold">Collect at {logisticsAdvice.from} • ₹{logisticsAdvice.price || 450}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={24} className="opacity-50" />
                                </div>
                            )}

                            <Button variant="danger" fullWidth onClick={handleEndTrip} className="h-14 rounded-2xl opacity-50 hover:opacity-100 transition-opacity uppercase font-black text-xs tracking-widest">Emergency Shift End</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onConfirm={handleManualVerify}
                title="Verify Digital Ticket"
                confirmLabel={verifyLoading ? "Scanning..." : "Confirm & Deposit"}
            >
                <div className="p-6 space-y-6">
                    <div className="glass-3 bg-white/5 p-8 rounded-3xl text-center border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-colors">
                        <Camera size={40} className="text-slate-500 mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan QR Identity</p>
                    </div>
                    <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">OR</div>
                    <input
                        value={verifyId}
                        onChange={(e) => setVerifyId(e.target.value)}
                        placeholder="TK-XXXX"
                        className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 outline-none font-black text-center uppercase text-xl tracking-[0.3em] text-white"
                        autoFocus
                    />
                    {verifyResult && (
                        <div className={`p-6 rounded-2xl border-2 ${verifyResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} animate-fade-in-up`}>
                            <div className="flex items-center gap-3 mb-2">
                                {verifyResult.success ? <Check size={24} className="text-emerald-400" /> : <ShieldAlert size={24} className="text-red-400" />}
                                <h4 className={`text-lg font-black uppercase tracking-tight ${verifyResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {verifyResult.success ? 'Payment Verified' : 'Invalid Identity'}
                                </h4>
                            </div>
                            <p className="text-xs font-bold text-slate-400 leading-relaxed">{verifyResult.success ? verifyResult.financialDetails : verifyResult.error}</p>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onConfirm={handleWithdraw}
                title="Elite Withdrawal"
                confirmLabel="Authorize Transfer"
            >
                <div className="p-6 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl shadow-glow-sm">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Total Available</p>
                        <p className="text-4xl font-black text-white tracking-tighter">₹{walletBalance.toFixed(2)}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Amount to Transfer</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-black">₹</span>
                            <input
                                type="number"
                                aria-label="Withdraw Amount"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full pl-12 p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-2xl font-black outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {['500', '1000', walletBalance.toString()].map(amt => (
                            <button key={amt} onClick={() => setWithdrawAmount(amt)} className="flex-1 py-3 glass-3 border-white/5 rounded-xl text-[10px] font-black text-white hover:bg-white/10 uppercase tracking-widest">
                                {amt === walletBalance.toString() ? 'Max' : `₹${amt}`}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DriverView;
