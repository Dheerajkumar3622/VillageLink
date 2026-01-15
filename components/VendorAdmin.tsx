
import React, { useState, useEffect } from 'react';
import { User, Store, CheckCircle2, XCircle, Clock, Search, Filter, ShieldCheck, FileText, MapPin, Phone, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';

interface Vendor {
    id: string;
    name: string;
    stallName: string;
    stallCategory: string;
    phone: string;
    status: string;
    verificationStatus: string;
    isVerified: boolean;
    createdAt: number;
}

export const VendorAdmin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [search, setSearch] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/vendor/admin/pending`, {
                headers: { 'Authorization': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setVendors(data);
            }
        } catch (err) {
            console.error("Failed to fetch vendors", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleVerify = async (vendorId: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const token = getAuthToken();
            const endpoint = status === 'APPROVED' ? 'verify' : 'reject';
            const res = await fetch(`${API_BASE_URL}/api/vendor/admin/${vendorId}/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Authorization': token || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Admin approval' })
            });
            if (res.ok) {
                fetchVendors();
                setSelectedVendor(null);
            }
        } catch (err) {
            console.error("Failed to verify vendor", err);
        }
    };

    const filteredVendors = vendors.filter(v =>
        (filter === 'ALL' || (filter === 'PENDING' && v.status === 'PENDING') || (filter === 'VERIFIED' && v.status === 'VERIFIED')) &&
        (v.name.toLowerCase().includes(search.toLowerCase()) || v.stallName.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ArrowLeft size={20} className="dark:text-white" />
                        </button>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <ShieldCheck className="text-indigo-600" /> Vendor Admin
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase py-1 px-3 bg-slate-100 dark:bg-slate-800 rounded-full">Admin Panel</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {['PENDING', 'VERIFIED', 'ALL'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-2xl animate-pulse"></div>)}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="py-20 text-center">
                        <Store size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500">No vendors found matching criteria</p>
                    </div>
                ) : (
                    filteredVendors.map(vendor => (
                        <div key={vendor.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{vendor.stallName}</h3>
                                        <p className="text-xs text-slate-500">{vendor.name} • {vendor.stallCategory}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${vendor.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {vendor.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mb-6">
                                <div className="flex items-center gap-2"><Phone size={14} /> {vendor.phone}</div>
                                <div className="flex items-center gap-2"><Clock size={14} /> {new Date(vendor.createdAt).toLocaleDateString()}</div>
                            </div>

                            <div className="flex gap-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                                <Button variant="outline" size="sm" fullWidth className="gap-2" onClick={() => setSelectedVendor(vendor)}>
                                    <FileText size={14} /> View Details
                                </Button>
                                {vendor.status === 'PENDING' && (
                                    <Button size="sm" fullWidth className="gap-2 bg-emerald-600 hover:bg-emerald-700 border-none" onClick={() => handleVerify(vendor.id, 'APPROVED')}>
                                        <CheckCircle2 size={14} /> Approve
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal Overlay */}
            {selectedVendor && (
                <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden animate-in slide-in-from-bottom-10">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold dark:text-white">Vendor Verification</h3>
                            <button onClick={() => setSelectedVendor(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <XCircle size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Owner Name</p>
                                    <p className="text-sm font-bold dark:text-white">{selectedVendor.name}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Shop Name</p>
                                    <p className="text-sm font-bold dark:text-white">{selectedVendor.stallName}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-3 pl-1">Submitted Documents</p>
                                <div className="space-y-2">
                                    {['AADHAR_FRONT', 'AADHAR_BACK', 'STALL_PHOTO', 'FSSAI_CERT'].map(doc => (
                                        <div key={doc} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="text-xs font-medium dark:text-slate-300">{doc.replace('_', ' ')}</span>
                                            </div>
                                            <button className="text-[10px] font-bold text-indigo-600 hover:underline">View File</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                                <p className="text-xs text-amber-800 dark:text-amber-400">Please verify Aadhar data against Government database before approval.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <Button variant="outline" fullWidth className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleVerify(selectedVendor.id, 'REJECTED')}>
                                Reject Application
                            </Button>
                            <Button fullWidth className="bg-indigo-600 hover:bg-indigo-700 border-none" onClick={() => handleVerify(selectedVendor.id, 'APPROVED')}>
                                Approve Vendor
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
