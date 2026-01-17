
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStoredTickets, subscribeToUpdates, broadcastBusLocation, registerDriverOnNetwork, disconnectDriver, driverCollectTicket, driverWithdraw, getRentalRequests, getAllParcels, suggestLocation } from '../services/transportService';
import { fetchSmartRoute } from '../services/graphService';
import { getRoutes } from '../services/adminService';
import { getWallet } from '../services/blockchainService';
import { Ticket, TicketStatus, User, LocationData, DeviationProposal, RentalBooking, VehicleComponentHealth, RouteDefinition, ParcelBooking, LedgerEntry, FuelAdvice } from '../types';
import { checkForRouteDeviations, analyzeDriverDrowsiness, analyzeBusAudioOccupancy, initFatigueMonitoring, stopFatigueMonitoring } from '../services/mlService';
import { startPotholeMonitoring, stopPotholeMonitoring } from '../services/iotService';
import { playSonicToken } from '../services/advancedFeatures';
import { Button } from './Button';
import { Camera, Activity, Check, MapPin, Clock, Mic, AlertOctagon, ScanLine, Coins, Wifi, Car, Package, ShieldAlert, Wallet as WalletIcon, Banknote, Volume2, VolumeX, Plus, CreditCard } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { TRANSLATIONS } from '../constants';
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

        const rentalInterval = setInterval(async () => {
            if (viewMode === 'CHARTER' && isCharterAvailable) { const reqs = await getRentalRequests(); setRentalRequests(reqs); }
            if (viewMode === 'CARGO') { loadParcels(); }
            loadWallet();
        }, 5000);
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
        <div className="max-w-md mx-auto pb-32 animate-fade-in font-sans relative">
            {/* ... (Fatigue & Pothole Overlays - Unchanged) ... */}
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

            {/* ... (Header & Mode Selector - Unchanged) ... */}
            <div className="mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-lg">{user.name.charAt(0)}</div>
                        <div>
                            <h2 className="text-base font-bold leading-none">Cpt. {user.name.split(' ')[0]}</h2>
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                                <span>{viewMode} Mode</span>
                                {isMobileATM && <span className="text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Coins size={10} /> ATM Active</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div onClick={() => setVoiceAssist(!voiceAssist)} className={`cursor-pointer p-2 rounded-xl border flex items-center justify-center transition-all ${voiceAssist ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                            {voiceAssist ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </div>
                        <div onClick={() => setShowWithdrawModal(true)} className="cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex flex-col items-end hover:bg-slate-700 transition-colors">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Earnings</p>
                            <div className="flex items-center gap-1 font-bold text-emerald-400">
                                <WalletIcon size={12} /> ₹{walletBalance.toFixed(0)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-xl mt-4 overflow-x-auto gap-1">
                    <button onClick={() => setViewMode('BUS')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap ${viewMode === 'BUS' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Bus</button>
                    <button onClick={() => setViewMode('CARGO')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap ${viewMode === 'CARGO' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Logistics</button>
                    <button onClick={() => setViewMode('CHARTER')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap ${viewMode === 'CHARTER' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Charter</button>
                    <button onClick={() => setViewMode('UTILITIES')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap ${viewMode === 'UTILITIES' ? 'bg-brand-700 text-white' : 'text-slate-500'}`}>Tools</button>
                </div>
            </div>

            {viewMode === 'UTILITIES' ? (
                // ... (Utilities content - Unchanged) ...
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => setIsMobileATM(!isMobileATM)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isMobileATM ? 'bg-emerald-50 border-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2"><Coins size={20} /></div>
                            <h4 className="font-bold text-sm dark:text-white">Mobile ATM</h4>
                            <p className="text-xs text-slate-500">{isMobileATM ? 'Broadcast Active' : 'Enable Cash-Out'}</p>
                        </div>
                        <div onClick={() => setIsDataMuleActive(!isDataMuleActive)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isDataMuleActive ? 'bg-blue-50 border-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2"><Wifi size={20} /></div>
                            <h4 className="font-bold text-sm dark:text-white">Data Mule</h4>
                            <p className="text-xs text-slate-500">{isDataMuleActive ? 'Hosting Content' : 'Sync Content'}</p>
                        </div>
                        <div onClick={() => setIsRoadAIActive(!isRoadAIActive)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isRoadAIActive ? 'bg-amber-50 border-amber-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isRoadAIActive ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-100 text-amber-600'}`}><Activity size={20} /></div>
                            <h4 className="font-bold text-sm dark:text-white">Road AI</h4>
                            <p className="text-xs text-slate-500">{isRoadAIActive ? 'Sensor Active' : 'Detect Potholes'}</p>
                        </div>
                        <div onClick={handleAudioCount} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-500`}>
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-2">
                                {isCountingAudio ? <span className="animate-spin">⌛</span> : <Mic size={20} />}
                            </div>
                            <h4 className="font-bold text-sm dark:text-white">Count Crowd</h4>
                            <p className="text-xs text-slate-500">Use Audio AI</p>
                        </div>
                    </div>
                </div>
            ) : (!tripConfig.isActive ? (
                // ... (Route Selection - Unchanged) ...
                <div className="glass-panel p-6 rounded-[32px] shadow-2xl relative border border-white/50 mt-6">
                    <h3 className="text-2xl font-bold dark:text-white mb-4 text-center">Begin Shift</h3>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                        <button onClick={() => setRouteMode('OFFICIAL')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${routeMode === 'OFFICIAL' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Official Route</button>
                        <button onClick={() => setRouteMode('CUSTOM')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${routeMode === 'CUSTOM' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Custom Path</button>
                    </div>
                    {routeMode === 'OFFICIAL' ? (
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Assigned Route</label>
                            <div className="relative">
                                <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none outline-none dark:text-white font-medium">
                                    <option value="">-- Select Route --</option>
                                    {officialRoutes.map(route => (<option key={route.id} value={route.id}>{route.name} ({route.from} - {route.to})</option>))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-6"><LocationSelector label="Start Point" onSelect={(loc) => setTripConfig(prev => ({ ...prev, startLocation: loc }))} /><LocationSelector label="End Point" onSelect={(loc) => setTripConfig(prev => ({ ...prev, endLocation: loc }))} /></div>
                    )}
                    <Button variant="primary" fullWidth onClick={handleStartTrip} className="h-14 text-lg rounded-xl">Initialize Route</Button>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in relative">
                    <div className="bg-slate-900 rounded-3xl p-5 shadow-xl border border-slate-700 relative overflow-hidden flex flex-col h-80">
                        <div className="flex justify-between items-center mb-4 text-white">
                            <div>
                                <h3 className="font-bold text-lg">Route Navigation</h3>
                                <p className="text-xs text-slate-400">{tripConfig.path[0]} → {tripConfig.path[tripConfig.path.length - 1]}</p>
                            </div>
                            {/* VERIFY BUTTON */}
                            <button
                                onClick={() => { setVerifyId(''); setVerifyResult(null); setShowVerifyModal(true); }}
                                className="bg-emerald-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
                            >
                                <ScanLine size={16} /> Collect Ticket
                            </button>
                        </div>
                        {/* ... (Route List - Unchanged) ... */}
                        <div className="relative z-10 flex-1 overflow-y-auto pr-2 space-y-0" ref={routeListRef}>
                            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-700 -z-10"></div>
                            {tripConfig.path.map((stop, idx) => {
                                const isCurrent = idx === currentStopIndex;
                                const isPassed = idx < currentStopIndex;
                                return (
                                    <div key={idx} className={`flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0 ${isCurrent ? 'bg-slate-800/50 -mx-2 px-2 rounded-lg' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`relative w-6 h-6 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'border-emerald-500 bg-emerald-500/20' : (isPassed ? 'border-slate-600 bg-slate-700' : 'border-slate-600')}`}>
                                                {isCurrent && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
                                            </div>
                                            <span className={`text-sm font-medium ${isCurrent ? 'text-white' : (isPassed ? 'text-slate-500 line-through' : 'text-slate-400')}`}>{stop}</span>
                                        </div>
                                        {isCurrent && (
                                            <div className="flex gap-2">
                                                <button onClick={handleMarkChowk} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-600"><Plus size={10} /> Chowk</button>
                                                <button onClick={() => setCurrentStopIndex(i => Math.min(i + 1, tripConfig.path.length - 1))} className="text-[10px] bg-white text-slate-900 px-2 py-1 rounded font-bold">Depart</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {deviation && (
                        <div className="bg-red-500 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse shadow-lg border-2 border-red-400">
                            <ShieldAlert size={24} />
                            <div>
                                <p className="font-bold text-sm uppercase">Off-Route Warning</p>
                                <p className="text-xs opacity-90">{deviation.extraDistance.toFixed(2)}km deviation detected.</p>
                            </div>
                        </div>
                    )}

                    <Button variant="danger" fullWidth onClick={handleEndTrip}>End Trip</Button>
                </div>
            ))}

            {/* VERIFY MODAL */}
            <Modal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onConfirm={handleManualVerify}
                title="Collect & Verify Ticket"
                confirmLabel={verifyLoading ? "Processing..." : "Verify & Add to Wallet"}
            >
                <div className="p-4 space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center border-2 border-dashed border-slate-300 dark:border-slate-700 h-32 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-colors">
                        <Camera size={32} className="text-slate-400 mb-2" />
                        <p className="text-xs font-bold text-slate-500">Tap to Scan QR Code</p>
                    </div>

                    <div className="text-center text-xs font-bold text-slate-400 uppercase">OR Enter ID Manually</div>

                    <input
                        value={verifyId}
                        onChange={(e) => setVerifyId(e.target.value)}
                        placeholder="e.g. 1234 or TK-1234"
                        className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-mono text-center uppercase text-lg tracking-widest"
                        autoFocus
                    />

                    {verifyResult && (
                        <div className={`p-4 rounded-xl border ${verifyResult.success ? (verifyResult.paymentMethod === 'CASH' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200') : 'bg-red-50 border-red-200'} animate-in slide-in-from-top-2`}>
                            <div className="flex items-center gap-2 mb-2">
                                {verifyResult.success ? <Check size={20} className={verifyResult.paymentMethod === 'CASH' ? "text-amber-600" : "text-emerald-600"} /> : <ShieldAlert size={20} className="text-red-600" />}
                                <span className={`font-bold ${verifyResult.paymentMethod === 'CASH' ? 'text-amber-800' : (verifyResult.success ? 'text-emerald-800' : 'text-red-800')}`}>
                                    {verifyResult.success ? (verifyResult.paymentMethod === 'CASH' ? 'Verify Cash' : 'Online Verified') : 'Failed'}
                                </span>
                            </div>

                            {verifyResult.success ? (
                                <div className="text-sm">
                                    {verifyResult.paymentMethod === 'CASH' ? (
                                        <div className="space-y-1">
                                            <p className="text-amber-800 font-bold flex items-center gap-2"><Banknote size={14} /> Collect Full Cash from User</p>
                                            <p className="text-xs text-amber-700">{verifyResult.financialDetails}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-emerald-800 font-bold flex items-center gap-2"><CreditCard size={14} /> Payment Received Online</p>
                                            <p className="text-xs text-emerald-700">{verifyResult.financialDetails}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-red-700">{verifyResult.error || 'Invalid ID.'}</p>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* ... (Withdraw Modal - Unchanged) ... */}
            <Modal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onConfirm={handleWithdraw}
                title="Withdraw Funds"
                confirmLabel="Request Withdrawal"
            >
                <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Available Balance</p>
                            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">₹{walletBalance.toFixed(2)}</p>
                        </div>
                        <WalletIcon size={32} className="text-emerald-500" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Amount to Withdraw</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full pl-8 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 p-2 border rounded-lg text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs" onClick={() => setWithdrawAmount('500')}>₹500</div>
                        <div className="flex-1 p-2 border rounded-lg text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs" onClick={() => setWithdrawAmount('1000')}>₹1000</div>
                        <div className="flex-1 p-2 border rounded-lg text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs" onClick={() => setWithdrawAmount(walletBalance.toString())}>All</div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">Service charge calculated at ticket scan time.</p>
                </div>
            </Modal>
        </div>
    );
};
