import React, { useEffect, useState, useRef } from 'react';
import { User, AdminStats, RouteDefinition, LocationData } from '@villagelink/shared';
import { getAdminStats, getAllUsers, verifyDriver, toggleUserBan, getRoutes, createRoute, deleteRoute, getPricingConfig, updatePricingConfig, searchTicketHistory } from '../services/adminService';
import { findDetailedPath, calculatePathDistance } from '../services/graphService';
import { LayoutDashboard, Users, UserCheck, ShieldAlert, CheckCircle, XCircle, Search, LogOut, Lock, Unlock, Activity, DollarSign, Map, Plus, Trash2, ArrowRight, Route as RouteIcon, Globe, Store, Car, Settings, UserX, UserCheck as UserActive, AlertTriangle, Bug, RefreshCw } from 'lucide-react';
import { logoutUser } from '../services/authService';
import { API_BASE_URL } from '../config';
import { LocationSelector } from './LocationSelector';
import { Button } from './Button';
import AutoClicker from './AutoClicker';
import { DroneFleetStatus } from './aero/DroneFleetStatus';
import { ChargingDockPanel } from './aero/ChargingDockPanel';
import { ControlCenterMap } from './aero/ControlCenterMap';
import { LiveSimulationTwin } from './digitalTwin/LiveSimulationTwin';
import { MemoryGraphVisual } from './digitalTwin/MemoryGraphVisual';
import { CityOperatingSystem } from './digitalTwin/CityOperatingSystem';
import { SwarmNegotiationHUD } from './hud/SwarmNegotiationHUD';

