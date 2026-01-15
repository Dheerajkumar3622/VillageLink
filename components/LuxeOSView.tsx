
import React, { useState, useEffect } from 'react';
import { User, GuestProfile, InventoryItem } from '../types';
import { Button } from './Button';
import {
    Users, Database, GraduationCap, DollarSign,
    Search, AlertTriangle, CheckCircle, Smartphone,
    Crown, UtensilsCrossed, FileText
} from 'lucide-react';
import { getMockGuest, getMockInventory } from '../services/luxeOSService';

interface LuxeOSViewProps {
    user: User;
    onBack?: () => void;
}

type Tab = 'CRM' | 'INVENTORY' | 'TRAINING' | 'FINANCE';

export const LuxeOSView: React.FC<LuxeOSViewProps> = ({ user, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('CRM');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeGuest, setActiveGuest] = useState<GuestProfile | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        // Initial Mock Load
        setInventory(getMockInventory());
    }, []);

    const handleSearchGuest = () => {
        // Simulate finding a guest
        setActiveGuest(getMockGuest());
    };

    const renderCRM = () => (
        <div className="space-y-6">
            <div className="bg-slate-900 text-gold-400 p-6 rounded-2xl relative overflow-hidden">
                <div className="relative z-10 text-white">
                    <h2 className="text-2xl font-serif">LuxeOS Concierge</h2>
                    <p className="opacity-70 font-light">Recognize every guest, every time.</p>
                </div>
                <Crown className="absolute right-4 top-4 text-yellow-600 w-16 h-16 opacity-20" />
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Guest by Phone or Name..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleSearchGuest} className="bg-slate-900 text-white">
                    Find
                </Button>
            </div>

            {/* Guest Card */}
            {activeGuest ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-serif">{activeGuest.name}</h3>
                            <p className="opacity-70 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" /> {activeGuest.phone}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                                {activeGuest.vipTier} MEMBER
                            </span>
                            <p className="text-xs opacity-60 mt-2">Visits: {activeGuest.visitCount} | Avg: ₹{activeGuest.avgSpend}</p>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="p-6 grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Dietary Restrictions</h4>
                            <div className="flex flex-wrap gap-2">
                                {activeGuest.preferences.dietaryRestrictions.map(r => (
                                    <span key={r} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">
                                        {r.replace('_', ' ')}
                                    </span>
                                ))}
                                {activeGuest.preferences.allergies.map(a => (
                                    <span key={a} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">
                                        {a} ALLERGY
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Preferences</h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                                <li>❤️ {activeGuest.preferences.favoriteTable}</li>
                                <li>🌶️ {activeGuest.preferences.spicePreference} Spice</li>
                                <li>🍷 {activeGuest.preferences.preferredDrink}</li>
                            </ul>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-yellow-50 p-4 border-t border-yellow-100 text-sm text-yellow-800">
                        <strong>Staff Note:</strong> {activeGuest.preferences.notes}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">Search for a guest to view their Golden Record</p>
                </div>
            )}
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-700 text-lg">Live Inventory Dashboard</h3>

            {/* Alerts */}
            <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 min-w-[200px]">
                    <div className="flex items-center gap-2 text-red-700 mb-1">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold">Low Stock Alert</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">2 Items</p>
                    <p className="text-xs text-gray-500">Below Reorder Level</p>
                </div>

                <div className="bg-green-50 p-4 rounded-xl border border-green-100 min-w-[200px]">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                        <FileText className="w-5 h-5" />
                        <span className="font-bold">Pending POs</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">1 Draft</p>
                    <p className="text-xs text-gray-500">Needs Approval</p>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4">Item</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {inventory.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-gray-800">{item.itemName}</div>
                                    <div className="text-xs text-gray-500">{item.supplier.name}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`font-mono ${item.isLowStock ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                        {item.currentStock} {item.unit}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {item.isLowStock ? (
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">LOW</span>
                                    ) : (
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">OK</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {item.isLowStock && (
                                        <Button size="sm" variant="outline" className="text-xs">
                                            Auto-Reorder
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-20">
                <h1 className="font-serif font-bold text-xl text-slate-900 tracking-wide">LUXEOS</h1>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-2 rounded-full">
                        <UtensilsCrossed className="w-5 h-5 text-slate-600" />
                    </div>
                </div>
            </div>

            <div className="p-4">
                {activeTab === 'CRM' && renderCRM()}
                {activeTab === 'INVENTORY' && renderInventory()}
                {activeTab === 'TRAINING' && <div className="text-center py-20 text-gray-400">LMS Coming Soon</div>}
                {activeTab === 'FINANCE' && <div className="text-center py-20 text-gray-400">Financial Dashboard Coming Soon</div>}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 shadow-lg">
                <button
                    onClick={() => setActiveTab('CRM')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'CRM' ? 'text-slate-900' : 'text-gray-400'}`}
                >
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Concierge</span>
                </button>
                <button
                    onClick={() => setActiveTab('INVENTORY')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'INVENTORY' ? 'text-slate-900' : 'text-gray-400'}`}
                >
                    <Database className="w-6 h-6" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Stock</span>
                </button>
                <button
                    onClick={() => setActiveTab('TRAINING')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'TRAINING' ? 'text-slate-900' : 'text-gray-400'}`}
                >
                    <GraduationCap className="w-6 h-6" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Training</span>
                </button>
                <button
                    onClick={() => setActiveTab('FINANCE')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'FINANCE' ? 'text-slate-900' : 'text-gray-400'}`}
                >
                    <DollarSign className="w-6 h-6" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Finance</span>
                </button>
            </div>
        </div>
    );
};
