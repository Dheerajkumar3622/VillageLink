
import React, { useState, useEffect, useRef } from 'react';
import { User, MenuVote, PrepSheet, WasteEntry } from '../types';
import { Button } from './Button';
import { ArrowRight, BarChart3, Carrot, ChevronRight, ChefHat, ClipboardList, ThumbsDown, ThumbsUp, Trash2, Users, Sparkles, TrendingUp, AlertTriangle, Monitor } from 'lucide-react';
import { getMenuVotes, submitVote, getPrepSheet, logWaste, getMockVote, getMockPrepSheet } from '../services/messMateService';
import { API_BASE_URL } from '../config';

interface MessManagerViewProps {
    user: User;
    onBack?: () => void;
}

type Tab = 'DASHBOARD' | 'VOTING' | 'PREP' | 'WASTE';

const MessManagerView: React.FC<MessManagerViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
    const [activeVote, setActiveVote] = useState<MenuVote | null>(null);
    const [prepSheet, setPrepSheet] = useState<PrepSheet | null>(null);
    const [kitchenHub, setKitchenHub] = useState<any>(null);
    const [predictiveMenu, setPredictiveMenu] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const voteListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (voteListRef.current) {
            const bars = voteListRef.current.querySelectorAll('.mess-progress-bar');
            bars.forEach(bar => {
                const p = bar.getAttribute('data-progress');
                if (p) (bar as HTMLElement).style.setProperty('--progress', p);
            });
        }
    }, [activeVote, activeTab]);

    // State for Waste Logging
    const [wasteDishName, setWasteDishName] = useState('');
    const [wasteKg, setWasteKg] = useState('');

    useEffect(() => {
        // Initial Load - Mock Data for Demo
        setActiveVote(getMockVote());
        setPrepSheet(getMockPrepSheet());
        fetchKitchenHub();
        fetchPredictiveMenu();
    }, []);

    const InventoryBar: React.FC<{ level: number; color: string }> = ({ level, color }) => {
        const ref = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            if (ref.current) ref.current.style.setProperty('--inv-level', `${level}%`);
        }, [level]);
        return <div ref={ref} className={`v5-inventory-bar-fill ${color}`}></div>;
    };

    const fetchKitchenHub = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/food/kitchen-hub`);
            const data = await res.json();
            if (data.success) setKitchenHub(data.hub);
        } catch (e) { console.error("Kitchen Hub error", e); }
    };

    const fetchPredictiveMenu = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/food/predictive-menu`);
            const data = await res.json();
            if (data.success) setPredictiveMenu(data.suggestion);
        } catch (e) { console.error("Predictive Menu error", e); }
        setLoading(false);
    };

    const handleVote = async (optionId: string) => {
        if (activeVote) {
            // Optimistic update
            const updatedOptions = activeVote.options.map(opt =>
                opt.dishId === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            );
            setActiveVote({ ...activeVote, options: updatedOptions, totalVotes: activeVote.totalVotes + 1 });
            await submitVote(activeVote.id, optionId);
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="bg-emerald-700 text-white p-6 rounded-2xl">
                <h2 className="text-2xl font-bold">Mess Mate Dashboard</h2>
                <p className="opacity-80">Reducing waste, improving taste</p>

                <div className="flex gap-4 mt-6">
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm text-center">
                        <span className="block text-2xl font-bold">340</span>
                        <span className="text-xs opacity-75">Eating Today</span>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm text-center">
                        <span className="block text-2xl font-bold">12%</span>
                        <span className="text-xs opacity-75">Waste Reduced</span>
                    </div>
                </div>
            </div>

            {/* Kitchen Hub Overlay */}
            {kitchenHub && (
                <div className="glass-3 p-6 rounded-[32px] border-white/5 shadow-yhisk-float animate-fade-in mb-6 bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Monitor size={120} />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Monitor size={20} />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Kitchen Hub Live</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="block text-[10px] font-black text-slate-500 uppercase mb-1">Live Load</span>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-400" />
                                <span className="text-xl font-black text-white">{kitchenHub.liveLoad} / {kitchenHub.capacity}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="block text-[10px] font-black text-slate-500 uppercase mb-1">Queue Size</span>
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-amber-400" />
                                <span className="text-xl font-black text-white">{kitchenHub.queueSize}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                        <AlertTriangle size={18} className="text-emerald-400" />
                        <p className="text-[11px] font-bold text-emerald-400">{kitchenHub.recommendation}</p>
                    </div>
                </div>
            )}

            {/* Predictive Menu AI Suggestion */}
            {predictiveMenu && (
                <div className="glass-3 p-6 rounded-[32px] border-white/5 shadow-yhisk-float animate-fade-in mb-6 bg-indigo-950 overflow-hidden relative">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--accent-primary)]/10 rounded-full blur-3xl"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Menu Predictor</h3>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white/70 uppercase">
                            Accuracy: {predictiveMenu.confidence}%
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-4 relative z-10">
                        <h4 className="text-lg font-black text-white tracking-tight mb-2">Tomorrow's Best: {predictiveMenu.recommendedDish}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{predictiveMenu.rationale}</p>
                    </div>
                    <div className="flex gap-2 relative z-10">
                        <div className="flex-1 p-3 bg-white/5 rounded-xl text-center">
                            <span className="block text-lg font-black text-emerald-400">-{predictiveMenu.expectedWasteReduction}%</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Waste</span>
                        </div>
                        <div className="flex-1 p-3 bg-white/5 rounded-xl text-center">
                            <span className="block text-lg font-black text-amber-400">+{predictiveMenu.marginImprovement}%</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Profit</span>
                        </div>
                    </div>
                    <button className="w-full mt-4 py-3 bg-[var(--accent-primary)] text-black text-[10px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 transition-opacity">Apply Suggestion</button>
                </div>
            )}

            {/* V5 Inventory Status (Inspired by Demo) */}
            <div className="glass-3 p-6 rounded-[32px] border-white/5 bg-slate-900 mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Carrot size={16} className="text-emerald-400" /> Inventory Analytics
                </h3>
                <div className="space-y-4">
                    {[
                        { name: 'Atta (Wheat Flour)', level: 12, color: 'bg-red-500', alert: '12% Low' },
                        { name: 'Rice (Basmati)', level: 65, color: 'bg-emerald-500', alert: 'Stable' },
                        { name: 'Cooking Oil', level: 25, color: 'bg-warm-500', alert: 'Refill Soon' },
                    ].map((item, idx) => (
                        <div key={idx} className="v5-inventory-item">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-300">{item.name}</span>
                                <span className={`text-[9px] font-black uppercase ${item.level < 20 ? 'text-red-500' : 'text-slate-500'}`}>{item.alert}</span>
                            </div>
                            <div className="v5-inventory-bar-bg">
                                <InventoryBar level={item.level} color={item.color} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* V5 Order History (Inspired by Demo) */}
            <div className="glass-3 p-6 rounded-[32px] border-white/5 bg-slate-900 mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ClipboardList size={16} className="text-[var(--accent-secondary)]" /> Recent Bulk Orders
                </h3>
                <div className="space-y-2">
                    {[
                        { id: '#ORD-9923', type: 'Veg Dinner', count: 120, status: 'Ready' },
                        { id: '#ORD-9924', type: 'Rice & Dal', count: 45, status: 'In Prep' },
                    ].map((order, idx) => (
                        <div key={idx} className="v5-order-card">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-xl">
                                    <ChefHat size={18} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">{order.type}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{order.id}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-white">{order.count} Servings</p>
                                <span className={`text-[9px] font-black uppercase ${order.status === 'Ready' ? 'text-emerald-500' : 'text-warm-500'}`}>{order.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div
                    onClick={() => setActiveTab('VOTING')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 cursor-pointer hover:border-emerald-300"
                >
                    <div className="bg-emerald-100 w-10 h-10 rounded-full flex items-center justify-center text-emerald-700 mb-3">
                        <ThumbsUp size={20} />
                    </div>
                    <h3 className="font-bold">Menu Voting</h3>
                    <p className="text-xs text-gray-500">Students pick dinner</p>
                </div>

                <div
                    onClick={() => setActiveTab('PREP')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 cursor-pointer hover:border-blue-300"
                >
                    <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-700 mb-3">
                        <ClipboardList size={20} />
                    </div>
                    <h3 className="font-bold">Prep Sheet</h3>
                    <p className="text-xs text-gray-500">Exact quantities</p>
                </div>

                <div
                    onClick={() => setActiveTab('WASTE')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-red-100 cursor-pointer hover:border-red-300"
                >
                    <div className="bg-red-100 w-10 h-10 rounded-full flex items-center justify-center text-red-700 mb-3">
                        <Trash2 size={20} />
                    </div>
                    <h3 className="font-bold">Log Waste</h3>
                    <p className="text-xs text-gray-500">Track & Optimize</p>
                </div>
            </div>
        </div>
    );

    const renderVoting = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-700 text-lg">Tomorrow's Dinner Vote</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={voteListRef}>
                {activeVote?.options.map(option => (
                    <div key={option.dishId} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between relative z-10">
                            <div>
                                <h4 className="font-bold text-lg">{option.dishName}</h4>
                                <p className="text-sm text-gray-500">{option.votes} votes</p>
                            </div>
                            {(user.role === 'PASSENGER' || user.role === 'MESS_MANAGER') && (
                                <Button size="sm" onClick={() => handleVote(option.dishId)}>Vote</Button>
                            )}
                        </div>
                        {/* Progress Bar Background */}
                        <div
                            className="absolute bottom-0 left-0 top-0 bg-emerald-50 transition-all duration-500 mess-progress-bar"
                            data-progress={activeVote.totalVotes > 0 ? `${(option.votes / activeVote.totalVotes) * 100}%` : '0%'}
                        ></div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPrepSheet = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-700 text-lg">Kitchen Prep Sheet</h3>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                    {prepSheet?.confirmedHeadcount} Students
                </span>
            </div>

            {prepSheet?.items.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between mb-2">
                        <h4 className="font-bold text-lg">{item.dishName}</h4>
                        <div className="text-right">
                            <span className="block font-bold text-2xl">{item.totalToPrep}</span>
                            <span className="text-xs text-gray-500">Total Units</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        {item.rawMaterials.map((mat, mIdx) => (
                            <div key={mIdx} className="flex justify-between text-sm">
                                <span className="text-gray-600">{mat.name}</span>
                                <span className="font-mono font-bold">{mat.quantity} {mat.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-3 text-sm text-yellow-800">
                <ChefHat className="shrink-0" />
                <p><strong>Chef's Note:</strong> 160 students have skipped dinner. Preparation has been adjusted automatically to prevent waste.</p>
            </div>
        </div>
    );

    const renderWaste = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-700 text-lg">Daily Waste Log</h3>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Dish Name</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        placeholder="e.g. Pumpkin Curry"
                        value={wasteDishName}
                        onChange={(e) => setWasteDishName(e.target.value)}
                    />

                    <label className="block text-sm font-medium text-gray-700">Waste Quantity (Kg)</label>
                    <input
                        type="number"
                        className="w-full p-2 border rounded-lg"
                        placeholder="0.0"
                        value={wasteKg}
                        onChange={(e) => setWasteKg(e.target.value)}
                    />

                    <Button
                        fullWidth
                        className="bg-red-600 hover:bg-red-700 text-white mt-2"
                        onClick={() => {
                            alert(`Logged ${wasteKg}kg waste for ${wasteDishName}`);
                            setWasteDishName('');
                            setWasteKg('');
                        }}
                    >
                        Log Waste Entry
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                    Waste Analytics (Last 7 Days)
                </h4>
                <div className="h-40 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-sm">
                    [Chart Placeholder: Waste Trend Down 15%]
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-20">
                {activeTab !== 'DASHBOARD' && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('DASHBOARD')}>
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </Button>
                )}
                <h1 className="font-bold text-lg capitalize">
                    {activeTab === 'DASHBOARD' ? 'Mess Manager' : activeTab.toLowerCase()}
                </h1>
            </div>

            <div className="p-4">
                {activeTab === 'DASHBOARD' && renderDashboard()}
                {activeTab === 'VOTING' && renderVoting()}
                {activeTab === 'PREP' && renderPrepSheet()}
                {activeTab === 'WASTE' && renderWaste()}
            </div>
        </div>
    );
};

export default MessManagerView;