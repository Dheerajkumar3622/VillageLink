import React, { useState, useEffect } from 'react';
import { X, Clock, RefreshCw, IndianRupee, MapPin, Package, Users, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { getDriverHistory } from '../transportService';
import { User } from '@villagelink/shared';

interface DriverProfileModalProps {
    user: User;
    onClose: () => void;
}

export const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ user, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any>(null);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [expandedTrip, setExpandedTrip] = useState(false);

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
                        <div 
                            onClick={() => setShowEditPopup(true)} 
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-luxe-sienna to-luxe-gold flex items-center justify-center font-black text-3xl text-white shadow-glow-md cursor-pointer hover:rotate-3 transition-transform"
                            title="Click to view/edit details"
                        >
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
                        <div className="space-y-4 pb-8">
                            
                            {/* Trip History Dashboard */}
                            {(historyData?.tickets?.length > 0) && (
                                <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                     <div 
                                        className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        onClick={() => setExpandedTrip(!expandedTrip)}
                                     >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Today's Trip Summary</span>
                                            {expandedTrip ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                                            {historyData.tickets[0]?.from} → {historyData.tickets[historyData.tickets.length - 1]?.to || 'Destination'}
                                        </h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                            {totalTrips} Passengers Boarded
                                        </p>
                                     </div>

                                     {expandedTrip && (
                                         <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-t border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detailed Stop History</p>
                                            <div className="relative pl-4 border-l-2 border-dashed border-slate-200 dark:border-slate-700 space-y-6">
                                                
                                                {/* Group tickets by From station */}
                                                {Object.entries(
                                                    historyData.tickets.reduce((acc: any, t: any) => {
                                                        if (!acc[t.from]) acc[t.from] = [];
                                                        acc[t.from].push(t);
                                                        return acc;
                                                    }, {})
                                                ).map(([stopName, stopTickets]: any) => (
                                                    <div key={stopName} className="relative">
                                                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-luxe-teal rounded-full shadow-glow-sm"></div>
                                                        <h5 className="text-sm font-black text-slate-900 dark:text-white mb-2">{stopName}</h5>
                                                        
                                                        <div className="space-y-2">
                                                            {stopTickets.map((t: any) => (
                                                                <div key={t.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-500 font-mono block">Tk: {t.id}</span>
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dest: {t.to}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded capitalize">+{t.passengerCount} Pax</span>
                                                                        <span className="block text-[10px] font-bold text-emerald-500 mt-1">₹{t.totalPrice}</span>
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
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-2">Income & Parcel History</h4>
                                {historyData?.parcels?.map((p: any) => (
                                    <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 mb-2">
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
                                    </div>
                                ))}

                                {historyData?.transactions?.filter((t: any) => t.type === 'EARN').slice(0, 5).map((t: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-2 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                <IndianRupee size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white">Earnings Credited</p>
                                                <p className="text-[9px] text-slate-500 font-mono">{new Date(t.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-500">+₹{t.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit / Details Popup Modal */}
            {showEditPopup && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 relative">
                            <button onClick={() => setShowEditPopup(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit3 size={20} className="text-luxe-sienna" /> Profile Details
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Full Name</label>
                                <input type="text" defaultValue={user.name} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-luxe-teal" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Phone Number</label>
                                <input type="text" defaultValue={user.phone} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-luxe-teal" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Vehicle Details</label>
                                <input type="text" defaultValue={user.vehicleType} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-luxe-teal" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Aadhar / License (Read-Only)</label>
                                <input type="text" value="XXXX-XXXX-8492" disabled className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-bold text-slate-500 cursor-not-allowed" />
                            </div>
                            
                            <button onClick={() => setShowEditPopup(false)} className="w-full mt-4 bg-gradient-to-r from-luxe-sienna to-luxe-gold text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-glow-md">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
