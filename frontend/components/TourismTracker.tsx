import React, { useState } from 'react';
import { Ticket, TicketStatus } from '@villagelink/shared';
import { MapPin, Navigation, Phone, ShieldCheck, User, Star, Clock, XCircle } from 'lucide-react';

interface TourismTrackerProps {
    ticket: Ticket;
    onEndSession?: () => void;
}

export const TourismTracker: React.FC<TourismTrackerProps> = ({ ticket, onEndSession }) => {
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    // We treat the driverId field as the assigned Guide/Driver name in this context
    const driverName = ticket.driverId || "Unassigned";

    return (
        <div className="mx-4 mb-6 relative animate-in slide-in-from-bottom-4 duration-500 z-10">
            <div className="bg-slate-900 border border-brand-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-brand-500/20">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 px-5 py-4 flex justify-between items-center text-black">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30 hidden sm:block">
                            <Navigation size={20} className="text-white drop-shadow-md animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg leading-tight uppercase tracking-widest drop-shadow-sm">Tourism Active</h3>
                            <p className="font-bold text-white/80 text-[10px] uppercase">Journey Status: {ticket.status}</p>
                        </div>
                    </div>
                    {/* OTP / Secret Code */}
                    <div className="text-right bg-black/20 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
                        <p className="text-[9px] uppercase font-black text-brand-100 tracking-widest mb-0.5">Start OTP</p>
                        <p className="font-black text-xl leading-none text-white tracking-widest drop-shadow-md">
                            {ticket.id.slice(-4).toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-5 relative bg-slate-900 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    
                    {/* Destination Info */}
                    <div className="mb-6 relative z-10 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="text-xl font-black text-white">{ticket.to}</h4>
                                <p className="text-brand-400 font-bold text-xs">{ticket.toDetails}</p>
                            </div>
                            <div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 shadow-inner">
                                <Clock size={12} className="text-amber-400" />
                                <span className="font-bold text-amber-400 text-xs tracking-wider">ONGOING</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-slate-400 bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/50">
                            <MapPin size={14} className="text-brand-500 flex-shrink-0" /> 
                            <span className="truncate">Picked up from <span className="text-white">{ticket.from}</span></span>
                        </div>
                    </div>

                    {/* Driver / Guide Info */}
                    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50 flex gap-4 items-center relative z-10 shadow-lg relative overflow-hidden group">
                        {/* Shimmer on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[150%] skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>

                        <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center border border-slate-600 shadow-inner">
                                <User size={24} className="text-slate-400" />
                            </div>
                            {/* Shield Verification Badge */}
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                <ShieldCheck size={10} className="text-white" />
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-brand-400 mb-0.5">Assigned Guide / Driver</p>
                            <h4 className="font-black text-white text-base truncate">{driverName}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    <Star size={10} className="text-amber-400 fill-amber-400" /> 4.8
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">Verified Partner</span>
                            </div>
                        </div>
                        
                        <button className="w-12 h-12 rounded-2xl bg-brand-500 text-black flex items-center justify-center hover:bg-brand-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95">
                            <Phone size={20} className="fill-black" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex gap-3 relative z-10">
                         <button 
                             onClick={() => setShowCancelConfirm(true)}
                             className="flex-1 py-3.5 rounded-xl font-black text-[13px] uppercase tracking-wider border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-all text-center flex items-center justify-center gap-2"
                         >
                             <XCircle size={16} /> Cancel Trip
                         </button>
                         <button className="flex-[2] py-3.5 rounded-xl font-black text-[13px] uppercase tracking-wider bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition-all text-center shadow-md">
                             Open Itinerary map
                         </button>
                    </div>
                </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-500"></div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                                    <XCircle size={24} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">Cancel Trip?</h3>
                                    <p className="text-xs text-slate-400">This action cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                                Are you sure you want to cancel your tourism trip to <span className="font-bold text-white">{ticket.to}</span>?
                                A 10% service charge will be deducted from your refund.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
                                >
                                    Keep Trip
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowCancelConfirm(false);
                                        if (onEndSession) onEndSession();
                                    }}
                                    className="flex-1 py-3.5 rounded-xl font-black text-sm bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 shadow-[0_4px_15px_rgba(239,68,68,0.3)]"
                                >
                                    Yes, Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
