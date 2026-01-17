
import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, PaymentMethod, User, LocationData, Pass, SeatConfig, ChurnRiskAnalysis, RentalVehicle, RentalBooking, ParcelBooking, Wallet as WalletType, GeoLocation, CrowdForecast, DynamicFareResult, MandiRate, JobOpportunity, MarketItem, PilgrimagePackage, NewsItem, Shop, Product, LostItem, LeafDiagnosisResult, BusState } from '../types';
import { RENTAL_FLEET, TRANSLATIONS } from '../constants';
import { generateTicketId, generatePassId, generateRentalId, generateParcelId, saveTicket, savePass, getStoredTickets, getMyPasses, bookRental, bookParcel, getAllParcels, getActiveBuses, sendSOS } from '../services/transportService';
import { calculateDynamicFare, getCrowdForecast, formatCurrency, analyzeChurnRisk, calculateLogisticsCost, getMandiRates, getJobs, getMarketItems, getPackages, verifyGenderBiometrics, diagnoseLeaf, estimateParcelSize, findPoolMatches } from '../services/mlService';
import { getWallet, mintPassNFT, createEscrow, earnGramCoin, spendGramCoin } from '../services/blockchainService';
import { signTransaction, updateLastLocation } from '../services/securityService';
import { fetchSmartRoute } from '../services/graphService';
import { isOnline, queueAction } from '../services/offlineService';
import { Button } from './Button';
import { LiveTracker } from './LiveTracker';
import { LocationSelector } from './LocationSelector';
import { Modal } from './Modal';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { ARFinder } from './ARFinder';
import { BottomNav } from './BottomNav';
import { UserProfile } from './UserProfile';
import { MarketingView } from './MarketingView';
import { FoodLinkHome } from './FoodLinkHome';
import { RouteMap } from './RouteMap';
import { PaymentHistory } from './PaymentHistory';
import { VendorMapView } from './VendorMapView';
import { VendorAdmin } from './VendorAdmin';
import { Ticket as TicketIcon, Check, Bus, Route, User as UserIcon, Car, Package, ShieldCheck, Gem, WifiOff, ArrowLeft, Store, Camera, AlertOctagon, Coins, Volume2, VolumeX, Users, Gift, QrCode, CreditCard, Banknote, Siren, Bike, Replace, Mic, Utensils, MapPin } from 'lucide-react';

interface PassengerViewProps {
    user: User;
    lang: 'EN' | 'HI';
}

