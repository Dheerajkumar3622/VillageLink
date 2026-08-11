import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, RefreshCw, IndianRupee, MapPin, Package, Users, Edit3, ChevronDown, ChevronUp, ArrowLeft, TrendingUp, Languages } from 'lucide-react';
import { getDriverHistory } from '../transportService';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { LanguageSelector } from './LanguageSelector';

interface DriverProfileModalProps {
    user: User;
    onClose: () => void;
}

export const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ user, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any>(null);
    const [earningsData, setEarningsData] = useState<{ today: number; week: number; month: number }>({ today: 0, week: 0, month: 0 });
    const [pendingOrders, setPendingOrders] = useState<number>(0);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [expandedTrip, setExpandedTrip] = useState(false);

    const loadProfileData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('villagelink_token');
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

            const [history, earningsRes, deliveriesRes] = await Promise.all([
                getDriverHistory(),
                fetch(`${API_BASE_URL}/api/driver/earnings`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${API_BASE_URL}/api/driver/deliveries`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
            ]);

            setHistoryData(history);

            if (earningsRes) {
                setEarningsData({
                    today: earningsRes.today?.total || 0,
                    week: earningsRes.thisWeek?.total || 0,
                    month: earningsRes.thisMonth?.total || 0
                });
            }

            if (deliveriesRes && deliveriesRes.deliveries) {
                const pending = deliveriesRes.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'ASSIGNED').length;
                setPendingOrders(pending);
            }
        } catch (e) {
            console.error('Error loading profile data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, []);

    const totalLedgerEarnings = historyData?.transactions?.reduce((sum: number, t: any) => sum + (t.type === 'EARN' ? t.amount : 0), 0) || 0;
    const totalTrips = historyData?.tickets?.length || 0;
    const totalParcels = historyData?.parcels?.length || 0;

    return createPortal(
        <div className="fixed inset-0 z-[250] bg-slate-950 text-white flex flex-col h-full w-full overflow-hidden animate-fade-in">
            
            {/* Top Navigation Bar - Sticky */}
            <div className="sticky top-0 z-30 flex items-center justify-between p-4 px-5 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-sm font-bold text-white border border-white/10"
                >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>
                
                <h1 className="text-base font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-amber-300 bg-clip-text text-transparent">
                    Driver Profile Page
                </h1>

                <button
                    onClick={() => setShowEditPopup(true)}
                    className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold border border-amber-500/30"
                    title="Edit Profile"
                >
                    <Edit3 size={16} />
                    <span className="hidden sm:inline">Edit</span>
                </button>
            </div>

            {/* Scrollable Page Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">

                {/* Profile Card Header */}
                <div className="p-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-900 to-black border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div 
                            onClick={() => setShowEditPopup(true)}
                            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-luxe-sienna via-amber-500 to-luxe-gold flex items-center justify-center font-black text-4xl text-white shadow-glow-md cursor-pointer hover:scale-105 transition-transform shrink-0 border-2 border-white/20"
                            title="Click to edit profile details"
                        >
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-black text-white truncate leading-tight mb-1">{user.name}</h2>
                            <p className="text-xs font-bold text-amber-400/90 uppercase tracking-widest truncate">
                                {user.vehicleType || 'Driver'} • {user.phone}
                            </p>
                            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active Verified Partner
                            </span>
                        </div>
                    </div>
                </div>

                {/* App Settings Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <Languages size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white">App Language</p>
                            <p className="text-[10px] text-slate-400">Select preferred language</p>
                        </div>
                    </div>
                    <LanguageSelector />
                </div>

                {/* Earnings Summary Grid (Today, Weekly, Pending) */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-emerald-400" /> Earnings Overview
                        </h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Sync</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Today Earnings */}
                        <div className="p-4 flex flex-col items-center justify-center bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                            <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">₹{earningsData.today}</span>
                            <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1 font-black">Today</span>
                        </div>

                        {/* Weekly Earnings */}
                        <div className="p-4 flex flex-col items-center justify-center bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
                            <span className="text-2xl font-black text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.3)]">₹{earningsData.week}</span>
                            <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1 font-black">Weekly</span>
                        </div>

                        {/* Pending Orders */}
                        <div className="p-4 flex flex-col items-center justify-center bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-xl relative overflow-hidden group hover:border-cyan-500/60 transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl"></div>
                            <span className="text-2xl font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.3)]">{pendingOrders}</span>
                            <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1 font-black">Pending</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics Bar */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 flex flex-col items-center">
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1">
                            <IndianRupee size={12} /> Total Ledger
                        </span>
                        <span className="text-lg font-black text-white">₹{totalLedgerEarnings}</span>
                    </div>
                    <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 flex flex-col items-center">
                        <span className="flex items-center gap-1 text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                            <Users size={12} /> Total Tickets
                        </span>
                        <span className="text-lg font-black text-white">{totalTrips}</span>
                    </div>
                    <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/10 flex flex-col items-center">
                        <span className="flex items-center gap-1 text-[10px] font-black text-luxe-teal uppercase tracking-wider mb-1">
                            <Package size={12} /> Total Parcels
                        </span>
                        <span className="text-lg font-black text-white">{totalParcels}</span>
                    </div>
                </div>

                {/* History List */}
                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Recent Activity & Trips</h3>
                        <button 
                            onClick={loadProfileData} 
                            className={`p-2 rounded-full text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all ${loading ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/40 rounded-3xl border border-white/5">
                            <Clock size={36} className="animate-pulse text-amber-400" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading ledger details...</p>
                        </div>
                    ) : historyData?.tickets?.length === 0 && historyData?.parcels?.length === 0 ? (
                        <div className="text-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-slate-900/20">
                            <p className="text-sm font-bold text-slate-400">No recent activity recorded.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-12">
                            
                            {/* Trip History Dashboard */}
                            {(historyData?.tickets?.length > 0) && (
                                <div className="bg-slate-900 rounded-[24px] shadow-sm border border-white/10 overflow-hidden">
                                     <div 
                                        className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setExpandedTrip(!expandedTrip)}
                                     >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">Today's Trip Summary</span>
                                            {expandedTrip ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                        </div>
                                        <h4 className="text-lg font-black text-white mt-2">
                                            {historyData.tickets[0]?.from} → {historyData.tickets[historyData.tickets.length - 1]?.to || 'Destination'}
                                        </h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {totalTrips} Passengers Boarded
                                        </p>
                                     </div>

                                     {expandedTrip && (
                                         <div className="bg-black/40 p-5 border-t border-white/10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detailed Stop History</p>
                                            <div className="relative pl-4 border-l-2 border-dashed border-white/20 space-y-6">
                                                
                                                {/* Group tickets by From station */}
                                                {Object.entries(
                                                    historyData.tickets.reduce((acc: any, t: any) => {
                                                        if (!acc[t.from]) acc[t.from] = [];
                                                        acc[t.from].push(t);
                                                        return acc;
                                                    }, {})
                                                ).map(([stopName, stopTickets]: any) => (
                                                    <div key={stopName} className="relative">
                                                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-amber-400 rounded-full shadow-glow-sm"></div>
                                                        <h5 className="text-sm font-black text-white mb-2">{stopName}</h5>
                                                        
                                                        <div className="space-y-2">
                                                            {stopTickets.map((t: any) => (
                                                                <div key={t.id} className="bg-slate-900 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 font-mono block">Tk: {t.id}</span>
                                                                        <span className="text-xs font-bold text-slate-200">Dest: {t.to}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded capitalize">+{t.passengerCount} Pax</span>
                                                                        <span className="block text-[10px] font-bold text-emerald-400 mt-1">₹{t.totalPrice}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                            </div>
                                         </div>
                                     )}
                                </div>
                            )}

                            {/* Income Transactions */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Income & Parcel History</h4>
                                {historyData?.parcels?.map((p: any) => (
                                    <div key={p.id} className="bg-slate-900 p-4 rounded-[20px] shadow-sm border border-white/10 mb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-luxe-teal/20 text-luxe-teal text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Parcel</span>
                                                <span className="text-xs font-bold text-slate-400 font-mono">{p.id}</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-400">+₹{p.price}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-200">
                                            <MapPin size={12} className="text-amber-400" />
                                            <span className="text-xs font-bold truncate">{p.from} → {p.to}</span>
                                        </div>
                                    </div>
                                ))}

                                {historyData?.transactions?.filter((t: any) => t.type === 'EARN').slice(0, 5).map((t: any, idx: number) => (
                                    <div key={idx} className="bg-slate-900 p-3.5 rounded-xl border border-white/10 mb-2 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <IndianRupee size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white">Earnings Credited</p>
                                                <p className="text-[9px] text-slate-400 font-mono">{new Date(t.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-400">+₹{t.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit / Details Popup Modal */}
            {showEditPopup && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="w-full max-w-sm bg-slate-900 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-6 border-b border-white/10 relative">
                            <button onClick={() => setShowEditPopup(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <Edit3 size={20} className="text-amber-400" /> Profile Details
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                                <input type="text" defaultValue={user.name} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-amber-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                                <input type="text" defaultValue={user.phone} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-amber-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle Details</label>
                                <input type="text" defaultValue={user.vehicleType} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-amber-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aadhar / License (Read-Only)</label>
                                <input type="text" value="XXXX-XXXX-8492" disabled className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-slate-500 cursor-not-allowed" />
                            </div>
                            
                            <button onClick={() => setShowEditPopup(false)} className="w-full mt-4 bg-gradient-to-r from-amber-500 to-luxe-gold text-slate-950 font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-md">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>,
        document.body
    );
};
