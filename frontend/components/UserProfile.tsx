
import React, { useEffect, useState } from 'react';
import { User, Wallet } from '@villagelink/shared';
import { getAuthToken } from '../services/authService';
import { getWallet } from '../services/blockchainService';
import { calculateGramScore } from '../services/mlService';
import { getStoredTickets, getMyPasses, getAllParcels, cancelTicket } from '../services/transportService';
import { ArrowLeft, History, MapPin, Calendar, CreditCard, Wallet as WalletIcon, User as UserIcon, Mail, Phone, Shield, Bus, Package, Car, Ticket as TicketIcon, Gem, Layers, Filter, CheckCircle2, Clock, Users, TrendingUp, ShieldCheck, Compass, Wheat } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface UserProfileProps {
    user: User;
    onBack: () => void;
    onShowPayments?: () => void;
    onShowAdmin?: () => void;
    onLogout?: () => void;
    isDevMode?: boolean;
    onToggleDevMode?: () => void;
}

type FilterType = 'ALL' | 'TRIPS' | 'PASSES' | 'PARCELS' | 'MANDI';

export const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onShowPayments, onShowAdmin, onLogout, isDevMode, onToggleDevMode }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [activeTab, setActiveTab] = useState<'HISTORY' | 'WALLET' | 'REFERRAL'>('HISTORY');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [gramScore, setGramScore] = useState(300);
    const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = getAuthToken();
            let serverData: any[] = [];
            let mandiOrders: any[] = [];

            const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

            try {
                // Fetch from backend
                const res = await fetch(`${API_BASE_URL}/api/user/history?userId=${user.id}`, { headers });
                if (res.ok) {
                    serverData = await res.json();
                } else {
                    console.warn("History API returned non-200 status");
                    if (res.status === 401) {
                        window.dispatchEvent(new Event('auth_error'));
                    }
                }
            } catch (e) {
                console.error("Failed to load history from server", e);
            }

            try {
                // Fetch Mandi orders
                const res = await fetch(`${API_BASE_URL}/api/grammandi/orders/my`, { headers });
                if (res.ok) {
                    mandiOrders = await res.json();
                } else if (res.status === 401) {
                    window.dispatchEvent(new Event('auth_error'));
                }
            } catch (e) {
                console.error("Failed to load Mandi history from server", e);
            }

            // Merge local Mandi orders
            const localMandi = localStorage.getItem('grammandi_orders');
            const localMandiParsed = localMandi ? JSON.parse(localMandi) : [];
            const mergedMandi = [...mandiOrders];
            localMandiParsed.forEach((lo: any) => {
                if (!mergedMandi.some(o => o.id === lo.id)) {
                    mergedMandi.push(lo);
                }
            });

            const formattedMandi = mergedMandi.map(o => ({
                ...o,
                historyType: 'MANDI',
                sortDate: o.createdAt || Date.now()
            }));

            // MERGE LOCAL CACHE (Recent bookings not yet synced or offline bookings)
            const localTickets = getStoredTickets()
                .filter(t => t.userId === user.id)
                .map(t => {
                    let hType = 'TICKET';
                    if (t.id && t.id.startsWith('TOUR-')) hType = 'TOUR';
                    else if (t.id && t.id.startsWith('LT-')) hType = 'PARCEL';
                    return { ...t, historyType: hType, sortDate: t.timestamp };
                });

            // Use a Map for O(1) deduplication by ID
            const historyMap = new Map();

            // Add Server Data First
            serverData.forEach(item => {
                let hType = item.historyType || 'TICKET';
                if (item.id && item.id.startsWith('TOUR-')) hType = 'TOUR';
                else if (item.id && item.id.startsWith('LT-')) hType = 'PARCEL';
                
                historyMap.set(item.id, {
                    ...item,
                    historyType: hType,
                    sortDate: item.sortDate || item.timestamp || item.purchaseDate || (item.date ? new Date(item.date).getTime() : Date.now())
                });
            });

            // Add/Overwrite with Local Data (Latest state)
            localTickets.forEach(item => historyMap.set(item.id, item));

            // Add Mandi Data
            formattedMandi.forEach(item => historyMap.set(item.id, item));

            const merged = Array.from(historyMap.values());

            // Sort by date desc
            merged.sort((a, b) => {
                const timeA = a.sortDate || a.timestamp || a.purchaseDate || (a.date ? new Date(a.date).getTime() : 0) || 0;
                const timeB = b.sortDate || b.timestamp || b.purchaseDate || (b.date ? new Date(b.date).getTime() : 0) || 0;
                return timeB - timeA;
            });

            setHistory(merged);
            setLoading(false);
        };

        const fetchWallet = async () => {
            const w = await getWallet(user.id);
            setWallet(w);
        };

        fetchWallet();
        fetchHistory();
    }, [user.id]);

    useEffect(() => {
        if (wallet && history) {
            // ML Feature 7: Gram Score Calculation
            setGramScore(calculateGramScore(history, wallet.balance));
        }
    }, [wallet, history]);

    const getFilteredHistory = () => {
        return history.filter(item => {
            if (filter === 'ALL') return true;
            if (filter === 'TRIPS') return item.historyType === 'TICKET' || item.historyType === 'RENTAL' || item.historyType === 'TOUR';
            if (filter === 'PASSES') return item.historyType === 'PASS';
            if (filter === 'PARCELS') return item.historyType === 'PARCEL';
            if (filter === 'MANDI') return item.historyType === 'MANDI';
            return true;
        });
    };

    const groupHistoryByDate = (items: any[]) => {
        const groups: Record<string, any[]> = {};
        items.forEach(item => {
            // Use the sortDate provided by the backend or fallback
            const dateVal = item.sortDate || item.timestamp || item.purchaseDate || (item.date ? new window.Date(item.date).getTime() : window.Date.now());
            const dateObj = new window.Date(dateVal);
            const today = new window.Date();
            const yesterday = new window.Date();
            yesterday.setDate(today.getDate() - 1);

            let dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            if (dateObj.toDateString() === today.toDateString()) dateStr = 'Today';
            else if (dateObj.toDateString() === yesterday.toDateString()) dateStr = 'Yesterday';

            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(item);
        });
        return groups;
    };

    const handleCancelTicket = async (ticket: any) => {
        if (!window.confirm("Are you sure you want to cancel this ticket? A service charge of 10% will be deducted from your refund.")) return;
        
        setCancelLoadingId(ticket.id);
        try {
            const res = await cancelTicket(ticket.id);
            if (res.success) {
                alert(`Ticket Cancelled! Refund processing: ₹${res.refundAmount || (ticket.totalPrice * 0.9).toFixed(2)} (10% Service Charge Deducted)`);
                // Update local list directly for fast UI update
                setHistory(prev => prev.map(item => item.id === ticket.id ? { ...item, status: 'CANCELLED' } : item));
            } else {
                alert("Cancellation failed: " + res.message);
            }
        } catch (e) {
            alert("Error cancelling ticket");
        }
        setCancelLoadingId(null);
    };

    const renderHistoryItem = (item: any) => {
        switch (item.historyType) {
            case 'TICKET':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-luxe-sienna/10 dark:bg-luxe-sienna/20 p-2.5 rounded-full text-luxe-sienna">
                                <Bus size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                                    {item.from} <ArrowLeft size={10} className="rotate-180 text-slate-400" /> {item.to}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                    <span>{item.paymentMethod}</span>
                                    {item.status === 'BOARDED' ? <span className="text-emerald-500 font-bold">• Active</span> : <span>• {item.status}</span>}
                                </p>
                                {item.transactionId && <p className="text-[9px] text-slate-400 font-mono mt-1">Txn: {item.transactionId}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">₹{typeof item.totalPrice === 'number' ? Number(item.totalPrice.toFixed(2)) : item.totalPrice}</p>
                            <p className="text-[10px] text-slate-400">{new window.Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            
                            {(item.status === 'PENDING' || item.status === 'PROVISIONAL') && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelTicket(item); }}
                                    disabled={cancelLoadingId === item.id}
                                    className="mt-2 text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                                >
                                    {cancelLoadingId === item.id ? 'Cancelling...' : 'Cancel Ticket'}
                                </button>
                            )}
                            
                            {item.status === 'CANCELLED' && (
                                <p className="mt-2 text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded">Cancelled</p>
                            )}
                        </div>
                    </div>
                );
            case 'PASS':
                return (
                    <div key={item.id} className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 flex items-center justify-between shadow-sm text-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2.5 rounded-full text-emerald-400">
                                <TicketIcon size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">{item.type} PASS</h4>
                                <p className="text-[10px] opacity-70 mt-0.5">
                                    Expires: {new window.Date(item.expiryDate).toLocaleDateString()}
                                </p>
                                {item.transactionId && <p className="text-[9px] opacity-50 font-mono mt-1">Txn: {item.transactionId}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold">₹{item.price}</p>
                            <p className="text-[10px] opacity-50 bg-white/10 px-2 py-0.5 rounded mt-1 inline-block">{item.status}</p>
                        </div>
                    </div>
                );
            case 'RENTAL':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-luxe-teal/10 dark:bg-luxe-teal/20 p-2.5 rounded-full text-luxe-teal">
                                <Car size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.tripType === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'} Charter</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {item.from} → {item.to}
                                </p>
                                {item.transactionId && <p className="text-[9px] text-slate-400 font-mono mt-1">Txn: {item.transactionId}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">₹{item.totalFare}</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${item.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                );
            case 'PARCEL':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-luxe-gold/10 dark:bg-luxe-gold/20 p-2.5 rounded-full text-luxe-gold">
                                <Package size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Logistics: {item.weightKg}kg</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {item.from} → {item.to}
                                </p>
                                {item.transactionId && <p className="text-[9px] text-slate-400 font-mono mt-1">Txn: {item.transactionId}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">₹{item.price}</p>
                            <span className="text-[9px] text-slate-400">{item.status}</span>
                        </div>
                    </div>
                );
            case 'TOUR':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-500/10 dark:bg-brand-500/20 p-2.5 rounded-full text-brand-500">
                                <Compass size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {item.to || 'Adventure Package'}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {item.toDetails || 'Tourism Package'} • {item.driverId || 'Local Guide'}
                                </p>
                                {item.transactionId && <p className="text-[9px] text-slate-400 font-mono mt-1">Txn: {item.transactionId}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">₹{item.totalPrice}</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                );
            case 'MANDI':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-2.5 rounded-full text-emerald-600">
                                <Wheat size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {item.sender || 'Direct Sourced Produce'}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Direct Farm Fresh Vegetables • {item.items?.map((it: any) => `${it.name} x${it.quantity}`).join(', ') || 'Fresh Items'}
                                </p>
                                {item.id && <p className="text-[9px] text-slate-400 font-mono mt-1">ID: {item.id}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">₹{item.totalAmount || item.total || item.totalPrice || item.charge || 150}</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${item.status === 'CANCELLED' || item.status === 'REFUNDED' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-455' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                {item.status || 'Completed'}
                            </span>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    const groupedHistory = groupHistoryByDate(getFilteredHistory());

    return (
        <div className="animate-fade-in pb-20 min-h-screen bg-slate-50 dark:bg-black">
            {/* V5 - Integrated Profile Tabs - Made Sticky */}
            <div className="sticky top-0 bg-slate-50/90 dark:bg-[var(--bg-void)]/90 backdrop-blur-md z-20 border-b border-slate-200/50 dark:border-slate-800 pt-4 pb-4 px-4 shadow-sm mb-6">
                <div className="flex p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : '!text-slate-600 dark:!text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: activeTab !== 'HISTORY' ? '#475569' : undefined }}>
                        <History size={14} /> Activity
                    </button>
                    <button onClick={() => setActiveTab('WALLET')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'WALLET' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : '!text-slate-600 dark:!text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: activeTab !== 'WALLET' ? '#475569' : undefined }}>
                        <WalletIcon size={14} /> Wallet
                    </button>
                    <button onClick={() => setActiveTab('REFERRAL')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'REFERRAL' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : '!text-slate-600 dark:!text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: activeTab !== 'REFERRAL' ? '#475569' : undefined }}>
                        <Users size={14} /> Invite
                    </button>
                </div>
                {onToggleDevMode && (
                    <div className="flex items-center justify-between mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                🛠️ Developer Mode (Testing Panels)
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Unlock Mandi & Mess panels for internal testing
                            </p>
                        </div>
                        <button
                            onClick={onToggleDevMode}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm ${
                                isDevMode 
                                    ? 'bg-amber-500 text-black shadow-amber-500/30 scale-105' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {isDevMode ? 'ENABLED' : 'DISABLED'}
                        </button>
                    </div>
                )}
                {user.role === 'ADMIN' && onShowAdmin && (
                    <div className="flex justify-center mt-3">
                        <button onClick={onShowAdmin} className="text-[10px] font-bold bg-[#BE5103] text-white px-6 py-2 rounded-full flex items-center gap-1.5 shadow-lg shadow-luxe-sienna/20 active:scale-95 transition-transform">
                            <ShieldCheck size={14} /> Open Admin Panel
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'WALLET' && wallet && (
                <div className="animate-fade-in space-y-6 px-4">
                    <div className="bg-gradient-to-br from-[#BE5103] to-[#FFCE1B] rounded-[32px] p-6 text-white shadow-xl hover:shadow-[0_20px_40px_rgba(190,81,3,0.3)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 relative overflow-hidden border border-white/20 group">
                        {/* Animated shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>
                        
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-[#FFCE1B]/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 delay-100"></div>

                        <p className="text-xs font-bold uppercase opacity-90 mb-1 flex items-center gap-1 relative z-10"><Gem size={14} className="animate-pulse" /> GramCoin Balance</p>
                        <h3 className="text-5xl font-black mb-5 tracking-tight drop-shadow-md relative z-10">{wallet.balance}</h3>
                        <div className="flex items-center justify-between text-[10px] opacity-90 relative z-10">
                            <span className="font-mono bg-black/20 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-inner">{wallet.address.substring(0, 12)}...</span>
                            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-200" /> Verified on TrustChain</span>
                        </div>
                    </div>

                    {/* ML Feature 7: Gram Score Display */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Gram-Score</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{gramScore} <span className="text-xs font-normal text-slate-400">/ 900</span></p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded font-bold mb-1">Excellent</div>
                            <p className="text-[10px] text-slate-400">Credit Limit: ₹{user.creditLimit}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm text-slate-500 uppercase mb-4 pl-1">Recent Transactions</h4>
                        <div className="space-y-3">
                            {wallet.transactions && wallet.transactions.length > 0 ? (
                                wallet.transactions.map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${tx.type === 'EARN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {tx.type === 'EARN' ? <ArrowLeft size={16} className="rotate-45" /> : <ArrowLeft size={16} className="-rotate-[135deg]" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white">{tx.desc}</p>
                                                <p className="text-[10px] text-slate-400">{new window.Date(tx.timestamp).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold text-sm ${tx.type === 'EARN' ? 'text-luxe-teal' : 'text-slate-500'}`}>
                                            {tx.type === 'EARN' ? '+' : '-'}{tx.amount}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 border-dashed">
                                    <Clock size={24} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-medium">No recent transactions</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="animate-fade-in px-4">
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white dark:bg-slate-900 !text-slate-600 dark:!text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: filter !== 'ALL' ? '#475569' : undefined }}>All</button>
                        <button onClick={() => setFilter('TRIPS')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'TRIPS' ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white dark:bg-slate-900 !text-slate-600 dark:!text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: filter !== 'TRIPS' ? '#475569' : undefined }}>Trips</button>
                        <button onClick={() => setFilter('PASSES')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'PASSES' ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white dark:bg-slate-900 !text-slate-600 dark:!text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: filter !== 'PASSES' ? '#475569' : undefined }}>Passes</button>
                        <button onClick={() => setFilter('PARCELS')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'PARCELS' ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white dark:bg-slate-900 !text-slate-600 dark:!text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: filter !== 'PARCELS' ? '#475569' : undefined }}>Parcels</button>
                        <button onClick={() => setFilter('MANDI')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'MANDI' ? 'bg-[#BE5103] text-white border-[#BE5103]' : 'bg-white dark:bg-slate-900 !text-slate-600 dark:!text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`} style={{ color: filter !== 'MANDI' ? '#475569' : undefined }}>Mandi 🌾</button>
                        <div className="flex-1"></div>
                        {onShowPayments && (
                            <button onClick={onShowPayments} className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#BE5103] text-white shadow-lg shadow-[#BE5103]/20 whitespace-nowrap flex items-center gap-2">
                                <CreditCard size={14} /> Payments
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-slate-400 animate-pulse">Loading history...</div>
                    ) : Object.keys(groupedHistory).length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <History size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No activity history found.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedHistory).map(([dateLabel, items]) => (
                                <div key={dateLabel}>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 pl-1 sticky top-16 bg-slate-50 dark:bg-black py-2 z-10">{dateLabel}</h3>
                                    <div className="space-y-3">
                                        {items.map(item => renderHistoryItem(item))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfile;
