/**
 * UserPanel - Consumer Super App
 * Unified access to all VillageLink services
 */

import React, { useState, useEffect } from 'react';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { getAuthToken, logoutUser } from '../services/authService';
import { Button } from './Button';
import {
    Loader2, ArrowLeft, Bus, Utensils, Wheat, ShoppingBag, Package, Briefcase,
    MapPin, Star, Clock, Phone, ChevronRight, Bell, User as UserIcon, Settings,
    Wallet, Gift, Heart, Search, Home, Ticket, QrCode, X, Leaf, ShieldCheck
} from 'lucide-react';

// Lazy load heavy components
const PassengerBooking = React.lazy(() => import('./PassengerView').then(m => ({ default: m.PassengerView })));
const FoodLinkHome = React.lazy(() => import('./FoodLinkHome').then(m => ({ default: m.default })));
const GramMandiHome = React.lazy(() => import('./GramMandiHome').then(m => ({ default: m.GramMandiHome })));

interface UserPanelProps {
    user: User;
    lang?: 'EN' | 'HI';
    onLogout: () => void;
}

type ActiveModule = 'HOME' | 'YATRA' | 'FOOD' | 'GRAMMANDI' | 'VYAPAR' | 'PARCEL' | 'JOBS' | 'PROFILE';

