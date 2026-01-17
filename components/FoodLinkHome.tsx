import React, { useState, useEffect, useMemo } from 'react';
import { User, FoodVendor, FoodOrder, FoodItem, Restaurant, BudgetTier, RestaurantCategory } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import {
    Loader2, Search, MapPin, Star, Clock, Filter, X, ChevronRight,
    UtensilsCrossed, Coffee, Leaf, Flame, ShoppingBag, Check, QrCode,
    Calendar, Users, CreditCard, Bookmark, TrendingUp, Heart, Info,
    ArrowLeft, ChevronDown, Plus, Minus, Timer, Sparkles, Zap, Coins
} from 'lucide-react';
import { TableBookingView } from './TableBookingView';
import { ReviewForm } from './ReviewForm';
import { getWallet } from '../services/blockchainService';

interface FoodLinkHomeProps {
    user: User;
    onBack?: () => void;
}

type ViewType = 'HOME' | 'STALL_MENU' | 'RESTAURANT_MENU' | 'CART' | 'ORDER_STATUS' | 'TABLE_BOOK' | 'SUBSCRIPTIONS' | 'MY_ORDERS';
type FilterTab = 'ALL' | 'STALLS' | 'RESTAURANTS' | 'MESS';

interface CartItem {
    item: FoodItem;
    quantity: number;
    customization?: {
        spiceLevel: 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY';
        addOns: { name: string; price: number }[];
        specialInstructions?: string;
    };
}

const BUDGET_OPTIONS: { value: BudgetTier; label: string; range: string }[] = [
    { value: 'BUDGET', label: 'Budget', range: '₹0-100' },
    { value: 'MID_RANGE', label: 'Mid-Range', range: '₹100-300' },
    { value: 'PREMIUM', label: 'Premium', range: '₹300-500' },
    { value: 'LUXURY', label: 'Luxury', range: '₹500+' },
];

const CATEGORY_OPTIONS: { value: RestaurantCategory | 'ALL'; label: string; icon: string }[] = [
    { value: 'ALL', label: 'All', icon: '🍽️' },
    { value: 'STREET_STALL', label: 'Street Food', icon: '🍜' },
    { value: 'DHABA', label: 'Dhaba', icon: '🍛' },
    { value: 'MESS', label: 'Mess', icon: '🥗' },
    { value: 'FAST_FOOD', label: 'Fast Food', icon: '🍔' },
    { value: 'RESTAURANT', label: 'Restaurant', icon: '🍴' },
    { value: 'CAFE', label: 'Cafe', icon: '☕' },
    { value: 'FINE_DINING', label: 'Fine Dining', icon: '🥂' },
];

