import React, { useState, useEffect } from 'react';
import { User, FoodVendor, FoodOrder, FoodItem } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import {
    Loader2, Store, ShoppingBag, UtensilsCrossed, Settings,
    Power, PowerOff, TrendingUp, Star, Clock, Check, X,
    QrCode, Plus, Edit2, Trash2, DollarSign, MapPin, Camera, BarChart3
} from 'lucide-react';
import { VendorAnalytics } from './VendorAnalytics';
import { LiveLocationUpdater } from './LiveLocationUpdater';

interface VendorViewProps {
    user: User;
}

type TabType = 'dashboard' | 'orders' | 'menu' | 'analytics' | 'settings';
type OrderFilterType = 'active' | 'completed' | 'all';

export const VendorView: React.FC<VendorViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [loading, setLoading] = useState(true);
    const [vendor, setVendor] = useState<FoodVendor | null>(null);
    const [orders, setOrders] = useState<FoodOrder[]>([]);
    const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
    const [orderFilter, setOrderFilter] = useState<OrderFilterType>('active');
    const [stats, setStats] = useState({ todayOrders: 0, todayEarnings: 0, avgRating: 0, totalOrders: 0 });

    // Menu form state
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
    const [menuForm, setMenuForm] = useState({
        name: '', price: '', type: 'VEG' as 'VEG' | 'NON_VEG' | 'EGG',
        category: 'SNACKS' as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS',
        description: '', available: true
    });

    // QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scanResult, setScanResult] = useState<FoodOrder | null>(null);

    useEffect(() => {
        fetchVendorData();
    }, []);

    const fetchVendorData = async () => {
        setLoading(true);
        try {
            // Fetch vendor profile
            const profileRes = await fetch(`${API_BASE_URL}/api/vendor/profile`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (profileRes.ok) {
                const vendorData = await profileRes.json();
                setVendor(vendorData);
            }

            // Fetch orders
            const ordersRes = await fetch(`${API_BASE_URL}/api/vendor/orders`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                setOrders(ordersData);
            }

            // Fetch menu
            const menuRes = await fetch(`${API_BASE_URL}/api/vendor/menu`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (menuRes.ok) {
                const menuData = await menuRes.json();
                setMenuItems(menuData);
            }

            // Fetch stats
            const statsRes = await fetch(`${API_BASE_URL}/api/vendor/analytics`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (e) {
            console.error('Error fetching vendor data:', e);
            // Set mock data for demo
            setVendor({
                id: 'v1', userId: user.id, name: user.name, phone: user.phone || '',
                stallName: 'Demo Food Stall', stallCategory: 'STREET_FOOD', location: 'Main Market',
                isMobile: false, operatingHours: { open: '10:00', close: '22:00' },
                status: 'VERIFIED', badges: ['VERIFIED'], rating: 4.5, totalOrders: 150,
                isOpen: false, isPureVeg: true, specialties: ['Chaat', 'Momos'], images: [],
                createdAt: Date.now()
            });
            setStats({ todayOrders: 12, todayEarnings: 2450, avgRating: 4.5, totalOrders: 150 });
        } finally {
            setLoading(false);
        }
    };

    const toggleStallStatus = async () => {
        if (!vendor) return;
        try {
            const newStatus = !vendor.isOpen;
            await fetch(`${API_BASE_URL}/api/vendor/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ isOpen: newStatus })
            });
            setVendor({ ...vendor, isOpen: newStatus });
        } catch (e) {
            console.error('Error toggling status:', e);
            setVendor({ ...vendor, isOpen: !vendor.isOpen });
        }
    };

    const handleOrderAction = async (orderId: string, action: 'accept' | 'reject' | 'ready' | 'complete') => {
        try {
            await fetch(`${API_BASE_URL}/api/vendor/orders/${orderId}/${action}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            setOrders(prev => prev.map(order => {
                if (order.id === orderId) {
                    const statusMap = {
                        accept: 'ACCEPTED',
                        reject: 'REJECTED',
                        ready: 'READY',
                        complete: 'COMPLETED'
                    };
                    return { ...order, status: statusMap[action] as any };
                }
                return order;
            }));
        } catch (e) {
            console.error('Error updating order:', e);
        }
    };

    const handleSaveMenuItem = async () => {
        try {
            const endpoint = editingItem
                ? `${API_BASE_URL}/api/vendor/menu/${editingItem.id}`
                : `${API_BASE_URL}/api/vendor/menu`;

            await fetch(endpoint, {
                method: editingItem ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({
                    ...menuForm,
                    price: parseFloat(menuForm.price),
                    vendorId: vendor?.id
                })
            });

            fetchVendorData();
            setShowMenuForm(false);
            setEditingItem(null);
            setMenuForm({ name: '', price: '', type: 'VEG', category: 'SNACKS', description: '', available: true });
        } catch (e) {
            console.error('Error saving menu item:', e);
        }
    };

    const handleDeleteMenuItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/vendor/menu/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            setMenuItems(prev => prev.filter(item => item.id !== itemId));
        } catch (e) {
            console.error('Error deleting menu item:', e);
        }
    };

    const filteredOrders = orders.filter(order => {
        if (orderFilter === 'active') return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status);
        if (orderFilter === 'completed') return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status);
        return true;
    });

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    if (!vendor || vendor.status === 'PENDING') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="text-orange-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white mb-4">Verification Pending</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Your vendor registration is under review. You will be notified once approved.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left">
                        <p className="text-sm text-slate-500 mb-2">Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">Under Review</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 pt-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-orange-100 text-sm">Welcome back,</p>
                        <h1 className="text-xl font-bold">{vendor.stallName}</h1>
                    </div>
                    <button
                        onClick={toggleStallStatus}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${vendor.isOpen
                            ? 'bg-green-500 text-white'
                            : 'bg-white/20 text-white'
                            }`}
                    >
                        {vendor.isOpen ? <Power size={16} /> : <PowerOff size={16} />}
                        {vendor.isOpen ? 'OPEN' : 'CLOSED'}
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold">{stats.todayOrders}</p>
                        <p className="text-[10px] opacity-80">Today</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold">₹{stats.todayEarnings}</p>
                        <p className="text-[10px] opacity-80">Earnings</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold flex items-center justify-center gap-1">
                            {stats.avgRating} <Star size={14} fill="currentColor" />
                        </p>
                        <p className="text-[10px] opacity-80">Rating</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold">{stats.totalOrders}</p>
                        <p className="text-[10px] opacity-80">Total</p>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'dashboard' && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <ShoppingBag size={20} className="text-orange-500" />
                            Active Orders
                        </h2>

                        {filteredOrders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag className="text-slate-300" size={32} />
                                </div>
                                <p className="text-slate-500">No active orders right now</p>
                            </div>
                        ) : (
                            filteredOrders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-lg dark:text-white">#{order.token}</p>
                                            <p className="text-xs text-slate-500">{order.items.length} items • ₹{order.totalAmount}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'PLACED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            order.status === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-1">
                                                <span className="dark:text-slate-300">{item.quantity}x {item.name}</span>
                                                <span className="text-slate-500">₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === 'PLACED' && (
                                            <>
                                                <Button onClick={() => handleOrderAction(order.id, 'accept')} className="flex-1 bg-green-500 hover:bg-green-600">
                                                    <Check size={16} className="mr-1" /> Accept
                                                </Button>
                                                <Button onClick={() => handleOrderAction(order.id, 'reject')} variant="outline" className="flex-1 text-red-500 border-red-200">
                                                    <X size={16} className="mr-1" /> Reject
                                                </Button>
                                            </>
                                        )}
                                        {order.status === 'ACCEPTED' && (
                                            <Button onClick={() => handleOrderAction(order.id, 'ready')} className="flex-1 bg-orange-500 hover:bg-orange-600">
                                                Mark as Ready
                                            </Button>
                                        )}
                                        {order.status === 'READY' && (
                                            <Button onClick={() => setShowScanner(true)} className="flex-1">
                                                <QrCode size={16} className="mr-1" /> Scan to Complete
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-4">
                            {(['active', 'completed', 'all'] as OrderFilterType[]).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setOrderFilter(filter)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${orderFilter === filter
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>

                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold dark:text-white">#{order.token}</p>
                                        <p className="text-xs text-slate-500">{order.items.length} items • ₹{order.totalAmount}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'menu' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-lg dark:text-white">Your Menu</h2>
                            <Button onClick={() => { setShowMenuForm(true); setEditingItem(null); }} size="sm">
                                <Plus size={16} className="mr-1" /> Add Item
                            </Button>
                        </div>

                        {menuItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center">
                                <UtensilsCrossed className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500 mb-4">No menu items yet</p>
                                <Button onClick={() => setShowMenuForm(true)}>Add Your First Item</Button>
                            </div>
                        ) : (
                            menuItems.map(item => (
                                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex gap-4">
                                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                                        <UtensilsCrossed className="text-slate-400" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold dark:text-white">{item.name}</h3>
                                                    <div className={`w-3 h-3 border ${item.type === 'VEG' ? 'border-green-500' : 'border-red-500'} flex items-center justify-center`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-500">{item.description}</p>
                                            </div>
                                            <p className="font-bold text-orange-500">₹{item.price}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className={`text-xs px-2 py-1 rounded ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.available ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingItem(item); setMenuForm({ ...item, price: String(item.price), description: item.description || '' }); setShowMenuForm(true); }} className="p-2 text-slate-500 hover:text-orange-500">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-slate-500 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && vendor && (
                    <VendorAnalytics vendor={vendor} />
                )}

                {activeTab === 'settings' && vendor && (
                    <div className="space-y-4">
                        <LiveLocationUpdater
                            vendor={vendor}
                            onUpdate={(loc) => setVendor({ ...vendor, location: loc.address })}
                        />

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                            <h3 className="font-bold dark:text-white mb-4">Stall Information</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <Store className="text-orange-500" size={20} />
                                    <div>
                                        <p className="text-xs text-slate-500">Stall Name</p>
                                        <p className="font-medium dark:text-white">{vendor.stallName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <MapPin className="text-orange-500" size={20} />
                                    <div>
                                        <p className="text-xs text-slate-500">Location</p>
                                        <p className="font-medium dark:text-white">{vendor.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <Clock className="text-orange-500" size={20} />
                                    <div>
                                        <p className="text-xs text-slate-500">Operating Hours</p>
                                        <p className="font-medium dark:text-white">{vendor.operatingHours.open} - {vendor.operatingHours.close}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                            <h3 className="font-bold dark:text-white mb-4">Verification Status</h3>
                            <div className="flex flex-wrap gap-2">
                                {vendor.badges.map((badge, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                                        ✓ {badge.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-around">
                {[
                    { id: 'dashboard', icon: Store, label: 'Dashboard' },
                    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
                    { id: 'menu', icon: UtensilsCrossed, label: 'Menu' },
                    { id: 'analytics', icon: BarChart3, label: 'Stats' },
                    { id: 'settings', icon: Settings, label: 'Settings' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${activeTab === tab.id
                            ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'text-slate-400 dark:text-slate-500'
                            }`}
                    >
                        <tab.icon size={20} />
                        <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Menu Form Modal */}
            {showMenuForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg dark:text-white mb-4">
                            {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Item Name</label>
                                <input
                                    type="text"
                                    value={menuForm.name}
                                    onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    placeholder="e.g., Paneer Tikka"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-500 block mb-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        value={menuForm.price}
                                        onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-500 block mb-1">Type</label>
                                    <select
                                        value={menuForm.type}
                                        onChange={e => setMenuForm({ ...menuForm, type: e.target.value as any })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    >
                                        <option value="VEG">Veg</option>
                                        <option value="NON_VEG">Non-Veg</option>
                                        <option value="EGG">Egg</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Category</label>
                                <select
                                    value={menuForm.category}
                                    onChange={e => setMenuForm({ ...menuForm, category: e.target.value as any })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="BREAKFAST">Breakfast</option>
                                    <option value="LUNCH">Lunch</option>
                                    <option value="DINNER">Dinner</option>
                                    <option value="SNACKS">Snacks</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Description</label>
                                <textarea
                                    value={menuForm.description}
                                    onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    rows={2}
                                    placeholder="Describe your dish..."
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="available"
                                    checked={menuForm.available}
                                    onChange={e => setMenuForm({ ...menuForm, available: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <label htmlFor="available" className="dark:text-white">Available for ordering</label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button onClick={() => setShowMenuForm(false)} variant="outline" className="flex-1">Cancel</Button>
                            <Button onClick={handleSaveMenuItem} className="flex-1">Save Item</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md text-center">
                        <QrCode className="mx-auto text-orange-500 mb-4" size={64} />
                        <h3 className="font-bold text-lg dark:text-white mb-2">Scan Order QR Code</h3>
                        <p className="text-slate-500 text-sm mb-6">Ask customer to show their order QR code</p>

                        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-8 mb-6">
                            <Camera className="mx-auto text-slate-400" size={48} />
                            <p className="text-slate-500 text-sm mt-2">Camera will appear here</p>
                        </div>

                        <Button onClick={() => setShowScanner(false)} variant="outline" fullWidth>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorView;
