/**
 * GramMandi Home - Complete Food Ecosystem
 * Farm to Consumer Platform
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Wheat, Milk, Truck, Warehouse, ShoppingCart, Users,
    Plus, Search, MapPin, Star, Clock, Phone, ChevronRight, Filter, Leaf,
    TrendingUp, Package, DollarSign, BarChart3, RefreshCw, Eye, Check,
    ShieldCheck, Map, History, Globe, Sparkles, X, Newspaper
} from 'lucide-react';
import { ARMandiHUD } from './ARMandiHUD';
import { useTranslation } from '../services/i18n';

const OrganicToggle: React.FC<{ organic: boolean, onChange: (val: boolean) => void }> = ({ organic, onChange }) => {
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.setAttribute('aria-checked', organic ? 'true' : 'false');
        }
    }, [organic]);
    return (
        <button
            ref={ref}
            onClick={() => onChange(!organic)}
            className={`w-12 h-6 rounded-full transition-all ${organic ? 'bg-luxe-teal' : 'bg-slate-300'}`}
            role="switch"
            aria-checked="false"
            aria-label="Toggle organic produce"
        >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${organic ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
        </button>
    );
};

interface GramMandiHomeProps {
    user: User;
    onBack?: () => void;
}

type UserRole = 'FARMER' | 'VENDOR' | 'STORAGE' | 'LOGISTICS' | 'CONSUMER';
type ViewType = 'HOME' | 'FARMER_DASHBOARD' | 'PRODUCE_LIST' | 'CREATE_LISTING' | 'CONSUMER_SHOP' | 'ORDER_DETAIL' | 'STORAGE_BROWSE' | 'GROUP_BUY' | 'TRUST_TRACKER';

interface ProduceListing {
    id: string;
    farmerId: string;
    farmerName: string;
    category: string;
    crop: string;
    variety: string;
    grade: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    harvestDate: string;
    photos: string[];
    location: { village: string; district: string };
    organic: boolean;
    status: string;
    trustChain?: {
        harvestHash: string;
        batchId: string;
        qualityCertificate?: string;
        farmerExperience: number;
    };
}

interface Order {
    id: string;
    items: any[];
    totalAmount: number;
    status: string;
    createdAt: number;
}

export const GramMandiHome: React.FC<GramMandiHomeProps> = ({ user, onBack }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<ViewType>('CONSUMER_SHOP');
    const [userRole, setUserRole] = useState<UserRole>('CONSUMER');
    
    // Mandi Segregation State
    const [activeSection, setActiveSection] = useState<'KISAN' | 'KIRANA' | 'ORDERS'>('KISAN');
    const [activeStore, setActiveStore] = useState<any>(null);

    // Checkout & Order Flow State
    const [showCart, setShowCart] = useState(false);
    const [showAddressPrompt, setShowAddressPrompt] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [tempAddress, setTempAddress] = useState('');

    // Game-Changer Order/Tracking details & support states
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [supportMessages, setSupportMessages] = useState<any[]>([]);
    const [supportTyping, setSupportTyping] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');

    // Data states
    const [listings, setListings] = useState<ProduceListing[]>([]);
    const [myListings, setMyListings] = useState<ProduceListing[]>([]);
    const [orders, setOrders] = useState<any[]>(() => {
        const saved = localStorage.getItem('grammandi_orders');
        return saved ? JSON.parse(saved) : [];
    });
    const [cart, setCart] = useState<{ listing: ProduceListing; quantity: number }[]>([]);
    const [selectedListing, setSelectedListing] = useState<ProduceListing | null>(null);
    const [farmerStats, setFarmerStats] = useState<any>(null);
    const [consumerStats, setConsumerStats] = useState<any>(null);
    const [news, setNews] = useState<any[]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Whisk 3.0 State Extensions
    const [selectedCropGroup, setSelectedCropGroup] = useState<string | null>(null);
    const [selectedKiranaGroup, setSelectedKiranaGroup] = useState<string | null>(null);
    const [activeSortType, setActiveSortType] = useState<'PRICE_ASC' | 'DISTANCE_ASC' | 'RATING_DESC'>('PRICE_ASC');
    const [userLocation] = useState({ lat: 25.120, lng: 84.020 });

    // Store Items (Kirana Bazaar) with multiple shops for grouping demonstration
    const storeItems = React.useMemo(() => [
        { name: "Mustard Oil", shop: "Gupta Kirana", price: 140, unit: "L", image: "🛢️", tag: "Filtered", available: 20, rating: 4.6, village: "Main Chowk", coordinates: { lat: 25.122, lng: 84.021 } },
        { name: "Mustard Oil", shop: "Mishra Traders", price: 138, unit: "L", image: "🛢️", tag: "Filtered", available: 15, rating: 4.8, village: "Station Rd", coordinates: { lat: 25.125, lng: 84.025 } },
        { name: "Basmati Rice", shop: "Mishra Traders", price: 85, unit: "kg", image: "🍚", tag: "Premium", available: 50, rating: 4.8, village: "Station Rd", coordinates: { lat: 25.125, lng: 84.025 } },
        { name: "Basmati Rice", shop: "Gupta Kirana", price: 82, unit: "kg", image: "🍚", tag: "Premium", available: 30, rating: 4.6, village: "Main Chowk", coordinates: { lat: 25.122, lng: 84.021 } },
        { name: "Tur Dal", shop: "Gupta Kirana", price: 120, unit: "kg", image: "𫛘", tag: "Unpolished", available: 30, rating: 4.6, village: "Main Chowk", coordinates: { lat: 25.122, lng: 84.021 } },
        { name: "Tur Dal", shop: "Daily Needs", price: 125, unit: "kg", image: "𫛘", tag: "Unpolished", available: 25, rating: 4.5, village: "Kura Mod", coordinates: { lat: 25.120, lng: 84.018 } },
        { name: "Biscuits", shop: "Daily Needs", price: 40, unit: "pack", image: "🍪", tag: "Combo", available: 15, rating: 4.5, village: "Kura Mod", coordinates: { lat: 25.120, lng: 84.018 } },
        { name: "Biscuits", shop: "Gupta Kirana", price: 38, unit: "pack", image: "🍪", tag: "Combo", available: 40, rating: 4.6, village: "Main Chowk", coordinates: { lat: 25.122, lng: 84.021 } }
    ], []);

    // 3D Visual Asset Helper
    const getCropImage = (crop: string) => {
        const name = crop.toLowerCase();
        if (name.includes('tomato')) return '/images/tomato_3d.png';
        if (name.includes('onion')) return '/images/onion_3d.png';
        if (name.includes('potato')) return '/images/potato_3d.png';
        if (name.includes('wheat')) return '/images/wheat_3d.png';
        if (name.includes('milk')) return '/images/milk_3d.png';
        if (name.includes('mustard') || name.includes('oil')) return '/images/mustard_oil_3d.png';
        if (name.includes('rice') || name.includes('basmati')) return '/images/basmati_rice_3d.png';
        return '/images/generic_produce_3d.png';
    };

    // Dynamic Price-Trend Sparkline SVG generator
    const renderSparkline = (name: string, colorClass = "stroke-emerald-500") => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const prices = [];
        let base = 30 + (Math.abs(hash) % 50);
        for (let i = 0; i < 7; i++) {
            base += ((hash >> i) & 1 ? 1 : -1) * (1 + (Math.abs(hash + i) % 5));
            prices.push(Math.max(10, base));
        }
        
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;
        const points = prices.map((p, idx) => {
            const x = (idx / 6) * 50 + 2;
            const y = 20 - ((p - min) / range) * 16 + 2;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg className="w-14 h-6 overflow-visible text-slate-400 dark:text-slate-655" aria-hidden="true">
                <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={colorClass}
                    points={points}
                />
            </svg>
        );
    };

    // Haversine Geodistance Formula
    const calculateDistance = (loc1: { lat: number, lng: number }, loc2?: { lat: number, lng: number } | null) => {
        if (!loc2 || !loc2.lat || !loc2.lng) return 1.5;
        const R = 6371;
        const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
        const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c * 10) / 10;
    };

    const getSafeItemId = (item: any) => {
        if (!item) return '';
        if (item.id) return item.id;
        const name = (item.name || 'item').toLowerCase().replace(/\s+/g, '-');
        const shop = (item.shop || 'unknown').toLowerCase().replace(/\s+/g, '-');
        return `kirana-${name}-${shop}`;
    };

    // B.L.A.S.T. Compliant Cart Quantity Stepper & Deselect Logic
    const updateCartItemQuantity = (item: any, delta: number) => {
        setCart(prev => {
            const id = getSafeItemId(item);
            const existing = prev.find(c => getSafeItemId(c.listing) === id);

            if (existing) {
                const nextQty = existing.quantity + delta;
                if (nextQty <= 0) {
                    return prev.filter(c => getSafeItemId(c.listing) !== id);
                }
                return prev.map(c => getSafeItemId(c.listing) === id ? { ...c, quantity: nextQty } : c);
            }

            if (delta > 0) {
                return [...prev, { listing: item, quantity: delta }];
            }
            return prev;
        });
    };

    const getCartItemQuantity = (item: any) => {
        const id = getSafeItemId(item);
        const found = cart.find(c => getSafeItemId(c.listing) === id);
        return found ? found.quantity : 0;
    };

    // Form states for new listing
    const [newListing, setNewListing] = useState({
        category: 'VEGETABLE',
        crop: '',
        variety: '',
        grade: 'B',
        quantity: 0,
        unit: 'KG',
        pricePerUnit: 0,
        harvestDate: new Date().toISOString().split('T')[0],
        location: { village: '', block: '', district: 'Rohtas', pincode: '' },
        organic: false,
        pickupType: 'FARM_PICKUP'
    });

    useEffect(() => {
        // V5 Parity: Consumers land directly in the shop
        if (user.role === 'CONSUMER' as any) {
            setView('CONSUMER_SHOP');
        }
        fetchData();
    }, [user.role]);

    useEffect(() => {
        const handleBack = () => {
            if (activeStore) {
                setActiveStore(null);
            } else if (view === 'CREATE_LISTING') {
                setView('FARMER_DASHBOARD');
            } else if (view === 'TRUST_TRACKER') {
                setView('CONSUMER_SHOP');
            } else if (view === 'FARMER_DASHBOARD' || view === 'CONSUMER_SHOP' || view === 'HOME') {
                if (onBack) onBack();
            }
        };
        window.addEventListener('haat-back', handleBack);
        return () => window.removeEventListener('haat-back', handleBack);
    }, [view, onBack, activeStore]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };
            const role = user?.role || 'CONSUMER';

            const isFarmer = role === 'FARMER';
            const isConsumer = role === 'CONSUMER';

            // Build dynamic list of promises to fetch only required endpoints
            const promiseKeys: string[] = ['listings', 'news'];
            const promises: Promise<any>[] = [
                fetch(`${API_BASE_URL}/api/grammandi/produce/listings`),
                fetch(`${API_BASE_URL}/api/grammandi/news`)
            ];

            if (isFarmer) {
                promiseKeys.push('farmerStats');
                promises.push(fetch(`${API_BASE_URL}/api/grammandi/dashboard/farmer`, { headers }));
                promiseKeys.push('myListings');
                promises.push(fetch(`${API_BASE_URL}/api/grammandi/produce/my-listings`, { headers }));
            }
            if (isConsumer) {
                promiseKeys.push('consumerStats');
                promises.push(fetch(`${API_BASE_URL}/api/grammandi/dashboard/consumer`, { headers }));
                promiseKeys.push('orders');
                promises.push(fetch(`${API_BASE_URL}/api/grammandi/orders/my`, { headers }));
            }

            const responses = await Promise.all(promises);
            
            // Map responses back to states
            for (let i = 0; i < responses.length; i++) {
                const key = promiseKeys[i];
                const res = responses[i];
                if (res && res.ok) {
                    const data = await res.json();
                    if (key === 'listings') setListings(data);
                    else if (key === 'news') setNews(data);
                    else if (key === 'farmerStats') setFarmerStats(data);
                    else if (key === 'myListings') setMyListings(data);
                    else if (key === 'consumerStats') setConsumerStats(data);
                    else if (key === 'orders') {
                        setOrders(prev => {
                            const local = localStorage.getItem('grammandi_orders');
                            const localParsed = local ? JSON.parse(local) : [];
                            const combined = [...data];
                            
                            localParsed.forEach((lo: any) => {
                                if (!combined.some(o => o.id === lo.id)) {
                                    combined.push(lo);
                                }
                            });
                            
                            return combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                        });
                    }
                }
            }

        } catch (e) {
            console.error('GramMandi fetch error:', e);
        }
        setLoading(false);
    };


    const createListing = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/grammandi/produce/listing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newListing)
            });
            if (res.ok) {
                alert('Listing created successfully!');
                setView('FARMER_DASHBOARD');
                fetchData();
            }
        } catch (e) {
            console.error('Create listing error:', e);
        }
    };

    const addToCart = (listing: ProduceListing) => {
        setCart(prev => {
            const existing = prev.find(c => c.listing.id === listing.id);
            if (existing) {
                return prev.map(c => c.listing.id === listing.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { listing, quantity: 1 }];
        });
    };

    const placeOrder = async () => {
        try {
            const token = getAuthToken();
            const items = cart.map(c => ({ listingId: c.listing.id, quantity: c.quantity }));
            const res = await fetch(`${API_BASE_URL}/api/grammandi/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    items,
                    deliveryType: 'HOME_DELIVERY',
                    deliveryAddress: { line1: 'Test Address', city: 'Patna', pincode: '802101' },
                    paymentMethod: 'COD'
                })
            });
            if (res.ok) {
                alert('Order placed successfully!');
                setCart([]);
                fetchData();
            }
        } catch (e) {
            console.error('Order error:', e);
        }
    };

    const cartTotal = cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0);

    const filteredListings = listings.filter(l => {
        if (categoryFilter && l.category !== categoryFilter) return false;
        if (searchQuery && !l.crop.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Client-side Grouping Engine for Kisan Produce Listings
    const groupedProduce = React.useMemo(() => {
        const groups: Record<string, {
            crop: string;
            category: string;
            minPrice: number;
            maxPrice: number;
            unit: string;
            organic: boolean;
            listings: ProduceListing[];
        }> = {};

        filteredListings.forEach(l => {
            const cropKey = l.crop.trim().toLowerCase();
            if (!groups[cropKey]) {
                groups[cropKey] = {
                    crop: l.crop,
                    category: l.category,
                    minPrice: l.pricePerUnit,
                    maxPrice: l.pricePerUnit,
                    unit: l.unit,
                    organic: l.organic,
                    listings: []
                };
            }
            groups[cropKey].listings.push(l);
            if (l.pricePerUnit < groups[cropKey].minPrice) groups[cropKey].minPrice = l.pricePerUnit;
            if (l.pricePerUnit > groups[cropKey].maxPrice) groups[cropKey].maxPrice = l.pricePerUnit;
            if (l.organic) groups[cropKey].organic = true;
        });

        return Object.values(groups);
    }, [filteredListings]);

    // Client-side Grouping Engine for Kirana Bazaar Items
    const groupedKiranaItems = React.useMemo(() => {
        const groups: Record<string, {
            name: string;
            minPrice: number;
            maxPrice: number;
            unit: string;
            image: string;
            tag: string;
            listings: any[];
        }> = {};

        const filteredKirana = storeItems.filter(item => {
            if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });

        filteredKirana.forEach(item => {
            const nameKey = item.name.trim().toLowerCase();
            if (!groups[nameKey]) {
                groups[nameKey] = {
                    name: item.name,
                    minPrice: item.price,
                    maxPrice: item.price,
                    unit: item.unit,
                    image: item.image,
                    tag: item.tag,
                    listings: []
                };
            }
            groups[nameKey].listings.push(item);
            if (item.price < groups[nameKey].minPrice) groups[nameKey].minPrice = item.price;
            if (item.price > groups[nameKey].maxPrice) groups[nameKey].maxPrice = item.price;
        });

        return Object.values(groups);
    }, [searchQuery, storeItems]);

    const getCropEmoji = (category: string, crop: string) => {
        const map: Record<string, string> = {
            'Onion': '🧅', 'Tomato': '🍅', 'Potato': '🥔', 'Wheat': '🌾', 'Rice': '🍚',
            'Milk': '🥛', 'Fresh Milk': '🥛', 'Apple': '🍎', 'Mango': '🥭', 'Banana': '🍌'
        };
        return map[crop] || (category === 'VEGETABLE' ? '🥬' : category === 'FRUIT' ? '🍇' : category === 'GRAIN' ? '🌾' : category === 'DAIRY' ? '🥛' : '📦');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-deep)] pb-20 p-4 pt-6">
                <div className="flex items-center gap-2 mb-4 animate-pulse">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8 animate-pulse"></div>
                
                {/* Stats Skeleton */}
                <div className="flex gap-3 -mt-2 overflow-x-auto pb-4 mb-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[120px] p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg mb-3"></div>
                            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                            <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Skeleton */}
                <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4 animate-pulse"></div>
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/5 rounded-[24px] p-3 border border-white/5 animate-pulse">
                            <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl mb-3"></div>
                            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded mb-3"></div>
                            <div className="flex justify-between items-center mt-3">
                                <div className="w-12 h-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==================== CHECKOUT LOGIC ====================
    const handleAddToCart = (item: any) => {
        updateCartItemQuantity(item, 1);
    };

    const handleCheckout = () => {
        if (!user.address) {
            setShowAddressPrompt(true);
        } else {
            confirmOrder(user.address.line1 || 'Saved Address');
        }
    };

    const getLiveTrackingStage = (order: any) => {
        if (order.status === 'CANCELLED') return { stage: -1, text: 'Order Cancelled' };
        if (order.status === 'REFUNDED') return { stage: -2, text: 'Refunded (Dispute Closed)' };
        if (order.status === 'DELIVERED') return { stage: 3, text: 'Delivered' };
        
        const elapsed = Date.now() - (order.createdAt || Date.now());
        const mins = elapsed / (1000 * 60);
        
        if (mins < 1) return { stage: 0, text: 'Order Confirmed' };
        if (mins < 3) return { stage: 1, text: 'Preparing Items' };
        if (mins < 6) return { stage: 2, text: 'Out for Delivery' };
        return { stage: 3, text: 'Delivered' };
    };

    const cancelLocalOrder = (orderId: string) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            setOrders(prev => {
                const updated = prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o);
                localStorage.setItem('grammandi_orders', JSON.stringify(updated));
                return updated;
            });
            if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
                setSelectedOrderDetail(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
            }
        }
    };

    const handleDisputeSubmit = async (order: any, reason: string) => {
        if (!reason) return;
        setLoading(true);
        try {
            const refundAmount = order.totalAmount || order.total || 0;
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/user/transaction`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: refundAmount,
                    type: 'EARN',
                    desc: `Refund for Mandi Order Dispute (${order.id})`
                })
            });
            
            if (res.ok) {
                // Update order status locally and in localStorage
                setOrders(prev => {
                    const updated = prev.map(o => o.id === order.id ? { ...o, status: 'REFUNDED', disputeReason: reason } : o);
                    localStorage.setItem('grammandi_orders', JSON.stringify(updated));
                    return updated;
                });
                
                // Update selected details view
                setSelectedOrderDetail(prev => prev ? { ...prev, status: 'REFUNDED', disputeReason: reason } : null);
                
                alert(`Dispute Approved! Instant refund of ₹${refundAmount} has been credited to your VillageLink Wallet.`);
                
                // Dispatch custom profile reload event to sync balance in header instantly
                window.dispatchEvent(new Event('wallet-update'));
            } else {
                alert("Claim submission failed. Please try again.");
            }
        } catch (e) {
            console.error("Dispute error:", e);
            alert("Dispute processing encountered an error.");
        }
        setLoading(false);
        setShowDisputeModal(false);
    };

    const handleSupportQueryClick = (queryText: string) => {
        const userMsg = { sender: 'USER', text: queryText, timestamp: Date.now() };
        setSupportMessages(prev => [...prev, userMsg]);
        setSupportTyping(true);

        setTimeout(() => {
            let replyText = "Checking details...";
            const drName = selectedOrderDetail?.driver?.name || "Ramu Prasad";
            const drPhone = selectedOrderDetail?.driver?.phone || "+91 98765 43210";
            
            if (queryText.includes("Where is my delivery truck")) {
                replyText = `🚚 Real-time update: Delivery Partner ${drName} has loaded your order crates. Currently crossing the highway towards your village. Estimated delivery: 8-12 minutes.`;
            } else if (queryText.includes("Call delivery partner")) {
                replyText = `📞 You can contact your delivery partner ${drName} directly at ${drPhone}. He is driving vehicle: ${selectedOrderDetail?.driver?.vehicle || 'Mahindra Jeeto'}.`;
            } else if (queryText.includes("Report missing crop items")) {
                replyText = `🥬 Stale or missing item detected? You can tap the "Raise Dispute / Claim Refund" button in order details to get an instant refund credited to your Wallet.`;
            } else {
                replyText = `Agent connected. How can I assist you with order ${selectedOrderDetail?.id || 'mandi order'}?`;
            }

            const agentMsg = { sender: 'AGENT', text: replyText, timestamp: Date.now() };
            setSupportMessages(prev => [...prev, agentMsg]);
            setSupportTyping(false);
        }, 1000);
    };

    const confirmOrder = (address: string) => {
        const orderId = `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const total = cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0);
        
        const subtotal = total;
        const deliveryCharge = 30;
        const platformFee = Math.round(subtotal * 0.03);
        const totalAmount = subtotal + deliveryCharge + platformFee;
        
        // Premium Business Calculations
        const middlemanBypassed = Math.round(subtotal * 0.15); // Assume 15% middleman markup saved
        const carbonSaved = (subtotal * 0.015).toFixed(1); // Assume 15g CO2 saved per ₹ spent
        
        // Mock Driver Details
        const drivers = [
            { name: "Ramu Prasad", phone: "+91 98765 43210", rating: "4.9", vehicle: "Mahindra Jeeto (Auto)", img: "👨🏽‍✈️" },
            { name: "Satish Kumar", phone: "+91 99112 23344", rating: "4.8", vehicle: "Tata Ace (Chota Hathi)", img: "👨🏼‍✈️" },
            { name: "Vikram Singh", phone: "+91 94321 87654", rating: "4.7", vehicle: "E-Rickshaw Cargo", img: "👨🏾‍✈️" }
        ];
        const assignedDriver = drivers[Math.floor(Math.random() * drivers.length)];

        const newOrder = {
            id: orderId,
            items: [...cart],
            totalAmount,
            subtotal,
            deliveryCharge,
            platformFee,
            address,
            date: new Date().toLocaleString(),
            createdAt: Date.now(),
            sender: activeStore ? activeStore.name : 'VillageLink Seller',
            status: 'PENDING',
            middlemanBypassed,
            carbonSaved,
            driver: assignedDriver,
            pickupOtp: Math.floor(1000 + Math.random() * 9000).toString(),
            deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
            qrString: JSON.stringify({ id: orderId, total: totalAmount, sender: activeStore?.name || 'VillageLink Seller' })
        };
        
        setOrders(prev => {
            const updated = [newOrder, ...prev];
            localStorage.setItem('grammandi_orders', JSON.stringify(updated));
            return updated;
        });
        setCurrentOrder(newOrder);
        setCart([]);
        setShowAddressPrompt(false);
        setShowCart(false);
        setShowInvoice(true);
    };

    // ==================== STOREFRONT / PROFILE VIEW ====================
    if (activeStore) {
        return (
            <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-[950] pb-24 font-sans relative animate-fade-in z-50 -mt-4">
                {/* Store Cover Image / Gradient */}
                <div className={`w-full h-48 bg-gradient-to-br ${activeStore.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 dark:from-slate-[950] to-transparent"></div>
                </div>

                {/* Profile Details Overlay */}
                <div className="px-5 relative z-10 -mt-16 space-y-6">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-5 border border-white/50 dark:border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-5xl border-4 border-slate-50 dark:border-slate-[950] -mt-10 relative z-20">
                                {activeStore.img}
                            </div>
                            <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
                                <Star size={12} fill="currentColor" />
                                {activeStore.rating}
                            </div>
                        </div>
                        
                        <div className="mt-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{activeStore.name}</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                <MapPin size={14} className="text-emerald-500" />
                                {activeStore.village || activeStore.location} • {activeStore.type || activeStore.crop}
                            </p>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                            <button className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r ${activeStore.color} shadow-lg shadow-${activeStore.color.split('-')[1]}/30`}>
                                Message
                            </button>
                            <button className="flex-1 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                                <Phone size={14} /> Call Call
                            </button>
                        </div>
                    </div>

                    {/* Store Inventory Segment */}
                    <div>
                        <div className="flex justify-between items-end mb-4 px-1">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Full Catalog</h3>
                                <p className="text-xs text-slate-500 font-medium">All items available in store</p>
                            </div>
                            <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                <Filter size={12}/> Sort
                            </button>
                        </div>
                        
                        {/* Mock Inventory specific to the opened store */}
                        <div className="space-y-3">
                            {[1, 2, 3].map((item, idx) => (
                                <div key={idx} className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-[20px] p-3 border border-white/50 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="flex-shrink-0 w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                        📦
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-[15px] truncate pr-2">Sample Product {item}</h4>
                                            <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                                In Stock
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5.truncate">High quality verified product</p>
                                        <div className="mt-3 flex items-end justify-between">
                                            <div>
                                                <span className="text-base font-black text-slate-900 dark:text-white">₹{item.price || `1${item}0`}</span>
                                                <span className="text-[9px] text-slate-500 font-medium ml-0.5">/{item.unit || 'unit'}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleAddToCart({ id: `kirana-sample-${item}-${activeStore.name.toLowerCase().replace(/\s+/g, '-')}`, name: `Sample Product ${item}`, price: Number(`1${item}0`), unit: 'unit', shop: activeStore.name })}
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-xl font-bold text-[11px] hover:scale-105 transition-transform shadow-md"
                                            >
                                                Add +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== MAIN MANDI DASHBOARD ====================
    return (
        <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-[950] pb-24 pt-4 px-4 overflow-y-auto font-sans relative">
            {/* V5 Mesh Background (Nano Banana) */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-1000">
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-amber-300 to-orange-500 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 space-y-6 mt-2">
                
                {/* 1. Mandi Segment Selector (Kisan vs Kirana vs Orders) */}
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-2 flex gap-1 border border-white/40 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                    {/* Sliding Active Indicator */}
                    <div 
                        className="absolute inset-y-2 rounded-2xl bg-gradient-to-br transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm"
                        style={{
                            left: activeSection === 'KISAN' ? '8px' : activeSection === 'KIRANA' ? 'calc(33.333% + 4px)' : 'calc(66.666% + 2px)',
                            width: 'calc(33.333% - 10px)',
                            backgroundImage: activeSection === 'KISAN' ? 'linear-gradient(to bottom right, #34d399, #10b981)' : activeSection === 'KIRANA' ? 'linear-gradient(to bottom right, #fbbf24, #f59e0b)' : 'linear-gradient(to bottom right, #60a5fa, #4f46e5)',
                            boxShadow: activeSection === 'KISAN' ? '0 10px 15px -3px rgba(16, 185, 129, 0.2)' : activeSection === 'KIRANA' ? '0 10px 15px -3px rgba(245, 158, 11, 0.2)' : '0 10px 15px -3px rgba(79, 70, 229, 0.2)'
                        }}
                    ></div>

                    <button 
                        onClick={() => setActiveSection('KISAN')}
                        className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 ${activeSection === 'KISAN' ? 'text-white' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                    >
                        <Wheat size={18} className={`mb-0.5 transition-transform duration-300 ${activeSection === 'KISAN' ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-[11px] font-bold font-sans tracking-wide">Kisan Mandi</span>
                    </button>

                    <button 
                        onClick={() => setActiveSection('KIRANA')}
                        className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 ${activeSection === 'KIRANA' ? 'text-white' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                    >
                        <ShoppingCart size={18} className={`mb-0.5 transition-transform duration-300 ${activeSection === 'KIRANA' ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-[11px] font-bold font-sans tracking-wide">Gramin Bazaar</span>
                    </button>

                    <button 
                        onClick={() => setActiveSection('ORDERS')}
                        className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 ${activeSection === 'ORDERS' ? 'text-white' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                    >
                        <Package size={18} className={`mb-0.5 transition-transform duration-300 ${activeSection === 'ORDERS' ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-[11px] font-bold font-sans tracking-wide">My Orders</span>
                    </button>
                </div>
                
                {/* 2. Dynamic Content Area based on Selection */}
                {activeSection === 'KISAN' ? (
                    <div className="animate-fade-in space-y-6">
                        {/* Section Header */}
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-800 dark:from-emerald-400 dark:to-teal-300">
                                    Local Kisans
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Direct from local farms</p>
                            </div>
                            <button className="text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                View All
                            </button>
                        </div>

                        {/* Top Farmers Carousel */}
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {[
                                { name: "Ramesh Singh", village: "Dehri", crop: "Organic Vegetables", rating: 4.8, img: "👨🏽‍🌾", color: "from-emerald-400 to-teal-500" },
                                { name: "Sita Devi", village: "Amuar", crop: "Fresh Dairy", rating: 4.9, img: "👩🏽‍🌾", color: "from-blue-400 to-cyan-500" },
                                { name: "Kishan Kumar", village: "Parsa", crop: "Premium Grains", rating: 4.7, img: "👨🏽‍🌾", color: "from-amber-400 to-orange-500" }
                            ].map((farmer, idx) => (
                                <div key={idx} onClick={() => setActiveStore(farmer)} className="min-w-[160px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${farmer.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`}></div>
                                    <div className="text-3xl mb-3 bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {farmer.img}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{farmer.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1"><MapPin size={10}/> {farmer.village}</p>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{farmer.crop}</span>
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <Star size={10} fill="currentColor" />
                                            <span className="text-[10px] font-bold">{farmer.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inventory Grid Header */}
                        <div className="flex justify-between items-end px-1 mt-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fresh Harvest</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Recently listed by farmers</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
                                    <Filter size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Produce Grid - Grouped Client-Side */}
                        <div className="grid grid-cols-2 gap-3">
                            {groupedProduce.map((group: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedCropGroup(group.crop)}
                                    className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] overflow-hidden border border-white/30 dark:border-slate-800/40 shadow-sm flex flex-col justify-between cursor-pointer transform hover:scale-[1.03] active:scale-[0.97] hover:shadow-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 group animate-fade-in"
                                >
                                    {/* Crop Image Division - Fitted Full-Size */}
                                    <div className="w-full h-28 relative bg-gradient-to-br from-slate-950 to-slate-900 overflow-hidden border-b border-slate-900 dark:border-slate-850 flex items-center justify-center p-2">
                                        <img 
                                            src={getCropImage(group.crop)} 
                                            alt={group.crop} 
                                            className="w-full h-full object-contain mix-blend-screen transform group-hover:scale-105 transition-transform duration-500"
                                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                                        />
                                    </div>
                                    
                                    {/* Text Info (Name & Price Range) */}
                                    <div className="p-3.5 flex flex-col gap-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm capitalize truncate leading-tight">
                                            {group.crop}
                                        </h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prices</span>
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                {group.minPrice === group.maxPrice ? `₹${group.minPrice}` : `₹${group.minPrice} - ₹${group.maxPrice}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {groupedProduce.length === 0 && (
                            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 text-center text-sm text-slate-500">
                                No live produce listings available right now. Pull to refresh and try again.
                            </div>
                        )}
                    </div>
                ) : null}
                {activeSection === 'KIRANA' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Section Header */}
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-800 dark:from-amber-400 dark:to-orange-500">
                                    Local Shops
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Kirana & Daily Needs</p>
                            </div>
                            <button className="text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full">
                                View Maps
                            </button>
                        </div>

                        {/* Top Shops Carousel */}
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {[
                                { name: "Gupta Kirana", location: "Main Chowk", type: "Groceries", rating: 4.6, img: "🏪", color: "from-amber-400 to-orange-500" },
                                { name: "Mishra Traders", location: "Station Rd", type: "Groceries", rating: 4.8, img: "🏬", color: "from-rose-400 to-red-500" },
                                { name: "Daily Needs", location: "Kura Mod", type: "Groceries", rating: 4.5, img: "🛒", color: "from-purple-400 to-fuchsia-500" }
                            ].map((shop, idx) => (
                                <div key={idx} onClick={() => setActiveStore(shop)} className="min-w-[160px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${shop.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`}></div>
                                    <div className="text-3xl mb-3 bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {shop.img}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{shop.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1"><MapPin size={10}/> {shop.location}</p>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{shop.type}</span>
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <Star size={10} fill="currentColor" />
                                            <span className="text-[10px] font-bold">{shop.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Inventory Grid Header */}
                        <div className="flex justify-between items-end px-1 mt-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Store Items</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Packaged goods & staples</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"><Filter size={14}/></button>
                            </div>
                        </div>

                        {/* Store Product Grid - Grouped Client-Side */}
                        <div className="grid grid-cols-2 gap-3">
                            {groupedKiranaItems.map((group: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedKiranaGroup(group.name)}
                                    className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] overflow-hidden border border-white/30 dark:border-slate-800/40 shadow-sm flex flex-col justify-between cursor-pointer transform hover:scale-[1.03] active:scale-[0.97] hover:shadow-orange-500/10 hover:border-orange-500/20 transition-all duration-300 group animate-fade-in"
                                >
                                    {/* Product Image Division - Fitted Full-Size */}
                                    <div className="w-full h-28 relative bg-gradient-to-br from-slate-950 to-slate-900 overflow-hidden border-b border-slate-900 dark:border-slate-850 flex items-center justify-center p-2">
                                        <img 
                                            src={getCropImage(group.name)} 
                                            alt={group.name} 
                                            className="w-full h-full object-contain mix-blend-screen transform group-hover:scale-105 transition-transform duration-500"
                                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                                        />
                                    </div>
                                    
                                    {/* Text Info (Name & Price Range) */}
                                    <div className="p-3.5 flex flex-col gap-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm capitalize truncate leading-tight">
                                            {group.name}
                                        </h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prices</span>
                                            <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                                                {group.minPrice === group.maxPrice ? `₹${group.minPrice}` : `₹${group.minPrice} - ₹${group.maxPrice}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'ORDERS' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Section Header */}
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-800 dark:from-blue-400 dark:to-indigo-300">
                                    My Orders
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Track and manage your purchases</p>
                            </div>
                            <span className="text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
                                {orders.length} Total
                            </span>
                        </div>

                        {/* Orders List */}
                        <div className="space-y-4">
                            {orders.length === 0 ? (
                                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] p-8 text-center border border-white/30 dark:border-slate-800/40 shadow-sm flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4 shadow-inner">
                                        📦
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">No orders placed yet</h4>
                                    <p className="text-xs text-slate-500 max-w-[200px] mb-6">Explore Kisan Mandi or Kirana bazaar to buy fresh farm items!</p>
                                    <button 
                                        onClick={() => setActiveSection('KISAN')}
                                        className="bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        Start Sourcing
                                    </button>
                                </div>
                            ) : (
                                orders.map((order, idx) => {
                                    const stageInfo = getLiveTrackingStage(order);
                                    const isCancelled = order.status === 'CANCELLED';
                                    const isRefunded = order.status === 'REFUNDED';
                                    const isDelivered = order.status === 'DELIVERED' || stageInfo.stage === 3;
                                    
                                    let badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
                                    let statusText = "Pending";
                                    if (isCancelled) {
                                        badgeColor = "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";
                                        statusText = "Cancelled";
                                    } else if (isRefunded) {
                                        badgeColor = "bg-indigo-100 text-indigo-705 dark:bg-indigo-500/10 dark:text-indigo-400";
                                        statusText = "Refunded";
                                    } else if (isDelivered) {
                                        badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
                                        statusText = "Delivered";
                                    } else if (stageInfo.stage === 2) {
                                        badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
                                        statusText = "In Transit";
                                    } else if (stageInfo.stage === 1) {
                                        badgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400";
                                        statusText = "Preparing";
                                    }

                                    return (
                                        <div key={order.id || idx} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] border border-white/30 dark:border-slate-800/40 shadow-sm p-4 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-850 dark:text-white text-[15px] group-hover:text-blue-500 transition-colors">
                                                        {order.sender || 'VillageLink Seller'}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                                        {order.id} • {order.date ? order.date.split(',')[0] : 'Today'}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badgeColor}`}>
                                                    {statusText}
                                                </span>
                                            </div>

                                            <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl p-3 border border-slate-100/50 dark:border-slate-800/50">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {order.items && order.items.length > 0 ? (
                                                        order.items.map((it: any) => {
                                                            const itName = it.listing?.crop || it.listing?.name || it.crop || it.name;
                                                            return `${it.quantity}x ${itName}`;
                                                        }).join(', ')
                                                    ) : 'Farm Produce'}
                                                </p>
                                                
                                                {!isCancelled && !isRefunded && (
                                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                            🌿 {order.carbonSaved || '1.5'}kg CO2 saved
                                                        </span>
                                                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                                            🤝 ₹{order.middlemanBypassed || '45'} Direct Sourcing Bonus
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Amount Pay</span>
                                                    <span className="text-base font-black text-slate-900 dark:text-white">₹{order.totalAmount || order.total}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {order.status === 'PENDING' && !isCancelled && !isDelivered && (
                                                        <button 
                                                            onClick={() => cancelLocalOrder(order.id)}
                                                            className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 rounded-xl border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => setSelectedOrderDetail(order)}
                                                        className="text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl flex items-center gap-1 hover:opacity-90 transition-all shadow-md"
                                                    >
                                                        Track Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Mandi Khabar - News Section */}
                {news.length > 0 && (
                    <div className="animate-fade-in space-y-4 mt-2">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Newspaper size={18} className="text-amber-500" />
                                    Mandi Khabar
                                </h3>
                                <p className="text-[11px] text-slate-500 font-medium">Latest market updates</p>
                            </div>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            {news.map((item: any, idx: number) => (
                                <div key={idx} className="min-w-[260px] snap-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-4 border border-white/50 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-400 to-orange-500 opacity-10 rounded-bl-full"></div>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full mb-2">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                        Update
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight line-clamp-1">{item.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary || item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Address Verification Prompt Modal */}
            {showAddressPrompt && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                                <MapPin size={24} />
                            </div>
                            <button onClick={() => setShowAddressPrompt(false)} className="text-slate-400 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Delivery Details Missing</h3>
                        <p className="text-sm text-slate-500 mt-2 mb-6">Please enter your complete delivery address to finalize this order.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 block mb-1">Full Address</label>
                                <textarea 
                                    rows={3} 
                                    value={tempAddress}
                                    onChange={(e) => setTempAddress(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white resize-none"
                                    placeholder="Enter house no, street, landmark, PIN code..."
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    confirmOrder(tempAddress);
                                }}
                                disabled={tempAddress.trim().length < 5}
                                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Invoice & QR Success Overlay */}
            {showInvoice && currentOrder && (
                <div className="fixed inset-0 z-[150] bg-white dark:bg-slate-950 flex flex-col animate-fade-in overflow-y-auto">
                    <div className="p-4 pt-8 sticky top-0 bg-white dark:bg-slate-950 z-10 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Order Confirmed</h2>
                        <button onClick={() => setShowInvoice(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white">Success!</h3>
                        <p className="text-sm text-slate-500 text-center mt-2 max-w-[250px]">Your order has been routed to the nearest VillageLink delivery partner.</p>
                        
                        {/* Virtual Invoice Card */}
                        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mt-8 shadow-xl relative overflow-hidden">
                            {/* Receipt Notch Effects */}
                            <div className="absolute top-0 inset-x-0 h-3 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] dark:bg-[radial-gradient(circle,transparent_4px,var(--slate-900)_5px)] bg-[length:12px_10px] -mt-2"></div>
                            
                            <div className="flex justify-between items-start border-b border-dashed border-slate-200 dark:border-slate-700 pb-4 mb-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice ID</p>
                                    <p className="font-mono text-sm font-bold text-slate-800 dark:text-white">{currentOrder.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{currentOrder.date.split(',')[0]}</p>
                                </div>
                            </div>
                            
                            <div className="w-full flex justify-center py-4 bg-white rounded-xl mb-4 border border-slate-100 p-2">
                                {/* Simulated QR Code (in real app, use qrcode.react) */}
                                <div className="grid grid-cols-5 gap-1 w-32 h-32 opacity-80 mix-blend-multiply">
                                    {Array.from({length: 25}).map((_, i) => (
                                        <div key={i} className={`bg-slate-900 rounded-sm ${Math.random() > 0.4 ? 'opacity-100' : 'opacity-0'}`}></div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mb-6 px-4">Delivery partner will scan this QR at pickup & dropoff.</p>
                            
                            <div className="space-y-3 mb-4">
                                {currentOrder.items.map((c:any, i:number) => {
                                    const lName = c.listing.crop || c.listing.name;
                                    const lPrice = c.listing.pricePerUnit || c.listing.price || 0;
                                    return (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-slate-650 dark:text-slate-400 capitalize">{c.quantity}x {lName}</span>
                                            <span className="font-semibold text-slate-800 dark:text-white">₹{lPrice * c.quantity}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                                <span className="text-slate-500 font-bold">Total Pay (COD)</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{currentOrder.total}</span>
                            </div>
                        </div>

                        <button onClick={() => setShowInvoice(false)} className="mt-8 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-6 py-3 rounded-xl w-full max-w-sm">
                            Continue Shopping
                        </button>
                    </div>
                </div>
            )}

            {/* Crop Group Seller Details Sheet */}
            {selectedCropGroup && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800/80 animate-slide-up max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-850">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl flex items-center justify-center border border-slate-900 dark:border-slate-800/50 shadow-inner overflow-hidden p-1.5">
                                    <img 
                                        src={getCropImage(selectedCropGroup)} 
                                        alt={selectedCropGroup} 
                                        className="w-full h-full object-contain mix-blend-screen"
                                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{selectedCropGroup}</h3>
                                        {(() => {
                                            const cropData = groupedProduce.find((g: any) => g.crop.toLowerCase() === selectedCropGroup.toLowerCase());
                                            if (!cropData) return null;
                                            return (
                                                <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                    {cropData.organic ? '🌿 Organic' : cropData.category}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {(() => {
                                        const cropData = groupedProduce.find((g: any) => g.crop.toLowerCase() === selectedCropGroup.toLowerCase());
                                        if (!cropData) return null;
                                        return (
                                            <p className="text-xs text-slate-500 font-medium">
                                                {cropData.listings.length} {cropData.listings.length === 1 ? 'Kisan' : 'Kisans'} selling direct from local farms
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedCropGroup(null)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Sort & Filter Controls */}
                        <div className="flex gap-2 mb-4 bg-slate-100/50 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-slate-200/20">
                            <button 
                                onClick={() => setActiveSortType('PRICE_ASC')}
                                className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all ${activeSortType === 'PRICE_ASC' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                            >
                                Lowest Price
                            </button>
                            <button 
                                onClick={() => setActiveSortType('DISTANCE_ASC')}
                                className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all ${activeSortType === 'DISTANCE_ASC' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                            >
                                Nearest First
                            </button>
                        </div>

                        {/* Sellers List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {listings
                                .filter(l => l.crop.trim().toLowerCase() === selectedCropGroup.toLowerCase() && l.status === 'ACTIVE')
                                .map(l => ({ ...l, distance: calculateDistance(userLocation, l.location?.coordinates || { lat: 25.122, lng: 84.022 }) }))
                                .sort((a, b) => {
                                    if (activeSortType === 'PRICE_ASC') return a.pricePerUnit - b.pricePerUnit;
                                    if (activeSortType === 'DISTANCE_ASC') return a.distance - b.distance;
                                    return 0;
                                })
                                .map((item) => {
                                    const qtyInCart = getCartItemQuantity(item);
                                    return (
                                        <div key={item.id} className="bg-slate-50 dark:bg-slate-850/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm animate-fade-in">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-850 dark:text-white text-sm">{item.farmerName}</span>
                                                    <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                                        <Star size={10} fill="currentColor"/> 4.8
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    📍 {item.location?.village || 'Local Farm'} • <span className="text-emerald-500 font-bold">{item.distance} km away</span>
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                    Grade {item.grade || 'B'} • {item.quantity} {item.unit} stock
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div>
                                                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{item.pricePerUnit}</span>
                                                    <span className="text-[9px] text-slate-500 font-medium">/{item.unit}</span>
                                                </div>
                                                {qtyInCart > 0 ? (
                                                    <div className="flex items-center bg-slate-900 dark:bg-white rounded-xl shadow-md border border-slate-800 dark:border-slate-200 overflow-hidden animate-bounce-in">
                                                        <button 
                                                            onClick={() => updateCartItemQuantity(item, -1)}
                                                            className="px-3 py-1.5 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-100 font-black transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2 font-bold text-xs text-white dark:text-slate-900">{qtyInCart}</span>
                                                        <button 
                                                            onClick={() => updateCartItemQuantity(item, 1)}
                                                            className="px-3 py-1.5 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-100 font-black transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(item, 1)}
                                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Kirana Group Seller Details Sheet */}
            {selectedKiranaGroup && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800/80 animate-slide-up max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-850">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl flex items-center justify-center border border-slate-900 dark:border-slate-800/50 shadow-inner overflow-hidden p-1.5">
                                    <img 
                                        src={getCropImage(selectedKiranaGroup)} 
                                        alt={selectedKiranaGroup} 
                                        className="w-full h-full object-contain mix-blend-screen"
                                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{selectedKiranaGroup}</h3>
                                        {(() => {
                                            const itemData = groupedKiranaItems.find((g: any) => g.name.toLowerCase() === selectedKiranaGroup.toLowerCase());
                                            if (!itemData) return null;
                                            return (
                                                <span className="bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                    {itemData.tag}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {(() => {
                                        const itemData = groupedKiranaItems.find((g: any) => g.name.toLowerCase() === selectedKiranaGroup.toLowerCase());
                                        if (!itemData) return null;
                                        return (
                                            <p className="text-xs text-slate-500 font-medium">
                                                Available from {itemData.listings.length} local {itemData.listings.length === 1 ? 'shop' : 'shops'}
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedKiranaGroup(null)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Shops List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {storeItems
                                .filter(item => item.name.trim().toLowerCase() === selectedKiranaGroup.toLowerCase())
                                .map(item => ({ ...item, distance: calculateDistance(userLocation, item.coordinates || { lat: 25.122, lng: 84.022 }) }))
                                .map((item, idx) => {
                                    const qtyInCart = getCartItemQuantity(item);
                                    return (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-850/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm animate-fade-in">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-850 dark:text-white text-sm">{item.shop}</span>
                                                    <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                                        <Star size={10} fill="currentColor"/> {item.rating}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    🏪 {item.village || 'Main Road'} • <span className="text-orange-500 font-bold">{item.distance} km away</span>
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                    Tag: {item.tag} • {item.available} stock
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div>
                                                    <span className="text-base font-black text-orange-600 dark:text-orange-400">₹{item.price}</span>
                                                    <span className="text-[9px] text-slate-500 font-medium">/{item.unit}</span>
                                                </div>
                                                {qtyInCart > 0 ? (
                                                    <div className="flex items-center bg-slate-900 dark:bg-white rounded-xl shadow-md border border-slate-800 dark:border-slate-200 overflow-hidden animate-bounce-in">
                                                        <button 
                                                            onClick={() => updateCartItemQuantity(item, -1)}
                                                            className="px-3 py-1.5 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-100 font-black transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2 font-bold text-xs text-white dark:text-slate-900">{qtyInCart}</span>
                                                        <button 
                                                            onClick={() => updateCartItemQuantity(item, 1)}
                                                            className="px-3 py-1.5 text-white dark:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-100 font-black transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(item, 1)}
                                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Sliding Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-[130] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-md h-full flex flex-col shadow-2xl rounded-3xl animate-slide-left overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="text-emerald-500" size={24} />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Your Cart ({cart.length} items)</h3>
                            </div>
                            <button 
                                onClick={() => setShowCart(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {cart.map((item, idx) => {
                                const lPrice = item.listing.pricePerUnit || item.listing.price || 0;
                                const lName = item.listing.crop || item.listing.name;
                                const lSeller = item.listing.farmerName || item.listing.shop;
                                return (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between animate-fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center p-1.5 border border-slate-900 dark:border-slate-800 shadow-inner overflow-hidden">
                                                <img 
                                                    src={getCropImage(lName)} 
                                                    alt={lName} 
                                                    className="w-full h-full object-contain mix-blend-screen"
                                                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white capitalize text-sm">{lName}</h4>
                                                <p className="text-xs text-slate-500">by {lSeller}</p>
                                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">₹{lPrice} / {item.listing.unit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden">
                                            <button 
                                                onClick={() => updateCartItemQuantity(item.listing, -1)}
                                                className="px-2.5 py-1.5 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-750 font-bold transition-colors text-xs"
                                            >
                                                -
                                            </button>
                                            <span className="px-2 font-bold text-xs text-slate-800 dark:text-white">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateCartItemQuantity(item.listing, 1)}
                                                className="px-2.5 py-1.5 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-750 font-bold transition-colors text-xs"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Summary & Slide to Pay */}
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Items Total</span>
                                    <span>₹{cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Delivery Partner Charge</span>
                                    <span>₹30</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Platform Fee (3%)</span>
                                    <span>₹{Math.round(cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0) * 0.03)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-800 dark:text-white text-base pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <span>Total Payable</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">₹{
                                        cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0) + 
                                        30 + 
                                        Math.round(cart.reduce((sum, c) => sum + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0) * 0.03)
                                    }</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleCheckout()}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.99] transition-all text-center flex items-center justify-center gap-2"
                            >
                                Proceed to Delivery Address <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Cart Button */}
            {cart.length > 0 && !showInvoice && (
                <div className="fixed bottom-24 inset-x-0 flex justify-center z-50 animate-bounce-in px-4">
                    <button 
                        onClick={() => setShowCart(true)}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between w-full max-w-md group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Package size={20} />
                                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                                    {cart.length}
                                </span>
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-medium opacity-70">View Cart</p>
                                <p className="text-sm font-bold">₹{cart.reduce((s, c) => s + ((c.listing.pricePerUnit || c.listing.price || 0) * c.quantity), 0)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-sm bg-white/20 dark:bg-black/10 px-4 py-2 rounded-xl group-hover:bg-white/30 transition-colors">
                            Open Cart <ChevronRight size={16} />
                        </div>
                    </button>
                </div>
            )}

            {/* Custom CSS Style Injection for Route Path Flow */}
            <style>{`
                @keyframes routeFlow {
                    to {
                        stroke-dashoffset: -20;
                    }
                }
                .route-line-flow {
                    stroke-dasharray: 8, 4;
                    animation: routeFlow 1.2s linear infinite;
                }
            `}</style>

            {/* Order Details Drawer/Modal */}
            {selectedOrderDetail && (
                <div className="fixed inset-0 z-[150] bg-slate-900/65 backdrop-blur-sm flex items-end justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800/80 animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Track Order</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedOrderDetail.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedOrderDetail(null)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Container */}
                        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1 scrollbar-hide">
                            {/* savings and carbon offsets banner */}
                            {selectedOrderDetail.status !== 'CANCELLED' && (
                                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Leaf size={16} className="text-emerald-500" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-emerald-400">Carbon & Direct Farm Sourcing</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">🌿 {selectedOrderDetail.carbonSaved || '1.5'}kg CO2</p>
                                        <p className="text-[9px] text-slate-500 font-medium">₹{selectedOrderDetail.middlemanBypassed || '45'} Saved</p>
                                    </div>
                                </div>
                            )}

                            {/* Stepper tracking */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Journey Tracker</h4>
                                {(() => {
                                    const { stage, text } = getLiveTrackingStage(selectedOrderDetail);
                                    
                                    const renderStep = (stepIdx: number, title: string, subtitle: string) => {
                                        const isPast = stage >= stepIdx;
                                        const isCurrent = stage === stepIdx;
                                        return (
                                            <div className="flex gap-3 relative" key={stepIdx}>
                                                {stepIdx < 3 && (
                                                    <div className={`absolute left-2.5 top-6 bottom-[-16px] w-[2px] ${stage > stepIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                                )}
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-colors ${
                                                    isPast ? 'bg-emerald-500 text-white' : 
                                                    isCurrent ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                    {isPast ? '✓' : stepIdx + 1}
                                                </div>
                                                <div>
                                                    <h5 className={`text-xs font-bold ${isCurrent ? 'text-blue-500' : 'text-slate-800 dark:text-white'}`}>{title}</h5>
                                                    <p className="text-[10px] text-slate-500 font-medium">{subtitle}</p>
                                                </div>
                                            </div>
                                        );
                                    };

                                    if (selectedOrderDetail.status === 'CANCELLED') {
                                        return (
                                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-center">
                                                <X size={20} className="text-rose-500" />
                                                <div>
                                                    <h5 className="text-xs font-bold text-rose-500">Order Cancelled</h5>
                                                    <p className="text-[10px] text-slate-500 font-medium">This order was cancelled by the buyer.</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (selectedOrderDetail.status === 'REFUNDED') {
                                        return (
                                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 items-center">
                                                <ShieldCheck size={20} className="text-indigo-500" />
                                                <div>
                                                    <h5 className="text-xs font-bold text-indigo-500">Order Refunded</h5>
                                                    <p className="text-[10px] text-slate-500 font-medium">Dispute approved. Refund credited: ₹{selectedOrderDetail.totalAmount || selectedOrderDetail.total}</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4 p-1.5 bg-slate-50/55 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800/80">
                                            <div className="space-y-4 p-4">
                                                {renderStep(0, "Order Confirmed", "Crates allocated at farm")}
                                                {renderStep(1, "Quality Assured", "FSSAI standards verified")}
                                                {renderStep(2, "Out for Delivery", `In-transit with temperature control`)}
                                                {renderStep(3, "Delivered", "Crates handed over to customer")}
                                            </div>

                                            {stage === 2 && (
                                                <div className="px-4 pb-4">
                                                    <div className="bg-slate-955 rounded-3xl p-3 border border-slate-900 shadow-inner relative overflow-hidden h-32">
                                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1),transparent_60%)]"></div>
                                                        <svg className="w-full h-full absolute inset-0 p-4 overflow-visible" viewBox="0 0 100 60">
                                                            <defs>
                                                                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#10b981" />
                                                                    <stop offset="100%" stopColor="#3b82f6" />
                                                                </linearGradient>
                                                            </defs>
                                                            <path 
                                                                d="M 10 45 Q 50 15 90 25" 
                                                                fill="none" 
                                                                stroke="url(#routeGrad)" 
                                                                strokeWidth="3" 
                                                                strokeLinecap="round"
                                                                className="route-line-flow"
                                                            />
                                                            <circle cx="10" cy="45" r="4.5" className="fill-emerald-500 animate-pulse" />
                                                            <text x="8" y="55" className="fill-slate-400 font-black text-[5px]">MANDI</text>
                                                            <circle cx="90" cy="25" r="4.5" className="fill-blue-500" />
                                                            <text x="80" y="35" className="fill-slate-400 font-black text-[5px]">HOME</text>
                                                            <g className="animate-pulse">
                                                                <circle cx="48" cy="25" r="6" className="fill-emerald-500/20 stroke-emerald-500 stroke-0.5" />
                                                                <text x="45" y="28" className="text-[7px]">🚚</text>
                                                            </g>
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Driver Profile */}
                            {selectedOrderDetail.status !== 'CANCELLED' && selectedOrderDetail.status !== 'REFUNDED' && (
                                <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-[24px] p-4 border border-slate-100/50 dark:border-slate-800/50">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned Delivery Partner</h4>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-850 shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center text-2xl">
                                                {selectedOrderDetail.driver?.img || '👨🏽‍✈️'}
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-855 dark:text-white text-sm">{selectedOrderDetail.driver?.name || 'Ramu Prasad'}</h5>
                                                <p className="text-[10px] text-slate-500 font-semibold">{selectedOrderDetail.driver?.vehicle || 'Mahindra Jeeto'} • {selectedOrderDetail.driver?.rating || '4.9'} ★</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setSupportMessages([
                                                    { sender: 'AGENT', text: `Hi, agent connected for Order ${selectedOrderDetail.id}. Need help contacting Ramu Prasad?`, timestamp: Date.now() }
                                                ]);
                                                setShowSupportChat(true);
                                            }}
                                            className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl border border-blue-100 dark:border-blue-500/20 transition-all"
                                            aria-label="Chat support"
                                        >
                                            <Phone size={14} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
                                            <p className="text-[8px] text-slate-400 font-bold uppercase">Pickup OTP</p>
                                            <p className="text-sm font-mono font-black text-slate-800 dark:text-white tracking-widest">{selectedOrderDetail.pickupOtp || '4829'}</p>
                                        </div>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
                                            <p className="text-[8px] text-slate-400 font-bold uppercase">Dropoff OTP</p>
                                            <p className="text-sm font-mono font-black text-slate-800 dark:text-white tracking-widest">{selectedOrderDetail.deliveryOtp || '8927'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Itemized receipt breakdown */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Items</h4>
                                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-850/40 rounded-[24px] p-4 border border-slate-100/50 dark:border-slate-800/50">
                                    {selectedOrderDetail.items && selectedOrderDetail.items.map((it: any, idx: number) => {
                                        const itName = it.listing?.crop || it.listing?.name || it.crop || it.name;
                                        const itPrice = it.listing?.pricePerUnit || it.listing?.price || it.pricePerUnit || it.price || 0;
                                        return (
                                            <div key={idx} className="flex justify-between text-xs font-medium">
                                                <span className="text-slate-500 capitalize">{it.quantity}x {itName}</span>
                                                <span className="font-bold text-slate-800 dark:text-white">₹{itPrice * it.quantity}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-slate-200/50 dark:border-slate-850 pt-2.5 mt-1 space-y-1">
                                        <div className="flex justify-between text-[11px] text-slate-400">
                                            <span>Subtotal</span>
                                            <span>₹{selectedOrderDetail.subtotal || selectedOrderDetail.total}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-400">
                                            <span>Platform Fee (3%)</span>
                                            <span>₹{selectedOrderDetail.platformFee || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-400">
                                            <span>Delivery Charge</span>
                                            <span>₹{selectedOrderDetail.deliveryCharge || 0}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-slate-855 dark:text-white text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-855">
                                            <span>Total Amount</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">₹{selectedOrderDetail.totalAmount || selectedOrderDetail.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Address */}
                            <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-[24px] p-4 border border-slate-100/50 dark:border-slate-800/50">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Location</h4>
                                <p className="text-xs font-medium text-slate-655 dark:text-slate-350">{selectedOrderDetail.address || 'Saved Address'}</p>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            {selectedOrderDetail.status === 'PENDING' && (
                                <button 
                                    onClick={() => cancelLocalOrder(selectedOrderDetail.id)}
                                    className="flex-1 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-bold text-sm border border-rose-100 dark:border-rose-500/20"
                                >
                                    Cancel Order
                                </button>
                            )}
                            {getLiveTrackingStage(selectedOrderDetail).stage === 3 && selectedOrderDetail.status !== 'REFUNDED' && (
                                <button 
                                    onClick={() => {
                                        setDisputeReason('');
                                        setShowDisputeModal(true);
                                    }}
                                    className="flex-1 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-bold text-sm border border-rose-100 dark:border-rose-500/20"
                                >
                                    Dispute / Claim Refund
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    setSupportMessages([
                                        { sender: 'AGENT', text: `Hi! Welcome to VillageLink Support. I can assist you with tracking or claiming a refund on Order ${selectedOrderDetail.id}.`, timestamp: Date.now() }
                                    ]);
                                    setShowSupportChat(true);
                                }}
                                className="flex-1 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm"
                            >
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dispute Claim Modal */}
            {showDisputeModal && selectedOrderDetail && (
                <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-855 dark:text-white">Produce Quality Claim</h3>
                            <button onClick={() => setShowDisputeModal(false)} className="text-slate-400 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">Select the issue with your fresh produce shipment. The VillageLink trust-chain automatically evaluates and resolves eligible claims immediately.</p>
                        
                        <div className="space-y-3 mb-6">
                            {[
                                { val: "STALE", text: "🥬 Produce is stale / rotten" },
                                { val: "WEIGHT", text: "⚖️ Weight discrepancy (short weight)" },
                                { val: "WRONG", text: "❌ Wrong items delivered" },
                                { val: "DAMAGED", text: "📦 Packaging damaged / crushed" }
                            ].map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => setDisputeReason(opt.val)}
                                    className={`w-full p-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                        disputeReason === opt.val ? 
                                        'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400' : 
                                        'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350'
                                    }`}
                                >
                                    <span>{opt.text}</span>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${disputeReason === opt.val ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-350'}`}>
                                        {disputeReason === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handleDisputeSubmit(selectedOrderDetail, disputeReason)}
                            disabled={!disputeReason}
                            className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg hover:bg-rose-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center flex items-center justify-center gap-2 text-sm"
                        >
                            <ShieldCheck size={16} /> Submit Instant Refund Claim
                        </button>
                    </div>
                </div>
            )}

            {/* Support Chat Drawer/Modal */}
            {showSupportChat && selectedOrderDetail && (
                <div className="fixed inset-0 z-[170] bg-slate-900/60 backdrop-blur-sm flex justify-end p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-md h-full flex flex-col shadow-2xl rounded-3xl animate-slide-left overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white">Mandi Assistant</h3>
                                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Agent Online
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSupportChat(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                            {supportMessages.map((msg, idx) => {
                                const isUser = msg.sender === 'USER';
                                return (
                                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                            isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/80 rounded-tl-none'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            {supportTyping && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Suggestion Query Pill Options */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {[
                                    "📍 Where is my delivery truck?",
                                    "📞 Call delivery partner",
                                    "📦 Report missing crop items"
                                ].map((qText) => (
                                    <button
                                        key={qText}
                                        onClick={() => handleSupportQueryClick(qText)}
                                        className="whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-3.5 py-2 rounded-xl text-[11px] font-bold border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-200 transition-colors"
                                    >
                                        {qText}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GramMandiHome;
