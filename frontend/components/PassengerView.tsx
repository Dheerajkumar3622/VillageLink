
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, PaymentMethod, User, LocationData, Pass, SeatConfig, ChurnRiskAnalysis, RentalVehicle, RentalBooking, ParcelBooking, Wallet as WalletType, GeoLocation, CrowdForecast, DynamicFareResult, MandiRate, JobOpportunity, MarketItem, PilgrimagePackage, NewsItem, Shop, Product, LostItem, LeafDiagnosisResult, BusState } from '@villagelink/shared';
import { RENTAL_FLEET, TRANSLATIONS } from '@villagelink/shared';
import { generateTicketId, generatePassId, generateRentalId, generateParcelId, saveTicket, savePass, getStoredTickets, getMyPasses, bookRental, bookParcel, getAllParcels, getActiveBuses, cancelTicket } from '../services/transportService';
import { calculateDynamicFare, getCrowdForecast, formatCurrency, analyzeChurnRisk, calculateLogisticsCost, getMandiRates, getJobs, getMarketItems, getPackages, diagnoseLeaf, estimateParcelSize, findPoolMatches } from '../services/mlService';
import { getWallet, mintPassNFT, createEscrow, earnGramCoin, spendGramCoin } from '../services/blockchainService';
import { signTransaction, updateLastLocation } from '../services/securityService';
import { fetchSmartRoute } from '../services/graphService';
import { isOnline, queueAction } from '../services/offlineService';
import { broadcastUltrasonicTicket } from '../services/UltrasonicVerificationService';
import { Button } from './Button';
import { LiveTracker } from './LiveTracker';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { ARFinder } from './ARFinder';
import { UserProfile } from './UserProfile';
import { MarketingView } from './MarketingView';
import { FoodLinkHome } from './FoodLinkHome';
import { VectorRouteMap as RouteMap } from './VectorRouteMap';
import { PaymentHistory } from './PaymentHistory';
import { VendorMapView } from './VendorMapView';
import { VendorAdmin } from './VendorAdmin';
import { Ticket as TicketIcon, Check, Bus, Route, User as UserIcon, Car, Package, Gem, WifiOff, ArrowLeft, Store, Camera, AlertOctagon, Coins, Volume2, VolumeX, Users, Gift, QrCode, CreditCard, Banknote, Replace, Mic, Utensils, MapPin, Bike, Zap, Play } from 'lucide-react';
import { SuccessAnimation } from './SuccessAnimation';
import { FloatingVehicle } from './FloatingVehicle';
import { FlashPass } from './FlashPass';
import { JourneyCinematic } from './JourneyCinematic';
import { TourismCarousel } from './Tourism/TourismCarousel';
import { TourismDetailView } from './Tourism/TourismDetailView';
import { TourismSpot, TourismPackage } from '../utils/tourism/tourismData';
import { TransitHubWidget } from './TransitHubWidget';
import { TourismTracker } from './TourismTracker';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';

