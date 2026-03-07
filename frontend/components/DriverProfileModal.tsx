import React, { useState, useEffect } from 'react';
import { X, Clock, RefreshCw, IndianRupee, MapPin, Package, Users } from 'lucide-react';
import { getDriverHistory } from '../transportService';
import { User } from '@villagelink/shared';

interface DriverProfileModalProps {
    user: User;
    onClose: () => void;
}

export const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ user, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any>(null);

    const loadHistory = async () => {
        setLoading(true);
        const data = await getDriverHistory();
        setHistoryData(data);
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const totalEarnings = historyData?.transactions?.reduce((sum: number, t: any) => sum + (t.type === 'EARN' ? t.amount : 0), 0) || 0;
    const totalTrips = historyData?.tickets?.length || 0;
    const totalParcels = historyData?.parcels?.length || 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in sm:p-4">
            <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-transform animate-slide-up">
                
                {/* Header */}
                <div className="relative p-6 pt-8 pb-4 shrink-0 border-b border-slate-100 dark:border-white/5">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white rounded-full hover:scale-110 active:scale-95 transition-transform">
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-luxe-sienna to-luxe-gold flex items-center justify-center font-black text-3xl text-white shadow-glow-md">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{user.name}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user.vehicleType} • {user.phone}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-6">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                                <IndianRupee size={12} /> Earnings
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">₹{totalEarnings}</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                            <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                <Users size={12} /> Tickets
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{totalTrips}</span>
                        </div>
                        <div className="bg-luxe-teal/10 p-3 rounded-2xl border border-luxe-teal/20">
                            <span className="flex items-center gap-1 text-[10px] font-black text-luxe-teal uppercase tracking-wider mb-1">
                                <Package size={12} /> Parcels
                            </span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{totalParcels}</span>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
                        <button onClick={loadHistory} className={`p-2 rounded-full text-slate-400 hover:text-luxe-sienna transition-colors ${loading ? 'animate-spin' : ''}`}>
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-8 space-y-3 opacity-50">
                            <Clock size={32} className="animate-pulse text-slate-400" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading ledger...</p>
                        </div>
                    ) : historyData?.tickets?.length === 0 && historyData?.parcels?.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                            <p className="text-sm font-bold text-slate-500">No activity found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pb-8">
                            {/* Tickets */}
                            {historyData?.tickets?.map((t: any) => (
                                <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Ticket</span>
                                            <span className="text-xs font-bold text-slate-500 font-mono">{t.id}</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+₹{t.totalPrice}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <MapPin size={12} className="text-luxe-sienna" />
                                        <span className="text-xs font-bold truncate">{t.from} → {t.to}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                                        <span>{new Date(t.timestamp || t.scannedAt || Date.now()).toLocaleString()}</span>
                                        <span>{t.passengerCount} Pax</span>
                                    </div>
                                </div>
                            ))}

                            {/* Parcels */}
                            {historyData?.parcels?.map((p: any) => (
                                <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-luxe-teal/20 text-luxe-teal text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Parcel</span>
                                            <span className="text-xs font-bold text-slate-500 font-mono">{p.id}</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+₹{p.price}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <MapPin size={12} className="text-luxe-sienna" />
                                        <span className="text-xs font-bold truncate">{p.from} → {p.to}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                                        <span>{new Date(p.timestamp || p.deliveredAt || Date.now()).toLocaleString()}</span>
                                        <span>{p.weightKg} Kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
