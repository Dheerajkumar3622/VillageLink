
import React, { useState, useEffect } from 'react';
import { History, Search, Download, ExternalLink, CheckCircle2, XCircle, Clock, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';

interface PaymentRecord {
    id: string;
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';
    method?: string;
    createdAt: number;
}

export const PaymentHistory: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/payments/history`, {
                headers: {
                    'Authorization': token || ''
                }
            });
            if (res.ok) {
                const data = await res.json();
                setPayments(data);
            }
        } catch (err) {
            console.error("Failed to fetch payment history", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredPayments = payments.filter(p =>
        p.id.toLowerCase().includes(filter.toLowerCase()) ||
        p.orderId.toLowerCase().includes(filter.toLowerCase()) ||
        (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(filter.toLowerCase()))
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'FAILED': return <XCircle className="text-red-500" size={16} />;
            case 'REFUNDED': return <RefreshCcw className="text-blue-500" size={16} />;
            default: return <Clock className="text-amber-500" size={16} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in">
            <div className="px-4 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Go Back">
                        <ArrowLeft size={20} className="dark:text-white" />
                    </button>
                    <h2 className="text-xl font-bold dark:text-white">Payment History</h2>
                </div>
                <button onClick={fetchHistory} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Refresh History">
                    <RefreshCcw size={16} className={`dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-4">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by ID or Order#"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm dark:text-white"
                        aria-label="Filter Payments"
                    />
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div className="py-12 text-center">
                        <History size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No transactions found</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-24">
                        {filteredPayments.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusIcon(p.status)}
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{p.status}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">₹{p.amount.toFixed(2)}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Order ID</p>
                                        <p className="text-[11px] font-mono font-bold dark:text-slate-300 truncate">#{p.orderId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Payment ID</p>
                                        <p className="text-[11px] font-mono font-bold dark:text-slate-300 truncate">{p.razorpayPaymentId || 'N/A'}</p>
                                    </div>
                                </div>

                                {p.status === 'PAID' && (
                                    <div className="mt-4 flex gap-2">
                                        <Button variant="outline" fullWidth size="sm" className="gap-2 text-[11px]">
                                            <Download size={12} /> Receipt
                                        </Button>
                                        <Button variant="outline" fullWidth size="sm" className="gap-2 text-[11px]">
                                            <ExternalLink size={12} /> View Details
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
