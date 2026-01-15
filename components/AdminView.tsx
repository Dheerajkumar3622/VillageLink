
import React, { useEffect, useState } from 'react';
import { User, AdminStats, RouteDefinition, LocationData } from '../types';
import { getAdminStats, getAllUsers, verifyDriver, toggleUserBan, getRoutes, createRoute, deleteRoute, getPricingConfig, updatePricingConfig } from '../services/adminService';
import { findDetailedPath, calculatePathDistance } from '../services/graphService';
import { LayoutDashboard, Users, UserCheck, ShieldAlert, CheckCircle, XCircle, Search, LogOut, Lock, Unlock, Activity, DollarSign, Map, Plus, Trash2, ArrowRight, Route as RouteIcon, Globe, Store, Car, Settings, UserX, UserCheck as UserActive } from 'lucide-react';
import { logoutUser } from '../services/authService';
import { LocationSelector } from './LocationSelector';
import { Button } from './Button';

interface AdminViewProps {
    user: User;
}

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [routes, setRoutes] = useState<RouteDefinition[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPROVALS' | 'USERS' | 'ROUTES' | 'PRICING'>('DASHBOARD');
    const [search, setSearch] = useState('');

    // Route Create State
    const [newRouteName, setNewRouteName] = useState('');
    const [newRouteFrom, setNewRouteFrom] = useState<LocationData | null>(null);
    const [newRouteTo, setNewRouteTo] = useState<LocationData | null>(null);
    const [calculatedStops, setCalculatedStops] = useState<string[]>([]);
    const [calculatedDist, setCalculatedDist] = useState(0);
    const [isCalculating, setIsCalculating] = useState(false);

    // Pricing State
    const [baseFare, setBaseFare] = useState(10);
    const [perKmRate, setPerKmRate] = useState(6);
    const [isSavingPricing, setIsSavingPricing] = useState(false);

    const fetchData = async () => {
        const s = await getAdminStats();
        const u = await getAllUsers();
        const r = await getRoutes();
        setStats(s);
        setUsers(u);
        setRoutes(r);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab === 'PRICING') {
            getPricingConfig().then(config => {
                setBaseFare(config.baseFare);
                setPerKmRate(config.perKmRate);
            });
        }
    }, [activeTab]);

    // When start/end changes, auto-clear calc to force re-calc
    useEffect(() => {
        setCalculatedStops([]);
        setCalculatedDist(0);
    }, [newRouteFrom, newRouteTo]);

    const handleVerify = async (id: string, status: boolean) => {
        await verifyDriver(id, status);
        fetchData();
    };

    const handleBan = async (id: string, status: boolean) => {
        // Status: true = BAN (Deactivate), false = UNBAN (Activate)
        const action = status ? 'DEACTIVATE' : 'ACTIVATE';
        if (confirm(`Are you sure you want to ${action} this user ID? They ${status ? 'will not' : 'will'} be able to login.`)) {
            await toggleUserBan(id, status);
            fetchData();
        }
    };

    const handleCalculatePath = () => {
        if (!newRouteFrom || !newRouteTo) return alert("Select start and end points first");
        setIsCalculating(true);
        
        // Use Graph Service to calculate path based on Geospatial Data
        const stops = findDetailedPath(newRouteFrom.name, newRouteTo.name);
        const dist = calculatePathDistance(stops);
        
        setCalculatedStops(stops);
        setCalculatedDist(dist);
        setIsCalculating(false);
    };

    const handleSaveRoute = async () => {
        if (!newRouteName || !newRouteFrom || !newRouteTo) return alert("Fill all fields");
        if (calculatedStops.length === 0) return alert("Please calculate the path first");

        const success = await createRoute({
            name: newRouteName,
            from: newRouteFrom.name,
            to: newRouteTo.name,
            stops: calculatedStops,
            totalDistance: calculatedDist
        });
        
        if (success) {
            setNewRouteName('');
            setNewRouteFrom(null);
            setNewRouteTo(null);
            setCalculatedStops([]);
            fetchData();
            alert("Universal Route Saved Successfully");
        }
    };

    const handleDeleteRoute = async (id: string) => {
        if (confirm("Delete this route?")) {
            await deleteRoute(id);
            fetchData();
        }
    };

    const handleUpdatePricing = async () => {
        setIsSavingPricing(true);
        const success = await updatePricingConfig({ baseFare, perKmRate });
        setIsSavingPricing(false);
        if (success) alert("Pricing updated successfully. New rates are effective immediately.");
        else alert("Failed to update pricing");
    };

    // Filter pending users (Drivers & Shopkeepers)
    const pendingUsers = users.filter(u => (u.role === 'DRIVER' || u.role === 'SHOPKEEPER') && !u.isVerified);
    
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Header */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/50">
                        <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Master Panel</h1>
                        <p className="text-[10px] text-slate-400 font-mono">ADMIN: {user.name} ({user.id})</p>
                    </div>
                </div>
                <button onClick={() => { logoutUser(); window.location.reload(); }} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors text-red-400">
                    <LogOut size={20} />
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-[calc(100vh-80px)]">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-900 border-b md:border-r border-slate-800 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <LayoutDashboard size={18} /> <span className="font-bold text-sm">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('APPROVALS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'APPROVALS' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <UserCheck size={18} /> <span className="font-bold text-sm">Approvals</span>
                        {pendingUsers.length > 0 && <span className="bg-white text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">{pendingUsers.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'USERS' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Users size={18} /> <span className="font-bold text-sm">User Mgmt</span>
                    </button>
                    <button onClick={() => setActiveTab('ROUTES')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ROUTES' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Map size={18} /> <span className="font-bold text-sm">Routes</span>
                    </button>
                    <button onClick={() => setActiveTab('PRICING')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'PRICING' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <DollarSign size={18} /> <span className="font-bold text-sm">Pricing</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950/50">
                    
                    {activeTab === 'DASHBOARD' && stats && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-xs font-bold uppercase">Total Users</p>
                                    <p className="text-3xl font-bold mt-1 text-white">{stats.totalUsers}</p>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-xs font-bold uppercase">Pending</p>
                                    <p className="text-3xl font-bold mt-1 text-orange-500">{stats.pendingDrivers}</p>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-xs font-bold uppercase">Active Trips</p>
                                    <p className="text-3xl font-bold mt-1 text-emerald-500">{stats.activeTrips}</p>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-xs font-bold uppercase">System Health</p>
                                    <p className="text-3xl font-bold mt-1 text-blue-500 flex items-center gap-2">{stats.systemHealth}% <Activity size={18} /></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'APPROVALS' && (
                         <div className="space-y-4 animate-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold mb-4">Pending Approvals (Drivers/Shopkeepers)</h2>
                            <p className="text-sm text-slate-400 mb-4">These users are waiting for verification before they can access their dashboard.</p>
                            {pendingUsers.length === 0 ? <p className="text-slate-500 italic bg-slate-900 p-8 rounded-xl text-center">No pending approvals.</p> : null}
                            {pendingUsers.map(u => (
                                <div key={u.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${u.role === 'DRIVER' ? 'bg-indigo-900 text-indigo-300' : 'bg-orange-900 text-orange-300'}`}>
                                            {u.role === 'DRIVER' ? <Car size={20} /> : <Store size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{u.name}</h3>
                                            <p className="text-sm text-slate-400 font-mono flex items-center gap-2">
                                                {u.id} 
                                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded uppercase">{u.role}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button onClick={() => handleVerify(u.id, false)} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm">Reject</button>
                                        <button onClick={() => handleVerify(u.id, true)} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                            <CheckCircle size={16} /> Approve ID
                                        </button>
                                    </div>
                                </div>
                            ))}
                         </div>
                    )}

                    {activeTab === 'USERS' && (
                         <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">User Database & ID Status</h2>
                            </div>
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input 
                                    value={search} 
                                    onChange={(e) => setSearch(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 outline-none focus:border-red-600"
                                    placeholder="Search users by name or ID..."
                                />
                            </div>
                            <div className="space-y-2">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className={`p-4 rounded-xl border flex justify-between items-center ${u.isBanned ? 'bg-red-900/10 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{u.name}</span>
                                                <span className={`text-[10px] px-2 rounded font-bold ${u.role === 'ADMIN' ? 'bg-red-600 text-white' : (u.role === 'DRIVER' ? 'bg-indigo-600 text-white' : (u.role === 'SHOPKEEPER' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'))}`}>{u.role}</span>
                                                {u.isVerified && <CheckCircle size={12} className="text-emerald-500" />}
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono">{u.id} {u.phone ? `• ${u.phone}` : ''}</p>
                                        </div>
                                        {u.role !== 'ADMIN' && (
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] uppercase font-bold tracking-wider ${u.isBanned ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {u.isBanned ? 'Deactivated' : 'Active'}
                                                </span>
                                                <button 
                                                    onClick={() => handleBan(u.id, !u.isBanned)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${u.isBanned ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/50' : 'bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-600/50'}`}
                                                >
                                                    {u.isBanned ? <UserActive size={14} /> : <UserX size={14} />}
                                                    {u.isBanned ? 'Activate ID' : 'Deactivate ID'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}

                    {/* PRICING PANEL (Existing) */}
                    {activeTab === 'PRICING' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20} className="text-red-500" /> Fare Configuration</h2>
                                <p className="text-sm text-slate-400 mb-6">Adjust the global pricing logic for the entire platform. Changes apply immediately to new ticket calculations.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Base Fare (Boarding Fee)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                            <input 
                                                type="number"
                                                value={baseFare}
                                                onChange={e => setBaseFare(Number(e.target.value))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-red-500 font-bold text-lg"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Fixed cost added to every ticket regardless of distance.</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Rate Per Kilometer</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                            <input 
                                                type="number"
                                                value={perKmRate}
                                                onChange={e => setPerKmRate(Number(e.target.value))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-red-500 font-bold text-lg"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Multiplied by total trip distance calculated via geospatial analysis.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                                    <h3 className="text-sm font-bold text-slate-300 mb-2">Live Calculation Preview</h3>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Example: 10 KM Trip</span>
                                        <span className="font-mono text-emerald-400">
                                            {baseFare} + (10 × {perKmRate}) = ₹{baseFare + (10 * perKmRate)}
                                        </span>
                                    </div>
                                </div>

                                <Button fullWidth variant="primary" onClick={handleUpdatePricing} disabled={isSavingPricing}>
                                    {isSavingPricing ? 'Updating System...' : 'Update Global Pricing'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ROUTE MANAGER PANEL (Existing) */}
                    {activeTab === 'ROUTES' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            {/* CREATE ROUTE */}
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-red-500" /> Define Universal Route</h2>
                                <p className="text-sm text-slate-400 mb-4">Set the official stops for a route. This defines the "Universal Path" logic for passengers.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <input 
                                        placeholder="Route Name (e.g. Express Line 1)" 
                                        value={newRouteName}
                                        onChange={e => setNewRouteName(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-red-500"
                                    />
                                    <div className="text-black"><LocationSelector label="Start Point" onSelect={setNewRouteFrom} /></div>
                                    <div className="text-black"><LocationSelector label="End Point" onSelect={setNewRouteTo} /></div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <Button variant="secondary" onClick={handleCalculatePath} disabled={isCalculating}>
                                        <Globe size={16} /> {isCalculating ? 'Analyzing Geospatial Data...' : '1. Analyze & Generate Path'}
                                    </Button>
                                </div>

                                {/* PREVIEW GENERATED STOPS */}
                                {calculatedStops.length > 0 && (
                                    <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2"><RouteIcon size={14} /> Generated Universal Path</h3>
                                            <span className="text-xs text-slate-500 font-mono">{calculatedDist.toFixed(1)} km</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {calculatedStops.map((stop, i) => (
                                                <div key={i} className="flex items-center">
                                                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">{stop}</span>
                                                    {i < calculatedStops.length - 1 && <div className="w-4 h-0.5 bg-slate-700 mx-1"></div>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4">
                                            <Button fullWidth variant="primary" onClick={handleSaveRoute}>
                                                2. Save Official Route Definition
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* LIST ROUTES */}
                            <div>
                                <h2 className="text-lg font-bold mb-4 text-slate-400 uppercase tracking-wider">Active Network Routes</h2>
                                <div className="grid grid-cols-1 gap-4">
                                    {routes.length === 0 ? (
                                        <p className="text-slate-500 text-center py-8">No predefined routes active.</p>
                                    ) : (
                                        routes.map(r => (
                                            <div key={r.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-all">
                                                <div>
                                                    <h3 className="font-bold text-lg text-white">{r.name}</h3>
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                                        <span className="text-emerald-500">{r.from}</span>
                                                        <ArrowRight size={14} />
                                                        <span className="text-red-500">{r.to}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {r.stops.slice(1, -1).map((s, idx) => (
                                                            <span key={idx} className="text-[9px] text-slate-600 bg-slate-950 px-1 rounded">{s}</span>
                                                        ))}
                                                        {r.stops.length > 2 && <span className="text-[9px] text-slate-600 px-1">...</span>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-2 font-mono">
                                                        {r.totalDistance.toFixed(1)} km • {r.stops.length} Stops
                                                    </p>
                                                </div>
                                                <button onClick={() => handleDeleteRoute(r.id)} className="p-3 bg-slate-800 hover:bg-red-900/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