interface AdminViewProps {
    user: User;
}

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [routes, setRoutes] = useState<RouteDefinition[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPROVALS' | 'USERS' | 'ROUTES' | 'TICKETS' | 'PRICING' | 'ERRORS' | 'DRONES' | 'SIMULATION'>('DASHBOARD');
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

    // Error Analytics State
    const [errorAnalytics, setErrorAnalytics] = useState<any>(null);
    const [recentErrors, setRecentErrors] = useState<any[]>([]);
    const [isLoadingErrors, setIsLoadingErrors] = useState(false);

    // Ticket Search State
    const [ticketSearchQuery, setTicketSearchQuery] = useState('');
    const [ticketSearchResult, setTicketSearchResult] = useState<any>(null);
    const [isSearchingTicket, setIsSearchingTicket] = useState(false);

    const errorContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorContainerRef.current) {
            const bars = errorContainerRef.current.querySelectorAll('.admin-progress-bar');
            bars.forEach(bar => {
                const p = bar.getAttribute('data-progress');
                if (p) (bar as HTMLElement).style.setProperty('--progress', p);
            });
        }
    }, [errorAnalytics, activeTab]);

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

    // Fetch error analytics when tab is active
    useEffect(() => {
        if (activeTab === 'ERRORS') {
            fetchErrorData();
        }
    }, [activeTab]);

    const fetchErrorData = async () => {
        setIsLoadingErrors(true);
        try {
            const token = localStorage.getItem('auth_token');
            const [analyticsRes, errorsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/errors/analytics?days=7`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/errors/recent?limit=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            if (analyticsRes.ok) setErrorAnalytics(await analyticsRes.json());
            if (errorsRes.ok) setRecentErrors(await errorsRes.json());
        } catch (err) {
            console.error('Failed to fetch error data:', err);
        }
        setIsLoadingErrors(false);
    };

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

    const handleSearchTicket = async () => {
        if (!ticketSearchQuery.trim()) return;
        setIsSearchingTicket(true);
        setTicketSearchResult(null);
        const res = await searchTicketHistory(ticketSearchQuery.trim());
        setTicketSearchResult(res);
        setIsSearchingTicket(false);
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
                    <div className="w-10 h-10 bg-luxe-sienna rounded-lg flex items-center justify-center shadow-lg shadow-luxe-sienna/20">
                        <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Master Panel</h1>
                        <p className="text-[10px] text-slate-400 font-mono">ADMIN: {user.name} ({user.id})</p>
                    </div>
                </div>
                <button onClick={() => { logoutUser(); window.location.reload(); }} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors text-red-400" aria-label="Logout">
                    <LogOut size={20} />
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-[calc(100vh-80px)]">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-slate-900 border-b md:border-r border-slate-800 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <LayoutDashboard size={18} /> <span className="font-bold text-sm">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('APPROVALS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'APPROVALS' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <UserCheck size={18} /> <span className="font-bold text-sm">Approvals</span>
                        {pendingUsers.length > 0 && <span className="bg-white text-luxe-sienna px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">{pendingUsers.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'USERS' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Users size={18} /> <span className="font-bold text-sm">User Mgmt</span>
                    </button>
                    <button onClick={() => setActiveTab('ROUTES')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ROUTES' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Map size={18} /> <span className="font-bold text-sm">Routes</span>
                    </button>
                    <button onClick={() => setActiveTab('TICKETS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'TICKETS' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Search size={18} /> <span className="font-bold text-sm">Ticket Search</span>
                    </button>
                    <button onClick={() => setActiveTab('PRICING')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'PRICING' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <DollarSign size={18} /> <span className="font-bold text-sm">Pricing</span>
                    </button>
                    <button onClick={() => setActiveTab('ERRORS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ERRORS' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Bug size={18} /> <span className="font-bold text-sm">Errors</span>
                        {errorAnalytics?.summary?.total > 0 && <span className="bg-luxe-gold text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-auto">{errorAnalytics.summary.total}</span>}
                    </button>
                    <button onClick={() => setActiveTab('DRONES')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'DRONES' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Car size={18} /> <span className="font-bold text-sm">Drone Fleet</span>
                    </button>
                    <button onClick={() => setActiveTab('SIMULATION')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'SIMULATION' ? 'bg-luxe-sienna text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Activity size={18} /> <span className="font-bold text-sm">Digital Twin</span>
                    </button>

                    <div className="mt-auto pt-4">
                        <AutoClicker />
                    </div>
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
                                    <p className="text-3xl font-bold mt-1 text-luxe-gold">{stats.pendingDrivers}</p>
                                </div>
                                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-xs font-bold uppercase">Active Trips</p>
                                    <p className="text-3xl font-bold mt-1 text-luxe-teal">{stats.activeTrips}</p>
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
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${u.role === 'DRIVER' ? 'bg-luxe-sienna/20 text-luxe-sienna' : 'bg-luxe-gold/20 text-luxe-gold'}`}>
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
                                        <button onClick={() => handleVerify(u.id, true)} className="flex-1 md:flex-none bg-luxe-teal hover:bg-luxe-teal/80 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
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
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 outline-none focus:border-luxe-sienna"
                                    placeholder="Search users by name or ID..."
                                />
                            </div>
                            <div className="space-y-2">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className={`p-4 rounded-xl border flex justify-between items-center ${u.isBanned ? 'bg-red-900/10 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{u.name}</span>
                                                <span className={`text-[10px] px-2 rounded font-bold ${u.role === 'ADMIN' ? 'bg-luxe-sienna text-white' : (u.role === 'DRIVER' ? 'bg-luxe-teal text-white' : (u.role === 'SHOPKEEPER' ? 'bg-luxe-gold text-white' : 'bg-slate-700 text-slate-300'))}`}>{u.role}</span>
                                                {u.isVerified && <CheckCircle size={12} className="text-luxe-teal" />}
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono">{u.id} {u.phone ? `• ${u.phone}` : ''}</p>
                                        </div>
                                        {u.role !== 'ADMIN' && (
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] uppercase font-bold tracking-wider ${u.isBanned ? 'text-luxe-rust' : 'text-luxe-teal'}`}>
                                                    {u.isBanned ? 'Deactivated' : 'Active'}
                                                </span>
                                                <button
                                                    onClick={() => handleBan(u.id, !u.isBanned)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${u.isBanned ? 'bg-luxe-teal/20 text-luxe-teal hover:bg-luxe-teal/30 border border-luxe-teal/50' : 'bg-luxe-sienna/20 text-luxe-sienna hover:bg-luxe-sienna/30 border border-luxe-sienna/50'}`}
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

                    {/* TICKET SEARCH PANEL */}
                    {activeTab === 'TICKETS' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Search size={20} className="text-luxe-teal" /> Ticket Lifecycle Search</h2>
                                <p className="text-sm text-slate-400 mb-6">Enter a Ticket ID to view full passenger, driver, and transaction ledger history.</p>
                                
                                <div className="flex gap-4 mb-8">
                                    <input 
                                        type="text"
                                        placeholder="e.g. TK-1234"
                                        value={ticketSearchQuery}
                                        onChange={(e) => setTicketSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-teal"
                                    />
                                    <Button variant="primary" onClick={handleSearchTicket} disabled={isSearchingTicket}>
                                        {isSearchingTicket ? 'Searching...' : 'Search'}
                                    </Button>
                                </div>

                                {ticketSearchResult && ticketSearchResult.ticket ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-white uppercase tracking-wider">{ticketSearchResult.ticket.id}</h3>
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${ticketSearchResult.ticket.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {ticketSearchResult.ticket.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Route</p>
                                                    <p className="text-sm font-bold text-slate-300">{ticketSearchResult.ticket.from} → {ticketSearchResult.ticket.to}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pax / Price</p>
                                                    <p className="text-sm font-bold text-slate-300">{ticketSearchResult.ticket.passengerCount || 1} Pax / ₹{ticketSearchResult.ticket.totalPrice}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Payment</p>
                                                    <p className="text-sm font-bold text-slate-300">{ticketSearchResult.ticket.paymentMethod || 'UNKNOWN'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Date</p>
                                                    <p className="text-sm font-bold text-slate-300">{ticketSearchResult.ticket.timestamp || ticketSearchResult.ticket.scannedAt ? new Date(ticketSearchResult.ticket.timestamp || ticketSearchResult.ticket.scannedAt).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                    <p className="text-[10px] text-luxe-sienna font-bold uppercase mb-2 flex items-center gap-1"><UserCheck size={12}/> Passenger</p>
                                                    {ticketSearchResult.passenger ? (
                                                        <>
                                                            <p className="text-sm font-bold text-white">{ticketSearchResult.passenger.name}</p>
                                                            <p className="text-xs text-slate-400 font-mono">{ticketSearchResult.passenger.phone}</p>
                                                        </>
                                                    ) : <p className="text-xs text-slate-500 italic">No account mapped</p>}
                                                </div>
                                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                    <p className="text-[10px] text-luxe-teal font-bold uppercase mb-2 flex items-center gap-1"><Car size={12}/> Assigned Driver</p>
                                                    {ticketSearchResult.driver ? (
                                                        <>
                                                            <p className="text-sm font-bold text-white">{ticketSearchResult.driver.name}</p>
                                                            <p className="text-xs text-slate-400 font-mono">{ticketSearchResult.driver.phone} • {ticketSearchResult.driver.vehicleType}</p>
                                                        </>
                                                    ) : <p className="text-xs text-slate-500 italic">Not boarded yet</p>}
                                                </div>
                                            </div>
                                        </div>

                                        {ticketSearchResult.transactions && ticketSearchResult.transactions.length > 0 && (
                                            <div className="mt-6">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 text-[10px] tracking-wider">Transaction Ledger</h3>
                                                <div className="space-y-2">
                                                    {ticketSearchResult.transactions.map((txn: any) => (
                                                        <div key={txn.id} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${txn.type === 'EARN' || txn.type === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{txn.type}</span>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-300">{txn.description}</p>
                                                                    <p className="text-[9px] text-slate-500 font-mono">{txn.id}</p>
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-sm text-white font-mono">₹{txn.amount}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : ticketSearchResult && (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-700 rounded-xl">
                                        <p className="text-slate-400 font-bold mb-2">Ticket ID "{ticketSearchQuery}" not found.</p>
                                        <p className="text-xs text-slate-500">Ensure the ID is correct (e.g. TK-7770).</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PRICING PANEL (Existing) */}
                    {activeTab === 'PRICING' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings size={20} className="text-luxe-sienna" /> Fare Configuration</h2>
                                <p className="text-sm text-slate-400 mb-6">Adjust the global pricing logic for the entire platform. Changes apply immediately to new ticket calculations.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Base Fare (Boarding Fee)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                aria-label="Base Fare"
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
                                                aria-label="Rate Per Kilometer"
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
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-luxe-sienna" /> Define Universal Route</h2>
                                <p className="text-sm text-slate-400 mb-4">Set the official stops for a route. This defines the "Universal Path" logic for passengers.</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <input
                                        placeholder="Route Name (e.g. Express Line 1)"
                                        value={newRouteName}
                                        onChange={e => setNewRouteName(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-luxe-sienna"
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
                                            <h3 className="text-sm font-bold text-luxe-teal flex items-center gap-2"><RouteIcon size={14} /> Generated Universal Path</h3>
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
                                                        <span className="text-luxe-teal">{r.from}</span>
                                                        <ArrowRight size={14} />
                                                        <span className="text-luxe-sienna">{r.to}</span>
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
                                                <button onClick={() => handleDeleteRoute(r.id)} className="p-3 bg-slate-800 hover:bg-red-900/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors" aria-label="Delete Route">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ERROR ANALYTICS PANEL */}
                    {activeTab === 'ERRORS' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Bug size={20} className="text-luxe-gold" /> Error Analytics</h2>
                                    <p className="text-sm text-slate-400">Automatic error detection across all users</p>
                                </div>
                                <button onClick={fetchErrorData} disabled={isLoadingErrors} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-slate-300 transition-colors" aria-label="Refresh Errors">
                                    <RefreshCw size={18} className={isLoadingErrors ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Summary Cards */}
                            {errorAnalytics?.summary && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                        <p className="text-slate-500 text-xs font-bold uppercase">Total Errors (7d)</p>
                                        <p className="text-3xl font-bold mt-1 text-luxe-gold">{errorAnalytics.summary.total}</p>
                                    </div>
                                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                        <p className="text-slate-500 text-xs font-bold uppercase">Unique Issues</p>
                                        <p className="text-3xl font-bold mt-1 text-white">{errorAnalytics.summary.unique}</p>
                                    </div>
                                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                        <p className="text-slate-500 text-xs font-bold uppercase">Resolved</p>
                                        <p className="text-3xl font-bold mt-1 text-luxe-teal">{errorAnalytics.summary.resolved}</p>
                                    </div>
                                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                        <p className="text-slate-500 text-xs font-bold uppercase">Unresolved</p>
                                        <p className="text-3xl font-bold mt-1 text-red-500">{errorAnalytics.summary.unique - errorAnalytics.summary.resolved}</p>
                                    </div>
                                </div>
                            )}

                            {/* Error Type Breakdown */}
                            {errorAnalytics?.byType && errorAnalytics.byType.length > 0 && (
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="text-sm font-bold text-slate-300 mb-4">Errors by Type</h3>
                                    <div className="space-y-2">
                                        {errorAnalytics.byType.map((item: any) => (
                                            <div key={item._id} className="flex items-center gap-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${item._id === 'CLIENT_ERROR' ? 'bg-luxe-teal/20 text-luxe-teal' :
                                                    item._id === 'NETWORK_ERROR' ? 'bg-luxe-teal/10 text-luxe-teal' :
                                                        item._id === 'PERFORMANCE' ? 'bg-luxe-gold/20 text-luxe-gold' :
                                                            item._id === 'SERVICE_FAILURE' ? 'bg-luxe-sienna/20 text-luxe-sienna' :
                                                                'bg-slate-800 text-slate-300'
                                                    }`}>{item._id}</span>
                                                <div className="flex-1 bg-slate-800 rounded-full h-2" ref={errorContainerRef}>
                                                    <div className="bg-luxe-sienna h-2 rounded-full admin-progress-bar" data-progress={`${Math.min((item.count / errorAnalytics.summary.total) * 100, 100)}%`}></div>
                                                </div>
                                                <span className="text-sm font-mono text-slate-400">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Errors List */}
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-300 mb-4">Recent Errors</h3>
                                {recentErrors.length === 0 ? (
                                    <p className="text-slate-500 italic text-center py-8">No errors recorded yet. The system is working perfectly! 🎉</p>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {recentErrors.map((err: any) => (
                                            <div key={err.errorId || err._id} className={`p-4 rounded-xl border ${err.severity === 'CRITICAL' ? 'bg-luxe-sienna/10 border-luxe-sienna/20' :
                                                err.severity === 'HIGH' ? 'bg-luxe-rust/10 border-luxe-rust/20' :
                                                    'bg-slate-800 border-slate-700'
                                                }`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${err.severity === 'CRITICAL' ? 'bg-luxe-sienna text-white' :
                                                                err.severity === 'HIGH' ? 'bg-luxe-rust text-white' :
                                                                    err.severity === 'MEDIUM' ? 'bg-luxe-gold text-black' :
                                                                        'bg-slate-600 text-white'
                                                                }`}>{err.severity}</span>
                                                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{err.type}</span>
                                                            {err.resolved && <CheckCircle size={12} className="text-luxe-teal" />}
                                                        </div>
                                                        <p className="text-sm text-white font-medium truncate">{err.message}</p>
                                                        <p className="text-[10px] text-slate-500 mt-1">{err.url || 'Unknown URL'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-500">{new Date(err.createdAt).toLocaleString()}</p>
                                                        {err.occurrenceCount > 1 && (
                                                            <span className="text-[10px] bg-slate-700 text-luxe-gold px-2 py-0.5 rounded">×{err.occurrenceCount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'DRONES' && (
                        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto w-full text-white">
                            <ControlCenterMap />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                <div className="lg:col-span-2">
                                    <DroneFleetStatus />
                                </div>
                                <div className="lg:col-span-1">
                                    <SwarmNegotiationHUD />
                                </div>
                            </div>
                            <div className="mt-6">
                                <ChargingDockPanel />
                            </div>
                        </div>
                    )}
                    {activeTab === 'SIMULATION' && (
                        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto w-full text-white">
                            <LiveSimulationTwin />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                <div className="lg:col-span-2">
                                    <CityOperatingSystem />
                                </div>
                                <div className="lg:col-span-1">
                                    <MemoryGraphVisual />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
