
import React, { useState, useEffect } from 'react';
import { User, FoodItem } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Loader2, Plus, QrCode, TrendingUp, Users, DollarSign, Utensils, AlertCircle } from 'lucide-react';
import { Bar } from 'react-chartjs-2'; // Assuming Chart.js is available or we simulate simple UI

interface MessManagerViewProps {
    user: User;
}

export const MessManagerView: React.FC<MessManagerViewProps> = ({ user }) => {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifyToken, setVerifyToken] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const [error, setError] = useState<string | null>(null);

    // Add Menu Form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemType, setNewItemType] = useState('VEG');

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (dashboardData?.messId) {
            fetchMenu();
        }
    }, [dashboardData]);

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/food/manager/dashboard`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setDashboardData(data);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load dashboard. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMenu = async () => {
        if (dashboardData?.messId) {
            const res = await fetch(`${API_BASE_URL}/api/food/menu/${dashboardData.messId}`);
            const data = await res.json();
            setMenuItems(data);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyToken) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/food/manager/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ token: verifyToken })
            });
            const data = await res.json();
            if (data.success) {
                setVerifyStatus({ msg: `Verified: ${data.booking.items[0].name} (x${data.booking.items[0].quantity})`, type: 'success' });
                setVerifyToken('');
            } else {
                setVerifyStatus({ msg: data.error || 'Invalid Token', type: 'error' });
            }
        } catch (e) {
            setVerifyStatus({ msg: 'Verification Failed', type: 'error' });
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName || !newItemPrice || !dashboardData?.messId) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/food/manager/menu`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    messId: dashboardData.messId,
                    name: newItemName,
                    price: parseFloat(newItemPrice),
                    type: newItemType,
                    description: 'Freshly prepared'
                })
            });
            const data = await res.json();
            if (data.success) {
                setMenuItems([...menuItems, data.item]);
                setShowAddMenu(false);
                setNewItemName('');
                setNewItemPrice('');
            }
        } catch (e) {
            alert("Failed to add item");
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;

    if (error) return (
        <div className="flex flex-col h-[60vh] items-center justify-center p-6 text-center">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold dark:text-white">Account Setup Incomplete</h3>
            <p className="text-slate-500 mt-2 mb-6">{error === "No Mess Found" ? "Your Mess account lacks a linked Shop profile. Please re-register as a new Mess Manager." : error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
    );

    return (
        <div className="pb-20 space-y-6">

            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Users size={16} />
                        <span className="text-xs font-bold uppercase">Expected Footfall</span>
                    </div>
                    <div className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        {dashboardData?.prediction?.expectedFootfall || 0}
                        <span className="text-xs font-normal px-2 py-0.5 bg-green-100 text-green-700 rounded-full">ML Predicted</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-bold uppercase">Today's Bookings</span>
                    </div>
                    <div className="text-2xl font-bold dark:text-white">
                        {dashboardData?.todayCount || 0}
                    </div>
                </div>
            </div>

            {/* Verify Token Section */}
            <div className="bg-gradient-to-br from-brand-600 to-violet-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><QrCode size={20} /> Verify Meal Token</h3>

                    <form onSubmit={handleVerify} className="space-y-3">
                        <input
                            type="text"
                            value={verifyToken}
                            onChange={e => setVerifyToken(e.target.value.toUpperCase())}
                            placeholder="Enter 6-Digit Token"
                            className="w-full px-4 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-xl outline-none placeholder-white/60 font-mono text-center text-xl tracking-widest uppercase"
                        />
                        <Button type="submit" fullWidth variant="secondary">Verify Now</Button>
                    </form>

                    {verifyStatus && (
                        <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-fade-in ${verifyStatus.type === 'success' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                            {verifyStatus.type === 'success' ? <Utensils size={16} /> : <AlertCircle size={16} />}
                            {verifyStatus.msg}
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Management */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="font-bold text-lg dark:text-white">Daily Menu</h3>
                    <button onClick={() => setShowAddMenu(!showAddMenu)} className="p-2 bg-brand-50 text-brand-600 rounded-full hover:bg-brand-100"><Plus size={20} /></button>
                </div>

                {showAddMenu && (
                    <form onSubmit={handleAddItem} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                        <input type="text" placeholder="Item Name (e.g. Potato Curry)" className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                        <div className="flex gap-2">
                            <input type="number" placeholder="Price" className="w-[100px] p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                            <select className="flex-1 p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={newItemType} onChange={e => setNewItemType(e.target.value)}>
                                <option value="VEG">Veg</option>
                                <option value="NON_VEG">Non-Veg</option>
                                <option value="EGG">Egg</option>
                            </select>
                        </div>
                        <Button type="submit" size="sm" fullWidth>Add to Menu</Button>
                    </form>
                )}

                <div className="space-y-3">
                    {menuItems.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${item.type === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <div>
                                    <p className="font-medium dark:text-white">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.description}</p>
                                </div>
                            </div>
                            <span className="font-bold text-brand-600">₹{item.price}</span>
                        </div>
                    ))}
                    {menuItems.length === 0 && <p className="text-center text-slate-400 py-4">No items in menu</p>}
                </div>
            </div>

        </div>
    );
};
