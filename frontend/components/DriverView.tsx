
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStoredTickets, subscribeToUpdates, broadcastBusLocation, registerDriverOnNetwork, disconnectDriver, driverCollectTicket, driverWithdraw, getRentalRequests, getAllParcels, suggestLocation, getPathDemand, getAheadVehicles, checkKinematicLock, registerDriverTripTrajectory, endDriverTripTrajectory, initSocketConnection, emitUltrasonicVerifyRequest } from '../services/transportService';
import { fetchSmartRoute, resolveLocationCoords } from '../services/graphService';
import { getRoutes } from '../services/adminService';
import { getWallet } from '../services/blockchainService';
import { Ticket, TicketStatus, User, LocationData, DeviationProposal, RentalBooking, VehicleComponentHealth, RouteDefinition, ParcelBooking, LedgerEntry, FuelAdvice } from '@villagelink/shared';
import { checkForRouteDeviations, analyzeDriverDrowsiness, analyzeBusAudioOccupancy, initFatigueMonitoring, stopFatigueMonitoring } from '../services/mlService';
import { startPotholeMonitoring, stopPotholeMonitoring } from '../services/iotService';
import { playSonicToken } from '../services/advancedFeatures';
import { startUltrasonicListener, stopUltrasonicListener } from '../services/UltrasonicVerificationService';
import { Button } from './Button';
import { HeartHandshake, PhoneIcon, XIcon, ShieldOffIcon, AlertTriangleIcon, CheckCircle2, Navigation, Volume2, VolumeX, MenuSquare, ArrowUpRight, ArrowDownRight, Clock, MapPin, Search, Camera, Activity, Check, Mic, AlertOctagon, ScanLine, Coins, Wifi, Car, Package, ShieldAlert, Wallet as WalletIcon, Banknote, Plus, CreditCard, Users, TrendingDown, Info, ShoppingCart, ChevronRight, Layers, List } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { useTranslation } from '../services/i18n';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { getOfficialRoutes, simulateDemand, TripConfig, getLiveDemandHeatmap } from '../services/transportService';
import CargoDriverView from './CargoDriverView';
import { QRScanner } from './QRScanner';
import { DriverProfileModal } from './DriverProfileModal';
import { InceptionGrid3D } from './InceptionGrid3D';
import { GeminiCoPilot } from './GeminiCoPilot';
import { ARMandiHUD } from './ARMandiHUD';
import { SmartDriverDashboard } from './SmartDriverDashboard';
import { SwarmNegotiationHUD } from './hud/SwarmNegotiationHUD';
import { ProximityRadar3D } from './ProximityRadar3D';

interface DriverViewProps {
    user: User;
    lang: 'EN' | 'HI';
}

// ... (Interface definitions remain the same) ...