export const PassengerView: React.FC<PassengerViewProps> = ({ user, lang }) => {
    const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];

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

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

    const [showPaymentGateway, setShowPaymentGateway] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [upcomingBuses, setUpcomingBuses] = useState<BusState[]>([]);

    // QR Modal
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrData, setQrData] = useState<string>('');

    // New Feature State
    const [hasLivestock, setHasLivestock] = useState(false);
    const [hasInsurance, setHasInsurance] = useState(false);
    const [lostItems, setLostItems] = useState<LostItem[]>([]);
    const [drKisanResult, setDrKisanResult] = useState<LeafDiagnosisResult | null>(null);
    const [isScanningLeaf, setIsScanningLeaf] = useState(false);
    const [isScanningParcel, setIsScanningParcel] = useState(false);
    const [logisticsPoolFound, setLogisticsPoolFound] = useState(false);
    const [voiceGuideActive, setVoiceGuideActive] = useState(false);

    // GRAM-SETU & SOS & SURAKSHA KAVACH
    const [gramSetuMode, setGramSetuMode] = useState(false);
    const [showSOSModal, setShowSOSModal] = useState(false);
    const [sosCountdown, setSosCountdown] = useState(5);
    const [sosSent, setSosSent] = useState(false);

    // SURAKSHA KAVACH (AUDIO RECORDING) STATE
    const [isAudioShieldActive, setIsAudioShieldActive] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const [cargoSubsidy, setCargoSubsidy] = useState(0);

    const [isGift, setIsGift] = useState(false);
    const [recipientPhone, setRecipientPhone] = useState('');

    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [showAR, setShowAR] = useState(false);
    const [mandiRates, setMandiRates] = useState<MandiRate[]>([]);
    const [didiMode, setDidiMode] = useState(false);
    const [showChuttaModal, setShowChuttaModal] = useState(false);
    const [isDidiVerified, setIsDidiVerified] = useState(user.isDidiVerified || false);
    const [showDidiVerification, setShowDidiVerification] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'START' | 'VOICE' | 'FACE' | 'PROCESSING' | 'SUCCESS' | 'FAIL'>('START');

    const [jobs, setJobs] = useState<JobOpportunity[]>([]);
    const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
    const [packages, setPackages] = useState<PilgrimagePackage[]>([]);
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
        setMarketItems(getMarketItems());
        setPackages(getPackages());

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

        const interval = setInterval(() => {
            fetchTickets();
            fetchPasses();
            fetchWallet();
            fetchParcels();
            filterUpcomingBuses();
        }, 5000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', () => setIsOfflineMode(false));
            window.removeEventListener('offline', () => setIsOfflineMode(true));
        };
    }, [user.id, fromLocation]);

    // SURAKSHA KAVACH: Automatic Recording on Trip Start
    useEffect(() => {
        // If user is on an active trip (BOARDED), start recording if enabled
        const isOnTrip = activeTickets.some(t => t.status === 'BOARDED');

        if (isOnTrip && !isAudioShieldActive && (didiMode || user.gender === 'FEMALE')) {
            startAudioShield();
        } else if (!isOnTrip && isAudioShieldActive) {
            stopAudioShield();
        }
    }, [activeTickets, didiMode, user.gender]);

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
        if (currentView === 'BOOK_PARCEL' || marketBooking) {
            setLogisticsPrice(calculateLogisticsCost(logisticsItemType, logisticsWeight));
            const hasPool = findPoolMatches(fromLocation?.name || '');
            setLogisticsPoolFound(hasPool);
        }

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

                    let basePricing = 0;
                    if (gramSetuMode) {
                        basePricing = routeData.distance <= 5 ? 10 : 10 + ((routeData.distance - 5) * 15);
                    } else {
                        const df = await calculateDynamicFare(routeData.distance, Date.now());
                        basePricing = df.totalFare;
                        setFareDetails(df);
                    }

                    if (gramSetuMode) {
                        setFareDetails({
                            totalFare: basePricing,
                            baseFare: basePricing,
                            surgeAmount: 0,
                            discountAmount: 0,
                            isRushHour: false,
                            isHappyHour: false,
                            message: "Feeder Rate"
                        });
                    }

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

    }, [fromLocation, toLocation, seatConfig, isBuyingPass, churnAnalysis, currentView, selectedVehicle, tripType, logisticsWeight, logisticsItemType, passType, marketBooking, gramSetuMode]);

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

    const handleDidiToggle = () => {
        speak(didiMode ? "Didi Rath Disabled" : "Didi Rath Enabled");
        if (didiMode) {
            setDidiMode(false);
            return;
        }
        if (!isDidiVerified) {
            setVerificationStep('START');
            setShowDidiVerification(true);
        } else {
            setDidiMode(true);
        }
    };

    const handleGramSetuToggle = () => {
        setGramSetuMode(!gramSetuMode);
        speak(gramSetuMode ? "Switching to Main Bus Mode" : "Gram Setu Feeder Mode Active");
        if (!gramSetuMode) {
            // If activating, hint user to find nearest hub
            alert("Gram-Setu Active: Locating nearest E-Rickshaws for last-mile connectivity.");
        }
    };

    const triggerSOS = () => {
        setShowSOSModal(true);
        setSosSent(false);
        setSosCountdown(5);
        const timer = setInterval(() => {
            setSosCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSendSOS();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendSOS = async () => {
        setSosSent(true);
        // Create a Blob from the recorded audio chunks
        let audioBlobString = "";
        if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // Convert blob to base64 for MVP transmission (In real app, use FormData)
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                audioBlobString = reader.result as string;

                // SEND SOS to Server
                await sendSOS({
                    userId: user.id,
                    location: { lat: fromLocation?.lat || 0, lng: fromLocation?.lng || 0 }, // Fallback to last known
                    audioBlob: audioBlobString
                });
            }
        } else {
            // Send without audio if not recording
            await sendSOS({
                userId: user.id,
                location: { lat: fromLocation?.lat || 0, lng: fromLocation?.lng || 0 }
            });
        }

        console.log("CRITICAL: SOS BROADCAST SENT TO 12 NEARBY VEHICLES & POLICE");
        alert("SOS SENT! Nearby drivers and government ambulance have been alerted with your location and audio recording.");
    };

    const processBiometricCheck = async () => {
        setVerificationStep('PROCESSING');

        const voiceResult = await verifyGenderBiometrics('VOICE');
        if (!voiceResult.verified) {
            setVerificationStep('FAIL');
            return;
        }

        const faceResult = await verifyGenderBiometrics('FACE');
        if (!faceResult.verified) {
            setVerificationStep('FAIL');
            return;
        }

        setIsDidiVerified(true);
        setVerificationStep('SUCCESS');
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

        const totalCost = Math.max(0, ((fareDetails?.totalFare || 0) - cargoSubsidy) * passengerCount + (hasLivestock ? 20 : 0) + (hasInsurance ? 1 : 0));

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
                isDidiRath: didiMode,
                hasLivestock,
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
        const cost = Math.max(0, ((fareDetails?.totalFare || 0) - cargoSubsidy) * passengerCount + (hasLivestock ? 20 : 0) + (hasInsurance ? 1 : 0));

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
                isDidiRath: didiMode,
                hasLivestock,
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
        setHasLivestock(false);
        setHasInsurance(false);
        setIsGift(false);
        setRecipientPhone('');
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

                {/* WRAPPER FOR SCROLLABLE CONTENT WITH ANIMATION */}
                <div className="animate-fade-in">
                    {/* ... Header Area ... */}
                    {activeTab === 'HOME' && (
                        <div className="mb-6 px-4">
                            {/* Whisk 2.0: Dashboard Top Bar (Inspired by Image 1 & 3) */}
                            <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 super-rounded shadow-whisk-subtle border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <UserIcon size={20} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t('welcome')}</p>
                                        <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-none">{user.name.split(' ')[0]}</h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Balance</p>
                                        <div className="flex items-center gap-1 justify-end">
                                            <Gem size={14} className="text-yellow-500" />
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">₹{wallet?.balance || 0}</span>
                                        </div>
                                    </div>
                                    <button onClick={triggerSOS} className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-100 dark:border-red-900/50 text-red-600 pulse-heartbeat">
                                        <Siren size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Mode Selection Grid (Inspired by Image 3) */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                    { id: 'TRANSPORT', label: 'Ride', icon: Bus, color: 'bg-brand-50 text-brand-600 border-brand-100' },
                                    { id: 'MARKET', label: 'Haat', icon: Store, color: 'bg-orange-50 text-orange-600 border-orange-100' },
                                    { id: 'FOOD', label: 'Mess', icon: Utensils, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                    { id: 'SOS', label: 'Help', icon: ShieldCheck, color: 'bg-red-50 text-red-600 border-red-100' }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => {
                                            if (mode.id === 'SOS') triggerSOS();
                                            else {
                                                setAppMode(mode.id as any);
                                                speak(`${mode.label} Mode Active`);
                                            }
                                        }}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${appMode === mode.id
                                            ? `${mode.color} shadow-lg -translate-y-1 scale-105 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${mode.id === 'TRANSPORT' ? 'ring-brand-500' : (mode.id === 'MARKET' ? 'ring-orange-500' : 'ring-emerald-500')}`
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-xl ${appMode === mode.id ? 'bg-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                            <mode.icon size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{mode.label}</span>
                                    </button>
                                ))}
                            </div>
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
                                />
                    )}

                    {activeTab === 'PASSES' && (
                        <div className="px-4 py-6 space-y-6">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <TicketIcon className="text-brand-500" /> My Passes
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
                                        <div key={pass.id} className="ticket-stub relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-whisk-float super-rounded p-6">
                                            {/* Left Perforation Detail */}
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2 border border-slate-100 dark:border-slate-800"></div>
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2 border border-slate-100 dark:border-slate-800"></div>
                                            <div className="absolute top-1/2 left-0 right-0 border-t-2 border-dashed border-slate-100 dark:border-slate-800 -translate-y-1/2 mx-4"></div>

                                            <div className="relative z-10 flex flex-col justify-between h-full">
                                                <div className="mb-8">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">{pass.type} PASS</p>
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
                                                        className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 hover:scale-105 transition-transform"
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
                                <button onClick={() => { setActiveTab('HOME'); setCurrentView('DASHBOARD'); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><ArrowLeft size={20} /></button>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <div className="bg-orange-500 p-1.5 rounded-lg text-white shadow-lg shadow-orange-500/20"><Package size={20} /></div>
                                    CargoLink
                                </h2>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 super-rounded shadow-whisk-float border border-slate-100 dark:border-slate-800 animate-fade-in-up">
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
                                                { id: 'BOX_SMALL', label: 'Mini Van', cap: '50kg', icon: Package, color: 'text-orange-600' },
                                                { id: 'SACK_GRAIN', label: 'E-Rickshaw', cap: '200kg', icon: Bike, color: 'text-yellow-600' },
                                                { id: 'HEAVY_LORRY', label: 'Truck', cap: '2000kg', icon: Bus, color: 'text-blue-600' }
                                            ].map((v) => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        setLogisticsItemType(v.id as any);
                                                        setLogisticsWeight(v.id === 'BOX_SMALL' ? 5 : (v.id === 'SACK_GRAIN' ? 50 : 500));
                                                    }}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${logisticsItemType === v.id
                                                            ? 'bg-orange-50 border-orange-500 shadow-lg -translate-y-1'
                                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-orange-200'
                                                        }`}
                                                >
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
                                            <span className="text-sm font-bold text-orange-600">{logisticsWeight} kg</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max={logisticsItemType === 'HEAVY_LORRY' ? 2000 : 500}
                                            value={logisticsWeight}
                                            onChange={(e) => setLogisticsWeight(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[8px] font-bold text-slate-400 capitalize">Min Load</span>
                                            <span className="text-[8px] font-bold text-slate-400 capitalize">Full Capacity</span>
                                        </div>
                                    </div>

                                    {logisticsPoolFound && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-800 animate-pulse">
                                            <Users size={18} className="text-emerald-600" />
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">POOLING ACTIVE</p>
                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-0.5">30% discount applied for shared route.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2">
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Estimated Fare</p>
                                            <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{logisticsPoolFound ? (logisticsPrice * 0.7).toFixed(0) : logisticsPrice}</p>
                                        </div>
                                        <Button onClick={initiateBook} className="px-8 super-rounded bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-500/20" disabled={!fromLocation || !toLocation}>
                                            Book Parcel
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {myParcels.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-slate-500 text-sm uppercase">Active Parcels</h3>
                                    {myParcels.map(p => (
                                        <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-50 dark:bg-orange-900/30 p-2.5 rounded-full text-orange-600">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{p.from} → {p.to}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{p.status}</p>
                                                </div>
                                            </div>
                                            <button className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-bold text-slate-600 hover:bg-slate-200">Track</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {currentView === 'BOOK_RENTAL' && activeTab === 'HOME' && (
                        <div className="px-4 py-6 space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ArrowLeft size={20} /></button>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><Car className="text-indigo-500" /> Book Charter</h2>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-lg border border-slate-100 dark:border-slate-800">
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
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedVehicle?.id === v.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200'}`}
                                        >
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
                                    <div className="flex justify-end gap-2 -mt-2 mb-2 overflow-x-auto scrollbar-hide">
                                        {/* Gram-Setu Toggle */}
                                        <button onClick={handleGramSetuToggle} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shadow-sm ${gramSetuMode ? 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-yellow-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                            <Bike size={12} className={gramSetuMode ? "text-yellow-600" : ""} />
                                            {gramSetuMode ? 'Gram-Setu Active' : 'Feeder Mode'}
                                        </button>

                                        <button onClick={handleDidiToggle} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shadow-sm ${didiMode ? 'bg-pink-100 border-pink-500 text-pink-700 shadow-pink-200 ring-2 ring-pink-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                            <ShieldCheck size={12} className={didiMode ? "text-pink-600 animate-pulse" : ""} />
                                            {didiMode ? 'Didi Rath Active' : 'Didi Rath'}
                                        </button>
                                    </div>

                                    {/* REDESIGNED ACTIVE TRIP CARD (Whisk 2.0 Ticket Stub) */}
                                    {activeTickets.length > 0 && (
                                        <div className="ticket-stub relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-whisk-float super-rounded mb-6">
                                            {/* Top Perforation Area */}
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-indigo-500 to-brand-600"></div>

                                            <div className="p-5 relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t('active_trip')}</span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                                                            {activeTickets[0].from} <span className="text-slate-300 mx-1">→</span> {activeTickets[0].to}
                                                        </h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bus 404</p>
                                                        <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">₹{activeTickets[0].totalPrice}</p>
                                                    </div>
                                                </div>

                                                {/* Live Tracker Integration */}
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
                                                    <LiveTracker desiredPath={activeTickets[0].routePath} layout="HORIZONTAL" showHeader={false} />
                                                </div>

                                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold">Ticket ID</span>
                                                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">#{activeTickets[0].id.slice(-6).toUpperCase()}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleShowQR(activeTickets[0].id)}
                                                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                                                    >
                                                        <QrCode size={14} />
                                                        Show Ticket
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ... (Rest of existing dashboard UI) ... */}
                                    {/* Removed overflow-hidden to allow dropdown to display */}
                                    <div className="bg-white dark:bg-slate-900 p-6 super-rounded shadow-whisk-float border border-slate-100 dark:border-slate-800 relative animate-fade-in-up">
                                        <div className="flex flex-col gap-4 mb-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                                    {gramSetuMode ? <Bike className="text-yellow-600" /> : <Bus className="text-brand-600" />}
                                                    {gramSetuMode ? 'Village Feeder' : 'Plan Your Journey'}
                                                </h3>
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                    <button onClick={() => { setIsBuyingPass(false); setSeatConfig('SEAT'); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${!isBuyingPass ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Ticket</button>
                                                    <button onClick={() => { setIsBuyingPass(true); setSeatConfig('SEAT'); }} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${isBuyingPass ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Pass</button>
                                                </div>
                                            </div>

                                            {/* Whisk 2.0: Trip Type Toggle (Inspired by Image 4) */}
                                            {!isBuyingPass && (
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                                                    <button onClick={() => setTripType('ONE_WAY')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${tripType === 'ONE_WAY' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>One-Way</button>
                                                    <button onClick={() => setTripType('ROUND_TRIP')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${tripType === 'ROUND_TRIP' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Round-Trip</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <LocationSelector label={gramSetuMode ? "FROM (VILLAGE)" : "FROM"} icon={<div className={`w-2 h-2 rounded-full ${gramSetuMode ? 'bg-yellow-600 ring-4 ring-yellow-100' : 'bg-brand-600 ring-4 ring-brand-100'} dark:ring-opacity-30`}></div>} onSelect={setFromLocation} />
                                            {upcomingBuses.length > 0 && fromLocation && (
                                                <div className="absolute right-4 top-[85px] z-20 flex flex-col items-end">
                                                    {upcomingBuses.slice(0, 1).map(bus => (
                                                        <div key={bus.driverId} className="bg-white dark:bg-slate-800 shadow-lg rounded-full p-1 pr-3 flex items-center gap-2 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-right">
                                                            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full"><Bus size={14} /></div>
                                                            <div className="text-right"><p className="text-[9px] text-slate-400 font-bold uppercase">Approaching</p><p className="text-xs font-bold text-slate-800 dark:text-white">{(bus.capacity - bus.occupancy)} Seats</p></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="absolute left-[27px] top-[100px] bottom-[100px] w-0.5 bg-gradient-to-b from-brand-300 to-emerald-300 -z-10 opacity-50"></div>
                                            <LocationSelector label={gramSetuMode ? "TO (HIGHWAY HUB)" : "TO"} icon={<div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30"></div>} onSelect={setToLocation} />
                                        </div>

                                        {calculatedPath.length > 0 && (
                                            <div className={`mt-6 animate-fade-in p-4 rounded-xl ${gramSetuMode ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                <div className="flex justify-between items-end mb-3">
                                                    <label className={`text-xs font-bold uppercase tracking-wider ${gramSetuMode ? 'text-yellow-700' : 'text-slate-500'}`}>Route Landmarks ({calculatedPath.length})</label>
                                                    {tripDistance !== null && (
                                                        <span className="text-xs font-bold bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border border-brand-100 dark:border-brand-900">
                                                            <Route size={12} /> {tripDistance.toFixed(1)} km
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                    {calculatedPath.map((stop, i) => (
                                                        <div key={i} className="min-w-[60px] flex flex-col items-center gap-2">
                                                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold shadow-sm ${gramSetuMode ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-white dark:bg-slate-700 border-slate-200 text-slate-400'}`}>{stop.substring(0, 2).toUpperCase()}</div>
                                                            <span className="text-[9px] text-slate-500 truncate w-full text-center">{stop}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* INTERACTIVE ROUTE MAP */}
                                        {pathDetails.length > 1 && fromLocation && toLocation && (
                                            <div className="mt-4 animate-fade-in">
                                                <RouteMap
                                                    pathCoordinates={pathDetails}
                                                    pickupLocation={{ lat: fromLocation.lat, lng: fromLocation.lng, name: fromLocation.name }}
                                                    dropoffLocation={{ lat: toLocation.lat, lng: toLocation.lng, name: toLocation.name }}
                                                    height="200px"
                                                    showControls={true}
                                                />
                                                <div className="flex justify-between mt-2 px-1">
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Actual Road Route
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        ETA: ~{Math.round((tripDistance || 0) / 30 * 60)} min
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-6 flex items-center justify-between p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-900/50">
                                            <div className="flex items-center gap-2"><Gift size={16} className="text-brand-500" /><span className="text-sm font-bold text-brand-800 dark:text-brand-200">Gift Ticket to a friend?</span></div>
                                            <div onClick={() => setIsGift(!isGift)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${isGift ? 'bg-brand-500' : 'bg-slate-300'}`}><div className={`absolute top-1 bottom-1 w-3 bg-white rounded-full transition-all ${isGift ? 'left-6' : 'left-1'}`}></div></div>
                                        </div>
                                        {isGift && (<div className="mt-2 animate-fade-in"><input type="tel" placeholder="Enter Friend's Phone Number" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-brand-200 dark:border-brand-800 outline-none text-sm" /></div>)}

                                        {/* Whisk 2.0: Schedule Comparison List (Inspired by Image 1) */}
                                        {fareDetails && (
                                            <div className="mt-6 space-y-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Available Rides</label>
                                                {[
                                                    { time: '08:00', duration: '45m', type: 'Express Bus', price: fareDetails.totalFare, logo: Bus, color: 'text-brand-600' },
                                                    { time: '08:30', duration: '55m', type: 'Regular Bus', price: Math.round(fareDetails.totalFare * 0.8), logo: Bus, color: 'text-slate-500' },
                                                    { time: '09:00', duration: '40m', type: 'Shared Cab', price: Math.round(fareDetails.totalFare * 1.5), logo: Car, color: 'text-indigo-600' },
                                                ].map((ride, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:border-brand-300 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right border-r border-slate-100 dark:border-slate-700 pr-4">
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{ride.time}</p>
                                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{ride.duration}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-900 ${ride.color}`}>
                                                                    <ride.logo size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{ride.type}</p>
                                                                    <p className="text-[9px] text-slate-400 font-medium">Daily Service</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">₹{ride.price}</p>
                                                            <button className="text-[9px] font-bold text-slate-400 uppercase mt-1 group-hover:text-brand-500">Details →</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {fareDetails && (
                                            <div className="mt-6">
                                                <Button onClick={initiateBook} fullWidth disabled={!toLocation} className={`py-4 shadow-xl ${gramSetuMode ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'shadow-brand-500/20'}`}>
                                                    <div className="flex items-center justify-between w-full"><span>{gramSetuMode ? 'Hail E-Rickshaw' : (isBuyingPass ? `Buy ${passType.replace('_', ' ')} Pass` : 'Book Ticket')}</span><span className="bg-white/20 px-2 py-1 rounded text-sm">{formatCurrency(isBuyingPass ? passPrice : fareDetails.totalFare * passengerCount)}</span></div>
                                                </Button>
                                                {fareDetails.message && <p className="text-center text-[10px] text-slate-400 mt-2">{fareDetails.message}</p>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <button onClick={() => setCurrentView('BOOK_RENTAL')} className="bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 p-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm group">
                                            <div className="bg-indigo-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Car size={16} /></div><span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">Book Charter</span>
                                        </button>
                                        <button onClick={() => { setActiveTab('LOGISTICS'); setCurrentView('BOOK_PARCEL'); }} className="bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 border border-orange-200 dark:border-orange-800 p-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm group">
                                            <div className="bg-orange-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform"><Package size={16} /></div><span className="text-xs font-bold text-orange-800 dark:text-orange-200">Send Parcel</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <BottomNav activeTab={activeTab as any} onTabChange={(t) => handleTabChange(t)} />

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
                                    <p className="text-sm font-bold dark:text-white">Online Payment</p>
                                    <p className="text-[10px] text-slate-500">UPI, Cards, Netbanking</p>
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
                                    <p className="text-sm font-bold dark:text-white">Pay Cash to Driver</p>
                                    <p className="text-[10px] text-slate-500">Driver verifies & collects cash</p>
                                </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === PaymentMethod.CASH ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}></div>
                        </div>
                    </div>
                </div>
            </Modal>

            {showPaymentGateway && activeOrderId && (
                <PaymentGatewayModal
                    isOpen={showPaymentGateway}
                    onClose={() => setShowPaymentGateway(false)}
                    onSuccess={handlePaymentGatewaySuccess}
                    amount={isBuyingPass ? passPrice : (fareDetails?.totalFare || 0) * passengerCount}
                    orderId={activeOrderId}
                />
            )}

            <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} onConfirm={() => setShowQRModal(false)} title="My Ticket QR" confirmLabel="Close">
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-2 rounded-xl"><QrCode size={180} className="text-black" /></div>
                    <p className="text-xs font-mono mt-4 text-slate-500">{qrData}</p>
                    <p className="text-sm font-bold mt-2 dark:text-white">Show to Conductor</p>
                </div>
            </Modal>

            <Modal isOpen={showChuttaModal} onClose={() => setShowChuttaModal(false)} onConfirm={() => setShowChuttaModal(false)} title="Digital Chutta" confirmLabel="Done">
                <div className="text-center space-y-4">
                    <div className="text-4xl">🪙</div>
                    <h3 className="font-bold dark:text-white">Balance: ₹12</h3>
                    <p className="text-sm text-slate-500">Don't have change? Use your digital chutta wallet for small payments.</p>
                    <Button fullWidth onClick={() => alert("Added ₹10 via UPI")}>Add Money</Button>
                </div>
            </Modal>

            {/* SOS MODAL */}
            <Modal
                isOpen={showSOSModal}
                onClose={() => setShowSOSModal(false)}
                onConfirm={handleSendSOS}
                title="EMERGENCY SOS"
                confirmLabel={sosSent ? "Alert Sent!" : `Sending in ${sosCountdown}s`}
                hideFooter={true}
            >
                <div className="text-center p-4">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <Siren size={48} className="text-red-600 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-red-600 mb-2">Jeevan-Raksha Alert</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                        Broadcasting your location to all nearby vehicles (Ambulance, Taxi, SUV).
                        <br /><span className="text-xs text-red-500 font-bold mt-2 block">Audio is being recorded.</span>
                    </p>

                    {sosSent ? (
                        <div className="bg-green-100 text-green-800 p-4 rounded-xl font-bold animate-in slide-in-from-bottom-2">
                            Help is on the way!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Button fullWidth variant="danger" onClick={handleSendSOS}>SEND NOW</Button>
                            <Button fullWidth variant="secondary" onClick={() => setShowSOSModal(false)}>Cancel</Button>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={showDidiVerification} onClose={() => { setShowDidiVerification(false); setVerificationStep('START'); }} onConfirm={() => { }} title="Didi Rath Verification" confirmLabel="" hideFooter={true}>
                <div className="text-center space-y-6">
                    {verificationStep === 'START' && (
                        <div className="animate-fade-in">
                            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={40} className="text-pink-600" /></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Women Safety Mode</h3>
                            <p className="text-sm text-slate-500 mb-6">To enable Didi Rath (Pink Bus), we need to verify your identity using Voice & Face biometrics.</p>
                            <Button fullWidth onClick={processBiometricCheck} className="bg-pink-600 hover:bg-pink-700 text-white">Start Verification</Button>
                        </div>
                    )}
                    {verificationStep === 'PROCESSING' && (
                        <div className="py-8 animate-fade-in">
                            <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Verifying Biometrics...</p>
                            <p className="text-xs text-slate-400 mt-2">Analyzing voice pitch and facial features...</p>
                        </div>
                    )}
                    {verificationStep === 'SUCCESS' && (
                        <div className="py-4 animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Check size={40} className="text-emerald-600" /></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Verified Successfully!</h3>
                            <p className="text-sm text-slate-500 mt-2">Didi Rath mode is now active.</p>
                            <Button fullWidth onClick={() => { setShowDidiVerification(false); setDidiMode(true); }} className="mt-6 bg-emerald-600">Continue</Button>
                        </div>
                    )}
                    {verificationStep === 'FAIL' && (
                        <div className="py-4 animate-fade-in">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertOctagon size={40} className="text-red-600" /></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Verification Failed</h3>
                            <p className="text-sm text-slate-500 mt-2">We could not verify your gender biometrics. Please try again in a quiet environment.</p>
                            <div className="flex gap-2 mt-6"><Button variant="secondary" onClick={() => setShowDidiVerification(false)} fullWidth>Cancel</Button><Button onClick={() => setVerificationStep('START')} fullWidth className="bg-pink-600">Retry</Button></div>
                        </div>
                    )}
                </div>
            </Modal>

            {showToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
                    <div className="bg-emerald-500 rounded-full p-1"><Check size={14} /></div><span className="font-bold text-sm">Booking Successful!</span>
                </div>
            )}
        </>
    );
};
