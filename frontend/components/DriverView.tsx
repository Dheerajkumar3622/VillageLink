
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStoredTickets, subscribeToUpdates, broadcastBusLocation, registerDriverOnNetwork, disconnectDriver, driverCollectTicket, driverWithdraw, getRentalRequests, getAllParcels, suggestLocation, getPathDemand, getAheadVehicles, checkKinematicLock } from '../services/transportService';
import { fetchSmartRoute } from '../services/graphService';
import { getRoutes } from '../services/adminService';
import { getWallet } from '../services/blockchainService';
import { Ticket, TicketStatus, User, LocationData, DeviationProposal, RentalBooking, VehicleComponentHealth, RouteDefinition, ParcelBooking, LedgerEntry, FuelAdvice } from '@villagelink/shared';
import { checkForRouteDeviations, analyzeDriverDrowsiness, analyzeBusAudioOccupancy, initFatigueMonitoring, stopFatigueMonitoring } from '../services/mlService';
import { startPotholeMonitoring, stopPotholeMonitoring } from '../services/iotService';
import { playSonicToken } from '../services/advancedFeatures';
import { Button } from './Button';
import { Camera, Activity, Check, MapPin, Clock, Mic, AlertOctagon, ScanLine, Coins, Wifi, Car, Package, ShieldAlert, Wallet as WalletIcon, Banknote, Volume2, VolumeX, Plus, CreditCard, Users, TrendingDown, Info, ShoppingCart, ChevronRight } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { TRANSLATIONS } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import CargoDriverView from './CargoDriverView';
import { QRScanner } from './QRScanner';
import { DriverProfileModal } from './DriverProfileModal';

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



    // Bus Mode State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showDriverProfile, setShowDriverProfile] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState('');

    // Wallet State
    const [walletBalance, setWalletBalance] = useState(user.walletBalance || 0);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    const [currentGPS, setCurrentGPS] = useState<{ lat: number, lng: number, speed?: number } | null>(null);
    const [provisionalTickets, setProvisionalTickets] = useState<Ticket[]>([]);
    const [pathDemand, setPathDemand] = useState<Record<string, number>>({});
    const [aheadCompetitors, setAheadCompetitors] = useState<any[]>([]);
    const [profitWarning, setProfitWarning] = useState<string | null>(null);
    const [logisticsAdvice, setLogisticsAdvice] = useState<any>(null);
    const [demandHeatmap, setDemandHeatmap] = useState<any[]>([]);
    const [heroStats, setHeroStats] = useState<any>(null);
    const routeListRef = useRef<HTMLDivElement>(null);

    // --- 1000x SMART DRIVER STATE ---
    const [smartRoutes, setSmartRoutes] = useState<any[]>([]);
    const [smartLoading, setSmartLoading] = useState(false);
    const [liveSeats, setLiveSeats] = useState<{ total: number, occupied: number, parcels: number }>({ total: 20, occupied: 0, parcels: 0 });
    const [earnings, setEarnings] = useState<any>(null);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ROUTE' | 'EARNINGS' | 'DELIVERIES'>('ROUTE');
    const [routeDemand, setRouteDemand] = useState<any[]>([]);
    const [aheadVehicles, setAheadVehicles] = useState<any[]>([]);
    const tokenRef = useRef(localStorage.getItem('villagelink_token') || '');

    const currentOccupancy = useMemo(() => {
        return liveSeats.occupied || tickets.filter(t => t.status === TicketStatus.BOARDED).reduce((acc, t) => acc + t.passengerCount, 0);
    }, [tickets, liveSeats]);

    // Acoustic Verification State
    const [isAcousticListenerActive, setIsAcousticListenerActive] = useState(false);

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
                        const { latitude, longitude, speed } = pos.coords;
                        const currSpeed = speed ? speed * 3.6 : (tripConfig.isActive ? 25 : 0);
                        setCurrentGPS({ lat: latitude, lng: longitude, speed: currSpeed });
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
                if (data.success) setDemandHeatmap(data.heatmap || []);
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

    // --- 1000x: SMART API CALLS ---
    const apiHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenRef.current}` };

    const handleSmartGoOnline = async () => {
        setSmartLoading(true);
        try {
            const loc = currentGPS || { lat: 26.45, lng: 80.35 };
            const res = await fetch(`${API_BASE_URL}/api/driver/go-online`, {
                method: 'POST', headers: apiHeaders,
                body: JSON.stringify({ lat: loc.lat, lng: loc.lng, vehicleType: user.vehicleType || 'BUS', seatsTotal: user.vehicleCapacity || 20 })
            });
            const data = await res.json();
            if (data.suggestedRoutes) {
                setSmartRoutes(data.suggestedRoutes);
            }
            setIsOnline(true);
            announce('Online ho gaye. Route select karo.');
        } catch (e) {
            console.error('Go Online Error:', e);
            // Fallback to old method
            setIsOnline(true);
        }
        setSmartLoading(false);
    };

    const handleSmartSelectRoute = async (routeId: string) => {
        setSelectedRouteId(routeId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/select-route`, {
                method: 'POST', headers: apiHeaders,
                body: JSON.stringify({ routeId })
            });
            const data = await res.json();
            if (data.route) {
                setRouteDemand(data.stopDemand || []);
                // Auto-populate trip config from route
                const routeObj = officialRoutes.find(r => r.id === routeId) || data.route;
                if (routeObj) {
                    const path = routeObj.stops?.map((s: any) => s.name || s) || [routeObj.from, routeObj.to];
                    setTripConfig(prev => ({ ...prev, path, pathDetails: routeObj.stops || [], totalDistance: routeObj.distance || 0 }));
                }
                announce(`Route ${data.route.name} selected. ${data.stopDemand?.length || 0} stops hai.`);
            }
        } catch (e) { console.error('Select route error:', e); }
    };

    const loadEarnings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/earnings`, { headers: apiHeaders });
            const data = await res.json();
            setEarnings(data);
        } catch (e) { console.error('Earnings error:', e); }
    };

    const loadDeliveries = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/deliveries`, { headers: apiHeaders });
            const data = await res.json();
            setDeliveries(data.deliveries || []);
        } catch (e) { console.error('Deliveries error:', e); }
    };

    const loadAheadVehicles = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/ahead-vehicles`, { headers: apiHeaders });
            const data = await res.json();
            setAheadVehicles(data.vehicles || []);
        } catch (e) { console.error('Ahead vehicles error:', e); }
    };

    const loadMySeats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/my-seats`, { headers: apiHeaders });
            const data = await res.json();
            if (data.seatsTotal) setLiveSeats({ total: data.seatsTotal, occupied: data.seatsOccupied || 0, parcels: data.parcelsOnboard || 0 });
        } catch (e) { console.error('Seats error:', e); }
    };

    const handleDeliveryAction = async (id: string, action: 'accept' | 'pickup' | 'deliver') => {
        try {
            await fetch(`${API_BASE_URL}/api/driver/deliveries/${id}/${action}`, { method: 'PUT', headers: apiHeaders });
            loadDeliveries();
            loadMySeats();
            announce(`Delivery ${action} ho gayi.`);
        } catch (e) { console.error(`Delivery ${action} error:`, e); }
    };

    const handleCashVerify = async (ticketId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/verify-cash`, {
                method: 'POST', headers: apiHeaders,
                body: JSON.stringify({ ticketId, passengerCount: 1 })
            });
            const data = await res.json();
            if (data.seatsOccupied !== undefined) {
                setLiveSeats(prev => ({ ...prev, occupied: data.seatsOccupied }));
            }
        } catch (e) { console.error('Cash verify error:', e); }
    };

    // Periodic refresh for live data
    useEffect(() => {
        if (!isOnline || !tripConfig.isActive) return;
        const interval = setInterval(() => {
            loadMySeats();
            loadAheadVehicles();
            if (activeTab === 'EARNINGS') loadEarnings();
            if (activeTab === 'DELIVERIES') loadDeliveries();
        }, 8000);
        loadMySeats();
        loadEarnings();
        loadDeliveries();
        loadAheadVehicles();
        return () => clearInterval(interval);
    }, [isOnline, tripConfig.isActive, activeTab]);

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

    // --- AUTO GPS STOP VERIFICATION ---
    useEffect(() => {
        if (!tripConfig.isActive || !currentGPS || routeMode !== 'OFFICIAL') return;
        
        // Auto-verify current stop based on GPS proximity (e.g., within 500 meters)
        const checkStopProximity = () => {
            if (currentStopIndex >= tripConfig.pathDetails.length) return;
            
            const upcomingStop = tripConfig.pathDetails[currentStopIndex];
            if (!upcomingStop || typeof upcomingStop === 'string') return; // Needs coordinate data
            
            // Haversine distance formula approximation (in KM)
            const toRad = (value: number) => value * Math.PI / 180;
            const R = 6371; // Earth's radius in km
            const dLat = toRad(currentGPS.lat - upcomingStop.lat);
            const dLon = toRad(currentGPS.lng - upcomingStop.lng);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(upcomingStop.lat)) * Math.cos(toRad(currentGPS.lat)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            const distanceKM = R * c;
            
            // If within 500 meters (0.5 km) of the stop, auto-verify
            if (distanceKM <= 0.5) {
                setCurrentStopIndex(i => Math.min(i + 1, tripConfig.path.length - 1));
                setHoldProgress(100); // Trigger UI success animation
                announce(`${tripConfig.path[currentStopIndex]} Stop Verified Automatically.`);
                setTimeout(() => setHoldProgress(0), 3000); // Reset animation
            }
        };

        const timer = setInterval(checkStopProximity, 5000); // Check every 5 seconds
        return () => clearInterval(timer);
    }, [currentGPS, tripConfig.isActive, currentStopIndex, routeMode, tripConfig.pathDetails]);

    // Clean up acoustic listener on unmount
    useEffect(() => {
        return () => {
            stopUltrasonicListener();
        };
    }, []);

    const toggleAcousticListener = async (forceState?: boolean) => {
        const newState = forceState !== undefined ? forceState : !isAcousticListenerActive;
        setIsAcousticListenerActive(newState);
        
        if (newState) {
            announce("Acoustic listener activated. Ready for passengers.");
            await startUltrasonicListener(async (payload) => {
                console.log("[Acoustic RX] Received Payload:", payload);
                if (payload.startsWith("TK|")) {
                    const parts = payload.split("|");
                    const ticketId = parts[1];
                    
                    setProvisionalTickets(prev => {
                        if (prev.find(t => t.id === ticketId)) return prev;
                        announce("Acoustic ping valid. Tracking speed match.");
                        return [...prev, {
                            id: ticketId,
                            status: TicketStatus.PROVISIONAL,
                            provisionalTimestamp: Date.now()
                        } as Ticket];
                    });
                }
            });
        } else {
            announce("Acoustic listener deactivated.");
            stopUltrasonicListener();
        }
    };

    // --- PHASE 1.5: KINEMATIC MATCH LOOP ---
    useEffect(() => {
        if (provisionalTickets.length === 0) return;

        const interval = setInterval(() => {
            setProvisionalTickets(prev => {
                if (prev.length === 0) return prev;
                
                let ticketsToVerify: Ticket[] = [];
                const updated = prev.filter(ticket => {
                    // Mocking Passenger speed to match driver for demo purposes if they are on the bus
                    const driverSpeed = currentGPS?.speed || (tripConfig.isActive ? 25 : 0);
                    const passengerSpeed = driverSpeed; 

                    const newStatus = checkKinematicLock(ticket, driverSpeed, passengerSpeed);

                    if (newStatus === TicketStatus.BOARDED) {
                        ticketsToVerify.push(ticket);
                        return false;  // Remove from provisional
                    }
                    
                    if (ticket.provisionalTimestamp && Date.now() - ticket.provisionalTimestamp > 300000) {
                        return false; // Discard stale ticket (5 min)
                    }
                    return true;
                });

                ticketsToVerify.forEach(async (t) => {
                    announce("Speed match confirmed. Passenger Boarded.");
                    setVerifyId(t.id);
                    setShowVerifyModal(true);
                    setVerifyStatus('Kinematic Lock Achieved!');
                    
                    const result = await driverCollectTicket(t.id, user.id);
                    setVerifyResult(result);
                    if (result.success) {
                        setWalletBalance(result.balance);
                        setLiveSeats(s => ({...s, occupied: s.occupied + 1}));
                        setTimeout(() => { setVerifyId(''); setShowVerifyModal(false); }, 3000);
                    } else {
                        setTimeout(() => { setVerifyId(''); setShowVerifyModal(false); }, 3000);
                    }
                });

                return updated;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [provisionalTickets.length, currentGPS, user.id, tripConfig.isActive]);

    const handleManualVerify = async () => {
        let idToCheck = verifyId.trim().toUpperCase();
        if (!idToCheck) return;

        // NEW: 2-Digit Audio Code Fast Verify Simulation
        if (idToCheck.length === 2 && !isNaN(Number(idToCheck))) {
            setVerifyLoading(true);
            setVerifyStatus('Matching Short Code...');
            // Simulate short code matching success
            setTimeout(() => {
                setVerifyLoading(false);
                setVerifyStatus('Identity Matched via Short Code!');
                setVerifyResult({ success: true, paymentMethod: 'ONLINE', totalPrice: 25 });
                announce("Code matched. Passenger boarded.");
                setLiveSeats(prev => ({...prev, occupied: prev.occupied + 1}));
                setTimeout(() => { setVerifyId(''); setVerifyResult(null); setShowVerifyModal(false); }, 1500);
            }, 800);
            return;
        }

        // Robust Handling: Extract number and re-format
        // Example: "tk 7700" -> "7700" -> "TK-7700"
        // Example: "7700" -> "7700" -> "TK-7700"
        const numericPart = idToCheck.replace(/[^0-9]/g, '');
        if (numericPart.length >= 4) {
            idToCheck = `TK-${numericPart}`;
        }

        setVerifyLoading(true);
        setVerifyResult(null);
        setVerifyStatus('Searching VillageLink Ledger...');

        const result = await driverCollectTicket(idToCheck, user.id);

        setVerifyLoading(false);
        setVerifyStatus(result.success ? 'Identity Matched!' : 'Verification Failed.');
        setVerifyResult(result);
        if (result.success) {
            setWalletBalance(result.balance);
            if (result.paymentMethod === 'CASH') {
                announce(`Cash Collected. Platform fee deducted.`);
            } else {
                announce(`Ticket Verified. Earnings Added.`);
            }
            setTimeout(() => setVerifyId(''), 1000); // Clear after a delay
        } else {
            announce("Invalid Ticket.");
        }
    };

    const handleQRScan = (decodedText: string) => {
        setShowQRScanner(false);
        let ticketId = '';

        // Try to decode as base64 QR payload: {t: ticketId, s: signature, e: expiry, v: version}
        try {
            const decoded = atob(decodedText.replace(/-/g, '+').replace(/_/g, '/'));
            const qrData = JSON.parse(decoded);
            if (qrData && qrData.t) {
                ticketId = qrData.t;
            }
        } catch {
            // Not a base64 payload — treat as plain text
        }

        // If not decoded from QR payload, use raw text
        if (!ticketId) {
            ticketId = decodedText.trim().toUpperCase();
            // Try to format as ticket ID if it's just a number
            const numericPart = ticketId.replace(/[^0-9]/g, '');
            if (numericPart.length >= 4 && !ticketId.startsWith('TK')) {
                ticketId = `TK-${numericPart}`;
            }
        }

        if (ticketId) {
            setVerifyId(ticketId);
            setVerifyStatus('QR Scanned! Verifying...');
            // Auto-trigger verification after short delay for UI feedback
            setTimeout(() => {
                setVerifyId(ticketId);
                // Directly call the verify logic
                (async () => {
                    setVerifyLoading(true);
                    setVerifyResult(null);
                    setVerifyStatus('Scanning Ledger...');
                    const result = await driverCollectTicket(ticketId, user.id);
                    setVerifyLoading(false);
                    setVerifyStatus(result.success ? 'Identity Matched!' : 'Verification Failed.');
                    setVerifyResult(result);
                    if (result.success) {
                        setWalletBalance(result.balance);
                        if (result.paymentMethod === 'CASH') {
                            announce('Cash Collected. Platform fee deducted.');
                        } else {
                            announce('Ticket Verified. Earnings Added.');
                        }
                        setTimeout(() => setVerifyId(''), 1000);
                    } else {
                        announce('Invalid Ticket.');
                    }
                })();
            }, 300);
        }
    };

    if (!user.isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-slate-50 dark:bg-black">
                <div className="w-24 h-24 bg-luxe-gold/20 dark:bg-luxe-gold/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Clock size={48} className="text-luxe-gold" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white mb-2">Verification Pending</h2>
                <button onClick={() => window.location.reload()} className="mt-8 text-luxe-sienna font-bold text-sm">Refresh Status</button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-32 animate-fade-in font-sans relative">
                {showDriverProfile && <DriverProfileModal user={user} onClose={() => setShowDriverProfile(false)} />}
                
                {/* Header HUD — Sticky Top */}
                <div className="sticky top-4 z-50 mb-6 px-4 lg:px-0">
                    <div className="glass-3 p-4 rounded-[28px] border-slate-200 dark:border-white/10 shadow-whisk-float relative overflow-hidden">
                        <div className="flex justify-between items-center relative">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowDriverProfile(true)}>
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-luxe-sienna to-luxe-gold flex items-center justify-center font-black text-lg text-white shadow-glow-md group-hover:rotate-3 transition-transform">{user.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">{user.name.split(' ')[0]}</h2>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            {viewMode}
                                        </span>
                                        {isMobileATM && <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Coins size={9} /> ATM</span>}
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                            <Wifi size={9} className="text-emerald-500" /> Live
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div onClick={() => setVoiceAssist(!voiceAssist)} className={`cursor-pointer w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${voiceAssist ? 'bg-luxe-teal/10 border-luxe-teal/30 text-luxe-teal shadow-glow-sm' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500'}`}>
                                    {voiceAssist ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                </div>
                                <div onClick={() => setShowWithdrawModal(true)} className="cursor-pointer glass-3 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
                                    <WalletIcon size={14} className="text-slate-400" />
                                    <span className="font-black text-luxe-teal text-base">₹{walletBalance.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse lg:flex-row gap-6">
                {/* Left Side: Journey Timeline */}
                {tripConfig.isActive && (
                    <aside className="w-full lg:w-80 whisk-trip-card p-6 rounded-[32px] max-h-[60vh] lg:max-h-[calc(100vh-200px)] flex flex-col lg:sticky lg:top-[180px]">
                        <div className="flex items-center gap-3 mb-6 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-luxe-sienna/20 flex items-center justify-center text-xl shadow-glow-sm">🚀</div>
                            <div>
                                <h1 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">Trip VL-{user.id.slice(-3).toUpperCase()}</h1>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Route: {officialRoutes.find(r => r.id === selectedRouteId)?.name || 'Custom'}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                            <div className="space-y-0 relative">
                                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-800/50"></div>
                                {tripConfig.path.map((stop, idx) => {
                                    const isCurrent = idx === currentStopIndex;
                                    const isPassed = idx < currentStopIndex;
                                    const waitingCount = pathDemand[stop] || 0;
                                    const aheadBusesAtStop = aheadCompetitors.filter(c => (c.activePath || [])[c.currentStopIndex || 0] === stop);

                                    return (
                                        <div key={idx} className={`relative pl-8 pb-6 last:pb-0 transition-opacity duration-500 ${isCurrent ? 'opacity-100 scale-105' : 'opacity-80'}`}>
                                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300 ${isCurrent ? 'border-luxe-teal bg-luxe-teal/20 shadow-glow-sm' : (isPassed ? 'border-indigo-500/50 bg-indigo-500/50' : 'border-slate-200 dark:border-slate-800')}`}>
                                                {isCurrent && <div className="w-2 h-2 bg-slate-900 dark:bg-white rounded-full animate-pulse"></div>}
                                                {isPassed && <Check size={12} className="text-white" />}
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs font-black transition-colors ${isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{stop}</span>
                                                {!isPassed && waitingCount > 0 && (
                                                    <div className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-[8px] font-black text-emerald-400 animate-pulse uppercase tracking-tighter">
                                                        {waitingCount} WAITING
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <Users size={10} className="text-luxe-sienna" />
                                                    <span className="text-[10px] font-bold text-slate-500">{waitingCount} waiting</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <Package size={10} className="text-luxe-teal" />
                                                    <span className="text-[10px] font-bold text-slate-500">{Math.floor(Math.random() * 3)} parcels</span>
                                                </div>
                                            </div>
                                            {isCurrent && (
                                                <div className="mt-2 flex gap-2">
                                                    <button onClick={handleMarkChowk} className="text-[9px] font-black bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 uppercase tracking-widest transition-all">Mark Chowk</button>
                                                </div>
                                            )}
                                            {!isPassed && aheadBusesAtStop.length > 0 && (
                                                <p className="text-[8px] font-black text-rose-400 uppercase mt-1">Bus {aheadBusesAtStop[0].driverId.slice(-3).toUpperCase()} is here</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* --- ACOUSTIC AUTO-VALIDATION TOGGLE (Phase 1) --- */}
                        {isOnline && routeMode === 'OFFICIAL' && (
                            <div className="mt-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-900/30 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${isAcousticListenerActive ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                                            <Mic size={14} />
                                        </div>
                                        AI Acoustic Verification
                                    </h3>
                                    <div 
                                        className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors ${isAcousticListenerActive ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        onClick={() => toggleAcousticListener()}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${isAcousticListenerActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {isAcousticListenerActive ? "Listening for ultrasonic handshakes from boarding passengers..." : "Turn on to automatically verify tickets using inaudible sound waves."}
                                </p>
                            </div>
                        )}
                        
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

                    {/* Hero Stats Card */}
                    {heroStats && (
                        <div className="whisk-trip-card p-6 rounded-[32px] animate-fade-in mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-[var(--accent-primary)] rotate-180" />
                                    Hero Performance
                                </h3>
                                <div className="px-3 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-[10px] font-black uppercase">
                                    Grade: {heroStats.heroLevel > 5 ? 'A+' : 'B'}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center group cursor-help transition-transform hover:scale-105">
                                    <span className="block text-2xl font-black text-slate-900 dark:text-white transition-all group-hover:text-luxe-gold">{heroStats.totalTrips}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-slate-400 transition-colors">Trips</span>
                                </div>
                                <div className="text-center group cursor-help transition-transform hover:scale-105">
                                    <span className="block text-2xl font-black text-luxe-sienna dark:text-[var(--accent-warm)] transition-all group-hover:scale-110">{heroStats.heroPoints}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Points</span>
                                </div>
                                <div className="text-center group cursor-help transition-transform hover:scale-105">
                                    <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums transition-all group-hover:brightness-125">₹{heroStats.totalEarnings}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Revenue</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Demand Heatmap Visualization */}
                    {demandHeatmap.length > 0 && (
                        <div className="whisk-trip-card p-6 rounded-[32px] animate-fade-in mb-6">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                Live Demand Heatmap
                            </h3>
                            <div className="relative h-48 bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden transition-all hover:bg-slate-900/70">
                                {/* Pulse Overlays for Heatmap (V5 Parity) */}
                                {(demandHeatmap || []).slice(0, 3).map((point, i) => (
                                    <div key={i} title={`${point.location}: ${point.intensity}/10 demand`}>
                                        <HeatPulse top={20 + i * 25} left={30 + i * 20} opacity={point.intensity / 10} />
                                    </div>
                                ))}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/80 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm shadow-glow-sm">
                                        NavIC Grid Overlay Active
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-950/60 px-2 py-1 rounded-lg">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">You are here</span>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4">
                                {(demandHeatmap || []).slice(0, 4).map((point, i) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${point.intensity > 7 ? 'bg-rose-500 animate-pulse' : point.intensity > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{point.location}</span>
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
                                <div onClick={() => setIsMobileATM(!isMobileATM)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isMobileATM ? 'bg-emerald-500/10 border-emerald-500/50 shadow-glow-sm' : 'glass-3 border-slate-200 dark:border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isMobileATM ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Coins size={24} /></div>
                                    <h4 className={`font-black tracking-widest text-sm uppercase ${isMobileATM ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>Mobile ATM</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isMobileATM ? 'Broadcast Active' : 'Enable Cash-Out'}</p>
                                </div>
                                <div onClick={() => setIsDataMuleActive(!isDataMuleActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isDataMuleActive ? 'bg-blue-500/10 border-blue-500/50 shadow-glow-sm' : 'glass-3 border-slate-200 dark:border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDataMuleActive ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Wifi size={24} /></div>
                                    <h4 className={`font-black tracking-widest text-sm uppercase ${isDataMuleActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>Data Mule</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isDataMuleActive ? 'Hosting Content' : 'Sync Content'}</p>
                                </div>
                                <div onClick={() => setIsRoadAIActive(!isRoadAIActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isRoadAIActive ? 'bg-amber-500/10 border-amber-500/50 shadow-glow-sm' : 'glass-3 border-slate-200 dark:border-white/5 text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isRoadAIActive ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Activity size={24} /></div>
                                    <h4 className={`font-black tracking-widest text-sm uppercase ${isRoadAIActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>Road AI</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{isRoadAIActive ? 'Sensor Active' : 'Detect Potholes'}</p>
                                </div>
                                <div onClick={handleAudioCount} className="p-6 rounded-3xl border glass-3 border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 mb-4 group-hover:text-luxe-teal transition-colors">
                                        {isCountingAudio ? <span className="animate-spin text-2xl">⌛</span> : <Mic size={24} />}
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">Count Crowd</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">Use Audio AI Analysis</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!tripConfig.isActive && viewMode !== 'UTILITIES' && (
                        <div className="whisk-trip-card p-8 rounded-[40px] animate-fade-in-up">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center tracking-tight">Begin Shift</h3>

                            {/* Smart / Manual Route Toggle */}
                             <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl mb-6">
                                <button onClick={() => setRouteMode('OFFICIAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${routeMode === 'OFFICIAL' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-600 hover:text-slate-800 dark:hover:text-slate-300'}`}>Smart Route</button>
                                <button onClick={() => setRouteMode('CUSTOM')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${routeMode === 'CUSTOM' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-600 hover:text-slate-800 dark:hover:text-slate-300'}`}>Custom Path</button>
                            </div>

                            {routeMode === 'OFFICIAL' ? (
                                <div className="mb-6">
                                    {/* AI Smart Go Online Button */}
                                    {!isOnline && (
                                        <button
                                            onClick={handleSmartGoOnline}
                                            disabled={smartLoading}
                                            className="w-full mb-6 py-5 bg-gradient-to-r from-luxe-sienna to-luxe-gold text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-glow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {smartLoading ? (
                                                <><span className="animate-spin text-xl">⌛</span> AI Route Analysis...</>
                                            ) : (
                                                <>🟢 Go Online — Get AI Routes</>
                                            )}
                                        </button>
                                    )}

                                    {/* AI Suggested Routes */}
                                    {(smartRoutes || []).length > 0 && (
                                        <div className="space-y-3 mb-6">
                                            <p className="text-[9px] font-black text-luxe-gold uppercase tracking-[0.3em] mb-3">🤖 AI Recommended Routes</p>
                                            {smartRoutes.map((route: any, idx: number) => (
                                                <div
                                                    key={route.routeId || idx}
                                                    onClick={() => handleSmartSelectRoute(route.routeId || route.id)}
                                                    className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
                                                        selectedRouteId === (route.routeId || route.id)
                                                            ? 'bg-luxe-sienna/20 border-luxe-sienna/50 shadow-glow-sm'
                                                            : 'glass-3 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="font-black text-slate-900 dark:text-white text-sm">{route.name || route.routeName}</h4>
                                                            <p className="text-[10px] text-slate-500 font-bold">{route.from} → {route.to}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                                            route.tag === 'HOT🔥' ? 'bg-rose-500/20 text-rose-400' :
                                                            route.tag === 'GOOD👍' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                        }`}>{route.tag || 'NORMAL'}</span>
                                                    </div>
                                                    <div className="flex gap-4 mt-3">
                                                        <div className="flex items-center gap-1">
                                                            <Users size={12} className="text-luxe-teal" />
                                                            <span className="text-[10px] font-black text-slate-400">{route.demand?.passengers || 0} waiting</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Package size={12} className="text-luxe-gold" />
                                                            <span className="text-[10px] font-black text-slate-400">{route.demand?.parcels || 0} parcels</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Car size={12} className="text-slate-500" />
                                                            <span className="text-[10px] font-black text-slate-400">{route.competition || 0} buses</span>
                                                        </div>
                                                    </div>
                                                     {route.aiScore && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-luxe-sienna to-luxe-gold rounded-full transition-all" style={{ width: `${route.aiScore}%` }}></div>
                                                            </div>
                                                            <span className="text-[9px] font-black text-luxe-gold">{route.aiScore}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Fallback: Manual Route Select */}
                                    {(smartRoutes || []).length === 0 && isOnline && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Assigned Route</label>
                                             <div className="relative">
                                                <select value={selectedRouteId} onChange={(e) => { setSelectedRouteId(e.target.value); handleSmartSelectRoute(e.target.value); }} className="w-full p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl appearance-none outline-none text-slate-900 dark:text-white font-black text-sm tracking-tight" aria-label="Select Route">
                                                    <option value="" className="bg-white dark:bg-slate-950">-- Select Hub Route --</option>
                                                    {officialRoutes.map(route => (<option key={route.id} value={route.id} className="bg-white dark:bg-slate-950">{route.name} ({route.from} - {route.to})</option>))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                            </div>
                                        </div>
                                    )}

                                    {!isOnline && (smartRoutes || []).length === 0 && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Or Select Manually</label>
                                             <div className="relative">
                                                <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl appearance-none outline-none text-slate-900 dark:text-white font-black text-sm tracking-tight" aria-label="Select Route">
                                                    <option value="" className="bg-white dark:bg-slate-950">-- Select Hub Route --</option>
                                                    {officialRoutes.map(route => (<option key={route.id} value={route.id} className="bg-white dark:bg-slate-950">{route.name} ({route.from} - {route.to})</option>))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Per-Stop Demand Preview */}
                                    {(routeDemand || []).length > 0 && (
                                        <div className="mt-4 glass-3 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">📊 Stop-Wise Demand</p>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                 {routeDemand.map((stop: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{stop.stopName}</span>
                                                        <div className="flex gap-3">
                                                            {stop.waitingPassengers > 0 && (
                                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{stop.waitingPassengers}👤</span>
                                                            )}
                                                            {stop.parcels > 0 && (
                                                                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">{stop.parcels}📦</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                            <div className="whisk-trip-card rounded-[40px] p-8 flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-6">
                                    <div className="flex gap-4">
                                        {/* Live Seat HUD */}
                                        <div className="glass-3 border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 py-3 px-6 rounded-2xl">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Seats</p>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest">
                                                {liveSeats.occupied} / <span className="text-slate-400 dark:text-slate-600">{liveSeats.total}</span>
                                            </h3>
                                        </div>
                                        {liveSeats.parcels > 0 && (
                                            <div className="glass-3 border-white/5 bg-yellow-500/5 py-3 px-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcels</p>
                                                <h3 className="text-xl font-black text-yellow-400">📦 {liveSeats.parcels}</h3>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setVerifyId(''); setVerifyResult(null); setShowQRScanner(false); setShowVerifyModal(true); }}
                                            className="bg-slate-200 dark:bg-slate-800 px-6 py-4 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 shadow-sm"
                                        >
                                            <ScanLine size={16} /> Enter Code
                                        </button>
                                        <button
                                            onClick={() => {
                                                announce("Cash passenger added");
                                                setLiveSeats(prev => ({...prev, occupied: prev.occupied + 1}));
                                                // Trigger a quick flash animation on the button could be handled here
                                            }}
                                            className="bg-emerald-500 px-6 py-4 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-400 active:scale-95 transition-all shadow-glow-sm shadow-emerald-500/30 uppercase tracking-widest text-white transform"
                                        >
                                            <Plus size={16} strokeWidth={3} /> <span className="text-xl leading-none -mt-0.5">1</span> Cash
                                        </button>
                                    </div>
                                </div>

                                {/* --- KINEMATIC LOCK PENDING UI --- */}
                                {provisionalTickets.length > 0 && (
                                    <div className="w-full mb-6 relative z-10">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span className="animate-spin text-lg">⚙️</span> Kinematic Lock Pending ({provisionalTickets.length})
                                        </p>
                                        <div className="space-y-2">
                                            {provisionalTickets.map(pt => (
                                                <div key={pt.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex justify-between items-center transition-all animate-fade-in shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                                    <div>
                                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-0.5">Ultrasonic Match</span>
                                                        <span className="text-sm font-black text-white">{pt.id}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-bold text-amber-500/70 block uppercase tracking-widest">Speed Sync</span>
                                                        <span className="text-xs font-black text-amber-400 animate-pulse tracking-widest">&gt; 10 KMPH Wait...</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Background Geofencing Active - No Center HUD */}

                                {/* HUD Bottom Bar */}
                                <div className="w-full flex justify-center gap-6 md:gap-12 mt-4 flex-wrap pb-4">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[8px] font-black text-slate-700 dark:text-slate-500 uppercase tracking-[0.3em] mb-2">NavIC Sat</p>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={`w-1.5 h-4 rounded-full ${i <= 4 ? 'bg-luxe-teal shadow-glow-sm' : 'bg-slate-300 dark:bg-slate-800'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                                        <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2 opacity-90 border-b border-emerald-500/30 pb-1">Ultrasonic Sync</p>
                                        <span className="text-xs font-black tracking-widest flex items-center gap-1 text-slate-900 dark:text-white"><Volume2 size={12} className="animate-pulse text-emerald-600 dark:text-emerald-400" /> LISTENING...</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="text-[8px] font-black text-slate-700 dark:text-slate-500 uppercase tracking-[0.3em] mb-2">Network</p>
                                        <span className="text-xs font-black text-slate-900 dark:text-white tracking-widest">LIVE</span>
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
                                <div className="glass-3 profit-alert-glow p-8 rounded-[40px] flex gap-8 items-center bg-indigo-500/5 dark:bg-indigo-900/10 border-slate-200 dark:border-white/5 shadow-yhisk-float animate-fade-in-up transition-all hover:bg-indigo-500/10 dark:hover:bg-indigo-900/20">
                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-3xl shadow-glow-md animate-float-banana">🤖</div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                            AI Profitability Advisor
                                        </p>
                                        <h2 className="text-xl font-black text-white leading-tight">Switch to <span className="text-emerald-400">Cargo Link</span> mode</h2>
                                        <p className="text-[11px] font-bold text-slate-500 mt-2 leading-relaxed">{profitWarning}</p>
                                    </div>
                                    <button onClick={() => setViewMode('CARGO')} className="px-8 py-4 bg-luxe-teal text-white text-[10px] font-black rounded-2xl hover:bg-luxe-teal/80 transition-all uppercase tracking-[0.2em] shadow-glow-sm">Optimize Now</button>
                                </div>
                            )}

                            {logisticsAdvice && (
                                <div
                                    onClick={() => { setViewMode('CARGO'); setLogisticsAdvice(null); }}
                                    className="bg-luxe-rust text-white p-6 rounded-[32px] flex items-center justify-between gap-4 shadow-glow-sm cursor-pointer hover:scale-[1.02] transition-all transform active:scale-95"
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

                            <Button variant="danger" fullWidth onClick={handleEndTrip} className="h-14 rounded-2xl opacity-70 hover:opacity-100 transition-opacity uppercase font-black text-xs tracking-widest text-white shadow-md">Emergency Shift End</Button>

                            {/* --- 1000x: Smart Tabs (Earnings / Deliveries / Ahead) --- */}
                            <div className="mt-6 glass-3 rounded-[32px] border-white/5 overflow-hidden">
                                <div className="flex border-b border-white/5">
                                    {(['ROUTE', 'EARNINGS', 'DELIVERIES'] as const).map(tab => (
                                        <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'EARNINGS') loadEarnings(); if (tab === 'DELIVERIES') loadDeliveries(); }}
                                            className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-luxe-gold border-b-2 border-luxe-gold bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>
                                            {tab === 'ROUTE' ? '🚌 Ahead' : tab === 'EARNINGS' ? '💰 Earnings' : '📦 Deliveries'}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-5">
                                    {activeTab === 'ROUTE' && (
                                        <div className="space-y-3">
                                            {(aheadVehicles || []).length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">No vehicles ahead on this route</p>
                                            ) : aheadVehicles.map((v: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-luxe-sienna/20 flex items-center justify-center text-sm shadow-inner">🚌</div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{v.driverName || `Bus ${(v.driverId || '').slice(-3)}`.toUpperCase()}</p>
                                                            <p className="text-[9px] text-slate-600 dark:text-slate-400">{v.distanceAhead ? `${v.distanceAhead.toFixed(1)} km ahead` : 'On route'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{v.seatsAvailable || '?'} seats</p>
                                                        <p className="text-[9px] text-slate-600 dark:text-slate-400">{v.seatsOccupied || 0}/{v.seatsTotal || 20}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'EARNINGS' && earnings && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="text-center p-3 rounded-xl bg-white/5">
                                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Today</p>
                                                    <p className="text-lg font-black text-emerald-400">₹{earnings.today?.totalEarnings || 0}</p>
                                                    <p className="text-[9px] text-slate-500">{earnings.today?.trips || 0} trips</p>
                                                </div>
                                                <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Week</p>
                                                    <p className="text-lg font-black text-slate-900 dark:text-white">₹{earnings.week?.totalEarnings || 0}</p>
                                                </div>
                                                <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Month</p>
                                                    <p className="text-lg font-black text-slate-900 dark:text-white">₹{earnings.month?.totalEarnings || 0}</p>
                                                </div>
                                            </div>
                                            {earnings.today?.autoVerified > 0 && (
                                                <div className="p-3 rounded-xl bg-luxe-teal/10 border border-luxe-teal/20">
                                                    <p className="text-[9px] font-black text-luxe-teal">⚡ {earnings.today.autoVerified} tickets auto-verified by GPS Speed Match</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {activeTab === 'EARNINGS' && !earnings && (
                                        <p className="text-xs text-slate-500 text-center py-4">Loading earnings...</p>
                                    )}

                                    {activeTab === 'DELIVERIES' && (
                                        <div className="space-y-3">
                                            {(deliveries || []).length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">No pending deliveries</p>
                                            ) : deliveries.map((d: any, i: number) => (
                                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{d.type === 'PARCEL' ? `📦 ${d.itemType}` : `🌾 ${d.cropName}`}</p>
                                                            <p className="text-[9px] text-slate-500">{d.pickupLocation} → {d.deliveryLocation}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                            d.status === 'PENDING' || d.status === 'ACCEPTED' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            d.status === 'PICKED_UP' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                        }`}>{d.status}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {d.status === 'PENDING' && (
                                                            <button onClick={() => handleDeliveryAction(d.id, 'accept')} className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500/30 transition-all">Accept</button>
                                                        )}
                                                        {(d.status === 'ACCEPTED' || d.status === 'DRIVER_ASSIGNED') && (
                                                            <button onClick={() => handleDeliveryAction(d.id, 'pickup')} className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black uppercase hover:bg-blue-500/30 transition-all">Pickup</button>
                                                        )}
                                                        {d.status === 'PICKED_UP' && (
                                                            <button onClick={() => handleDeliveryAction(d.id, 'deliver')} className="flex-1 py-2 bg-luxe-gold/20 text-luxe-gold rounded-lg text-[9px] font-black uppercase hover:bg-luxe-gold/30 transition-all">Deliver</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 pb-safe">
                <div className="max-w-5xl mx-auto flex bg-slate-200 dark:bg-white/10 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide gap-2 shadow-whisk-float">
                    <button onClick={() => setViewMode('BUS')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-center ${viewMode === 'BUS' ? 'bg-luxe-sienna text-white shadow-glow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}`}>Bus</button>
                    <button onClick={() => setViewMode('CARGO')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-center ${viewMode === 'CARGO' ? 'bg-luxe-sienna text-white shadow-glow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}`}>Cargo</button>
                    <button onClick={() => setViewMode('CHARTER')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-center ${viewMode === 'CHARTER' ? 'bg-luxe-sienna text-white shadow-glow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}`}>Charter</button>
                    <button onClick={() => setViewMode('UTILITIES')} className={`flex-1 py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-center ${viewMode === 'UTILITIES' ? 'bg-luxe-rust text-white shadow-glow-sm scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}`}>Tools</button>
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={showVerifyModal}
                onClose={() => { setShowVerifyModal(false); setShowQRScanner(false); setVerifyResult(null); setVerifyStatus(''); }}
                onConfirm={handleManualVerify}
                title="Verify Digital Ticket"
                confirmLabel={verifyLoading ? "Verifying..." : "Confirm & Deposit"}
            >
                <div className="p-6 space-y-6">
                    {showQRScanner ? (
                        <QRScanner
                            onScan={handleQRScan}
                            onClose={() => setShowQRScanner(false)}
                        />
                    ) : (
                        <div
                            onClick={() => setShowQRScanner(true)}
                            className="glass-3 bg-slate-50 dark:bg-white/5 p-8 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-luxe-teal transition-all group"
                        >
                            <Camera size={40} className="text-slate-500 mb-3 group-hover:text-luxe-teal transition-colors" />
                            <p className="text-[10px] font-black text-luxe-teal uppercase tracking-widest">Tap to Scan QR Code</p>
                            <p className="text-[8px] font-bold text-slate-500 mt-1">Opens camera to scan passenger ticket</p>
                        </div>
                    )}
                    {verifyStatus && (
                        <p className="text-center text-[10px] font-black text-luxe-teal animate-pulse uppercase tracking-[0.2em]">{verifyStatus}</p>
                    )}
                    <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">OR</div>
                    <input
                        value={verifyId}
                        onChange={(e) => setVerifyId(e.target.value)}
                        placeholder="ENTER 2-DIGIT OR TK-XXX"
                        className="w-full bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 outline-none font-black text-center uppercase text-xl tracking-[0.3em] text-slate-900 dark:text-white focus:border-emerald-500 transition-all"
                        autoFocus
                    />
                    {verifyResult && (
                        <div className={`p-6 rounded-3xl border-2 ${verifyResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} animate-slideUp text-slate-900 dark:text-white`}>
                            <div className="flex items-center gap-3 mb-4">
                                {verifyResult.success ? (
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-glow-sm">
                                        <Check size={20} className="text-white" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                                        <ShieldAlert size={20} className="text-white" />
                                    </div>
                                )}
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${verifyResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {verifyResult.success ? 'Payment Authenticated' : 'Identity Error'}
                                    </h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{verifyResult.success ? 'Ledger Verified' : 'Check Ticket ID'}</p>
                                </div>
                            </div>
                            
                            {verifyResult.success && (
                                <div className="space-y-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">PAID BY</span>
                                        <span className="text-slate-900 dark:text-white uppercase">{verifyResult.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">FARE</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">₹{verifyResult.totalPrice || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">VILLAGELINK FEE</span>
                                        <span className="text-rose-500 dark:text-rose-400">-₹{Math.round((verifyResult.totalPrice || 0) * 0.1)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black border-t border-slate-200 dark:border-white/5 pt-2 mt-2">
                                        <span className="text-slate-900 dark:text-white">NET SETTLEMENT</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">₹{Math.round((verifyResult.totalPrice || 0) * 0.9)}</span>
                                    </div>
                                </div>
                            )}
                            {!verifyResult.success && (
                                <p className="text-xs font-bold text-red-400 mt-2">{verifyResult.error || 'Ticket not found or already verified.'}</p>
                            )}
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
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl shadow-glow-sm border border-indigo-500/30">
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Total Available</p>
                        <p className="text-4xl font-black text-white tracking-tighter drop-shadow-md">₹{walletBalance.toFixed(2)}</p>
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
                                className="w-full pl-12 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-2xl font-black outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {['500', '1000', walletBalance.toString()].map(amt => (
                            <button key={amt} onClick={() => setWithdrawAmount(amt)} className="flex-1 py-3 glass-3 border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 uppercase tracking-widest">
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