export const FoodLinkHome: React.FC<FoodLinkHomeProps> = ({ user, onBack }) => {
    const [view, setView] = useState<ViewType>('HOME');
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

    // Banana: Dynamic Time-Based Theming
    const [isNightTime, setIsNightTime] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        setIsNightTime(hour >= 18 || hour < 6);
    }, []);

    // Data states
    const [stalls, setStalls] = useState<FoodVendor[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<FoodVendor | Restaurant | null>(null);
    const [menu, setMenu] = useState<FoodItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeOrder, setActiveOrder] = useState<FoodOrder | null>(null);
    const [myOrders, setMyOrders] = useState<FoodOrder[]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [budgetFilter, setBudgetFilter] = useState<BudgetTier | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<RestaurantCategory | 'ALL'>('ALL');
    const [vegOnly, setVegOnly] = useState(false);
    const [ratingFilter, setRatingFilter] = useState<number>(0);
    const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'cost'>('rating');

    // Table booking state
    const [tableBooking, setTableBooking] = useState({
        date: '', timeSlot: '', partySize: 2, occasion: '', specialRequests: ''
    });

    // Subscription state
    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    // Smart features state
    const [mlRecommendations, setMlRecommendations] = useState<any[]>([]);
    const [socialProof, setSocialProof] = useState<{ [key: string]: string }>({});
    const [wallet, setWallet] = useState<any>(null);

    useEffect(() => {
        fetchData();
        fetchSmartFeatures();
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        const w = await getWallet(user.id);
        if (w) setWallet(w);
    };

    const fetchSmartFeatures = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/food/recommendations`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMlRecommendations(data);
            }

            // Mock social proof for menu items
            setSocialProof({
                'm1': 'Rahul ordered this',
                'm3': 'Sita & 2 friends ordered this',
                'm5': 'Ankit liked this'
            });
        } catch (e) {
            console.error('Error fetching recommendations:', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stalls
            const stallsRes = await fetch(`${API_BASE_URL}/api/food/stalls`);
            if (stallsRes.ok) {
                const data = await stallsRes.json();
                setStalls(data);
            }

            // Fetch my orders
            const ordersRes = await fetch(`${API_BASE_URL}/api/food/my-orders`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (ordersRes.ok) {
                const data = await ordersRes.json();
                setMyOrders(data);
                // Check for active order
                const active = data.find((o: FoodOrder) =>
                    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
                );
                if (active) setActiveOrder(active);
            }

            // Fetch subscriptions
            const subsRes = await fetch(`${API_BASE_URL}/api/food/my-subscriptions`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (subsRes.ok) {
                const data = await subsRes.json();
                setSubscriptions(data);
            }
        } catch (e) {
            console.error('Error fetching food data:', e);
            // Set mock data for demo
            setStalls([
                {
                    id: 'st1', userId: 'u1', name: 'Ramesh Kumar', phone: '9876543210',
                    stallName: 'Sharma Chaat Corner', stallCategory: 'CHAT_CORNER', location: 'Main Market, Sector 15',
                    isMobile: false, operatingHours: { open: '10:00', close: '22:00' },
                    status: 'VERIFIED', badges: ['VERIFIED', 'HYGIENE_RATED'], rating: 4.5, totalOrders: 1200,
                    isOpen: true, isPureVeg: true, specialties: ['Pani Puri', 'Dahi Bhalla', 'Aloo Tikki'],
                    images: [], createdAt: Date.now()
                },
                {
                    id: 'st2', userId: 'u2', name: 'Mohan Lal', phone: '9876543211',
                    stallName: 'Tibetan Momo Point', stallCategory: 'STREET_FOOD', location: 'Near Bus Stand',
                    isMobile: true, operatingHours: { open: '11:00', close: '21:00' },
                    status: 'VERIFIED', badges: ['VERIFIED'], rating: 4.3, totalOrders: 800,
                    isOpen: true, isPureVeg: false, specialties: ['Steamed Momos', 'Fried Momos', 'Thukpa'],
                    images: [], createdAt: Date.now()
                },
                {
                    id: 'st3', userId: 'u3', name: 'Ravi Tea Stall', phone: '9876543212',
                    stallName: 'Ravi Special Chai', stallCategory: 'TEA_STALL', location: 'College Road',
                    isMobile: false, operatingHours: { open: '06:00', close: '22:00' },
                    status: 'VERIFIED', badges: ['VERIFIED', 'TOP_RATED'], rating: 4.8, totalOrders: 5000,
                    isOpen: true, isPureVeg: true, specialties: ['Masala Chai', 'Bun Maska', 'Samosa'],
                    images: [], createdAt: Date.now()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorMenu = async (vendorId: string, type: 'STALL' | 'RESTAURANT') => {
        try {
            const endpoint = type === 'STALL'
                ? `${API_BASE_URL}/api/food/stalls/${vendorId}/menu`
                : `${API_BASE_URL}/api/food/menu/${vendorId}`;

            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                setMenu(data);
            } else {
                // Mock menu
                setMenu([
                    { id: 'm1', messId: vendorId, name: 'Pani Puri (6 pcs)', price: 30, type: 'VEG', category: 'SNACKS', available: true, description: 'Crispy puris with tangy water' },
                    { id: 'm2', messId: vendorId, name: 'Dahi Bhalla', price: 40, type: 'VEG', category: 'SNACKS', available: true, description: 'Soft bhallas in creamy curd' },
                    { id: 'm3', messId: vendorId, name: 'Aloo Tikki Chaat', price: 50, type: 'VEG', category: 'SNACKS', available: true, description: 'Crispy tikki with chutneys', isRecommended: true },
                    { id: 'm4', messId: vendorId, name: 'Papdi Chaat', price: 45, type: 'VEG', category: 'SNACKS', available: true, description: 'Crispy papdis with masala' },
                    { id: 'm5', messId: vendorId, name: 'Chole Bhature', price: 80, type: 'VEG', category: 'LUNCH', available: true, description: 'Fluffy bhature with spicy chole' },
                ]);
            }
        } catch (e) {
            console.error('Error fetching menu:', e);
        }
    };

    const addToCart = (item: FoodItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const updateCartQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === itemId) {
                const newQty = c.quantity + delta;
                return newQty > 0 ? { ...c, quantity: newQty } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    }, [cart]);

    const placeOrder = async (orderType: 'TAKEAWAY' | 'DINE_IN' | 'PRE_ORDER') => {
        if (!selectedVendor || cart.length === 0) return;

        try {
            const orderData = {
                vendorId: selectedVendor.id,
                items: cart.map(c => ({
                    itemId: c.item.id,
                    name: c.item.name,
                    price: c.item.price,
                    quantity: c.quantity,
                    customization: c.customization
                })),
                orderType,
                packagingCharges: orderType === 'TAKEAWAY' ? 10 : 0
            };

            const res = await fetch(`${API_BASE_URL}/api/food/stalls/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                const data = await res.json();
                setActiveOrder(data.order);
                setCart([]);
                setView('ORDER_STATUS');
            }
        } catch (e) {
            console.error('Error placing order:', e);
            // Mock order for demo
            const mockOrder: FoodOrder = {
                id: `FO-${Date.now()}`,
                userId: user.id,
                vendorId: selectedVendor.id,
                vendorType: 'STALL',
                orderType,
                items: cart.map(c => ({
                    itemId: c.item.id,
                    name: c.item.name,
                    price: c.item.price,
                    quantity: c.quantity
                })),
                totalAmount: cartTotal + (orderType === 'TAKEAWAY' ? 10 : 0),
                status: 'PLACED',
                token: Math.random().toString(36).substring(7).toUpperCase(),
                createdAt: Date.now()
            };
            setActiveOrder(mockOrder);
            setCart([]);
            setView('ORDER_STATUS');
        }
    };

    // Filter logic
    const filteredVendors = useMemo(() => {
        let results = [...stalls];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(s =>
                s.stallName.toLowerCase().includes(q) ||
                s.specialties.some(sp => sp.toLowerCase().includes(q)) ||
                s.location.toLowerCase().includes(q)
            );
        }

        if (vegOnly) {
            results = results.filter(s => s.isPureVeg);
        }

        if (ratingFilter > 0) {
            results = results.filter(s => s.rating >= ratingFilter);
        }

        if (categoryFilter !== 'ALL') {
            results = results.filter(s => s.stallCategory === categoryFilter);
        }

        // Sort
        if (sortBy === 'rating') {
            results.sort((a, b) => b.rating - a.rating);
        }

        return results.filter(s => s.isOpen || true); // Show all, mark closed
    }, [stalls, searchQuery, vegOnly, ratingFilter, categoryFilter, sortBy]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    // ============== ORDER STATUS VIEW ==============
    if (view === 'ORDER_STATUS' && activeOrder) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6">
                    <button onClick={() => setView('HOME')} className="mb-4 flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">Order Status</h1>
                </div>

                <div className="p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-4 text-center">
                        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            {activeOrder.status === 'PLACED' && <Clock className="text-orange-500" size={40} />}
                            {activeOrder.status === 'ACCEPTED' && <UtensilsCrossed className="text-orange-500" size={40} />}
                            {activeOrder.status === 'PREPARING' && <Flame className="text-orange-500 animate-pulse" size={40} />}
                            {activeOrder.status === 'READY' && <Check className="text-green-500" size={40} />}
                        </div>

                        <h2 className="text-2xl font-bold dark:text-white mb-2">#{activeOrder.token}</h2>
                        <p className={`text-lg font-medium ${activeOrder.status === 'READY' ? 'text-green-500' : 'text-orange-500'
                            }`}>
                            {activeOrder.status === 'PLACED' && 'Order Placed'}
                            {activeOrder.status === 'ACCEPTED' && 'Order Accepted'}
                            {activeOrder.status === 'PREPARING' && 'Preparing Your Food'}
                            {activeOrder.status === 'READY' && '🎉 Ready for Pickup!'}
                        </p>

                        {/* Meal Prep Countdown */}
                        {activeOrder.status === 'PREPARING' && (
                            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-800 flex items-center justify-center gap-3">
                                <Timer className="text-orange-500 animate-pulse" size={18} />
                                <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Prep Countdown: ~8 mins</p>
                            </div>
                        )}

                        {/* Progress Steps */}
                        <div className="flex justify-between mt-6 px-4">
                            {['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].map((step, idx) => {
                                const isActive = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].indexOf(activeOrder.status) >= idx;
                                return (
                                    <div key={step} className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <p className="text-[10px] mt-1 text-slate-500">{step}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4">
                        <h3 className="font-bold dark:text-white mb-3">Order Details</h3>
                        {activeOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <span className="dark:text-slate-300">{item.quantity}x {item.name}</span>
                                <span className="text-slate-500">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                        <div className="flex justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                            <span className="font-bold dark:text-white">Total</span>
                            <span className="font-bold text-orange-500">₹{activeOrder.totalAmount}</span>
                        </div>
                    </div>

                    {/* QR Code for pickup */}
                    {activeOrder.status === 'READY' && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center">
                            <QrCode className="mx-auto text-slate-800 dark:text-white mb-4" size={100} />
                            <p className="text-sm text-slate-500">Show this QR code at pickup</p>
                            <button className="mt-6 text-xs text-red-500 font-bold uppercase tracking-wider flex items-center gap-1 mx-auto">
                                <Info size={14} /> Report Quality Issue
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============== VENDOR MENU VIEW ==============
    if (view === 'STALL_MENU' && selectedVendor && 'stallName' in selectedVendor) {
        const vendor = selectedVendor as FoodVendor;
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
                {/* Header - Veo Cinematic Background */}
                <div className="relative h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 animate-[bgDrift_20s_ease-in-out_infinite_alternate] scale-110"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

                    <button onClick={() => { setView('HOME'); setCart([]); }} className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-colors z-10">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-10">
                        <h1 className="text-2xl font-bold drop-shadow-md">{vendor.stallName}</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm"><Star size={14} fill="currentColor" className="text-yellow-400" /> {vendor.rating}</span>
                            <span className="flex items-center gap-1"><MapPin size={14} /> {vendor.location}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${vendor.isOpen ? 'bg-green-500/20 border-green-400 text-green-300' : 'bg-red-500/20 border-red-400 text-red-300'}`}>
                                {vendor.isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 p-4 overflow-x-auto">
                    {vendor.badges.map((badge, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium whitespace-nowrap">
                            ✓ {badge.replace('_', ' ')}
                        </span>
                    ))}
                    {vendor.isPureVeg && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                            <Leaf size={12} /> Pure Veg
                        </span>
                    )}
                </div>

                {/* Specialties */}
                <div className="px-4 mb-4">
                    <p className="text-sm text-slate-500">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Known for:</span> {vendor.specialties.join(', ')}
                    </p>
                </div>

                {/* Menu */}
                <div className="px-4">
                    <h2 className="font-bold text-lg dark:text-white mb-3">Menu</h2>

                    {menu.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
                            <UtensilsCrossed className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">Menu loading...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {menu.map(item => {
                                const cartItem = cart.find(c => c.item.id === item.id);
                                return (
                                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 flex gap-4 border border-slate-100 dark:border-slate-800">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 border-2 ${item.type === 'VEG' ? 'border-green-500' : 'border-red-500'} rounded flex items-center justify-center`}>
                                                    <div className={`w-2 h-2 rounded-full ${item.type === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                </div>
                                                <h3 className="font-bold dark:text-white">{item.name}</h3>
                                                {item.isRecommended && (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">⭐ BEST</span>
                                                )}
                                                {socialProof[item.id] && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium flex items-center gap-1">
                                                        <Users size={10} /> {socialProof[item.id]}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <p className="font-bold text-orange-500">₹{item.price}</p>
                                                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
                                                    <Coins size={10} className="text-amber-500" />
                                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Earn {Math.floor(item.price * 0.05)} G$</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center">
                                            {cartItem ? (
                                                <div className="flex items-center gap-2 bg-orange-500 text-white rounded-full px-2 py-1">
                                                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="font-bold min-w-[20px] text-center">{cartItem.quantity}</span>
                                                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <Button onClick={() => addToCart(item)} size="sm" disabled={!item.available}>
                                                    {item.available ? 'ADD' : 'N/A'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cart Footer */}
                {cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-orange-500 text-white p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{cart.reduce((sum, c) => sum + c.quantity, 0)} items</p>
                            <p className="text-orange-100 text-sm">₹{cartTotal} + ₹10 packing</p>
                        </div>
                        <Button onClick={() => placeOrder('TAKEAWAY')} className="bg-white text-orange-500 hover:bg-orange-50">
                            Place Order <ChevronRight size={16} />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // ============== MY ORDERS VIEW ==============
    if (view === 'MY_ORDERS') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6">
                    <button onClick={() => setView('HOME')} className="mb-4 flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">My Orders</h1>
                </div>

                <div className="p-4 space-y-3">
                    {myOrders.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
                            <ShoppingBag className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">No orders yet</p>
                            <Button onClick={() => setView('HOME')} className="mt-4">Explore Food</Button>
                        </div>
                    ) : (
                        myOrders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold dark:text-white">#{order.token}</p>
                                        <p className="text-xs text-slate-500">{order.items.length} items • ₹{order.totalAmount}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                                {['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
                                    <Button onClick={() => { setActiveOrder(order); setView('ORDER_STATUS'); }} size="sm" className="mt-3 w-full">
                                        Track Order
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ============== SUBSCRIPTIONS VIEW ==============
    if (view === 'SUBSCRIPTIONS') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6">
                    <button onClick={() => setView('HOME')} className="mb-4 flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-xl font-bold">Meal Subscriptions</h1>
                </div>

                <div className="p-4">
                    {/* Active Subscriptions */}
                    <h2 className="font-bold dark:text-white mb-3">Your Subscriptions</h2>
                    {subscriptions.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center mb-6">
                            <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">No active subscriptions</p>
                        </div>
                    ) : (
                        subscriptions.map(sub => (
                            <div key={sub.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-3 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="font-bold dark:text-white">{sub.planName}</p>
                                        <p className="text-sm text-slate-500">{sub.type} Pass</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {sub.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Available Plans */}
                    <h2 className="font-bold dark:text-white mb-3 mt-6">Available Plans</h2>
                    <div className="space-y-3">
                        {[
                            { name: 'Daily Pass', type: 'DAILY', price: 120, meals: 'Lunch + Dinner', color: 'from-blue-500 to-cyan-500' },
                            { name: 'Weekly Pass', type: 'WEEKLY', price: 750, meals: 'All 7 Days', color: 'from-green-500 to-emerald-500' },
                            { name: 'Monthly Basic', type: 'MONTHLY', price: 2500, meals: 'Lunch OR Dinner', color: 'from-orange-500 to-amber-500' },
                            { name: 'Monthly Premium', type: 'MONTHLY', price: 4500, meals: 'Breakfast + Lunch + Dinner', color: 'from-purple-500 to-pink-500' },
                        ].map(plan => (
                            <div key={plan.name} className={`bg-gradient-to-r ${plan.color} rounded-xl p-4 text-white`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg">{plan.name}</h3>
                                        <p className="text-white/80 text-sm">{plan.meals}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">₹{plan.price}</p>
                                        <p className="text-white/80 text-xs">{plan.type.toLowerCase()}</p>
                                    </div>
                                </div>
                                <Button className="w-full mt-3 bg-white/20 hover:bg-white/30 border-0">
                                    Subscribe Now
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ============== HOME VIEW ==============
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-orange-100 text-sm">Hello, {user.name?.split(' ')[0]}</p>
                        <h1 className="text-xl font-bold">What's for today?</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {wallet && (
                            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                                <Coins size={14} className="text-yellow-300" />
                                <span className="text-xs font-bold text-white">{wallet.balance} <span className="text-[8px] opacity-70">G$</span></span>
                            </div>
                        )}
                        <button onClick={() => setView('MY_ORDERS')} className="p-2 bg-white/20 backdrop-blur rounded-full relative">
                            <ShoppingBag size={20} />
                            {activeOrder && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">!</div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Search Bar - Enhanced */}
                <div className="relative group variable-font-transition focus-within:ring-2 ring-orange-400 rounded-xl transition-all">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search for food, stalls, restaurants..."
                        className="w-full pl-12 pr-12 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 shadow-lg outline-none font-medium transition-all group-focus-within:font-bold"
                    />
                    <button onClick={() => setShowFilters(!showFilters)} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 hover:scale-110 transition-transform">
                        {/* Waveform for Voice UI hint if filters not active */}
                        <div className="flex items-end gap-0.5 h-3 w-4">
                            <div className="w-0.5 bg-orange-500 animate-[waveform_1s_ease-in-out_infinite]"></div>
                            <div className="w-0.5 bg-orange-500 animate-[waveform_1.2s_ease-in-out_infinite]"></div>
                            <div className="w-0.5 bg-orange-500 animate-[waveform_0.8s_ease-in-out_infinite]"></div>
                            <div className="w-0.5 bg-orange-500 animate-[waveform_1.1s_ease-in-out_infinite]"></div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-900 mx-4 -mt-4 rounded-xl p-4 shadow-lg border border-slate-100 dark:border-slate-800 mb-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold dark:text-white">Filters</h3>
                        <button onClick={() => setShowFilters(false)}><X size={18} className="text-slate-400" /></button>
                    </div>

                    <div className="space-y-4">
                        {/* Veg Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="dark:text-slate-300 flex items-center gap-2">
                                <Leaf className="text-green-500" size={16} /> Pure Veg Only
                            </span>
                            <button
                                onClick={() => setVegOnly(!vegOnly)}
                                className={`w-12 h-6 rounded-full transition-all ${vegOnly ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${vegOnly ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                            </button>
                        </div>

                        {/* Rating Filter */}
                        <div>
                            <p className="text-sm text-slate-500 mb-2">Minimum Rating</p>
                            <div className="flex gap-2">
                                {[0, 3, 3.5, 4, 4.5].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRatingFilter(r)}
                                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${ratingFilter === r
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        {r === 0 ? 'Any' : <><Star size={12} fill="currentColor" /> {r}+</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort */}
                        <div>
                            <p className="text-sm text-slate-500 mb-2">Sort By</p>
                            <div className="flex gap-2">
                                {[
                                    { value: 'rating', label: 'Rating' },
                                    { value: 'distance', label: 'Distance' },
                                    { value: 'cost', label: 'Cost' }
                                ].map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setSortBy(s.value as any)}
                                        className={`px-4 py-2 rounded-full text-sm ${sortBy === s.value
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3 px-4 py-4 overflow-x-auto">
                <button onClick={() => setView('SUBSCRIPTIONS')} className="flex flex-col items-center px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm min-w-[80px]">
                    <Calendar className="text-orange-500 mb-1" size={24} />
                    <span className="text-xs dark:text-slate-300">Passes</span>
                </button>
                <button onClick={() => setView('MY_ORDERS')} className="flex flex-col items-center px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm min-w-[80px]">
                    <ShoppingBag className="text-orange-500 mb-1" size={24} />
                    <span className="text-xs dark:text-slate-300">Orders</span>
                </button>
                <button className="flex flex-col items-center px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm min-w-[80px]">
                    <Heart className="text-orange-500 mb-1" size={24} />
                    <span className="text-xs dark:text-slate-300">Saved</span>
                </button>
                <button className="flex flex-col items-center px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm min-w-[80px]">
                    <TrendingUp className="text-orange-500 mb-1" size={24} />
                    <span className="text-xs dark:text-slate-300">Trending</span>
                </button>
            </div>

            {/* Smart Recommendations */}
            {mlRecommendations.length > 0 && (
                <div className="px-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-orange-500" size={18} />
                        <h2 className="font-bold dark:text-white">Personalized for You</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {mlRecommendations.map((rec, i) => (
                            <div key={i} className="min-w-[280px] bg-white dark:bg-slate-900 p-4 rounded-3xl border border-orange-100 dark:border-orange-950 shadow-sm hover:shadow-md transition-all flex gap-4">
                                <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                                    {rec.category === 'SNACKS' ? '🥟' : (rec.category === 'LUNCH' ? '🍱' : '🍛')}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm dark:text-white leading-tight">{rec.name}</h3>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{rec.vendor?.stallName || 'Vendor'}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-orange-500">₹{rec.price}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Coins size={10} className="text-amber-500" />
                                                <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">+{Math.floor(rec.price * 0.05)} G$</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addToCart(rec)}
                                            className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1">
                                        <Zap size={10} className="text-amber-500" />
                                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">Liked by people like you</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Pills */}
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
                {CATEGORY_OPTIONS.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setCategoryFilter(cat.value)}
                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${categoryFilter === cat.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        <span>{cat.icon}</span> {cat.label}
                    </button>
                ))}
            </div>

            {/* Active Order Banner */}
            {activeOrder && (
                <div onClick={() => setView('ORDER_STATUS')} className="mx-4 mb-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white flex justify-between items-center cursor-pointer">
                    <div>
                        <p className="font-bold">Order #{activeOrder.token}</p>
                        <p className="text-green-100 text-sm">{activeOrder.status} - Tap to track</p>
                    </div>
                    <ChevronRight size={24} />
                </div>
            )}

            {/* Stalls/Restaurants List */}
            <div className="px-4">
                <h2 className="font-bold text-lg dark:text-white mb-3 flex items-center gap-2">
                    <UtensilsCrossed size={20} className="text-orange-500" />
                    {categoryFilter === 'ALL' ? 'Near You' : CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label}
                    <span className="text-sm text-slate-400 font-normal">({filteredVendors.length})</span>
                </h2>

                {filteredVendors.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
                        <Search className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No results found</p>
                        <Button onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setVegOnly(false); }} className="mt-4" variant="outline">
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredVendors.map(vendor => (
                            <div
                                key={vendor.id}
                                onClick={() => {
                                    setSelectedVendor(vendor);
                                    fetchVendorMenu(vendor.id, 'STALL');
                                    setView('STALL_MENU');
                                }}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-4xl">
                                            {vendor.stallCategory === 'CHAT_CORNER' ? '🥙' :
                                                vendor.stallCategory === 'TEA_STALL' ? '☕' :
                                                    vendor.stallCategory === 'STREET_FOOD' ? '🍜' :
                                                        vendor.stallCategory === 'DHABA' ? '🍛' :
                                                            vendor.stallCategory === 'JUICE_STALL' ? '🥤' : '🍽️'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold dark:text-white">{vendor.stallName}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${vendor.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {vendor.isOpen ? 'OPEN' : 'CLOSED'}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                            <MapPin size={12} /> {vendor.location}
                                        </p>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                                <Star size={14} className="text-yellow-500" fill="currentColor" /> {vendor.rating}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm text-slate-500">
                                                <Clock size={14} /> {vendor.operatingHours.open}-{vendor.operatingHours.close}
                                            </span>
                                            {vendor.isPureVeg && (
                                                <span className="flex items-center gap-1 text-green-600 text-sm">
                                                    <Leaf size={14} /> Veg
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {vendor.specialties.slice(0, 3).map((sp, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-600 dark:text-slate-400">
                                                    {sp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodLinkHome;
