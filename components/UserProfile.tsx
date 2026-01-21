
import React, { useEffect, useState } from 'react';
import { User, Wallet } from '../types';
import { getAuthToken } from '../services/authService';
import { getWallet } from '../services/blockchainService';
import { calculateGramScore } from '../services/mlService';
import { getStoredTickets, getMyPasses, getAllParcels } from '../services/transportService';
import { ArrowLeft, History, MapPin, Calendar, CreditCard, Wallet as WalletIcon, User as UserIcon, Mail, Phone, Shield, Bus, Package, Car, Ticket as TicketIcon, Gem, Layers, Filter, CheckCircle2, Clock, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface UserProfileProps {
    user: User;
    onBack: () => void;
    onShowPayments?: () => void;
    onShowAdmin?: () => void;
}

type FilterType = 'ALL' | 'TRIPS' | 'PASSES' | 'PARCELS';

export const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onShowPayments, onShowAdmin }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [activeTab, setActiveTab] = useState<'HISTORY' | 'WALLET' | 'REFERRAL'>('HISTORY');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [gramScore, setGramScore] = useState(300);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = getAuthToken();
            let serverData: any[] = [];

            try {
                // Fetch from backend
                const res = await fetch(`${API_BASE_URL}/api/user/history?userId=${user.id}`, {
                    headers: { 'Authorization': token || '' }
                });
                if (res.ok) {
                    serverData = await res.json();
                } else {
                    console.warn("History API returned non-200 status");
                }
            } catch (e) {
                console.error("Failed to load history from server", e);
            }

            // MERGE LOCAL CACHE (Recent bookings not yet synced or offline bookings)
            const localTickets = getStoredTickets()
                .filter(t => t.userId === user.id)
                .map(t => ({ ...t, historyType: 'TICKET', sortDate: t.timestamp }));

            // Use a Map for O(1) deduplication by ID
            const historyMap = new Map();

            // Add Server Data First
            serverData.forEach(item => historyMap.set(item.id, item));

            // Add/Overwrite with Local Data (Latest state)
            localTickets.forEach(item => historyMap.set(item.id, item));

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
            if (filter === 'TRIPS') return item.historyType === 'TICKET' || item.historyType === 'RENTAL';
            if (filter === 'PASSES') return item.historyType === 'PASS';
            if (filter === 'PARCELS') return item.historyType === 'PARCEL';
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

    const renderHistoryItem = (item: any) => {
        switch (item.historyType) {
            case 'TICKET':
                return (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-50 dark:bg-brand-900/30 p-2.5 rounded-full text-brand-600 dark:text-brand-400">
                                <Bus size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white flex items-center gap-1">
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
                            <p className="font-bold text-slate-800 dark:text-white">₹{item.totalPrice}</p>
                            <p className="text-[10px] text-slate-400">{new window.Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-full text-indigo-600 dark:text-indigo-400">
                                <Car size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white">{item.tripType === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'} Charter</h4>
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
                            <div className="bg-orange-50 dark:bg-orange-900/30 p-2.5 rounded-full text-orange-600 dark:text-orange-400">
                                <Package size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white">Logistics: {item.weightKg}kg</h4>
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
            default: return null;
        }
    }

    const groupedHistory = groupHistoryByDate(getFilteredHistory());

    return (
        <div className="animate-fade-in pb-20 min-h-screen bg-slate-50 dark:bg-black">
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-50/90 dark:bg-black/90 backdrop-blur-md p-4 z-20 border-b border-slate-200/50 dark:border-slate-800">
                <button onClick={onBack} className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm" aria-label="Go Back">
                    <ArrowLeft size={20} className="dark:text-white" />
                </button>
                <h2 className="text-xl font-bold dark:text-white">Profile & Activity</h2>
            </div>

            <div className="px-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-brand-500/20">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold dark:text-white">{user.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">{user.role}</span>
                            <span>•</span>
                            <span className="font-mono">{user.id}</span>
                        </div>
                        {user.role === 'ADMIN' && onShowAdmin && (
                            <button onClick={onShowAdmin} className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                                <ShieldCheck size={12} /> Admin Panel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 mb-6">
                <div className="flex p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        <History size={14} /> Activity
                    </button>
                    <button onClick={() => setActiveTab('WALLET')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'WALLET' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        <WalletIcon size={14} /> Wallet
                    </button>
                    <button onClick={() => setActiveTab('REFERRAL')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'REFERRAL' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        <Users size={14} /> Invite
                    </button>
                </div>
            </div>

            {activeTab === 'WALLET' && wallet && (
                <div className="animate-fade-in space-y-6 px-4">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                        <p className="text-xs font-bold uppercase opacity-80 mb-1 flex items-center gap-1"><Gem size={12} /> GramCoin Balance</p>
                        <h3 className="text-4xl font-bold mb-4">{wallet.balance}</h3>
                        <div className="flex items-center justify-between text-[10px] opacity-80">
                            <span className="font-mono bg-black/10 px-2 py-1 rounded">{wallet.address.substring(0, 12)}...</span>
                            <span>Verified on TrustChain</span>
                        </div>
                    </div>

                    {/* ML Feature 7: Gram Score Display */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Gram-Score</p>
                            <p className="text-2xl font-bold dark:text-white">{gramScore} <span className="text-xs font-normal text-slate-400">/ 900</span></p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded font-bold mb-1">Excellent</div>
                            <p className="text-[10px] text-slate-400">Credit Limit: ₹{user.creditLimit}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm text-slate-500 uppercase mb-4 pl-1">Recent Transactions</h4>
                        <div className="space-y-3">
                            {wallet.transactions.map(tx => (
                                <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${tx.type === 'EARN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {tx.type === 'EARN' ? <ArrowLeft size={16} className="rotate-45" /> : <ArrowLeft size={16} className="-rotate-[135deg]" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm dark:text-white">{tx.desc}</p>
                                            <p className="text-[10px] text-slate-400">{new window.Date(tx.timestamp).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${tx.type === 'EARN' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                        {tx.type === 'EARN' ? '+' : '-'}{tx.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="animate-fade-in px-4">
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>All</button>
                        <button onClick={() => setFilter('TRIPS')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'TRIPS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>Trips</button>
                        <button onClick={() => setFilter('PASSES')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'PASSES' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>Passes</button>
                        <button onClick={() => setFilter('PARCELS')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'PARCELS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>Parcels</button>
                        <div className="flex-1"></div>
                        {onShowPayments && (
                            <button onClick={onShowPayments} className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-500 text-white shadow-lg shadow-brand-500/20 whitespace-nowrap flex items-center gap-2">
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