// Animated Wave Component for Ultrasonic Status
const AnimatedWave = ({ isBroadcasting, isError = false }: { isBroadcasting: boolean, isError?: boolean }) => {
    if (isError) {
        return (
            <div className="flex items-center gap-1 h-3 mt-1" title="Ultrasonic Broadcast Failed/Disabled">
                <div className="w-16 h-0.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
            </div>
        );
    }

    if (!isBroadcasting) {
        return (
            <div className="flex items-center gap-1 h-3 mt-1" title="Ultrasonic Broadcast Standby">
                <div className="w-16 h-0.5 bg-emerald-500/30 rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex items-end gap-0.5 h-3 mt-1" title="Broadcasting Ultrasonic Ticket">
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="w-[3px] bg-emerald-400 rounded-t-sm shadow-[0_0_5px_rgba(52,211,153,0.8)]"
                    style={{
                        animation: `waveform 1s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                        height: '20%' // Base height, CSS animation will take over
                    }}
                ></div>
            ))}
            {/* Embedded CSS just for the waveform if not in index.css */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes waveform {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
            `}} />
        </div>
    );
};

interface PassengerViewProps {
    user: User;
    lang: 'EN' | 'HI';
    isScrolled?: boolean;
    onLogout?: () => void;
    activeTourismTracker?: Ticket | null;
    setActiveTourismTracker?: (ticket: Ticket | null) => void;
}

export const PassengerView: React.FC<PassengerViewProps> = ({ user, lang, isScrolled = false, onLogout, activeTourismTracker, setActiveTourismTracker }) => {
    const t = (key: any) => (TRANSLATIONS[lang] as any)[key] || (TRANSLATIONS.EN as any)[key];

    const [appMode, setAppMode] = useState<'TRANSPORT' | 'MARKET' | 'FOOD'>('TRANSPORT');
    const [currentView, setCurrentView] = useState<'DASHBOARD' | 'BOOK_RENTAL' | 'BOOK_PARCEL'>('DASHBOARD');
    const [showFoodDashboard, setShowFoodDashboard] = useState(false);
    const [activeTab, setActiveTab] = useState<'HOME' | 'PASSES' | 'LOGISTICS' | 'COMMUNITY' | 'PROFILE'>('HOME');
    const [isOfflineMode, setIsOfflineMode] = useState(!isOnline());

    // Public Transport State
    const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
    const [toLocation, setToLocation] = useState<LocationData | null>(null);
    const [tripDistance, setTripDistance] = useState<number | null>(null);
    const [calculatedPath, setCalculatedPath] = useState<string[]>([]);
    const [pathDetails, setPathDetails] = useState<{ lat: number, lng: number }[]>([]);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
    const [myPasses, setMyPasses] = useState<Pass[]>([]);
    const [passengerCount, setPassengerCount] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    
    // Ultrasonic Audio state
    const [isBroadcastingAudio, setIsBroadcastingAudio] = useState(false);
    const [audioBroadcastError, setAudioBroadcastError] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

    const [showPaymentGateway, setShowPaymentGateway] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [upcomingBuses, setUpcomingBuses] = useState<BusState[]>([]);

    // QR Modal
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrData, setQrData] = useState<string>('');
    const [showFlashPassModal, setShowFlashPassModal] = useState<Ticket | null>(null);

    // New Feature State
    const [livestockInfo, setLivestockInfo] = useState('');
    const [hasInsurance, setInsurance] = useState(false);
    const [showJourneyCinematic, setShowJourneyCinematic] = useState(false);
    const [lostItems, setLostItems] = useState<LostItem[]>([]);
    const [drKisanResult, setDrKisanResult] = useState<LeafDiagnosisResult | null>(null);
    const [isScanningLeaf, setIsScanningLeaf] = useState(false);
    const [isScanningParcel, setIsScanningParcel] = useState(false);
    const [logisticsPoolFound, setLogisticsPoolFound] = useState(false);
    const [voiceGuideActive, setVoiceGuideActive] = useState(false);



    // SURAKSHA KAVACH (AUDIO RECORDING) STATE
    const [isAudioShieldActive, setIsAudioShieldActive] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const [cargoSubsidy, setCargoSubsidy] = useState(0);

    const [isGift, setIsGift] = useState(false);
    const [recipientPhone, setRecipientPhone] = useState('');
    const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

    // Tourism State
    const [selectedTourismSpot, setSelectedTourismSpot] = useState<(TourismSpot & { distance: number }) | null>(null);

    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [showAR, setShowAR] = useState(false);
    const [mandiRates, setMandiRates] = useState<MandiRate[]>([]);
    const [packages, setPackages] = useState<PilgrimagePackage[]>([]);

    const [jobs, setJobs] = useState<JobOpportunity[]>([]);
    const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
    const [showPayments, setShowPayments] = useState(false);
    const [showVendorMap, setShowVendorMap] = useState(false);
    const [showVendorAdmin, setShowVendorAdmin] = useState(false);

    const [isBuyingPass, setIsBuyingPass] = useState(false);
    const [seatConfig, setSeatConfig] = useState<SeatConfig>('SEAT');
    const [passType, setPassType] = useState<'MONTHLY' | 'STUDENT' | 'VIDYA_VAHAN'>('MONTHLY');

    const [logisticsWeight, setLogisticsWeight] = useState(5);
    const [logisticsItemType, setLogisticsItemType] = useState('BOX_SMALL');
    const [logisticsPrice, setLogisticsPrice] = useState(0);
    const [myParcels, setMyParcels] = useState<ParcelBooking[]>([]);

    const [churnAnalysis, setChurnAnalysis] = useState<ChurnRiskAnalysis | null>(null);
    const [fareDetails, setFareDetails] = useState<DynamicFareResult | null>(null);
    const [crowdForecast, setCrowdForecast] = useState<CrowdForecast | null>(null);
    const [passPrice, setPassPrice] = useState<number>(0);

    const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | null>(null);
    const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
    const [rentalDate, setRentalDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [rentalPrice, setRentalPrice] = useState<number>(0);
    const [bidAmount, setBidAmount] = useState<string>('');

    const [wallet, setWallet] = useState<WalletType | null>(null);
    const [trustScore, setTrustScore] = useState(1.0);
    const [marketBooking, setMarketBooking] = useState<{ product: Product, shop: Shop } | null>(null);

    useEffect(() => {
        window.addEventListener('online', () => setIsOfflineMode(false));
        window.addEventListener('offline', () => setIsOfflineMode(true));

        getMandiRates().then(rates => setMandiRates(rates));
        getJobs().then(j => setJobs(j));
        getMarketItems().then(items => setMarketItems(items));
        getPackages().then(p => setPackages(p));

        setLostItems([
            { id: 'L1', item: 'Red School Bag', location: 'Bus 404', date: 'Yesterday', contact: '9988...', status: 'LOST' },
            { id: 'L2', item: 'Watch (Titan)', location: 'Sasaram Stand', date: 'Today', contact: '8877...', status: 'FOUND' }
        ]);

        const fetchTickets = () => {
            const all = getStoredTickets().filter(t => t.userId === user.id);
            setActiveTickets(all.filter(t => ['PENDING', 'BOARDED', 'PAID'].includes(t.status)));
        };
        const fetchPasses = async () => {
            const passes = await getMyPasses(user.id);
            setMyPasses(passes);
            const risk = analyzeChurnRisk(passes);
            if (risk.riskLevel === 'HIGH' && risk.recommendedOffer) {
                setChurnAnalysis(risk);
            }
        };
        const fetchWallet = async () => {
            const w = await getWallet(user.id);
            setWallet(w);
        };
        const fetchParcels = async () => {
            const all = await getAllParcels();
            setMyParcels(all.filter(p => p.userId === user.id));
        };

        const filterUpcomingBuses = () => {
            if (!fromLocation) {
                setUpcomingBuses([]);
                return;
            }
            const active = getActiveBuses();
            const relevant = active.filter(b => b.activePath.includes(fromLocation.name));
            setUpcomingBuses(relevant);
        };

        fetchTickets();
        fetchPasses();
        fetchWallet();
        fetchParcels();
        filterUpcomingBuses();

        // Listen for instant ticket state changes (e.g. cancel from tracker overlay)
        const onTicketsChanged = () => fetchTickets();
        window.addEventListener('tickets_changed', onTicketsChanged);

        const interval = setInterval(() => {
            fetchTickets();
            fetchPasses();
            fetchWallet();
            fetchParcels();
            filterUpcomingBuses();
        }, 60000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('tickets_changed', onTicketsChanged);
            window.removeEventListener('online', () => setIsOfflineMode(false));
            window.removeEventListener('offline', () => setIsOfflineMode(true));
        };
    }, [user.id, fromLocation]);

    // ULTRASONIC AUDIO BROADCAST LOGIC
    useEffect(() => {
        let broadcastTimer: NodeJS.Timeout;
        let isActive = true;

        const startLoop = async () => {
            if (activeTickets.length > 0 && ['PENDING', 'BOARDED'].includes(activeTickets[0].status)) {
                setIsBroadcastingAudio(true);
                setAudioBroadcastError(false);
                
                const broadcast = async () => {
                    if (!isActive || document.hidden) return;
                    try {
                        console.log("[Acoustic TX] Emitting Ticket:", activeTickets[0].id);
                        await broadcastUltrasonicTicket(activeTickets[0].id);
                    } catch (e) {
                        console.error("Audio Broadcast Exception:", e);
                        setAudioBroadcastError(true);
                    }
                    if (isActive) broadcastTimer = setTimeout(broadcast, 4000); // 4 sec interval
                };
                
                broadcast();
            } else {
                setIsBroadcastingAudio(false);
            }
        };

        startLoop();

        return () => {
            isActive = false;
            setIsBroadcastingAudio(false);
            if (broadcastTimer) clearTimeout(broadcastTimer);
        };
    }, [activeTickets]);

    // SURAKSHA KAVACH: Automatic Recording on Trip Start
    useEffect(() => {
        // If user is on an active trip (BOARDED), start recording if enabled
        const isOnTrip = activeTickets.some(t => t.status === 'BOARDED');

        if (isOnTrip && !isAudioShieldActive && user.gender === 'FEMALE') {
            startAudioShield();
        } else if (!isOnTrip && isAudioShieldActive) {
            stopAudioShield();
        }
    }, [activeTickets, user.gender]);

    const startAudioShield = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setAudioChunks((prev) => [...prev, event.data]);
                }
            };

            mediaRecorder.start(10000); // Collect 10s chunks
            setIsAudioShieldActive(true);
            console.log("🛡️ Suraksha Kavach Active: Audio Recording Started");

            if (voiceGuideActive) speak("Safety Shield Active. Audio is being recorded for your safety.");

        } catch (e) {
            console.error("Audio Shield Failed", e);
        }
    };

    const stopAudioShield = () => {
        if (mediaRecorderRef.current && isAudioShieldActive) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsAudioShieldActive(false);
            console.log("🛡️ Suraksha Kavach Stopped");
        }
    };

    useEffect(() => {
        const calculateLogistics = async () => {
            if (currentView === 'BOOK_PARCEL' || marketBooking) {
                const price = await calculateLogisticsCost(logisticsItemType, logisticsWeight);
                setLogisticsPrice(price);
                const hasPool = findPoolMatches(fromLocation?.name || '');
                setLogisticsPoolFound(hasPool);
            }
        };
        calculateLogistics();

        const updateRoute = async () => {
            if (fromLocation && toLocation) {
                setIsCalculatingRoute(true);
                const routeData = await fetchSmartRoute(fromLocation, toLocation);

                setTripDistance(routeData.distance);
                setCalculatedPath(routeData.path);
                setPathDetails(routeData.pathDetails || []);
                setIsCalculatingRoute(false);

                if (currentView === 'DASHBOARD') {
                    const isHighTrafficRoute = routeData.distance > 5 && Math.random() > 0.5;
                    const subsidy = isHighTrafficRoute ? 5 : 0;
                    setCargoSubsidy(subsidy);

                    const df = await calculateDynamicFare(routeData.distance, Date.now());
                    let basePricing = df.totalFare;
                    setFareDetails(df);

                    let monthly = basePricing * 20;
                    if (seatConfig === 'STANDING') monthly = monthly * 0.80;
                    if (churnAnalysis?.recommendedOffer && isBuyingPass) monthly = monthly * (1 - churnAnalysis.recommendedOffer.discountPercent / 100);
                    if (passType === 'VIDYA_VAHAN' || passType === 'STUDENT') monthly = monthly * 0.50;
                    setPassPrice(Math.round(monthly));

                    const crowd = getCrowdForecast(Date.now());
                    setCrowdForecast(crowd);
                } else if (currentView === 'BOOK_RENTAL') {
                    if (selectedVehicle) {
                        const effectiveDist = tripType === 'ROUND_TRIP' ? routeData.distance * 2 : routeData.distance;
                        const price = selectedVehicle.baseRate + (effectiveDist * selectedVehicle.ratePerKm);
                        setRentalPrice(Math.round(price));
                    }
                }
            } else {
                setTripDistance(null);
                setFareDetails(null);
                setCrowdForecast(null);
                setPassPrice(0);
                setRentalPrice(0);
                setCalculatedPath([]);
                setPathDetails([]);
                setCargoSubsidy(0);
            }
        };

        updateRoute();

    }, [fromLocation, toLocation, seatConfig, isBuyingPass, churnAnalysis, currentView, selectedVehicle, tripType, logisticsWeight, logisticsItemType, passType, marketBooking]);

    const speak = (text: string) => {
        if (!voiceGuideActive) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'hi-IN';
            window.speechSynthesis.speak(u);
        }
    };

    const handleShowQR = (id: string) => {
        setQrData(id);
        setShowQRModal(true);
    };
    
    const handleBroadcastAcoustic = async (id: string) => {
        setIsBroadcastingAudio(true);
        try {
            await broadcastUltrasonicTicket(`TK|${id}|${user.id}`);
            alert("Acoustic Handshake Complete.");
        } catch (e) {
            console.error("Audio broadcast failed", e);
            alert("Ensure media volume is up for acoustic handshake.");
        }
        setIsBroadcastingAudio(false);
    };

    const handleShowFlashPass = (ticket: Ticket) => {
        setShowFlashPassModal(ticket);
    };

    const initiateBook = () => {
        speak("Booking initiated. Please confirm details.");
        if (isGift && recipientPhone.length < 10) {
            alert("Please enter a valid recipient phone number for the gift.");
            return;
        }
        if (fromLocation) {
            const currentGeo: GeoLocation = { lat: fromLocation.lat, lng: fromLocation.lng, timestamp: Date.now() };
            updateLastLocation(currentGeo);
        }
        if (!fromLocation || !toLocation) {
            alert("Please select start and end villages.");
            return;
        }
        setPaymentMethod(PaymentMethod.ONLINE);
        setShowConfirm(true);
    };

    const handleMarketDelivery = (product: Product, shop: Shop) => {
        setAppMode('TRANSPORT');
        setCurrentView('BOOK_PARCEL');
        setActiveTab('LOGISTICS');
        setMarketBooking({ product, shop });
        setLogisticsItemType(shop.category === 'CONSTRUCTION' ? 'SACK_GRAIN' : 'BOX_SMALL');
        setLogisticsWeight(shop.category === 'CONSTRUCTION' ? 50 : 2);
        setFromLocation({ name: shop.location, address: shop.location, lat: 0, lng: 0, block: '', panchayat: '', villageCode: 'SHOP' });
        alert(`Confirm delivery for ${product.name}. Please select your Drop location.`);
    };




    const handleLeafScan = async () => {
        setIsScanningLeaf(true);
        setDrKisanResult(null);
        const result = await diagnoseLeaf();
        setDrKisanResult(result);
        setIsScanningLeaf(false);
    };

    const handleParcelScan = async () => {
        setIsScanningParcel(true);
        const result = await estimateParcelSize();
        setLogisticsWeight(result.weightKg);
        setLogisticsItemType(result.recommendedType);
        setIsScanningParcel(false);
        alert(`AI Estimated: ${result.weightKg}kg (${result.dimensions})`);
    };

    const handleReviewConfirm = async () => {
        if (!paymentMethod) {
            alert("Please select a payment method.");
            return;
        }

        const totalCost = Math.max(0, ((fareDetails?.totalFare || 0) - cargoSubsidy) * passengerCount + (livestockInfo ? 20 : 0) + (hasInsurance ? 1 : 0));

        if (paymentMethod === PaymentMethod.GRAMCOIN) {
            const result = await spendGramCoin(user.id, totalCost, "Bus Ticket");
            if (result.success) {
                completeBooking(PaymentMethod.GRAMCOIN, TicketStatus.PAID, result.transactionId);
            } else {
                alert("Insufficient GramCoin Balance");
            }
            return;
        }

        // Cash Payment Logic
        if (paymentMethod === PaymentMethod.CASH) {
            // Book as PENDING
            completeBooking(PaymentMethod.CASH, TicketStatus.PENDING);
            return;
        }

        if (isOfflineMode && !isBuyingPass && currentView === 'DASHBOARD') {
            const offlineTicket = {
                userId: user.id,
                from: fromLocation!.name,
                to: toLocation!.name,
                fromDetails: fromLocation!.address,
                toDetails: toLocation!.address,
                status: TicketStatus.PENDING,
                paymentMethod: PaymentMethod.CASH,
                passengerCount,
                totalPrice: totalCost,
                routePath: calculatedPath,
                seatNumber: selectedSeat || undefined,
                hasLivestock: !!livestockInfo,
                hasInsurance,
                recipientPhone: isGift ? recipientPhone : undefined,
                giftedBy: isGift ? user.name : undefined
            };
            queueAction({ type: 'BOOK_TICKET', payload: offlineTicket });
            alert("Offline: Ticket queued! Will sync when online.");
            setShowConfirm(false);
            resetToDashboard();
            return;
        }

        if (isBuyingPass || currentView === 'BOOK_RENTAL' || currentView === 'BOOK_PARCEL') {
            const tempId = isBuyingPass ? generatePassId() : (currentView === 'BOOK_RENTAL' ? generateRentalId() : generateParcelId());
            setActiveOrderId(tempId);
            setShowConfirm(false);
            setShowPaymentGateway(true);
            return;
        }

        // Default to Online Payment Gateway (Ticket)
        const ticketId = generateTicketId();
        setActiveOrderId(ticketId);
        setShowConfirm(false);
        setShowPaymentGateway(true);
    };

    const handlePaymentGatewaySuccess = (txnId?: string) => {
        completeBooking(PaymentMethod.ONLINE, TicketStatus.PAID, txnId);
    };

    const completeBooking = async (method: PaymentMethod, status: TicketStatus, transactionId?: string) => {
        setIsBooking(true);
        const cost = Math.max(0, ((fareDetails?.totalFare || 0) - cargoSubsidy) * passengerCount + (livestockInfo ? 20 : 0) + (hasInsurance ? 1 : 0));

        const signature = await signTransaction({ userId: user.id, amount: rentalPrice || passPrice || cost, type: 'BOOKING' });

        if (currentView === 'BOOK_RENTAL') {
            const newRental: RentalBooking = {
                id: activeOrderId || generateRentalId(),
                userId: user.id,
                userName: user.name,
                vehicleType: selectedVehicle!.type,
                from: fromLocation!.name,
                to: toLocation!.name,
                tripType: tripType,
                date: rentalDate,
                distanceKm: tripDistance!,
                totalFare: bidAmount ? parseInt(bidAmount) : rentalPrice,
                status: 'PENDING',
                driverId: undefined,
                bidAmount: bidAmount ? parseInt(bidAmount) : undefined,
                transactionId
            };
            await bookRental(newRental);
        }
        else if (currentView === 'BOOK_PARCEL') {
            const totalPrice = marketBooking ? (marketBooking.product.price + logisticsPrice) : logisticsPrice;
            const finalPrice = logisticsPoolFound ? totalPrice * 0.7 : totalPrice;

            const newParcel: ParcelBooking = {
                id: activeOrderId || generateParcelId(),
                userId: user.id,
                from: fromLocation!.name,
                to: toLocation!.name,
                itemType: marketBooking ? `DELIVERY: ${marketBooking.product.name}` : logisticsItemType,
                weightKg: logisticsWeight,
                price: finalPrice,
                status: 'PENDING',
                isEncrypted: true,
                blockchainHash: signature,
                trackingEvents: [],
                isPooled: logisticsPoolFound,
                timestamp: Date.now(),
                transactionId
            };
            await bookParcel(newParcel);
            earnGramCoin(user.id, 2, "Logistics Reward");
            setMarketBooking(null);
        }
        else if (isBuyingPass) {
            const nftData = mintPassNFT(user.id, { from: fromLocation!.name, to: toLocation!.name, expiry: Date.now() + 30 * 24 * 60 * 60 * 1000 });
            const newPass: Pass = {
                id: activeOrderId || generatePassId(),
                userId: user.id,
                userName: user.name,
                from: fromLocation!.name,
                to: toLocation!.name,
                type: passType,
                seatConfig: seatConfig,
                validityDays: 30,
                usedDates: [],
                purchaseDate: Date.now(),
                expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
                price: passPrice,
                status: 'ACTIVE',
                nftMetadata: nftData,
                giftedBy: isGift ? user.name : undefined,
                transactionId
            };
            await savePass({ ...newPass, recipientPhone: isGift ? recipientPhone : undefined } as any);

            if (!isGift) setMyPasses(prev => [newPass, ...prev]);
            earnGramCoin(user.id, 50, "Monthly Pass Bonus");
        } else {
            const newTicket: Ticket = {
                id: activeOrderId || generateTicketId(),
                userId: user.id,
                from: fromLocation!.name,
                to: toLocation!.name,
                fromDetails: fromLocation!.address,
                toDetails: toLocation!.address,
                status: status,
                paymentMethod: method,
                timestamp: Date.now(),
                passengerCount: passengerCount,
                totalPrice: cost,
                routePath: calculatedPath,
                digitalSignature: signature,
                seatNumber: selectedSeat || undefined,
                hasLivestock: !!livestockInfo,
                hasInsurance,
                recipientPhone: isGift ? recipientPhone : undefined,
                giftedBy: isGift ? user.name : undefined,
                transactionId
            };

            // CRITICAL: Await save to DB before showing success
            await saveTicket(newTicket);

            if (!isGift) {
                setActiveTickets(prev => [newTicket, ...prev]);
            }

            if (hasInsurance) alert("Micro-Insurance Policy activated for this trip.");
            earnGramCoin(user.id, 1 * passengerCount + (fromLocation?.name !== 'Doorstep' ? 1 : 0), "Trip Reward");
        }

        setIsBooking(false);
        setShowConfirm(false);
        setShowPaymentGateway(false);
        setActiveOrderId(null); // Reset after completion
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            resetToDashboard();
        }, 2500);
    };

    const resetToDashboard = () => {
        setCurrentView('DASHBOARD');
        setActiveTab('HOME');
        setFromLocation(null);
        setToLocation(null);
        setSelectedVehicle(null);
        setIsBuyingPass(false);
        setMarketBooking(null);
        setLivestockInfo('');
        setInsurance(false);
        setIsGift(false);
        setRecipientPhone('');
    };

    const handleCancelActiveTicket = async (ticketId: string) => {
        if (!window.confirm("Are you sure you want to cancel this ticket? A service charge of 10% will be deducted from your refund.")) return;
        
        setCancelLoadingId(ticketId);
        try {
            const res = await cancelTicket(ticketId);
            if (res.success) {
                alert(`Ticket Cancelled! Refund processing: ₹${res.refundAmount || (activeTickets.find(t => t.id === ticketId)?.totalPrice! * 0.9).toFixed(2)}`);
                // Update local fast state
                setActiveTickets(prev => prev.filter(t => t.id !== ticketId));
            } else {
                alert("Cancellation failed: " + res.message);
            }
        } catch (e) {
            alert("Error cancelling ticket");
        }
        setCancelLoadingId(null);
    };

    const handleTabChange = (tab: 'HOME' | 'PASSES' | 'LOGISTICS' | 'COMMUNITY' | 'PROFILE') => {
        setActiveTab(tab);
        if (tab === 'LOGISTICS') {
            setCurrentView('BOOK_PARCEL');
        } else if (tab === 'PASSES') {
            setCurrentView('DASHBOARD');
        } else {
            setCurrentView('DASHBOARD');
        }
    };

    return (
        <>
            <div className="max-w-md mx-auto pb-32 relative min-h-screen font-sans">
                {showAR && <ARFinder onClose={() => setShowAR(false)} targetName={calculatedPath[1] || 'Bus Stop'} />}

                {/* WRAPPER FOR SCROLLABLE CONTENT WITH V5 ANIMATION */}
                <div className="animate-fade-in relative">
                    {/* Floating Vehicle Background Decorator */}
                    <div className="absolute -top-10 -right-20 opacity-20 blur-sm pointer-events-none z-0">
                        <FloatingVehicle size="300px" />
                    </div>

                    {/* V5 SMART TRANSIT HUB WIDGET (Shows only if no active tickets) */}
                    {activeTab === 'HOME' && activeTickets.length === 0 && (!activeTourismTracker) && (
                        <TransitHubWidget 
                            fromLocationName={fromLocation?.name}
                            lat={fromLocation?.lat}
                            lng={fromLocation?.lng}
                        />
                    )}

                    {/* Active Tourism Tracker */}
                    {activeTab === 'HOME' && activeTourismTracker && (
                        <TourismTracker 
                            ticket={activeTourismTracker} 
                            onEndSession={async () => {
                                // Extract true backend ID if present
                                const isBackendTicket = activeTourismTracker.id.startsWith('TOUR-') && activeTourismTracker.id.length > 10;
                                const backendId = isBackendTicket ? activeTourismTracker.id.replace('TOUR-', '') : null;
                                
                                // Cancel on backend tourism collection first
                                if (backendId) {
                                    try {
                                        await fetch(`${API_BASE_URL}/api/tourism/cancel`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': getAuthToken() || '' },
                                            body: JSON.stringify({ bookingId: backendId })
                                        });
                                    } catch (e) {
                                        console.warn("Tourism cancel failed", e);
                                    }
                                }

                                // Cancel from local transport states
                                setActiveTickets(prev => prev.filter(t => t.id !== activeTourismTracker.id));
                                // Make backend call
                                cancelTicket(activeTourismTracker.id).catch(e => console.warn('Cancel backend failed:', e));
                                // Clear the tracker UI
                                if (setActiveTourismTracker) {
                                    setActiveTourismTracker(null);
                                }
                            }} 
                        />
                    )}

                    {/* V5 HOME TAB CONTENT - Duplicate elements removed (handled by parent UserApp) */}
                    {activeTab === 'HOME' && (
                        <div className="mb-6 px-4">
                            {/* Mode-specific content will be shown below based on appMode */}
                        </div>
                    )}

                    {/* ... (Existing Tabs) ... */}

                    {activeTab === 'PROFILE' && (
                        showPayments ?
                            <PaymentHistory onBack={() => setShowPayments(false)} /> :
                            showVendorAdmin ?
                                <VendorAdmin onBack={() => setShowVendorAdmin(false)} /> :
                                <UserProfile
                                    user={user}
                                    onBack={() => setActiveTab('HOME')}
                                    onShowPayments={() => setShowPayments(true)}
                                    onShowAdmin={() => setShowVendorAdmin(true)}
                                    onLogout={onLogout}
                                />
                    )}

                    {activeTab === 'PASSES' && (
                        <div className="px-4 py-6 space-y-6">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <TicketIcon className="text-luxe-sienna" /> My Passes
                            </h2>
                            {myPasses.length === 0 ? (
                                <div className="text-center py-10 bg-slate-100 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                                    <TicketIcon size={48} className="mx-auto text-slate-400 mb-4 opacity-50" />
                                    <p className="text-slate-500 text-sm">No active passes found.</p>
                                    <Button onClick={() => { setActiveTab('HOME'); setIsBuyingPass(true); }} className="mt-4" variant="outline">Buy New Pass</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myPasses.map(pass => (
                                        <div key={pass.id} className="ticket-stub relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 super-rounded p-6 group">
                                            {/* Shimmer on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -translate-x-[150%] skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>
                                            {/* Left Perforation Detail */}
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2 border border-slate-100 dark:border-slate-800"></div>
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2 border border-slate-100 dark:border-slate-800"></div>
                                            <div className="absolute top-1/2 left-0 right-0 border-t-2 border-dashed border-slate-100 dark:border-slate-800 -translate-y-1/2 mx-4"></div>

                                            <div className="relative z-10 flex flex-col justify-between h-full">
                                                <div className="mb-8">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-luxe-sienna uppercase tracking-widest mb-1">{pass.type} PASS</p>
                                                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{pass.from} <span className="text-slate-300 mx-1">↔</span> {pass.to}</h3>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <QrCode size={24} className="text-slate-800 dark:text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase mb-2">
                                                            <span>EXP: {new Date(pass.expiryDate).toLocaleDateString()}</span>
                                                            <span>ID: {pass.id.slice(-6).toUpperCase()}</span>
                                                        </div>
                                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100 dark:border-emerald-800 inline-block uppercase tracking-wider">ACTIVE PASS</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleShowQR(pass.id)}
                                                        className="bg-luxe-sienna text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-luxe-sienna/20 hover:scale-105 transition-transform"
                                                    >
                                                        Open QR
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === 'LOGISTICS' || currentView === 'BOOK_PARCEL') && (
                        <div className="px-4 py-6 space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => { setActiveTab('HOME'); setCurrentView('DASHBOARD'); }} aria-label="Go Back" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><ArrowLeft size={20} /></button>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <div className="bg-luxe-teal p-1.5 rounded-lg text-white shadow-lg shadow-luxe-teal/20"><Package size={20} /></div>
                                    CargoLink
                                </h2>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 super-rounded shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-white/20 dark:border-slate-800 animate-fade-in-up">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <LocationSelector label="Pickup Terminal" onSelect={setFromLocation} />
                                        <LocationSelector label="Drop-off Point" onSelect={setToLocation} />
                                    </div>

                                    {/* Whisk 2.0: Cargo Vehicle Selection (Inspired by Image 2) */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Load Capacity</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'BOX_SMALL', label: 'Mini Van', cap: '50kg', icon: Package, color: 'text-luxe-teal' },
                                                { id: 'SACK_GRAIN', label: 'E-Rickshaw', cap: '200kg', icon: Bike, color: 'text-luxe-gold' },
                                                { id: 'HEAVY_LORRY', label: 'Truck', cap: '2000kg', icon: Bus, color: 'text-luxe-sienna' }
                                            ].map((v) => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        setLogisticsItemType(v.id as any);
                                                        setLogisticsWeight(v.id === 'BOX_SMALL' ? 5 : (v.id === 'SACK_GRAIN' ? 50 : 500));
                                                    }}
                                                    className={`relative overflow-hidden flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 group ${logisticsItemType === v.id
                                                        ? 'bg-luxe-teal/10 border-luxe-teal shadow-xl -translate-y-2 scale-[1.02]'
                                                        : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-100 dark:border-slate-700 hover:border-luxe-teal/40 hover:-translate-y-1 hover:shadow-lg'
                                                        }`}
                                                >
                                                    {logisticsItemType === v.id && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-luxe-teal/10 to-transparent -translate-x-[150%] skew-x-12 animate-[shimmer_2s_infinite]"></div>}
                                                    <div className={`p-2 rounded-xl scale-125 mb-1 ${v.color}`}>
                                                        <v.icon size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[9px] font-bold text-slate-800 dark:text-white uppercase leading-none mb-0.5">{v.label}</p>
                                                        <p className="text-[8px] font-bold text-slate-400">Up to {v.cap}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Payload Visualizer (Inspired by High-Vis Benchmarks) */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Load Weight</label>
                                            <span className="text-sm font-bold text-luxe-teal">{logisticsWeight} kg</span>
                                        </div>
                                        <input
                                            type="range"
                                            aria-label="Logistics Load Weight"
                                            min="1"
                                            max={logisticsItemType === 'HEAVY_LORRY' ? 2000 : 500}
                                            value={logisticsWeight}
                                            onChange={(e) => setLogisticsWeight(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-luxe-teal"
                                        />
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[8px] font-bold text-slate-400 capitalize">Min Load</span>
                                            <span className="text-[8px] font-bold text-slate-400 capitalize">Full Capacity</span>
                                        </div>
                                    </div>

                                    {logisticsPoolFound && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/40 p-3 rounded-2xl flex items-center gap-3 border border-emerald-200 dark:border-emerald-700 animate-pulse">
                                            <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">POOLING ACTIVE</p>
                                                <p className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-0.5">30% discount applied for shared route.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2">
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Estimated Fare</p>
                                            <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{logisticsPoolFound ? (logisticsPrice * 0.7).toFixed(0) : logisticsPrice}</p>
                                        </div>
                                        <Button onClick={initiateBook} className="px-8 super-rounded bg-luxe-teal hover:bg-luxe-teal/80 shadow-lg shadow-luxe-teal/20" disabled={!fromLocation || !toLocation}>
                                            Book Parcel
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {myParcels.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-slate-600 dark:text-slate-400 text-sm uppercase">Active Parcels</h3>
                                    {myParcels.map(p => (
                                        <div key={p.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-luxe-teal/10 dark:bg-luxe-teal/20 p-2.5 rounded-full text-luxe-teal">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{p.from} → {p.to}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">{p.status}</p>
                                                </div>
                                            </div>
                                            <button className="text-[10px] bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-full font-bold text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600">Track</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {currentView === 'BOOK_RENTAL' && activeTab === 'HOME' && (
                        <div className="px-4 py-6 space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => setCurrentView('DASHBOARD')} aria-label="Go Back" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ArrowLeft size={20} /></button>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><Car className="text-indigo-500" /> Book Charter</h2>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-[32px] shadow-xl hover:shadow-2xl border border-white/20 dark:border-slate-800 transition-all duration-500 hover:-translate-y-1">
                                <div className="space-y-4 mb-6">
                                    <LocationSelector label="Pickup Point" onSelect={setFromLocation} />
                                    <LocationSelector label="Destination" onSelect={setToLocation} />

                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        <button onClick={() => setTripType('ONE_WAY')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tripType === 'ONE_WAY' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}>One Way</button>
                                        <button onClick={() => setTripType('ROUND_TRIP')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tripType === 'ROUND_TRIP' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}>Round Trip</button>
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Select Vehicle</h3>
                                <div className="space-y-3 mb-6">
                                    {RENTAL_FLEET.map(v => (
                                        <div
                                            key={v.id}
                                            onClick={() => setSelectedVehicle(v)}
                                            className={`relative overflow-hidden p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 flex justify-between items-center group ${selectedVehicle?.id === v.id ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/30 shadow-xl -translate-y-1 scale-[1.02]' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 bg-white/50 dark:bg-slate-900/50'}`}
                                        >
                                            {selectedVehicle?.id === v.id && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-[150%] skew-x-12 animate-[shimmer_2s_infinite]"></div>}
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                                                    {v.imageIcon === 'car' ? <Car size={20} className="text-slate-600" /> : <Bus size={20} className="text-slate-600" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm dark:text-white">{v.model}</h4>
                                                    <p className="text-[10px] text-slate-500">{v.capacity} Seater • ₹{v.ratePerKm}/km</p>
                                                </div>
                                            </div>
                                            {selectedVehicle?.id === v.id && <div className="bg-indigo-500 text-white p-1 rounded-full"><Check size={12} /></div>}
                                        </div>
                                    ))}
                                </div>

                                {selectedVehicle && tripDistance && (
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-slate-500 font-bold uppercase">Estimated Fare</span>
                                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{rentalPrice}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 text-center">Includes Base Fare + Distance Charge</p>
                                    </div>
                                )}

                                <Button onClick={initiateBook} fullWidth className="bg-indigo-600 hover:bg-indigo-500" disabled={!selectedVehicle || !toLocation}>
                                    Book Now
                                </Button>
                            </div>
                        </div>
                    )}

                    {appMode === 'MARKET' && activeTab === 'HOME' ? (
                        showVendorMap ?
                            <VendorMapView onBack={() => setShowVendorMap(false)} userLocation={{ lat: 25.556, lng: 84.665 }} /> :
                            <MarketingView user={user} onBookDelivery={handleMarketDelivery} onShowMap={() => setShowVendorMap(true)} />
                    ) : appMode === 'FOOD' && activeTab === 'HOME' ? (
                        <FoodLinkHome user={user} onBack={() => { setAppMode('TRANSPORT'); }} />
                    ) : (
                        <>
                            {activeTab === 'HOME' && currentView === 'DASHBOARD' && (
                                <div className="space-y-6">

                                    {/* REDESIGNED ACTIVE Trip CARD (Whisk 2.0 Ticket Stub) */}
                                    {activeTickets.length > 0 && (
                                        <div className="ticket-stub relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 border border-brand-500/30 shadow-2xl shadow-brand-500/20 super-rounded mb-6">
                                            {/* Top Highlight Area */}
                                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-luxe-teal via-brand-400 to-luxe-gold"></div>

                                            <div className="p-5 relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex flex-col gap-1 mb-1.5 px-3 py-1.5 bg-emerald-500/10 w-max rounded-xl border border-emerald-500/20">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${audioBroadcastError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`}></span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest" style={{color: audioBroadcastError ? '#ef4444' : '#6ee7b7'}}>
                                                                    {audioBroadcastError ? 'BROADCAST ERR' : t('active_trip')}
                                                                </span>
                                                            </div>
                                                            <AnimatedWave isBroadcasting={isBroadcastingAudio && !audioBroadcastError} isError={audioBroadcastError} />
                                                        </div>
                                                        <h3 className="text-xl font-black leading-tight mt-1 flex items-center gap-2" style={{color: '#ffffff'}}>
                                                            <span>{activeTickets[0].from}</span>
                                                            <span style={{color: '#a5b4fc'}} className="mx-0.5">→</span>
                                                            <span>{activeTickets[0].to}</span>
                                                        </h3>
                                                    </div>
                                                    <div className="text-right px-3 py-1.5 rounded-xl" style={{backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'}}>
                                                        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{color: '#94a3b8'}}>Seat</p>
                                                        <p className="text-sm font-black" style={{color: '#a5b4fc'}}>{activeTickets[0].seatNumber || 'STAND'}</p>
                                                    </div>
                                                </div>

                                                {/* Live Tracker Integration */}
                                                <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 mb-6 ring-1 ring-white/10 shadow-inner">
                                                    <LiveTracker desiredPath={activeTickets[0].routePath} layout="HORIZONTAL" showHeader={false} />
                                                </div>

                                                <div className="flex justify-between items-center border-t border-dashed pt-4" style={{borderColor: 'rgba(255,255,255,0.15)'}}>
                                                    <div className="flex flex-col px-3 py-1.5 rounded-xl" style={{backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
                                                        <span className="text-[8px] uppercase font-black tracking-widest mb-0.5" style={{color: '#94a3b8'}}>Ticket ID</span>
                                                        <span className="text-[11px] font-mono font-black" style={{color: '#ffffff'}}>#{activeTickets[0].id.slice(-6).toUpperCase()}</span>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        {activeTickets[0].id.startsWith('TOUR-') && setActiveTourismTracker && (
                                                            <button
                                                                onClick={() => setActiveTourismTracker(activeTickets[0])}
                                                                className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-3 py-2 rounded-xl text-xs font-bold hover:bg-brand-500/40 transition-colors flex items-center justify-center"
                                                            >
                                                                Open Chat
                                                            </button>
                                                        )}
                                                        {(activeTickets[0].status === 'PENDING' || activeTickets[0].status === 'PROVISIONAL') && (
                                                            <button
                                                                onClick={() => handleCancelActiveTicket(activeTickets[0].id)}
                                                                disabled={cancelLoadingId === activeTickets[0].id}
                                                                className="bg-red-500/20 text-red-200 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-500/40 transition-colors flex items-center justify-center"
                                                            >
                                                                {cancelLoadingId === activeTickets[0].id ? 'Wait...' : 'Cancel'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleShowFlashPass(activeTickets[0])}
                                                            className="bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-colors flex items-center gap-2 transform hover:scale-105"
                                                        >
                                                            <Zap size={14} className="fill-white" />
                                                            Flash Pass
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ... (Rest of existing dashboard UI) ... */}
                                    {/* Removed overflow-hidden to allow dropdown to display */}
                                    {/* DASHBOARD SECTION MATCHING REFERENCE IMAGE */}
                                    <div className={`journey-card-reference transition-all duration-500 ease-in-out ${isScrolled ? '![border-radius:50%_50%_0_0/24px_24px_0_0] shadow-2xl mt-4 mx-0' : `![border-radius:0_0_32px_32px] !border-t-0 shadow-xl ${activeTickets.length > 0 ? 'mt-4' : '-mt-[2px] z-10'} mx-0`}`}>
                                        <div className="flex flex-col gap-5">
                                            <div className="flex justify-between items-stretch gap-3">
                                                <div className="toggle-ticket-match flex-1 m-0">
                                                    <button 
                                                        onClick={() => { setIsBuyingPass(false); setSeatConfig('SEAT'); }} 
                                                        className={!isBuyingPass ? 'active flex-1' : 'text-slate-500 flex-1'}
                                                    >
                                                        Ticket
                                                    </button>
                                                    <button 
                                                        onClick={() => { setIsBuyingPass(true); setSeatConfig('SEAT'); }} 
                                                        className={isBuyingPass ? 'active flex-1' : 'text-slate-500 flex-1'}
                                                    >
                                                        Pass
                                                    </button>
                                                </div>

                                                {/* Whisk 2.0: Trip Type Toggle */}
                                                {!isBuyingPass && (
                                                    <div className="toggle-ticket-match flex-1 m-0">
                                                        <button 
                                                            onClick={() => setTripType('ONE_WAY')} 
                                                            className={tripType === 'ONE_WAY' ? 'active flex-1' : 'text-slate-500 flex-1'}
                                                        >
                                                            One-Way
                                                        </button>
                                                        <button 
                                                            onClick={() => setTripType('ROUND_TRIP')} 
                                                            className={tripType === 'ROUND_TRIP' ? 'active flex-1' : 'text-slate-500 flex-1'}
                                                        >
                                                            Round-Trip
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative z-10 mt-6">
                                            <LocationSelector
                                                label="Pickup Point"
                                                defaultAutoDetect={true}
                                                onSelect={setFromLocation}
                                                placeholder="Start"
                                            />

                                            {upcomingBuses.length > 0 && fromLocation && (
                                                <div className="absolute right-4 top-[85px] z-20 flex flex-col items-end pointer-events-none">
                                                    {upcomingBuses.slice(0, 1).map(bus => (
                                                        <div key={bus.driverId} className="bg-white/10 backdrop-blur-md shadow-lg rounded-full p-1 pr-3 flex items-center gap-2 border border-white/20 animate-in slide-in-from-right">
                                                            <div className="bg-emerald-500 text-white p-1.5 rounded-full"><Bus size={14} /></div>
                                                            <div className="text-right"><p className="text-[9px] text-emerald-300 font-bold uppercase">Approaching</p><p className="text-xs font-bold text-white">{(bus.capacity - bus.occupancy)} Seats</p></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="absolute left-[29px] top-[100px] bottom-[100px] w-0.5 bg-gradient-to-b from-brand-500/50 to-emerald-500/50 -z-10"></div>

                                            <LocationSelector
                                                label="Destination"
                                                onSelect={setToLocation}
                                                placeholder="End"
                                            />
                                        </div>

                                        {calculatedPath.length > 0 && (
                                            <div className={`mt-6 animate-fade-in p-4 rounded-xl border border-white/5 bg-brand-900/10`}>
                                                <div className="flex justify-between items-end mb-3">
                                                    <label className={`text-xs font-bold uppercase tracking-wider text-brand-300`}>Route Landmarks ({calculatedPath.length})</label>
                                                    {tripDistance !== null && (
                                                        <span className="text-xs font-bold bg-brand-500/20 text-brand-300 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border border-brand-500/30">
                                                            <Route size={12} /> {tripDistance.toFixed(1)} km
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                    {calculatedPath.map((stop, i) => (
                                                        <div key={i} className="min-w-[60px] flex flex-col items-center gap-2">
                                                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold shadow-sm backdrop-blur-md bg-brand-500/10 border-brand-500/30 text-brand-400`}>{stop.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-[9px] text-slate-400 truncate w-full text-center">{stop}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {/* The Horizon Drive Preview Button */}
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <button 
                                                        onClick={() => setShowJourneyCinematic(true)}
                                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 text-white font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--brand-500),0.3)] active:scale-95 transition-transform"
                                                    >
                                                        <Play size={16} fill="currentColor" /> Cinematic Route Preview
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* INTERACTIVE ROUTE MAP */}
                                        {pathDetails.length > 1 && fromLocation && toLocation && (
                                            <div className="mt-4 animate-fade-in ring-1 ring-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                                <RouteMap
                                                    pathCoordinates={pathDetails}
                                                    pickupLocation={{ lat: fromLocation.lat, lng: fromLocation.lng, name: fromLocation.name }}
                                                    dropoffLocation={{ lat: toLocation.lat, lng: toLocation.lng, name: toLocation.name }}
                                                    height="220px"
                                                    showControls={true}
                                                    theme="dark" // FORCE DARK MODE FOR IMMERSIVE FEEL
                                                    className="opacity-90 hover:opacity-100 transition-opacity"
                                                />
                                                <div className="flex justify-between mt-2 px-1">
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Actual Road Route
                                                    </span>
                                                    <span className="text-[10px] text-emerald-400 font-bold">
                                                        ETA: ~{Math.round((tripDistance || 0) / 30 * 60)} min
                                                    </span>
                                                </div>
                                            </div>
                                        )}



                                        {/* Whisk 3.0: Ultimate Ride Selector (Inspired by Demo) */}
                                        {fareDetails && (
                                            <div className="mt-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Vehicle</label>
                                                    <span className="v5-match-badge group-hover:animate-pulse">AI Route Match</span>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                                    {[
                                                        { id: 'RICKSHAW', icon: '🛺', name: 'E-Rickshaw', price: 12 },
                                                        { id: 'BUS', icon: '🚌', name: 'Village Bus', price: 5 },
                                                        { id: 'MOTO', icon: '🛵', name: 'Moto Taxi', price: 15 },
                                                        { id: 'CARGO', icon: '🛒', name: 'Cargo Cart', price: 8 },
                                                    ].map((ride) => (
                                                        <div
                                                            key={ride.id}
                                                            className={`v5-ride-option ${ride.id === 'BUS' ? 'active' : ''}`}
                                                        >
                                                            <span className="v5-ride-icon">{ride.icon}</span>
                                                            <div className="v5-ride-name">{ride.name}</div>
                                                            <div className="v5-ride-price">₹{Math.round(fareDetails.totalFare * (ride.price / 10))}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Ride Details (Inspired by Demo) */}
                                                <div className="space-y-3 mt-2">
                                                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <span className="text-xs text-slate-400">Distance / ETA</span>
                                                        <span className="text-xs font-bold text-white">{tripDistance?.toFixed(1) || '2.4'} km • {Math.round((tripDistance || 2.4) * 3)} min</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <span className="text-xs text-slate-400">Route Match</span>
                                                        <span className="v5-match-badge">98% Efficient</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {fareDetails && (
                                            <div className="mt-6">
                                                <Button onClick={initiateBook} fullWidth disabled={!toLocation} className={`py-4 shadow-xl shadow-brand-500/20`}>
                                                    <div className="flex items-center justify-between w-full"><span>{isBuyingPass ? `Buy ${passType.replace('_', ' ')} Pass` : 'Book Ticket'}</span><span className="bg-white/20 px-2 py-1 rounded text-sm">{formatCurrency(isBuyingPass ? passPrice : fareDetails.totalFare * passengerCount)}</span></div>
                                                </Button>
                                                {fareDetails.message && <p className="text-center text-[10px] text-slate-400 mt-2">{fareDetails.message}</p>}
                                            </div>
                                        )}

                                        {/* Book Charter & Send Parcel merged into Journey Card */}
                                        <div className="grid grid-cols-2 gap-3 mt-6">
                                            <button onClick={() => setCurrentView('BOOK_RENTAL')} className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 p-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm group">
                                                <div className="bg-indigo-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Car size={16} /></div><span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Book Charter</span>
                                            </button>
                                            <button onClick={() => { setActiveTab('LOGISTICS'); setCurrentView('BOOK_PARCEL'); }} className="bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100 border border-orange-200 dark:border-orange-700 p-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm group">
                                                <div className="bg-orange-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Package size={16} /></div><span className="text-xs font-bold text-orange-900 dark:text-orange-200">Send Parcel</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Whisk 3.0: Adventurous Packages Section */}
                                    <TourismCarousel 
                                        userLocation={fromLocation ? { lat: fromLocation.lat, lng: fromLocation.lng } : undefined}
                                        onSelectSpot={setSelectedTourismSpot}
                                    />

                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Navigation removed - handled by parent UserApp via V5BottomNav */}

            <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleReviewConfirm} title="Confirm Booking" confirmLabel={paymentMethod ? `Pay ${formatCurrency(isBuyingPass ? passPrice : (fareDetails?.totalFare || 0) * passengerCount)}` : "Select Payment"}>
                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-500 uppercase">Route</p>
                        <p className="font-bold text-lg dark:text-white">{fromLocation?.name} <ArrowLeft size={12} className="inline rotate-180" /> {toLocation?.name}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase ml-1">Payment Method</p>
                        <div
                            onClick={() => setPaymentMethod(PaymentMethod.ONLINE)}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${paymentMethod === PaymentMethod.ONLINE ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-100 dark:bg-brand-900/50 p-2 rounded-full text-brand-600"><CreditCard size={18} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Online Payment</p>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400">UPI, Cards, Netbanking</p>
                                </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === PaymentMethod.ONLINE ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}></div>
                        </div>

                        {/* Cash Option - Clarified Text */}
                        <div
                            onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                            className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${paymentMethod === PaymentMethod.CASH ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-full text-slate-600"><Banknote size={18} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Pay Cash to Driver</p>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400">Driver verifies & collects cash</p>
                                </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === PaymentMethod.CASH ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}></div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Payment Gateway Modal */}
            {showPaymentGateway && activeOrderId && (
                <PaymentGatewayModal
                    isOpen={showPaymentGateway}
                    onClose={() => setShowPaymentGateway(false)}
                    onSuccess={handlePaymentGatewaySuccess}
                    amount={Math.max(0, ((fareDetails?.totalFare || 0) - cargoSubsidy) * passengerCount + (livestockInfo ? 20 : 0) + (hasInsurance ? 1 : 0))}
                    orderId={activeOrderId}
                />
            )}

            {/* Journey Cinematic Interactive Preview */}
            {showJourneyCinematic && calculatedPath && calculatedPath.length > 0 && (
                <JourneyCinematic 
                    path={calculatedPath} 
                    onClose={() => setShowJourneyCinematic(false)} 
                />
            )}

            {/* Tourism Detail Modal */}
            {selectedTourismSpot && (
                <TourismDetailView 
                    spot={selectedTourismSpot}
                    onClose={() => setSelectedTourismSpot(null)}
                    userLocation={fromLocation ? { lat: fromLocation.lat, lng: fromLocation.lng } : undefined}
                    onBookPackage={async (pkg, spot) => {
                        let backendBookingId = null;

                        // Also create a TourismBooking in backend for vendor assignment flow
                        try {
                            const token = getAuthToken();
                            const res = await fetch(`${API_BASE_URL}/api/tourism/book`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': token || '' },
                                body: JSON.stringify({
                                    packageId: pkg.id,
                                    scheduledDate: new Date().toISOString()
                                })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                backendBookingId = data.booking?._id;
                            }
                        } catch (e) {
                            console.warn('Tourism booking API call failed (offline?):', e);
                        }

                        // Use real backend ID if possible to sync cancellations
                        const ticketId = backendBookingId ? `TOUR-${backendBookingId}` : 'TOUR-' + Math.floor(1000 + Math.random() * 9000);
                        
                        const newTicket: Ticket = {
                            id: ticketId,
                            userId: user.id,
                            from: 'Current Location',
                            to: spot.name,
                            fromDetails: '',
                            toDetails: pkg.title,
                            status: 'BOARDED' as TicketStatus,
                            paymentMethod: 'ONLINE' as PaymentMethod,
                            timestamp: Date.now(),
                            passengerCount: 1,
                            totalPrice: pkg.price,
                            routePath: ['Pickup Point', spot.name],
                            hasLivestock: false,
                            hasInsurance: false,
                            driverId: pkg.providerName
                        };

                        // Fire-and-forget: save to local transport ledger
                        saveTicket(newTicket).catch(e => console.warn('Tourism ticket save failed:', e));
                        setActiveTickets(prev => [newTicket, ...prev]);
                        
                        // Close the detail view
                        setSelectedTourismSpot(null);
                        
                        // Activate tourism tracker at UserApp level IMMEDIATELY
                        if (setActiveTourismTracker) {
                            setActiveTourismTracker(newTicket);
                        }
                    }}
                />
            )}

            <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} onConfirm={() => setShowQRModal(false)} title="My Ticket QR" confirmLabel="Close">
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-2 rounded-xl"><QrCode size={180} className="text-black" /></div>
                    <p className="text-xs font-mono mt-4 text-slate-500">{qrData}</p>
                    <p className="text-sm font-bold mt-2 dark:text-white">Show to Conductor</p>
                </div>
            </Modal>

            {/* NEW FLASH PASS VERIFICATION SYSTEM */}
            <FlashPass
                isOpen={!!showFlashPassModal}
                onClose={() => setShowFlashPassModal(null)}
                ticket={showFlashPassModal}
                userName={user.name}
            />

            {showToast && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-2 shadow-2xl scale-125">
                        <SuccessAnimation message="Booking Confirmed!" subMessage="Have a safe journey!" />
                    </div>
                </div>
            )}



        </>
    );
};

export default PassengerView;