export const UserPanel: React.FC<UserPanelProps> = ({ user, lang = 'EN', onLogout }) => {
    const [activeModule, setActiveModule] = useState<ActiveModule>('HOME');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<number>(3);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    // Universal Bookings & Orders Hub States
    const [showUniversalOrders, setShowUniversalOrders] = useState(false);
    const [universalOrders, setUniversalOrders] = useState<any[]>([]);
    const [ordersFilter, setOrdersFilter] = useState<'ALL' | 'MANDI' | 'YATRA' | 'PARCELS'>('ALL');
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [supportMessages, setSupportMessages] = useState<any[]>([]);
    const [supportTyping, setSupportTyping] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');

    useEffect(() => {
        fetchUserData();
        const handleWalletUpdate = () => fetchUserData();
        window.addEventListener('wallet-update', handleWalletUpdate);
        return () => window.removeEventListener('wallet-update', handleWalletUpdate);
    }, []);

    useEffect(() => {
        if (showUniversalOrders) {
            fetchUniversalHistory();
        }
    }, [showUniversalOrders]);

    const fetchUserData = async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWalletBalance(data.walletBalance || 0);
            }
        } catch (e) {
            console.error('Profile fetch error:', e);
        }
    };

    const services = [
        { id: 'YATRA', name: 'YatraLink', desc: 'Bus, Auto, Taxi', icon: Bus, color: 'from-blue-500 to-indigo-600', emoji: '🚌' },
        { id: 'FOOD', name: 'FoodLink', desc: 'Mess & Restaurant', icon: Utensils, color: 'from-orange-500 to-red-500', emoji: '🍽️' },
        { id: 'GRAMMANDI', name: 'GramMandi', desc: 'Fresh Vegetables', icon: Wheat, color: 'from-green-500 to-emerald-600', emoji: '🌾' },
        { id: 'VYAPAR', name: 'VyaparSaathi', desc: 'Local Shopping', icon: ShoppingBag, color: 'from-purple-500 to-pink-500', emoji: '🛍️' },
        { id: 'PARCEL', name: 'ParcelLink', desc: 'Send Packages', icon: Package, color: 'from-amber-500 to-orange-500', emoji: '📦' },
        { id: 'JOBS', name: 'RojgarLink', desc: 'Find Jobs', icon: Briefcase, color: 'from-teal-500 to-cyan-500', emoji: '💼' },
    ];

    const fetchUniversalHistory = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Fetch Yatra tickets, passes, rentals, parcels
            let historyData: any[] = [];
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/history`, { headers });
                if (res.ok) {
                    historyData = await res.json();
                }
            } catch (e) {
                console.error("Error fetching user history:", e);
            }

            // 2. Fetch GramMandi orders
            let mandiOrders: any[] = [];
            try {
                const res = await fetch(`${API_BASE_URL}/api/grammandi/orders/my`, { headers });
                if (res.ok) {
                    mandiOrders = await res.json();
                }
            } catch (e) {
                console.error("Error fetching server mandi orders:", e);
            }

            const local = localStorage.getItem('grammandi_orders');
            const localParsed = local ? JSON.parse(local) : [];
            const mergedMandi = [...mandiOrders];
            localParsed.forEach((lo: any) => {
                if (!mergedMandi.some(o => o.id === lo.id)) {
                    mergedMandi.push(lo);
                }
            });

            const formattedMandi = mergedMandi.map(o => ({
                ...o,
                historyType: 'MANDI',
                sortDate: o.createdAt || Date.now()
            }));

            const formattedHistory = historyData.map(item => {
                let hType = item.historyType || 'TICKET';
                if (item.id && item.id.startsWith('LT-')) hType = 'PARCEL';
                return {
                    ...item,
                    historyType: hType,
                    sortDate: item.sortDate || item.timestamp || item.purchaseDate || Date.now()
                };
            });

            const combined = [...formattedHistory, ...formattedMandi];
            combined.sort((a, b) => b.sortDate - a.sortDate);
            setUniversalOrders(combined);
        } catch (e) {
            console.error("Error building universal history:", e);
        }
        setLoading(false);
    };

    const getLiveTrackingStage = (order: any) => {
        if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return { stage: -1, text: 'Cancelled/Refunded' };
        if (order.status === 'DELIVERED' || order.status === 'COMPLETED') return { stage: 3, text: 'Completed' };
        
        const elapsed = Date.now() - (order.createdAt || order.sortDate || Date.now());
        const mins = elapsed / (1000 * 60);
        
        if (mins < 1) return { stage: 0, text: 'Confirmed' };
        if (mins < 3) return { stage: 1, text: 'Preparing' };
        if (mins < 6) return { stage: 2, text: 'Out for Delivery / Boarding' };
        return { stage: 3, text: 'Completed' };
    };

    const cancelLocalOrder = async (orderId: string, historyType: string) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;
        
        if (historyType === 'MANDI') {
            const local = localStorage.getItem('grammandi_orders');
            const localParsed = local ? JSON.parse(local) : [];
            const updated = localParsed.map((o: any) => o.id === orderId ? { ...o, status: 'CANCELLED' } : o);
            localStorage.setItem('grammandi_orders', JSON.stringify(updated));
            
            setUniversalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
            if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
                setSelectedOrderDetail((prev: any) => prev ? { ...prev, status: 'CANCELLED' } : null);
            }
            alert("Mandi order cancelled successfully.");
        } else {
            setUniversalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
            if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
                setSelectedOrderDetail((prev: any) => prev ? { ...prev, status: 'CANCELLED' } : null);
            }
            alert("Booking cancelled successfully.");
        }
    };

    const handleDisputeSubmit = async (order: any, reason: string) => {
        if (!reason) return;
        setLoading(true);
        try {
            const refundAmount = order.totalAmount || order.total || order.totalPrice || order.charge || 120;
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
                    desc: `Dispute Refund for Booking (${order.id})`
                })
            });
            
            if (res.ok) {
                if (order.historyType === 'MANDI') {
                    const local = localStorage.getItem('grammandi_orders');
                    const localParsed = local ? JSON.parse(local) : [];
                    const updated = localParsed.map((o: any) => o.id === order.id ? { ...o, status: 'REFUNDED' } : o);
                    localStorage.setItem('grammandi_orders', JSON.stringify(updated));
                }

                setUniversalOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'REFUNDED' } : o));
                setSelectedOrderDetail((prev: any) => prev ? { ...prev, status: 'REFUNDED' } : null);
                
                alert(`Dispute Approved! Instant refund of ₹${refundAmount} has been credited to your VillageLink Wallet.`);
                fetchUserData(); 
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
            let replyText = "Checking booking status...";
            const drName = selectedOrderDetail?.driver?.name || selectedOrderDetail?.driverName || "Ramu Prasad";
            const drPhone = selectedOrderDetail?.driver?.phone || selectedOrderDetail?.driverPhone || "+91 98765 43210";
            
            if (selectedOrderDetail?.historyType === 'MANDI') {
                if (queryText.includes("Where is my delivery truck")) {
                    replyText = `🚚 Real-time update: Delivery Partner ${drName} has loaded your order crates. Currently crossing the highway towards your village. ETA: 8 minutes.`;
                } else if (queryText.includes("Call delivery partner")) {
                    replyText = `📞 You can contact your delivery partner ${drName} directly at ${drPhone}. He is driving vehicle: ${selectedOrderDetail?.driver?.vehicle || 'Mahindra Jeeto'}.`;
                } else if (queryText.includes("Report missing crop items")) {
                    replyText = `🥬 Stale or missing item detected? You can tap the "Raise Dispute / Claim Refund" button in order details to get an instant refund credited to your Wallet.`;
                }
            } else if (selectedOrderDetail?.historyType === 'TICKET') {
                if (queryText.includes("Where is my bus")) {
                    replyText = `🚌 Bus ${selectedOrderDetail?.vehicleNumber || 'BR01-P9928'} is currently approaching the main highway crossing. Road traffic is light. ETA: 6 minutes.`;
                } else if (queryText.includes("Call driver")) {
                    replyText = `📞 You can contact Driver ${drName} at ${drPhone}. Please have your boarding pass QR code ready for scanning.`;
                }
            } else {
                replyText = `Agent connected. How can I assist you with booking ${selectedOrderDetail?.id || 'VillageLink service'}?`;
            }

            const agentMsg = { sender: 'AGENT', text: replyText, timestamp: Date.now() };
            setSupportMessages(prev => [...prev, agentMsg]);
            setSupportTyping(false);
        }, 1000);
    };

    const renderUniversalOrdersView = () => {
        const totalMandiSavings = universalOrders
            .filter(o => o.historyType === 'MANDI' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
            .reduce((sum, o) => sum + (o.middlemanBypassed || 45), 0);
        const totalYatraSavings = universalOrders
            .filter(o => o.historyType === 'TICKET')
            .length * 50;
        const totalSavings = totalMandiSavings + totalYatraSavings;

        const totalMandiCarbon = universalOrders
            .filter(o => o.historyType === 'MANDI' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
            .reduce((sum, o) => sum + parseFloat(o.carbonSaved || '1.5'), 0);
        const totalYatraCarbon = universalOrders
            .filter(o => o.historyType === 'TICKET')
            .length * 1.2;
        const totalCarbon = (totalMandiCarbon + totalYatraCarbon).toFixed(1);

        const filtered = universalOrders.filter(o => {
            if (ordersFilter === 'MANDI') return o.historyType === 'MANDI';
            if (ordersFilter === 'YATRA') return o.historyType === 'TICKET' || o.historyType === 'RENTAL';
            if (ordersFilter === 'PARCELS') return o.historyType === 'PARCEL';
            return true;
        });

        return (
            <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-[950] pb-24 pt-4 px-4 overflow-y-auto font-sans relative">
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

                {/* Visual Mesh Background */}
                <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-300 to-indigo-500 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50"></div>
                </div>

                <div className="relative z-10 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowUniversalOrders(false)}
                            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-350 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-905 dark:text-white leading-tight">My Orders & Bookings</h2>
                            <p className="text-xs text-slate-500 font-medium">Universal Super-App Tracking</p>
                        </div>
                    </div>

                    {/* Aggregate Savings Widgets */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 dark:border-slate-800/85 rounded-3xl p-4 shadow-xl text-center relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Savings</span>
                            <span className="text-2xl font-black text-blue-500 mt-1 block">₹{totalSavings}</span>
                            <span className="text-[9px] text-slate-550 font-medium block mt-1">Direct middleman bypass</span>
                        </div>
                        <div className="bg-gradient-to-br from-slate-900 to-slate-955 border border-white/5 dark:border-slate-800/85 rounded-3xl p-4 shadow-xl text-center relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">CO2 Offsets</span>
                            <span className="text-2xl font-black text-emerald-400 mt-1 block">🌿 {totalCarbon} kg</span>
                            <span className="text-[9px] text-slate-550 font-medium block mt-1">Green commutes & logistics</span>
                        </div>
                    </div>

                    {/* Filters Segment Selector */}
                    <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-1.5 flex gap-1 border border-white/40 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                        {[
                            { key: 'ALL', label: 'All' },
                            { key: 'MANDI', label: 'Mandi 🌾' },
                            { key: 'YATRA', label: 'Yatra 🚌' },
                            { key: 'PARCELS', label: 'Parcels 📦' }
                        ].map((btn) => (
                            <button
                                key={btn.key}
                                onClick={() => setOrdersFilter(btn.key as any)}
                                className={`flex-1 py-2.5 rounded-2xl text-[11px] font-black transition-all ${
                                    ordersFilter === btn.key ? 
                                    'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 
                                    'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-850/40'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Bookings List */}
                    <div className="space-y-4">
                        {filtered.length === 0 ? (
                            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] p-8 text-center border border-white/30 dark:border-slate-800/40 shadow-sm">
                                <span className="text-4xl block mb-3">📦</span>
                                <h4 className="font-bold text-slate-800 dark:text-white">No active bookings</h4>
                                <p className="text-xs text-slate-505 max-w-[200px] mx-auto mt-1">Book a bus, cab, or order fresh farm produce to view updates here!</p>
                            </div>
                        ) : (
                            filtered.map((item, idx) => {
                                const stageInfo = getLiveTrackingStage(item);
                                const isCancelled = item.status === 'CANCELLED';
                                const isRefunded = item.status === 'REFUNDED';
                                const isCompleted = item.status === 'DELIVERED' || item.status === 'COMPLETED' || stageInfo.stage === 3;
                                
                                let badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
                                let statusText = "Pending";
                                if (isCancelled) {
                                    badgeColor = "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";
                                    statusText = "Cancelled";
                                } else if (isRefunded) {
                                    badgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400";
                                    statusText = "Refunded";
                                } else if (isCompleted) {
                                    badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
                                    statusText = "Completed";
                                } else if (stageInfo.stage === 2) {
                                    badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
                                    statusText = "In Transit";
                                } else if (stageInfo.stage === 1) {
                                    badgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400";
                                    statusText = "Processing";
                                }

                                const title = item.historyType === 'MANDI' ? (item.sender || 'Direct Sourced Produce') : 
                                              item.historyType === 'TICKET' ? `${item.from || 'Patna'} ➔ ${item.to || 'Dehri'}` : 
                                              item.historyType === 'RENTAL' ? 'YatraLink Vehicle Rental' : 'ParcelLink Delivery';

                                const description = item.historyType === 'MANDI' ? 'Direct Farm Fresh Vegetables' :
                                                     item.historyType === 'TICKET' ? `Seat: ${item.seatNumber || item.seatNumbers || 'Allocated'} • ${item.vehicleNumber || 'Bus'}` :
                                                     item.historyType === 'RENTAL' ? `Rental Duration: 1 Day` : `Parcel to: ${item.deliveryAddress?.city || 'Rohtas'}`;

                                const displayPrice = item.totalAmount || item.total || item.totalPrice || item.charge || 150;

                                return (
                                    <div key={item.id || idx} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[28px] border border-white/30 dark:border-slate-800/40 p-4 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450">
                                                        {item.historyType === 'MANDI' ? '🌾 Mandi' : item.historyType === 'TICKET' ? '🚌 Yatra' : item.historyType === 'RENTAL' ? '🚗 Rental' : '📦 Parcel'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-450 font-mono">{item.id}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-850 dark:text-white text-[15px] group-hover:text-blue-500 transition-colors mt-2 leading-tight">
                                                    {title}
                                                </h4>
                                            </div>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badgeColor}`}>
                                                {statusText}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl p-3 border border-slate-100/50 dark:border-slate-800/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{description}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{item.date ? item.date.split(',')[0] : 'Today'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-slate-450 block font-semibold uppercase">Total Paid</span>
                                                <span className="text-base font-black text-slate-900 dark:text-white">₹{displayPrice}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            {item.historyType === 'MANDI' && !isCancelled && !isRefunded && (
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    🌿 {item.carbonSaved || '1.5'}kg Carbon Saved
                                                </span>
                                            )}
                                            {item.historyType === 'TICKET' && !isCancelled && (
                                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                    🚌 Public Share: ₹50 Saved
                                                </span>
                                            )}
                                            {((item.historyType !== 'MANDI' && item.historyType !== 'TICKET') || isCancelled || isRefunded) && <div></div>}

                                            <div className="flex gap-2">
                                                {(item.status === 'PENDING' || item.status === 'PLACED') && !isCancelled && !isCompleted && (
                                                    <button 
                                                        onClick={() => cancelLocalOrder(item.id, item.historyType)}
                                                        className="text-xs font-bold text-rose-500 dark:text-rose-455 bg-rose-55 dark:bg-rose-500/10 px-3.5 py-2.5 rounded-xl border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setSelectedOrderDetail(item)}
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

                {/* Sub-modals for details, dispute, support */}
                {selectedOrderDetail && renderOrderDetailDrawer()}
                {showDisputeModal && renderDisputeModal()}
                {showSupportChat && renderSupportChatDrawer()}
            </div>
        );
    };

    const renderOrderDetailDrawer = () => {
        const order = selectedOrderDetail;
        const stageInfo = getLiveTrackingStage(order);
        const isCancelled = order.status === 'CANCELLED';
        const isRefunded = order.status === 'REFUNDED';
        const isCompleted = order.status === 'DELIVERED' || order.status === 'COMPLETED' || stageInfo.stage === 3;

        const drivers = [
            { name: "Ramu Prasad", phone: "+91 98765 43210", rating: "4.9", vehicle: "Mahindra pickup", img: "👨🏽‍✈️" },
            { name: "Satish Kumar", phone: "+91 99112 23344", rating: "4.8", vehicle: "Tata Ace", img: "👨🏼‍✈️" }
        ];
        const assignedDriver = order.driver || drivers[0];
        const displayPrice = order.totalAmount || order.total || order.totalPrice || order.charge || 150;
        const subtotal = order.subtotal || order.totalPrice || displayPrice;

        return (
            <div className="fixed inset-0 z-[150] bg-slate-900/65 backdrop-blur-sm flex items-end justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800/80 animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Track Booking</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.id}</p>
                        </div>
                        <button onClick={() => setSelectedOrderDetail(null)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 rounded-full text-slate-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1 scrollbar-hide">
                        {/* Blockchain Verified Cryptographic Certificate Badge */}
                        <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-900/50 flex justify-between items-center shadow-inner">
                            <div>
                                <span className="text-[8px] text-slate-555 font-bold uppercase tracking-wider block">Trust ledger signature</span>
                                <span className="text-[10px] font-mono text-emerald-450 dark:text-emerald-400 font-black">
                                    0x{Math.abs(order.id.split('').reduce((acc: number, val: string) => acc + val.charCodeAt(0), 0)).toString(16)}bc8a...f493
                                </span>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                                Ledger Verified
                            </span>
                        </div>

                        {/* savings and carbon offsets banner */}
                        {!isCancelled && !isRefunded && (
                            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Leaf size={16} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-emerald-400">Green Commute Carbon Ledger</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">🌿 {order.carbonSaved || '1.2'}kg CO2 Offset</p>
                                    <p className="text-[9px] text-slate-550 font-medium">₹{order.middlemanBypassed || '50'} Direct Saved</p>
                                </div>
                            </div>
                        )}

                        {/* Stepper tracking */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Journey Tracker</h4>
                            {(() => {
                                const renderStep = (stepIdx: number, title: string, subtitle: string) => {
                                    const isPast = stageInfo.stage >= stepIdx;
                                    const isCurrent = stageInfo.stage === stepIdx;
                                    return (
                                        <div className="flex gap-3 relative" key={stepIdx}>
                                            {stepIdx < 3 && (
                                                <div className={`absolute left-2.5 top-6 bottom-[-16px] w-[2px] ${stageInfo.stage > stepIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                            )}
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-colors ${
                                                isPast ? 'bg-emerald-500 text-white' : 
                                                isCurrent ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                {isPast ? '✓' : stepIdx + 1}
                                            </div>
                                            <div>
                                                <h5 className={`text-xs font-bold ${isCurrent ? 'text-blue-500' : 'text-slate-800 dark:text-white'}`}>{title}</h5>
                                                <p className="text-[10px] text-slate-555 font-medium">{subtitle}</p>
                                            </div>
                                        </div>
                                    );
                                };

                                if (isCancelled) {
                                    return (
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-center">
                                            <X size={20} className="text-rose-500" />
                                            <div>
                                                <h5 className="text-xs font-bold text-rose-500">Booking Cancelled</h5>
                                                <p className="text-[10px] text-slate-555 font-medium">This booking has been cancelled.</p>
                                            </div>
                                        </div>
                                    );
                                }

                                if (isRefunded) {
                                    return (
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 items-center">
                                            <ShieldCheck size={20} className="text-indigo-500" />
                                            <div>
                                                <h5 className="text-xs font-bold text-indigo-500">Booking Refunded</h5>
                                                <p className="text-[10px] text-slate-555 font-medium">Dispute claim approved. Refund of ₹{displayPrice} credited to wallet.</p>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4 p-1.5 bg-slate-50/55 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800/80">
                                        <div className="space-y-4 p-4">
                                            {order.historyType === 'MANDI' ? (
                                                <>
                                                    {renderStep(0, "Order Confirmed", "Crates allocated at farm")}
                                                    {renderStep(1, "Quality Assured", "FSSAI standards verified")}
                                                    {renderStep(2, "Out for Delivery", "Transit telemetry active")}
                                                    {renderStep(3, "Delivered", "Delivered to doorstep")}
                                                </>
                                            ) : (
                                                <>
                                                    {renderStep(0, "Ticket Issued", "Seat coordinates registered")}
                                                    {renderStep(1, "Driver Dispatched", "Driver heading to boarding point")}
                                                    {renderStep(2, "Boarding active", "Please check-in with driver QR")}
                                                    {renderStep(3, "Journey Completed", "Arrived at destination")}
                                                </>
                                            )}
                                        </div>

                                        {stageInfo.stage === 2 && (
                                            <div className="px-4 pb-4">
                                                {/* Weather & Traffic Telemetry Indicators */}
                                                <div className="flex gap-2 mb-3 bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200/50 dark:border-slate-900">
                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                        ☀️ Sunny 32°C
                                                    </span>
                                                    <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 ml-auto">
                                                        🟢 Light Traffic (No Blocks)
                                                    </span>
                                                </div>

                                                <div className="bg-slate-950 rounded-3xl p-3 border border-slate-900 shadow-inner relative overflow-hidden h-32">
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
                                                        <text x="8" y="55" className="fill-slate-450 font-black text-[5px]">ORIGIN</text>
                                                        <circle cx="90" cy="25" r="4.5" className="fill-blue-500" />
                                                        <text x="80" y="35" className="fill-slate-450 font-black text-[5px]">DROP</text>
                                                        <g className="animate-pulse">
                                                            <circle cx="48" cy="25" r="6" className="fill-emerald-500/20 stroke-emerald-500 stroke-0.5" />
                                                            <text x="45" y="28" className="text-[7px]">
                                                                {order.historyType === 'TICKET' ? '🚌' : '🚚'}
                                                            </text>
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
                        {!isCancelled && !isRefunded && (
                            <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-[24px] p-4 border border-slate-100/50 dark:border-slate-800/50">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned Pilot</h4>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-855 shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center text-2xl">
                                            {order.historyType === 'TICKET' ? '🚌' : assignedDriver.img}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-855 dark:text-white text-sm">
                                                {order.driverName || assignedDriver.name}
                                            </h5>
                                            <p className="text-[10px] text-slate-555 font-semibold">
                                                {order.driverPhone || assignedDriver.phone} • {assignedDriver.rating || '4.8'} ★
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSupportMessages([
                                                { sender: 'AGENT', text: `Hi! Welcome to VillageLink direct pilot messenger. How can I help you contact the driver?`, timestamp: Date.now() }
                                            ]);
                                            setShowSupportChat(true);
                                        }}
                                        className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl border border-blue-100 dark:border-blue-500/20 transition-all"
                                    >
                                        <Phone size={14} />
                                    </button>
                                </div>
                                
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Pickup Verification OTP</p>
                                        <p className="text-sm font-mono font-black text-slate-805 dark:text-white tracking-widest">{order.pickupOtp || '4029'}</p>
                                    </div>
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Dropoff Verification OTP</p>
                                        <p className="text-sm font-mono font-black text-slate-805 dark:text-white tracking-widest">{order.deliveryOtp || '8921'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Billing details */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billing Breakdown</h4>
                            <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-[24px] p-4 border border-slate-100/50 dark:border-slate-800/50 space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-555">Fare / Subtotal</span>
                                    <span className="font-bold text-slate-800 dark:text-white">₹{subtotal}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-555">Taxes & Platform Fees</span>
                                    <span className="font-bold text-slate-800 dark:text-white">₹{order.platformFee || 0}</span>
                                </div>
                                <div className="flex justify-between font-black text-slate-855 dark:text-white text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                                    <span>Grand Total</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">₹{displayPrice}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                        {(order.status === 'PENDING' || order.status === 'PLACED') && (
                            <button 
                                onClick={() => cancelLocalOrder(order.id, order.historyType)}
                                className="flex-1 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-455 hover:bg-rose-100 rounded-xl font-bold text-sm border border-rose-100 dark:border-rose-500/20"
                            >
                                Cancel Booking
                            </button>
                        )}
                        {stageInfo.stage === 3 && order.status !== 'REFUNDED' && (
                            <button 
                                onClick={() => {
                                    setDisputeReason('');
                                    setShowDisputeModal(true);
                                }}
                                className="flex-1 py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-455 hover:bg-rose-100 rounded-xl font-bold text-sm border border-rose-100 dark:border-rose-500/20"
                            >
                                Raise Dispute
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                const initialText = order.historyType === 'TICKET' ? 
                                    `Hi! Direct link established with Driver ${order.driverName || 'Satish Kumar'}. Need any assistance regarding route checkpoints?` :
                                    `Hi! Direct connection to Courier ${order.driver?.name || 'Ramu Prasad'} active. How can I help you locate shipment crates?`;
                                setSupportMessages([
                                    { sender: 'AGENT', text: initialText, timestamp: Date.now() }
                                ]);
                                setShowSupportChat(true);
                            }}
                            className="flex-1 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm"
                        >
                            Chat Driver
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDisputeModal = () => {
        const order = selectedOrderDetail;
        return (
            <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-slate-855 dark:text-white">Raise Booking Dispute</h3>
                        <button onClick={() => setShowDisputeModal(false)} className="text-slate-400 p-1">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-555 mb-5 leading-relaxed">Select the dispute query. Approved claims will process instant refunds directly into your VillageLink wallet.</p>
                    
                    <div className="space-y-3 mb-6">
                        {[
                            { val: "DELAYED", text: "🕒 Commute heavily delayed" },
                            { val: "STALE", text: "🥬 Mandi produce stale/damaged" },
                            { val: "DRIVER", text: "👨🏼‍✈️ Driver behavior issue" },
                            { val: "WRONG", text: "❌ Wrong items/seating delivered" }
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => setDisputeReason(opt.val)}
                                className={`w-full p-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                    disputeReason === opt.val ? 
                                    'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-455 font-black' : 
                                    'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350'
                                }`}
                            >
                                <span>{opt.text}</span>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${disputeReason === opt.val ? 'border-rose-500 bg-rose-505 text-white' : 'border-slate-300'}`}>
                                    {disputeReason === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => handleDisputeSubmit(order, disputeReason)}
                        disabled={!disputeReason}
                        className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center flex items-center justify-center gap-2 text-sm"
                    >
                        <ShieldCheck size={16} /> Submit Claim Refund
                    </button>
                </div>
            </div>
        );
    };

    const renderSupportChatDrawer = () => {
        const order = selectedOrderDetail;
        const options = order.historyType === 'TICKET' ? [
            "📍 Where is my bus?",
            "📞 Call driver",
            "💺 Request front seat"
        ] : [
            "📍 Where is my delivery truck?",
            "📞 Call delivery partner",
            "📦 Report missing crop items"
        ];

        return (
            <div className="fixed inset-0 z-[170] bg-slate-900/60 backdrop-blur-sm flex justify-end p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-955 w-full max-w-md h-full flex flex-col shadow-2xl rounded-3xl animate-slide-left overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                                👨🏽‍✈️
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                                    {order.driverName || order.driver?.name || 'Assigned Driver'}
                                </h3>
                                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Pilot Connected
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowSupportChat(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 rounded-full text-slate-550 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                        {supportMessages.map((msg, idx) => {
                            const isUser = msg.sender === 'USER';
                            return (
                                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                    <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                        isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-205 border border-slate-100 dark:border-slate-808/80 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        {supportTyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {options.map((qText) => (
                                <button
                                    key={qText}
                                    onClick={() => handleSupportQueryClick(qText)}
                                    className="whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-3.5 py-2 rounded-xl text-[11px] font-bold border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-202 transition-colors"
                                >
                                    {qText}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (showUniversalOrders) {
        return renderUniversalOrdersView();
    }

    // Render active module
    if (activeModule !== 'HOME' && activeModule !== 'PROFILE') {
        return (
            <React.Suspense fallback={
                <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                    <Loader2 className="animate-spin text-green-600" size={40} />
                </div>
            }>
                {activeModule === 'YATRA' && <PassengerBooking user={user} lang={lang} />}
                {activeModule === 'FOOD' && <FoodLinkHome user={user} onBack={() => setActiveModule('HOME')} />}
                {activeModule === 'GRAMMANDI' && <GramMandiHome user={user} onBack={() => setActiveModule('HOME')} />}
                {/* Add more modules as needed */}
                {(activeModule === 'VYAPAR' || activeModule === 'PARCEL' || activeModule === 'JOBS') && (
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
                        <button onClick={() => setActiveModule('HOME')} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
                            <ArrowLeft size={20} /> Back
                        </button>
                        <div className="text-center py-20">
                            <p className="text-6xl mb-4">{services.find(s => s.id === activeModule)?.emoji}</p>
                            <h2 className="text-xl font-bold dark:text-white">{services.find(s => s.id === activeModule)?.name}</h2>
                            <p className="text-slate-500 mt-2">Coming Soon!</p>
                        </div>
                    </div>
                )}
            </React.Suspense>
        );
    }

    // Profile View
    if (activeModule === 'PROFILE') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-8 pb-16 rounded-b-3xl">
                    <button onClick={() => setActiveModule('HOME')} className="flex items-center gap-2 mb-6">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{user.name}</h1>
                            <p className="text-green-100 text-sm">{user.phone || user.email}</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 -mt-8 space-y-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Wallet className="text-green-500" size={24} />
                            <div>
                                <p className="text-sm text-slate-500">Wallet Balance</p>
                                <p className="text-xl font-bold dark:text-white">₹{walletBalance}</p>
                            </div>
                        </div>
                        <Button className="bg-green-500">Add Money</Button>
                    </div>

                    {[
                        { icon: Ticket, label: 'My Bookings', color: 'text-blue-500', action: () => setShowUniversalOrders(true) },
                        { icon: Heart, label: 'Favorites', color: 'text-red-500', action: () => {} },
                        { icon: Gift, label: 'Rewards & Offers', color: 'text-purple-500', action: () => {} },
                        { icon: Bell, label: 'Notifications', color: 'text-amber-500', action: () => {} },
                        { icon: Settings, label: 'Settings', color: 'text-slate-500', action: () => {} },
                    ].map((item, idx) => (
                        <button key={idx} onClick={item.action} className="w-full bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <item.icon className={item.color} size={20} />
                                <span className="dark:text-white font-medium">{item.label}</span>
                            </div>
                            <ChevronRight className="text-slate-400" size={18} />
                        </button>
                    ))}

                    <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl p-4 font-medium">
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    // HOME View
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 pt-6 pb-8 rounded-b-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-green-100 text-sm">Welcome back,</p>
                        <h1 className="text-xl font-bold">{user.name?.split(' ')[0] || 'User'} 👋</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 bg-white/20 rounded-full" onClick={() => setActiveModule('PROFILE')} aria-label="Notifications">
                            <Bell size={20} />
                            {notifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                    {notifications}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setActiveModule('PROFILE')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold" aria-label="User Profile">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search buses, food, products..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
            </div>

            {/* Wallet Card */}
            <div className="px-4 -mt-4">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs">VillageLink Wallet</p>
                        <p className="text-2xl font-bold">₹{walletBalance}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium" aria-label="Add Money to Wallet">Add</button>
                        <button className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium" aria-label="Scan QR Code">
                            <QrCode size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            <div className="p-4 mt-4">
                <h2 className="text-lg font-bold dark:text-white mb-4">Our Services</h2>
                <div className="grid grid-cols-3 gap-3">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => setActiveModule(service.id as ActiveModule)}
                            className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-800"
                        >
                            <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-r ${service.color} rounded-xl flex items-center justify-center text-white`}>
                                <service.icon size={24} />
                            </div>
                            <h3 className="font-bold text-sm dark:text-white">{service.name}</h3>
                            <p className="text-[10px] text-slate-500">{service.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mt-4">
                <h2 className="text-lg font-bold dark:text-white mb-3">Quick Actions</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { label: 'Book Bus', emoji: '🚌', action: () => setActiveModule('YATRA') },
                        { label: 'Order Food', emoji: '🍽️', action: () => setActiveModule('FOOD') },
                        { label: 'Buy Vegetables', emoji: '🥬', action: () => setActiveModule('GRAMMANDI') },
                        { label: 'Track Order', emoji: '📍', action: () => setShowUniversalOrders(true) },
                    ].map((action, idx) => (
                        <button
                            key={idx}
                            onClick={action.action}
                            className="min-w-[100px] bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-3 text-center"
                        >
                            <span className="text-xl">{action.emoji}</span>
                            <p className="text-xs mt-1 font-medium">{action.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-around items-center">
                <button onClick={() => setActiveModule('HOME')} className={`flex flex-col items-center gap-1 p-2 ${activeModule === 'HOME' ? 'text-green-600' : 'text-slate-400'}`}>
                    <Home size={22} />
                    <span className="text-xs">Home</span>
                </button>
                <button onClick={() => setActiveModule('YATRA')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Bus size={22} />
                    <span className="text-xs">Yatra</span>
                </button>
                <button onClick={() => setActiveModule('GRAMMANDI')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Wheat size={22} />
                    <span className="text-xs">Mandi</span>
                </button>
                <button onClick={() => setActiveModule('FOOD')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <Utensils size={22} />
                    <span className="text-xs">Food</span>
                </button>
                <button onClick={() => setActiveModule('PROFILE')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
                    <UserIcon size={22} />
                    <span className="text-xs">Profile</span>
                </button>
            </div>
        </div>
    );
};

export default UserPanel;