export const DriverView: React.FC<DriverViewProps> = ({ user, lang }) => {
    const { t } = useTranslation();
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
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
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
    const [serverStopDemand, setServerStopDemand] = useState<Record<string, number>>({});
    const [aheadCompetitors, setAheadCompetitors] = useState<any[]>([]);
    const [profitWarning, setProfitWarning] = useState<string | null>(null);
    const [logisticsAdvice, setLogisticsAdvice] = useState<any>(null);
    const [demandHeatmap, setDemandHeatmap] = useState<any[]>([]);
    const [heroStats, setHeroStats] = useState<any>(null);
    const routeListRef = useRef<HTMLDivElement>(null);

    // --- 1000x SMART DRIVER & 3D SPATIAL COCKPIT STATE ---
    const [stopViewMode, setStopViewMode] = useState<'STACK' | 'LIST'>('STACK');
    const [stackFocusIndex, setStackFocusIndex] = useState<number>(0);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const [autoTransitEnabled, setAutoTransitEnabled] = useState(true);
    const [transitStatus, setTransitStatus] = useState<'DEPARTED' | 'APPROACHING' | 'ARRIVED'>('DEPARTED');
    const [lastTransitTime, setLastTransitTime] = useState<number>(0);
    const [segmentInfo, setSegmentInfo] = useState<{ distanceKm: number; arrivalThresholdKm: number } | null>(null);
    const [smartRoutes, setSmartRoutes] = useState<any[]>([]);
    const [smartLoading, setSmartLoading] = useState(false);
    const [liveSeats, setLiveSeats] = useState<{ total: number, occupied: number, parcels: number }>({ total: 20, occupied: 0, parcels: 0 });
    const [earnings, setEarnings] = useState<any>(null);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ROUTE' | 'EARNINGS' | 'DELIVERIES' | 'HUD'>('ROUTE');
    const [routeDemand, setRouteDemand] = useState<any[]>([]);
    const [aheadVehicles, setAheadVehicles] = useState<any[]>([]);
    const [selectedStopForParcels, setSelectedStopForParcels] = useState<string | null>(null);
    const [isBidding, setIsBidding] = useState(false);
    const [showNextRouteAdvisor, setShowNextRouteAdvisor] = useState(false);
    const [showInceptionGrid, setShowInceptionGrid] = useState(true);
    const [showARMandiHUD, setShowARMandiHUD] = useState(false);
    const [showGeminiCoPilot, setShowGeminiCoPilot] = useState(false);
    const tokenRef = useRef(localStorage.getItem('villagelink_token') || '');

    const userRef = useRef(user);
    const tripConfigRef = useRef(tripConfig);
    const currentStopIndexRef = useRef(currentStopIndex);
    const currentOccupancyRef = useRef(0);
    const isMobileATMRef = useRef(isMobileATM);
    const parcelsRef = useRef(parcels);
    const deviationRef = useRef(deviation);
    const profitWarningRef = useRef(profitWarning);

    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { tripConfigRef.current = tripConfig; }, [tripConfig]);
    useEffect(() => { currentStopIndexRef.current = currentStopIndex; }, [currentStopIndex]);
    useEffect(() => { isMobileATMRef.current = isMobileATM; }, [isMobileATM]);
    useEffect(() => { parcelsRef.current = parcels; }, [parcels]);
    useEffect(() => { deviationRef.current = deviation; }, [deviation]);
    useEffect(() => { profitWarningRef.current = profitWarning; }, [profitWarning]);

    const currentOccupancy = useMemo(() => {
        const val = liveSeats.occupied || tickets.filter(t => t.status === TicketStatus.BOARDED).reduce((acc, t) => acc + t.passengerCount, 0);
        currentOccupancyRef.current = val;
        return val;
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
        let fallbackInterval: any;

        const handleGPSUpdate = (coords: { latitude: number, longitude: number, speed: number | null }) => {
            const { latitude, longitude, speed } = coords;
            const currSpeed = speed ? speed * 3.6 : (tripConfigRef.current.isActive ? 25 : 0);
            setCurrentGPS({ lat: latitude, lng: longitude, speed: currSpeed });
            broadcastBusLocation({
                driverId: userRef.current.id,
                isOnline: true,
                activePath: tripConfigRef.current.path,
                currentStopIndex: currentStopIndexRef.current,
                status: 'EN_ROUTE',
                location: { lat: latitude, lng: longitude, timestamp: Date.now() },
                capacity: userRef.current.vehicleCapacity || 40,
                occupancy: currentOccupancyRef.current,
                isATM: isMobileATMRef.current
            });
            if (tripConfigRef.current.pathDetails.length > 0) {
                const dev = checkForRouteDeviations({ lat: latitude, lng: longitude }, tripConfigRef.current.pathDetails);
                if (dev) {
                    if (!deviationRef.current) { announce("Warning. You are off route."); }
                    setDeviation(dev);
                } else {
                    setDeviation(null);
                }
            }

            // Smart Profit Analysis
            const demand = getPathDemand(tripConfigRef.current.path);
            setPathDemand(demand);

            const competitors = getAheadVehicles(tripConfigRef.current.path, currentStopIndexRef.current, userRef.current.id);
            setAheadCompetitors(competitors);

            // Profitability Logic
            const upcomingStops = tripConfigRef.current.path.slice(currentStopIndexRef.current + 1);
            const totalUpcomingDemand = upcomingStops.reduce((acc, stop) => acc + (demand[stop] || 0), 0);
            const competitorCapacity = competitors.reduce((acc, c) => acc + ((c.capacity || 40) - (c.occupancy || 0)), 0);

            if (totalUpcomingDemand > 0 && competitorCapacity >= totalUpcomingDemand) {
                if (!profitWarningRef.current) {
                    setProfitWarning(`Market Saturated: ${competitors.length} vehicles ahead have enough capacity for all waiting passengers. Highly recommend switching to Cargo or picking up GramMandi logistics.`);
                    announce("Warning. Demand ahead is low. Consider cargo pickup.");
                }
            } else {
                setProfitWarning(null);
            }

            // Suggest Logistics (Intersects with Path)
            const nearbyLogistics = parcelsRef.current.find(p =>
                p.status === 'PENDING' &&
                upcomingStops.includes(p.from) &&
                (p.weightKg || 1) <= ((userRef.current.vehicleCapacity || 100) - currentOccupancyRef.current) // Simple capacity check
            );
            if (nearbyLogistics) {
                setLogisticsAdvice(nearbyLogistics);
            } else {
                setLogisticsAdvice(null);
            }
        };

        const startFallbackSimulation = () => {
            if (fallbackInterval) clearInterval(fallbackInterval);
            let currentIdx = 0;
            fallbackInterval = setInterval(() => {
                const pathDetails = tripConfigRef.current.pathDetails;
                if (pathDetails && pathDetails.length > 0) {
                    const stop = pathDetails[currentIdx];
                    if (stop && typeof stop !== 'string' && stop.lat && stop.lng) {
                        handleGPSUpdate({
                            latitude: stop.lat,
                            longitude: stop.lng,
                            speed: 8.3 // ~30 km/h
                        });
                    }
                    currentIdx = (currentIdx + 1) % pathDetails.length;
                } else {
                    const latOffset = Math.sin(Date.now() / 10000) * 0.01;
                    const lngOffset = Math.cos(Date.now() / 10000) * 0.01;
                    handleGPSUpdate({
                        latitude: 26.45 + latOffset,
                        longitude: 80.35 + lngOffset,
                        speed: 8.3
                    });
                }
            }, 4000);
        };

        if (isOnline && tripConfig.isActive) {
            initFatigueMonitoring();
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        handleGPSUpdate(pos.coords);
                    },
                    (err) => {
                        console.warn("GPS Error, starting fallback simulation...", err);
                        startFallbackSimulation();
                    },
                    { enableHighAccuracy: true, distanceFilter: 10 } as any
                );
            } else {
                startFallbackSimulation();
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
            if (fallbackInterval) clearInterval(fallbackInterval);
            stopFatigueMonitoring();
        };
    }, [isOnline, tripConfig.isActive]);

    useEffect(() => {
        if (!tripConfig.isActive || !tripConfig.path?.length) {
            setServerStopDemand({});
            return;
        }
        const q = tripConfig.path.join(',');
        let cancelled = false;
        const load = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch(`${API_BASE_URL}/api/v1/transport/stop-demand?stops=${encodeURIComponent(q)}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (!res.ok) return;
                const json = await res.json();
                const demand = json.data?.demand ?? json.demand;
                if (demand && !cancelled) setServerStopDemand(demand);
            } catch { /* ignore */ }
        };
        load();
        const id = setInterval(load, 20000);
        return () => { cancelled = true; clearInterval(id); };
    }, [tripConfig.isActive, tripConfig.path.join('|')]);

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
        }, 15000);

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
        }, 15000);
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
            start = resolveLocationCoords({ name: route.from, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' });
            end = resolveLocationCoords({ name: route.to, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' });
        } else {
            if (!start || !end) return alert("Select Start and End points");
            start = resolveLocationCoords(start);
            end = resolveLocationCoords(end);
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

    const handleEndTripAndShowRecommendations = async () => {
        announce("Destination reached. Fetching hot return routes.");
        let destLat = 26.45;
        let destLng = 80.35;
        if (tripConfig.pathDetails && tripConfig.pathDetails.length > 0) {
            const lastStop = tripConfig.pathDetails[tripConfig.pathDetails.length - 1];
            if (lastStop && typeof lastStop !== 'string' && lastStop.lat && lastStop.lng) {
                destLat = lastStop.lat;
                destLng = lastStop.lng;
            }
        } else if (currentGPS) {
            destLat = currentGPS.lat;
            destLng = currentGPS.lng;
        }

        setTripConfig({ isActive: false, startLocation: null, endLocation: null, path: [], pathDetails: [], totalDistance: 0 });
        setIsSafetyMonitorActive(false);
        
        setSmartLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/driver/go-online`, {
                method: 'POST', headers: apiHeaders,
                body: JSON.stringify({ 
                    lat: destLat, 
                    lng: destLng, 
                    locationName: tripConfig.path[tripConfig.path.length - 1] || 'Destination Stop',
                    vehicleType: user.vehicleType || 'BUS', 
                    seatsTotal: user.vehicleCapacity || 20 
                })
            });
            const data = await res.json();
            if (data.suggestedRoutes && data.suggestedRoutes.length > 0) {
                setSmartRoutes(data.suggestedRoutes);
                setShowNextRouteAdvisor(true);
                announce(`${data.suggestedRoutes.length} profitable return routes found.`);
            } else {
                announce("No return routes available right now.");
                setIsOnline(false);
                disconnectDriver(user.id);
            }
        } catch (e) {
            console.error('End trip recommendations error:', e);
            setIsOnline(false);
            disconnectDriver(user.id);
        }
        setSmartLoading(false);
    };

    const loadParcels = async () => { const p = await getAllParcels(); setParcels(p); };

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

    // Helper: Haversine distance formula in KM
    const getHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (val: number) => val * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // --- DYNAMIC 20% DISTANCE AUTO-TRANSIT & 3-STAGE TRANSIT ENGINE ---
    useEffect(() => {
        if (!tripConfig.isActive || !currentGPS || !autoTransitEnabled) return;

        const pathDetails = tripConfig.pathDetails || [];
        const pathStops = tripConfig.path || [];
        const currentIdx = currentStopIndex;
        const nextIdx = currentIdx + 1;

        if (nextIdx >= pathStops.length) return; // Reached end of route

        const currentStopObj = pathDetails[currentIdx];
        const nextStopObj = pathDetails[nextIdx];

        // 1. Calculate inter-stop segment distance
        let segmentDistKm = 2.0; // Default 2.0 km fallback
        let hasCoords = false;

        if (currentStopObj && nextStopObj && 
            typeof currentStopObj !== 'string' && typeof nextStopObj !== 'string' &&
            currentStopObj.lat && currentStopObj.lng && nextStopObj.lat && nextStopObj.lng) {
            segmentDistKm = getHaversineDistanceKm(currentStopObj.lat, currentStopObj.lng, nextStopObj.lat, nextStopObj.lng);
            hasCoords = true;
        }

        // DYNAMIC THRESHOLD RULE: 20% of inter-stop distance (clamped between 150m and 2.0km)
        const arrivalThresholdKm = Math.min(Math.max(0.15, segmentDistKm * 0.20), 2.0);
        setSegmentInfo({ distanceKm: segmentDistKm, arrivalThresholdKm });

        // 2. Measure distance from vehicle to Next Stop and Current Stop
        let distToNextStopKm = 1.5;
        let distFromCurrentStopKm = 0.2;

        if (hasCoords && nextStopObj && typeof nextStopObj !== 'string') {
            distToNextStopKm = getHaversineDistanceKm(currentGPS.lat, currentGPS.lng, nextStopObj.lat, nextStopObj.lng);
        }

        if (hasCoords && currentStopObj && typeof currentStopObj !== 'string') {
            distFromCurrentStopKm = getHaversineDistanceKm(currentGPS.lat, currentGPS.lng, currentStopObj.lat, currentStopObj.lng);
        }

        const now = Date.now();

        // Stage 1: DEPARTED - Vehicle moves > 50 meters away from Current Stop
        if (distFromCurrentStopKm >= 0.05 && transitStatus !== 'DEPARTED' && transitStatus !== 'APPROACHING') {
            setTransitStatus('DEPARTED');
            announce(`Departed from ${pathStops[currentIdx]}. En route to ${pathStops[nextIdx]}.`);
        }

        // Stage 2: APPROACHING - Vehicle is en route towards Next Stop
        if (distToNextStopKm > arrivalThresholdKm && distFromCurrentStopKm > 0.1 && transitStatus !== 'APPROACHING' && transitStatus !== 'ARRIVED') {
            setTransitStatus('APPROACHING');
        }

        // Stage 3: ARRIVED (AUTO-TRANSITION) - Vehicle enters the 20% distance threshold zone of Next Stop!
        if (hasCoords && distToNextStopKm <= arrivalThresholdKm && now - lastTransitTime > 15000) {
            setLastTransitTime(now);
            setTransitStatus('ARRIVED');
            setHoldProgress(100); // Trigger UI success animation

            // Convert Next Stop into Current Stop automatically!
            const newNextIndex = nextIdx;
            setCurrentStopIndex(newNextIndex);

            const arrivedStopName = pathStops[newNextIndex];
            const upcomingStopName = pathStops[newNextIndex + 1] || 'Final Destination';

            announce(`Arrived at ${arrivedStopName}. Next stop is ${upcomingStopName}.`);

            // Send telemetry update to server
            try {
                fetch(`${API_BASE_URL}/api/driver/stop-reached`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokenRef.current}`
                    },
                    body: JSON.stringify({
                        driverId: user.id,
                        stopName: arrivedStopName,
                        stopIndex: newNextIndex,
                        lat: currentGPS.lat,
                        lng: currentGPS.lng,
                        timestamp: now
                    })
                }).catch(e => console.warn('Stop telemetry warning:', e));
            } catch (e) { }

            setTimeout(() => setHoldProgress(0), 3000);
        }
    }, [currentGPS, tripConfig.isActive, currentStopIndex, autoTransitEnabled, tripConfig.pathDetails, tripConfig.path, transitStatus, lastTransitTime]);

    // Clean up acoustic listener on unmount
    useEffect(() => {
        return () => {
            stopUltrasonicListener();
        };
    }, []);

    // Keep 3D Deck focus synchronized with active currentStopIndex
    useEffect(() => {
        setStackFocusIndex(currentStopIndex);
    }, [currentStopIndex]);

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
                    emitUltrasonicVerifyRequest(payload, user.id);

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
        <div className="max-w-5xl mx-auto pb-32 animate-fade-in font-sans relative w-full overflow-x-hidden">

                {/* --- PRIMARY ACTIVE TRIP ("TRIP VL") COMMAND CENTER --- */}
                {tripConfig.isActive ? (
                    <div className="space-y-6 animate-fade-in w-full">
                        {/* Overlays (Fatigue & Pothole) */}
                        {fatigueAlert && (
                            <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center text-white animate-pulse p-6 text-center">
                                <AlertOctagon size={80} className="mb-4 animate-bounce" />
                                <h1 className="text-3xl font-black mb-2 uppercase tracking-widest">Driver Fatigue Detected!</h1>
                                <p className="text-lg font-bold mb-8 opacity-90">Microsleep pattern identified by sensors. Please pull over safely.</p>
                                <button onClick={() => setFatigueAlert(false)} className="bg-white text-red-600 px-8 py-3 rounded-full font-black shadow-xl uppercase tracking-widest text-sm">I am Awake</button>
                            </div>
                        )}
                        {potholeDetected && (
                            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl z-[90] animate-bounce flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                                <Activity size={20} /> Pothole Detected & Logged!
                            </div>
                        )}

                        {/* 🚀 MAIN ACTIVE TRIP HERO CARD */}
                        <div className="whisk-trip-card p-4 sm:p-6 md:p-8 rounded-[28px] sm:rounded-[36px] shadow-2xl relative w-full overflow-hidden">
                            {/* Top Telemetry & Route Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-white/10">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl sm:text-3xl shadow-glow-sm shrink-0">
                                        🚀
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Dynamic 3-Stage Transit Pill */}
                                            {transitStatus === 'ARRIVED' && (
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse">
                                                    🏁 Arrived at {tripConfig.path[currentStopIndex] || 'Stop'}
                                                </span>
                                            )}
                                            {transitStatus === 'DEPARTED' && (
                                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                    🚀 Departed {tripConfig.path[currentStopIndex - 1] || tripConfig.path[0] || 'Origin'}
                                                </span>
                                            )}
                                            {transitStatus === 'APPROACHING' && (
                                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse">
                                                    📍 Approaching {tripConfig.path[currentStopIndex + 1] || 'Next Stop'}
                                                </span>
                                            )}

                                            {/* Auto GPS Transit Toggle */}
                                            <button
                                                onClick={() => setAutoTransitEnabled(!autoTransitEnabled)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                                                    autoTransitEnabled
                                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                                                        : 'bg-slate-800/80 text-slate-400 border-white/10'
                                                }`}
                                            >
                                                <span>🤖 Auto GPS:</span>
                                                <span className={autoTransitEnabled ? 'text-emerald-400 font-black' : 'text-slate-400'}>
                                                    {autoTransitEnabled ? 'ON' : 'OFF'}
                                                </span>
                                            </button>
                                            
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                                 🟢 GPS + GSM Triangulation Active
                                             </span>

                                             <span className="text-xs font-black text-slate-400">VL-{user.id.slice(-3).toUpperCase()}</span>
                                        </div>
                                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                                            {officialRoutes.find(r => r.id === selectedRouteId)?.name || (tripConfig.startLocation && tripConfig.endLocation ? `${tripConfig.startLocation.name} → ${tripConfig.endLocation.name}` : 'Custom Route')}
                                        </h1>
                                        <p className="text-xs font-bold text-amber-200/80 mt-0.5 flex flex-wrap items-center gap-2">
                                            <span>Current Stop ({currentStopIndex + 1}/{tripConfig.path.length}): <span className="text-emerald-400 font-black">{tripConfig.path[currentStopIndex] || 'In Transit'}</span></span>
                                            {segmentInfo?.arrivalThresholdKm && (
                                                <span className="text-[10px] font-bold text-cyan-300/80 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                                    ⚡ 20% Zone: {Math.round(segmentInfo.arrivalThresholdKm * 1000)}m
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Seat Occupancy Gauge */}
                                <div className="flex items-center gap-2 sm:gap-3 self-stretch md:self-auto w-full md:w-auto">
                                    <div className="flex-1 md:flex-none glass-3 bg-white/10 border border-white/20 p-2.5 sm:p-4 rounded-2xl text-center min-w-[90px] sm:min-w-[120px]">
                                        <p className="text-[8px] sm:text-[9px] font-black text-amber-300 uppercase tracking-widest mb-1">Seats Occupied</p>
                                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-widest">
                                            <span className="text-emerald-400">{liveSeats.occupied}</span> / <span className="text-slate-300">{liveSeats.total}</span>
                                        </h2>
                                    </div>
                                    {liveSeats.parcels > 0 && (
                                        <div className="glass-3 bg-yellow-500/10 border border-yellow-500/30 p-2.5 sm:p-4 rounded-2xl text-center min-w-[80px] sm:min-w-[100px]">
                                            <p className="text-[8px] sm:text-[9px] font-black text-yellow-300 uppercase tracking-widest mb-1">Onboard Cargo</p>
                                            <h2 className="text-xl sm:text-2xl font-black text-yellow-400">📦 {liveSeats.parcels}</h2>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Action Command Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
                                <button
                                    onClick={() => { setVerifyId(''); setVerifyResult(null); setShowQRScanner(false); setShowVerifyModal(true); }}
                                    className="py-3 px-2 sm:px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-black rounded-xl sm:rounded-2xl shadow-glow-sm shadow-emerald-500/30 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider transition-all"
                                >
                                    <ScanLine size={16} /> Enter Code / QR
                                </button>
                                <button
                                    onClick={() => {
                                        announce("Cash passenger added");
                                        setLiveSeats(prev => ({ ...prev, occupied: Math.min(prev.total, prev.occupied + 1) }));
                                    }}
                                    className="py-3 px-2 sm:px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl sm:rounded-2xl shadow-glow-sm shadow-amber-500/30 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider transition-all"
                                >
                                    <Plus size={16} strokeWidth={3} /> +1 Cash Fare
                                </button>
                                <button
                                    onClick={() => setShowInceptionGrid(!showInceptionGrid)}
                                    className={`py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider transition-all border ${showInceptionGrid ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                                >
                                    <Navigation size={16} /> {showInceptionGrid ? '3D Grid' : '3D Grid'}
                                </button>
                                <button
                                    onClick={() => setShowGeminiCoPilot(!showGeminiCoPilot)}
                                    className={`py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider transition-all border ${showGeminiCoPilot ? 'bg-purple-500/20 border-purple-400 text-purple-300' : 'bg-purple-600/30 border-purple-500/40 text-purple-200 hover:bg-purple-600/50'}`}
                                >
                                    <Mic size={16} /> Voice Co-Pilot
                                </button>
                            </div>

                            {/* Kinematic Lock Notification */}
                            {provisionalTickets.length > 0 && (
                                <div className="mb-6 bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 animate-fade-in shadow-glow-sm">
                                    <p className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <span className="animate-spin text-base">⚙️</span> Automatic Kinematic Lock Pending ({provisionalTickets.length})
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {provisionalTickets.map(pt => (
                                            <div key={pt.id} className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Ultrasonic Auto-Matched</span>
                                                    <span className="text-sm font-black text-white">{pt.id}</span>
                                                </div>
                                                <span className="text-xs font-bold text-amber-300 animate-pulse">Syncing Speed...</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Live Route Stepper Timeline & 3D Spatial Cockpit Deck */}
                            <div className="mb-8">
                                {/* Timeline Header & Mode Switcher Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="text-amber-400" size={20} />
                                        <h3 className="text-base font-black text-white uppercase tracking-wider">Stops Timeline</h3>
                                        <span className="text-xs font-bold text-slate-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                                            {tripConfig.path.length} Stops
                                        </span>
                                    </div>

                                    {/* View Mode Switcher Button */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setStopViewMode(stopViewMode === 'STACK' ? 'LIST' : 'STACK')}
                                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                        >
                                            {stopViewMode === 'STACK' ? (
                                                <><Layers size={14} /> 🃏 3D Spatial Deck</>
                                            ) : (
                                                <><List size={14} /> 📋 Full List View</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Mini Quick-Jump Stepper Bar */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                                    {tripConfig.path.map((sName, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => { setStackFocusIndex(sIdx); announce(`Viewing stop ${sIdx + 1}: ${sName}`); }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-black shrink-0 transition-all border flex items-center gap-1.5 ${
                                                sIdx === stackFocusIndex
                                                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-glow-sm scale-105'
                                                    : sIdx === currentStopIndex
                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                    : sIdx < currentStopIndex
                                                    ? 'bg-slate-900/60 text-slate-400 border-white/5'
                                                    : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <span>{sIdx + 1}. {sName}</span>
                                            {sIdx === currentStopIndex && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                                        </button>
                                    ))}
                                </div>

                                {/* MODE 1: 3D SPATIAL ISOMETRIC DEPTH DECK */}
                                {stopViewMode === 'STACK' && (
                                    <div className="relative">
                                        {/* Swipe Instructions / Deck Navigator Header */}
                                        <div className="flex items-center justify-between mb-3 text-xs font-bold text-amber-200/80 px-1">
                                            <span className="flex items-center gap-1">
                                                <span>👈 Swipe Deck or use Arrows 👉</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setStackFocusIndex(prev => Math.max(0, prev - 1))}
                                                    disabled={stackFocusIndex === 0}
                                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center font-bold text-base transition-all"
                                                >
                                                    ‹
                                                </button>
                                                <span className="text-white font-black text-xs">
                                                    {stackFocusIndex + 1} / {tripConfig.path.length}
                                                </span>
                                                <button
                                                    onClick={() => setStackFocusIndex(prev => Math.min(tripConfig.path.length - 1, prev + 1))}
                                                    disabled={stackFocusIndex === tripConfig.path.length - 1}
                                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center font-bold text-base transition-all"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        </div>

                                        {/* Touch & Pointer Gesture Container */}
                                        <div
                                            onTouchStart={(e) => {
                                                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                                            }}
                                            onTouchEnd={(e) => {
                                                if (!touchStartRef.current) return;
                                                const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                                                const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
                                                touchStartRef.current = null;
                                                if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
                                                    if (dx < -40 || dy < -40) {
                                                        setStackFocusIndex(prev => Math.min(tripConfig.path.length - 1, prev + 1));
                                                    } else if (dx > 40 || dy > 40) {
                                                        setStackFocusIndex(prev => Math.max(0, prev - 1));
                                                    }
                                                }
                                            }}
                                            className="relative min-h-[320px] select-none cursor-grab active:cursor-grabbing"
                                        >
                                            {/* Stacked 3D Cards Representation */}
                                            {tripConfig.path.slice(stackFocusIndex, stackFocusIndex + 3).map((stop, stackOffset) => {
                                                const idx = stackFocusIndex + stackOffset;
                                                const isCurrent = idx === currentStopIndex;
                                                const isNext = idx === currentStopIndex + 1;
                                                const isPassed = idx < currentStopIndex;
                                                const waitingCount = (pathDemand[stop] || 0) + (serverStopDemand[stop] || 0);
                                                const aheadBusesAtStop = aheadCompetitors.filter(c => (c.activePath || [])[c.currentStopIndex || 0] === stop);
                                                const parcelsAtThisStop = parcels.filter(p => (p.status === 'PENDING' || p.status === 'POSTED') && p.from === stop);
                                                const estPerPassenger = 15;
                                                const stopBenefit = waitingCount * estPerPassenger + parcelsAtThisStop.reduce((s, p) => s + (Number(p.price) || 0), 0);

                                                let liveDistanceText = 'Live GPS Syncing...';
                                                const stopDetails = tripConfig.pathDetails ? tripConfig.pathDetails[idx] : null;
                                                if (currentGPS && stopDetails && typeof stopDetails !== 'string' && stopDetails.lat && stopDetails.lng) {
                                                    const dKm = getHaversineDistanceKm(currentGPS.lat, currentGPS.lng, stopDetails.lat, stopDetails.lng);
                                                    const inArrivalZone = isNext && segmentInfo?.arrivalThresholdKm && dKm <= segmentInfo.arrivalThresholdKm;
                                                    if (inArrivalZone) {
                                                        liveDistanceText = `${dKm < 1 ? Math.round(dKm * 1000) + ' m' : dKm.toFixed(1) + ' km'} (Inside 20% Zone 🏁)`;
                                                    } else {
                                                        liveDistanceText = dKm < 1 ? `${Math.round(dKm * 1000)} m away` : `${dKm.toFixed(1)} km away`;
                                                    }
                                                } else {
                                                    const gap = idx - currentStopIndex;
                                                    if (gap === 0) liveDistanceText = 'At Location';
                                                    else if (gap < 0) liveDistanceText = 'Passed Stop';
                                                    else liveDistanceText = `${(gap * 1.8).toFixed(1)} km away`;
                                                }

                                                // 3D Depth Stack Transformations
                                                const scale = stackOffset === 0 ? 1 : stackOffset === 1 ? 0.95 : 0.90;
                                                const translateY = stackOffset === 0 ? 0 : stackOffset === 1 ? 16 : 32;
                                                const opacity = stackOffset === 0 ? 1 : stackOffset === 1 ? 0.7 : 0.4;
                                                const zIndex = 30 - stackOffset;

                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            transform: `scale(${scale}) translateY(${translateY}px)`,
                                                            opacity,
                                                            zIndex,
                                                            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                                                        }}
                                                        className={`p-6 rounded-[28px] border relative overflow-hidden shadow-2xl ${
                                                            stackOffset === 0 ? 'relative' : 'absolute top-0 left-0 right-0 pointer-events-none'
                                                        } ${
                                                            isCurrent 
                                                                ? 'bg-slate-900/95 border-amber-400/80 ring-2 ring-amber-400/40 shadow-amber-500/10' 
                                                                : isPassed 
                                                                ? 'bg-slate-950/60 border-white/5 opacity-60' 
                                                                : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {/* 1st ROW */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                                                    isCurrent ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-glow-sm' :
                                                                    isPassed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                                                    'bg-white/10 text-white border-white/20'
                                                                }`}>
                                                                    {isPassed ? <Check size={18} className="text-emerald-400" /> : idx + 1}
                                                                </div>
                                                                <h4 className="text-xl font-black text-white tracking-tight">{stop}</h4>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {isCurrent && (
                                                                    <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-amber-300 flex items-center gap-1 shadow-sm">
                                                                        📍 Current Stop
                                                                    </span>
                                                                )}
                                                                {isNext && (
                                                                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                        ➡️ Next Stop
                                                                    </span>
                                                                )}
                                                                {isPassed && (
                                                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                        ✓ Passed
                                                                    </span>
                                                                )}
                                                                {!isCurrent && !isNext && !isPassed && (
                                                                    <span className="px-3 py-1 bg-white/5 text-slate-400 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                        ⏱️ Upcoming
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* MIDDLE SECTION */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">
                                                            <div className="md:col-span-2 space-y-2.5">
                                                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl">
                                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                                        <Users size={15} />
                                                                    </div>
                                                                    <span className="text-xs font-black text-emerald-300 tracking-wide">
                                                                        Waiting Passengers: <span className="text-white text-sm font-black ml-1">{waitingCount} Pax</span>
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950/80 border border-yellow-500/30 rounded-2xl">
                                                                    <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                                                                        <Package size={15} />
                                                                    </div>
                                                                    <span className="text-xs font-black text-yellow-300 tracking-wide">
                                                                        Cargo Parcels: <span className="text-white text-sm font-black ml-1">{parcelsAtThisStop.length} Items</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="md:col-span-1 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                    💰 Est. Revenue
                                                                </span>
                                                                <span className="text-2xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                                                                    ₹{Math.round(stopBenefit)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 4th ROW (BOTTOM) */}
                                                        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {isCurrent && (
                                                                    <>
                                                                        <button
                                                                            onClick={handleMarkChowk}
                                                                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                                                                        >
                                                                            Mark Chowk
                                                                        </button>
                                                                        {idx < tripConfig.path.length - 1 ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setCurrentStopIndex(i => i + 1);
                                                                                    announce(`Arrived at next stop: ${tripConfig.path[idx + 1]}`);
                                                                                }}
                                                                                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1 active:scale-95"
                                                                            >
                                                                                Next Stop ➔
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={handleEndTripAndShowRecommendations}
                                                                                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                                                                            >
                                                                                Complete Trip
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {parcelsAtThisStop.length > 0 && !isPassed && (
                                                                    <button
                                                                        onClick={() => setSelectedStopForParcels(stop)}
                                                                        className="px-3.5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                                                    >
                                                                        View Cargo ({parcelsAtThisStop.length})
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/90 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-black shadow-inner">
                                                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                                                <MapPin size={14} className="text-cyan-400" />
                                                                <span>Distance: <span className="text-white ml-0.5">{liveDistanceText}</span></span>
                                                            </div>
                                                        </div>

                                                        {!isPassed && aheadBusesAtStop.length > 0 && (
                                                            <div className="mt-3 pt-2 border-t border-rose-500/30 flex items-center gap-2 text-xs font-black text-rose-400">
                                                                <AlertTriangleIcon size={14} />
                                                                <span>Bus {aheadBusesAtStop[0].driverId.slice(-3).toUpperCase()} is currently at this stop!</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* MODE 2: FULL LIST VIEW */}
                                {stopViewMode === 'LIST' && (
                                    <div className="space-y-4">
                                        {tripConfig.path.map((stop, idx) => {
                                            const isCurrent = idx === currentStopIndex;
                                            const isNext = idx === currentStopIndex + 1;
                                            const isPassed = idx < currentStopIndex;
                                            const waitingCount = (pathDemand[stop] || 0) + (serverStopDemand[stop] || 0);
                                            const aheadBusesAtStop = aheadCompetitors.filter(c => (c.activePath || [])[c.currentStopIndex || 0] === stop);
                                            const parcelsAtThisStop = parcels.filter(p => (p.status === 'PENDING' || p.status === 'POSTED') && p.from === stop);
                                            const estPerPassenger = 15;
                                            const stopBenefit = waitingCount * estPerPassenger + parcelsAtThisStop.reduce((s, p) => s + (Number(p.price) || 0), 0);

                                            let liveDistanceText = 'Live GPS Syncing...';
                                            const stopDetails = tripConfig.pathDetails ? tripConfig.pathDetails[idx] : null;
                                            if (currentGPS && stopDetails && typeof stopDetails !== 'string' && stopDetails.lat && stopDetails.lng) {
                                                const dKm = getHaversineDistanceKm(currentGPS.lat, currentGPS.lng, stopDetails.lat, stopDetails.lng);
                                                const inArrivalZone = isNext && segmentInfo?.arrivalThresholdKm && dKm <= segmentInfo.arrivalThresholdKm;
                                                if (inArrivalZone) {
                                                    liveDistanceText = `${dKm < 1 ? Math.round(dKm * 1000) + ' m' : dKm.toFixed(1) + ' km'} (Inside 20% Zone 🏁)`;
                                                } else {
                                                    liveDistanceText = dKm < 1 ? `${Math.round(dKm * 1000)} m away` : `${dKm.toFixed(1)} km away`;
                                                }
                                            } else {
                                                const gap = idx - currentStopIndex;
                                                if (gap === 0) liveDistanceText = 'At Location';
                                                else if (gap < 0) liveDistanceText = 'Passed Stop';
                                                else liveDistanceText = `${(gap * 1.8).toFixed(1)} km away`;
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-6 rounded-[28px] border transition-all relative overflow-hidden shadow-xl ${
                                                        isCurrent 
                                                            ? 'bg-slate-900/95 border-amber-400/80 ring-2 ring-amber-400/40 shadow-amber-500/10' 
                                                            : isPassed 
                                                            ? 'bg-slate-950/60 border-white/5 opacity-60' 
                                                            : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                                                isCurrent ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-glow-sm' :
                                                                isPassed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                                                'bg-white/10 text-white border-white/20'
                                                            }`}>
                                                                {isPassed ? <Check size={18} className="text-emerald-400" /> : idx + 1}
                                                            </div>
                                                            <h4 className="text-xl font-black text-white tracking-tight">{stop}</h4>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isCurrent && (
                                                                <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-amber-300 flex items-center gap-1 shadow-sm">
                                                                    📍 Current Stop
                                                                </span>
                                                            )}
                                                            {isNext && (
                                                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                    ➡️ Next Stop
                                                                </span>
                                                            )}
                                                            {isPassed && (
                                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                    ✓ Passed
                                                                </span>
                                                            )}
                                                            {!isCurrent && !isNext && !isPassed && (
                                                                <span className="px-3 py-1 bg-white/5 text-slate-400 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                    ⏱️ Upcoming
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">
                                                        <div className="md:col-span-2 space-y-2.5">
                                                            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl">
                                                                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                                    <Users size={15} />
                                                                </div>
                                                                <span className="text-xs font-black text-emerald-300 tracking-wide">
                                                                    Waiting Passengers: <span className="text-white text-sm font-black ml-1">{waitingCount} Pax</span>
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950/80 border border-yellow-500/30 rounded-2xl">
                                                                <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                                                                    <Package size={15} />
                                                                </div>
                                                                <span className="text-xs font-black text-yellow-300 tracking-wide">
                                                                    Cargo Parcels: <span className="text-white text-sm font-black ml-1">{parcelsAtThisStop.length} Items</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="md:col-span-1 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                💰 Est. Revenue
                                                            </span>
                                                            <span className="text-2xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                                                                ₹{Math.round(stopBenefit)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {isCurrent && (
                                                                <>
                                                                    <button
                                                                        onClick={handleMarkChowk}
                                                                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                                                                    >
                                                                        Mark Chowk
                                                                    </button>
                                                                    {idx < tripConfig.path.length - 1 ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                setCurrentStopIndex(i => i + 1);
                                                                                announce(`Arrived at next stop: ${tripConfig.path[idx + 1]}`);
                                                                            }}
                                                                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1 active:scale-95"
                                                                        >
                                                                            Next Stop ➔
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={handleEndTripAndShowRecommendations}
                                                                            className="px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                                                                        >
                                                                            Complete Trip
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {parcelsAtThisStop.length > 0 && !isPassed && (
                                                                <button
                                                                    onClick={() => setSelectedStopForParcels(stop)}
                                                                    className="px-3.5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                                                >
                                                                    View Cargo ({parcelsAtThisStop.length})
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/90 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-black shadow-inner">
                                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                                            <MapPin size={14} className="text-cyan-400" />
                                                            <span>Distance: <span className="text-white ml-0.5">{liveDistanceText}</span></span>
                                                        </div>
                                                    </div>

                                                    {!isPassed && aheadBusesAtStop.length > 0 && (
                                                        <div className="mt-3 pt-2 border-t border-rose-500/30 flex items-center gap-2 text-xs font-black text-rose-400">
                                                            <AlertTriangleIcon size={14} />
                                                            <span>Bus {aheadBusesAtStop[0].driverId.slice(-3).toUpperCase()} is currently at this stop!</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Acoustic Auto Verification Banner */}
                            {isOnline && routeMode === 'OFFICIAL' && (
                                <div className="bg-purple-900/40 border border-purple-500/30 rounded-2xl p-4 flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${isAcousticListenerActive ? 'bg-purple-500 text-white animate-pulse' : 'bg-white/10 text-slate-400'}`}>
                                            <Mic size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                                                AI Acoustic Ticket Verification
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isAcousticListenerActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {isAcousticListenerActive ? 'Active' : 'Off'}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-purple-200/70 mt-0.5">
                                                {isAcousticListenerActive ? "Listening for passenger ultrasonic sound code..." : "Automatically validates tickets via inaudible sound waves."}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleAcousticListener()}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isAcousticListenerActive ? 'bg-purple-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    >
                                        {isAcousticListenerActive ? 'Disable' : 'Enable'}
                                    </button>
                                </div>
                            )}

                            {/* Bottom Telemetry & Emergency Shift End */}
                            <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-6 text-xs font-bold text-slate-300">
                                    <span className="flex items-center gap-1.5"><Volume2 size={14} className="text-emerald-400 animate-pulse" /> Ultrasonic Sync Active</span>
                                    <span className="flex items-center gap-1.5"><Wifi size={14} className="text-cyan-400" /> NavIC GPS Live</span>
                                </div>
                                <button
                                    onClick={handleEndTrip}
                                    className="w-full md:w-auto px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
                                >
                                    Emergency Shift End
                                </button>
                            </div>
                        </div>

                        {/* Secondary Command Tabs (Ahead, Earnings, Deliveries, 3D Radar) */}
                        <div className="whisk-trip-card rounded-[32px] overflow-hidden">
                            <div className="flex border-b border-white/10 bg-white/5">
                                {(['ROUTE', 'EARNINGS', 'DELIVERIES', 'HUD'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); if (tab === 'EARNINGS') loadEarnings(); if (tab === 'DELIVERIES') loadDeliveries(); }}
                                        className={`flex-1 py-4 text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'text-amber-300 border-b-2 border-amber-300 bg-white/10' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {tab === 'ROUTE' ? '🚌 Vehicles Ahead' : tab === 'EARNINGS' ? '💰 Earnings' : tab === 'DELIVERIES' ? '📦 Cargo' : '🖥️ 3D Radar'}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">
                                {activeTab === 'ROUTE' && (
                                    <div className="space-y-4">
                                        {showInceptionGrid && (
                                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                                <InceptionGrid3D
                                                    stops={tripConfig.path.map((name, idx) => ({
                                                        name,
                                                        waitingPassengers: (routeDemand.find((d: any) => d.stopName === name) as any)?.waitingPassengers || 0,
                                                        parcels: (routeDemand.find((d: any) => d.stopName === name) as any)?.pendingParcels || 0,
                                                        isCurrentStop: idx === currentStopIndex
                                                    }))}
                                                    currentStopIndex={currentStopIndex}
                                                    currentSpeed={currentGPS?.speed || 0}
                                                    aheadVehicles={(aheadVehicles || []).map((v: any, i: number) => ({
                                                        id: v.driverId || `v-${i}`,
                                                        name: v.driverName || `Bus ${(v.driverId || '').slice(-3)}`,
                                                        distance: v.distanceAhead || (i + 1) * 2,
                                                        speed: v.speed || 30,
                                                        capacity: v.seatsTotal || 20,
                                                        occupancy: v.seatsOccupied || 0
                                                    }))}
                                                    tripDistance={tripConfig.totalDistance}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Ahead Vehicles on Route</h4>
                                            {(aheadVehicles || []).length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">No ahead vehicles reported</p>
                                            ) : aheadVehicles.map((v: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">🚌</div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">{v.driverName || `Bus ${(v.driverId || '').slice(-3).toUpperCase()}`}</p>
                                                            <p className="text-xs text-slate-400">{v.distanceAhead ? `${v.distanceAhead.toFixed(1)} km ahead` : 'Ahead on route'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-emerald-400">{v.seatsAvailable || '?'} seats open</p>
                                                        <p className="text-xs text-slate-400">{v.seatsOccupied || 0} / {v.seatsTotal || 20} occupied</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'EARNINGS' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-xs font-black text-slate-400 uppercase mb-1">Today</p>
                                                <p className="text-2xl font-black text-emerald-400">₹{earnings?.today?.totalEarnings || 0}</p>
                                                <p className="text-xs text-slate-400 mt-1">{earnings?.today?.trips || 0} trips</p>
                                            </div>
                                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-xs font-black text-slate-400 uppercase mb-1">This Week</p>
                                                <p className="text-2xl font-black text-amber-300">₹{earnings?.week?.totalEarnings || 0}</p>
                                            </div>
                                            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-xs font-black text-slate-400 uppercase mb-1">This Month</p>
                                                <p className="text-2xl font-black text-white">₹{earnings?.month?.totalEarnings || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'DELIVERIES' && (
                                    <div className="space-y-3">
                                        {(deliveries || []).length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-4">No active cargo deliveries</p>
                                        ) : deliveries.map((d: any, i: number) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-black text-white">📦 {d.itemType || d.cropName || 'Parcel'}</p>
                                                    <p className="text-xs text-slate-400">{d.pickupLocation} → {d.deliveryLocation}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-black uppercase">
                                                    {d.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'HUD' && (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                                            <ProximityRadar3D
                                                realTimeVehicles={aheadCompetitors}
                                                userLocation={currentGPS || { lat: 25.612, lng: 85.131 }}
                                            />
                                        </div>
                                        <SmartDriverDashboard vehicleId={`BUS_${user.id.slice(-2).toUpperCase()}`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* NON-ACTIVE TRIP VIEW ("BEGIN SHIFT") WITH HIGH CONTRAST BENTO CARDS */
                    <div className="flex-1 space-y-6 flex flex-col justify-center min-h-[calc(100vh-180px)] py-8 max-w-2xl mx-auto w-full">
                        {/* Overlays (Fatigue & Pothole) */}
                        {fatigueAlert && (
                            <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center text-white animate-pulse p-6 text-center">
                                <AlertOctagon size={80} className="mb-4 animate-bounce" />
                                <h1 className="text-3xl font-black mb-2 uppercase tracking-widest">Driver Fatigue Detected!</h1>
                                <p className="text-lg font-bold mb-8 opacity-90">Microsleep pattern identified by sensors. Please pull over safely.</p>
                                <button onClick={() => setFatigueAlert(false)} className="bg-white text-red-600 px-8 py-3 rounded-full font-black shadow-xl uppercase tracking-widest text-sm">I am Awake</button>
                            </div>
                        )}
                        {potholeDetected && (
                            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl z-[90] animate-bounce flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                                <Activity size={20} /> Pothole Detected & Logged!
                            </div>
                        )}

                        {/* Hero Stats Summary */}
                        {heroStats && (
                            <div className="whisk-trip-card p-6 rounded-[32px] animate-fade-in mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-amber-400 rotate-180" />
                                        Hero Performance
                                    </h3>
                                    <div className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-black uppercase border border-amber-500/30">
                                        Grade: {heroStats.heroLevel > 5 ? 'A+' : 'B'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center group cursor-pointer transition-transform hover:scale-105">
                                        <span className="block text-2xl font-black text-white">{heroStats.totalTrips}</span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">Trips Completed</span>
                                    </div>
                                    <div className="text-center group cursor-pointer transition-transform hover:scale-105">
                                        <span className="block text-2xl font-black text-amber-300">{heroStats.heroPoints}</span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">Hero Points</span>
                                    </div>
                                    <div className="text-center group cursor-pointer transition-transform hover:scale-105">
                                        <span className="block text-2xl font-black text-emerald-400 tabular-nums">₹{heroStats.totalEarnings}</span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">Total Revenue</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live Demand Heatmap */}
                        {demandHeatmap.length > 0 && (
                            <div className="whisk-trip-card p-6 rounded-[32px] animate-fade-in mb-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    Live Demand Heatmap Grid
                                </h3>
                                <div className="relative h-44 bg-slate-950/80 rounded-2xl border border-white/10 overflow-hidden">
                                    {(demandHeatmap || []).slice(0, 3).map((point, i) => (
                                        <div key={i} title={`${point.location}: ${point.intensity}/10 demand`}>
                                            <HeatPulse top={20 + i * 25} left={30 + i * 20} opacity={point.intensity / 10} />
                                        </div>
                                    ))}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-xs font-black text-amber-300 uppercase tracking-widest bg-slate-950/90 px-4 py-2 rounded-full border border-amber-400/30 backdrop-blur-sm">
                                            NavIC Grid Overlay Active
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Begin Shift Form */}
                        {viewMode !== 'UTILITIES' && (
                            <div className="whisk-trip-card p-4 sm:p-6 md:p-8 rounded-[28px] sm:rounded-[40px] animate-fade-in-up w-full max-w-full overflow-hidden">
                                <h3 className="text-2xl font-black text-white mb-6 text-center tracking-tight">Begin Driver Shift</h3>

                                <div className="flex bg-white/10 p-1.5 rounded-2xl mb-6 border border-white/10">
                                    <button onClick={() => setRouteMode('OFFICIAL')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${routeMode === 'OFFICIAL' ? 'bg-amber-400 text-slate-950 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Smart AI Route</button>
                                    <button onClick={() => setRouteMode('CUSTOM')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${routeMode === 'CUSTOM' ? 'bg-amber-400 text-slate-950 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Custom Path</button>
                                </div>

                                {routeMode === 'OFFICIAL' ? (
                                    <div className="mb-6">
                                        {!isOnline && (
                                            <button
                                                onClick={handleSmartGoOnline}
                                                disabled={smartLoading}
                                                className="w-full mb-6 py-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-glow-md transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {smartLoading ? (
                                                    <><span className="animate-spin text-xl">⌛</span> Analyzing Live Demand...</>
                                                ) : (
                                                    <>🟢 Go Online — Get AI Routes</>
                                                )}
                                            </button>
                                        )}

                                        {(smartRoutes || []).length > 0 && (
                                            <div className="space-y-3 mb-6">
                                                <p className="text-xs font-black text-amber-300 uppercase tracking-[0.2em] mb-3">🤖 AI Recommended High Revenue Routes</p>
                                                {smartRoutes.map((route: any, idx: number) => (
                                                    <div
                                                        key={route.routeId || idx}
                                                        onClick={() => handleSmartSelectRoute(route.routeId || route.id)}
                                                        className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${selectedRouteId === (route.routeId || route.id) ? 'bg-amber-500/20 border-amber-400 shadow-glow-sm' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h4 className="font-black text-white text-base">{route.name || route.routeName}</h4>
                                                                <p className="text-xs text-slate-300 font-bold">{route.from} → {route.to}</p>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${route.tag === 'HOT🔥' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : route.tag === 'GOOD👍' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-500/20 text-slate-300'}`}>{route.tag || 'NORMAL'}</span>
                                                        </div>
                                                        <div className="flex gap-4 mt-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <Users size={14} className="text-cyan-400" />
                                                                <span className="text-xs font-black text-slate-300">{route.demand?.passengers || 0} waiting</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Package size={14} className="text-yellow-400" />
                                                                <span className="text-xs font-black text-slate-300">{route.demand?.parcels || 0} parcels</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Car size={14} className="text-slate-400" />
                                                                <span className="text-xs font-black text-slate-300">{route.competition || 0} buses</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {isOnline && (smartRoutes || []).length === 0 && (
                                            <div>
                                                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 block">Select Assigned Hub Route</label>
                                                <div className="relative">
                                                    <select value={selectedRouteId} onChange={(e) => { setSelectedRouteId(e.target.value); handleSmartSelectRoute(e.target.value); }} className="w-full p-5 bg-slate-900 border border-white/20 rounded-2xl outline-none text-white font-black text-base" aria-label="Select Route">
                                                        <option value="" className="bg-slate-950 text-white">-- Select Hub Route --</option>
                                                        {officialRoutes.map(route => (<option key={route.id} value={route.id} className="bg-slate-950 text-white">{route.name} ({route.from} - {route.to})</option>))}
                                                    </select>
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400">▼</div>
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
                                <button onClick={handleStartTrip} className="w-full h-16 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base uppercase tracking-[0.2em] rounded-[24px] shadow-glow-md transition-all flex items-center justify-center gap-2">
                                    🚀 Initialize NavIC Active Trip
                                </button>
                            </div>
                        )}

                        {/* Utilities Grid */}
                        {viewMode === 'UTILITIES' && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                <div onClick={() => setIsMobileATM(!isMobileATM)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isMobileATM ? 'bg-emerald-500/20 border-emerald-400 shadow-glow-sm' : 'whisk-trip-card text-white'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isMobileATM ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white'}`}><Coins size={24} /></div>
                                    <h4 className="font-black tracking-widest text-base uppercase">Mobile ATM</h4>
                                    <p className="text-xs font-bold text-slate-300 mt-1">{isMobileATM ? 'Broadcast Active' : 'Enable Cash-Out'}</p>
                                </div>
                                <div onClick={() => setIsDataMuleActive(!isDataMuleActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isDataMuleActive ? 'bg-blue-500/20 border-blue-400 shadow-glow-sm' : 'whisk-trip-card text-white'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDataMuleActive ? 'bg-blue-400 text-slate-950' : 'bg-white/10 text-white'}`}><Wifi size={24} /></div>
                                    <h4 className="font-black tracking-widest text-base uppercase">Data Mule</h4>
                                    <p className="text-xs font-bold text-slate-300 mt-1">{isDataMuleActive ? 'Hosting Content' : 'Sync Content'}</p>
                                </div>
                                <div onClick={() => setIsRoadAIActive(!isRoadAIActive)} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isRoadAIActive ? 'bg-amber-500/20 border-amber-400 shadow-glow-sm' : 'whisk-trip-card text-white'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isRoadAIActive ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-white/10 text-white'}`}><Activity size={24} /></div>
                                    <h4 className="font-black tracking-widest text-base uppercase">Road AI</h4>
                                    <p className="text-xs font-bold text-slate-300 mt-1">{isRoadAIActive ? 'Sensor Active' : 'Detect Potholes'}</p>
                                </div>
                                <div onClick={handleAudioCount} className="p-6 rounded-3xl whisk-trip-card cursor-pointer hover:border-amber-400 transition-all">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-300 mb-4">
                                        {isCountingAudio ? <span className="animate-spin text-2xl">⌛</span> : <Mic size={24} />}
                                    </div>
                                    <h4 className="font-black text-white text-base uppercase tracking-widest">Count Crowd</h4>
                                    <p className="text-xs font-bold text-slate-300 mt-1">Audio AI Analysis</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                    {/* --- Parcel Bid Popup Modal --- */}
                    {selectedStopForParcels && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                            <div className="glass-3 border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-5 relative">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-black text-white">📦 Parcels at {selectedStopForParcels}</h3>
                                    <button onClick={() => setSelectedStopForParcels(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                                </div>
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                                    {parcels
                                        .filter(p => p.from?.toLowerCase() === selectedStopForParcels.toLowerCase() && (p.status === 'PENDING' || p.status === 'POSTED' || p.status === 'UNASSIGNED') && !p.driverId)
                                        .map((parcel: any, idx: number) => (
                                            <div key={parcel.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-xs font-black text-white">{parcel.itemType || parcel.cropName || 'General Cargo'}</p>
                                                        <p className="text-[9px] text-slate-400">{parcel.from} → {parcel.to}</p>
                                                    </div>
                                                    <span className="text-sm font-black text-emerald-400">₹{parcel.price || parcel.bidAmount || 0}</span>
                                                </div>
                                                <div className="flex gap-3 text-[8px] text-slate-500 mb-3">
                                                    <span>⚖️ {parcel.weightKg || '?'}kg</span>
                                                    {parcel.volumeLiters && (
                                                        <span>📐 {parcel.volumeLiters}L</span>
                                                    )}
                                                    <span>📏 {parcel.distance || '?'}km</span>
                                                </div>
                                                <button
                                                    disabled={isBidding}
                                                    onClick={async () => {
                                                        setIsBidding(true);
                                                        try {
                                                            const res = await fetch(`${API_BASE_URL}/api/parcels/${parcel.id}/bid`, {
                                                                method: 'POST', headers: apiHeaders,
                                                                body: JSON.stringify({ driverId: user.id, bidAmount: parcel.price || 50 })
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                announce("Cargo bid placed and claimed successfully.");
                                                                await loadParcels();
                                                                const remaining = parcels.filter(p => p.from?.toLowerCase() === selectedStopForParcels.toLowerCase() && (p.status === 'PENDING' || p.status === 'POSTED') && !p.driverId).length;
                                                                if (remaining <= 1) {
                                                                    setSelectedStopForParcels(null);
                                                                }
                                                            } else {
                                                                alert("Bid failed: " + data.error);
                                                            }
                                                        } catch (err) {
                                                            console.error("Bid placing error:", err);
                                                        }
                                                        setIsBidding(false);
                                                    }}
                                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[10px] font-black text-white uppercase tracking-widest rounded-2xl transition-all shadow-glow-sm shadow-emerald-500/20 active:scale-95 transform"
                                                >
                                                    {isBidding ? 'Bidding...' : 'Claim & Load'}
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- AI Next-Route Profitability Advisor Modal --- */}
                    {showNextRouteAdvisor && (smartRoutes || []).length > 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
                            <div className="glass-3 border-white/10 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl p-6 relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-2xl shadow-glow-sm animate-float-banana">🤖</div>
                                    <div>
                                        <span className="text-[9px] font-black text-luxe-gold uppercase tracking-[0.3em] block">AI Next-Route Advisor</span>
                                        <h3 className="text-xl font-black text-white leading-tight">Recommended Next Trips</h3>
                                    </div>
                                </div>

                                <p className="text-xs font-bold text-slate-400 mb-4 leading-relaxed">
                                    Based on live supply-chain demand, crop procurement logs, and passenger queues at this hub, here are the most profitable next routes:
                                </p>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6 pr-1">
                                    {smartRoutes.slice(0, 3).map((route, idx) => (
                                        <div 
                                            key={route.routeId || idx}
                                            onClick={async () => {
                                                setShowNextRouteAdvisor(false);
                                                await handleSmartSelectRoute(route.routeId || route.id);
                                            }}
                                            className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/15 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-black text-white text-sm">{route.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold">{route.from} → {route.to}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                    route.tag === 'HOT🔥' ? 'bg-rose-500/20 text-rose-400' :
                                                    route.tag === 'GOOD👍' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>{route.tag}</span>
                                            </div>

                                            {route.reason && (
                                                <p className="text-[11px] font-bold text-emerald-400 mb-3">{route.reason}</p>
                                            )}

                                            <div className="flex gap-4 mt-2 border-t border-white/5 pt-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Users size={12} className="text-luxe-teal" />
                                                    <span className="text-[10px] font-black text-slate-400">{route.demand?.passengers || 0} waiting</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Package size={12} className="text-luxe-gold" />
                                                    <span className="text-[10px] font-black text-slate-400">{route.demand?.parcels || 0} parcels</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Car size={12} className="text-slate-500" />
                                                    <span className="text-[10px] font-black text-slate-400">{route.competition || 0} competitors</span>
                                                </div>
                                            </div>

                                            {route.aiScore && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-luxe-sienna to-luxe-gold rounded-full" style={{ width: `${route.aiScore}%` }}></div>
                                                    </div>
                                                    <span className="text-[9px] font-black text-luxe-gold">{route.aiScore}% score</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setShowNextRouteAdvisor(false)} 
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
                                    >
                                        Close Advisor
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

            {/* --- AR Mandi HUD Overlay --- */}
            {showARMandiHUD && (
                <ARMandiHUD
                    mandiName={tripConfig.path[tripConfig.path.length - 1] || 'GramMandi Hub'}
                    location={currentGPS ? { lat: currentGPS.lat, lng: currentGPS.lng } : undefined}
                    onClose={() => setShowARMandiHUD(false)}
                />
            )}

            {/* --- Gemini Cognitive Co-Pilot --- */}
            {tripConfig.isActive && (
                <GeminiCoPilot
                    isActive={showGeminiCoPilot}
                    onToggle={() => setShowGeminiCoPilot(!showGeminiCoPilot)}
                    currentSpeed={currentGPS?.speed}
                    currentStop={tripConfig.path[currentStopIndex]}
                    nextStop={tripConfig.path[currentStopIndex + 1]}
                    aheadVehicles={(aheadVehicles || []).map((v: any) => ({
                        name: v.driverName,
                        distance: v.distanceAhead,
                        capacity: v.seatsTotal,
                        occupancy: v.seatsOccupied
                    }))}
                    parcels={(parcels || []).filter(p => p.status === 'PENDING').map(p => ({
                        from: p.from,
                        to: p.to,
                        itemType: (p as any).itemType,
                        price: (p as any).price
                    }))}
                    routePath={tripConfig.path}
                    earnings={earnings}
                    lang={lang}
                />
            )}

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
