
import React, { useState, useEffect } from 'react';
import { User, Shop, Product } from '../types';
import { getShops, createShop, addProduct, getProductsByShop } from '../services/marketingService';
import { Button } from './Button';
import { Plus, Store, Lock, LogOut, Package, TrendingUp, DollarSign, Camera, BatteryCharging, Stethoscope, Wheat } from 'lucide-react';
import { Modal } from './Modal';
import { logoutUser } from '../services/authService';

interface ShopkeeperViewProps {
    user: User;
}

export const ShopkeeperView: React.FC<ShopkeeperViewProps> = ({ user }) => {
    const [myShop, setMyShop] = useState<Shop | null>(null);
    const [myProducts, setMyProducts] = useState<Product[]>([]);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ unit: 'pc', available: true });
    const [newProductImage, setNewProductImage] = useState<string | null>(null);

    // --- VERIFICATION CHECK ---
    if (!user.isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-slate-50 dark:bg-black">
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Store size={48} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white mb-2">Verification Pending</h2>
                <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-xs text-left">
                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">Account Details</p>
                    <div className="flex justify-between text-sm dark:text-slate-200 mb-1"><span>Name:</span> <span className="font-bold">{user.name}</span></div>
                </div>
                <button onClick={() => window.location.reload()} className="mt-8 text-brand-600 font-bold text-sm">Refresh Status</button>
            </div>
        );
    }

    useEffect(() => {
        getShops().then(data => {
            const owned = data.find(s => s.ownerId === user.id);
            if (owned) { setMyShop(owned); getProductsByShop(owned.id).then(setMyProducts); }
        });
    }, [user.id]);

    const handleCreateShop = async () => { /* ... */ };
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
    const handleAddProductSubmit = async () => { /* ... */ };
    const handleLogout = () => { logoutUser(); window.location.reload(); };

    // New Toggles
    const toggleService = (service: 'BATTERY' | 'TELEMED') => {
        if (!myShop) return;
        // In real app, call API to update shop
        const updated = { ...myShop, [service === 'BATTERY' ? 'hasBatterySwap' : 'isTeleMedPoint']: !myShop[service === 'BATTERY' ? 'hasBatterySwap' : 'isTeleMedPoint'] };
        setMyShop(updated);
        alert(`${service} service updated.`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-lg"><Store size={20} /></div>
                    <div><h2 className="text-base font-bold leading-none">My Dukan</h2><p className="text-xs text-slate-400 mt-1">{user.name}</p></div>
                </div>
                <button onClick={handleLogout} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><LogOut size={18} /></button>
            </div>

            <div className="p-4 space-y-6">
                {myShop ? (
                    <>
                        {/* Shop Card */}
                        <div className="bg-gradient-to-r from-orange-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg">
                            <h2 className="text-2xl font-bold">{myShop.name}</h2>
                            <p className="text-sm opacity-90">{myShop.location} • {myShop.category}</p>
                            <div className="mt-4 flex gap-3"><button className="bg-white text-orange-600 px-4 py-2 rounded-xl text-xs font-bold shadow-md">Edit Details</button></div>
                        </div>

                        {/* Services Grid (New Features) */}
                        <div className="grid grid-cols-3 gap-3">
                            <div onClick={() => toggleService('BATTERY')} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${myShop.hasBatterySwap ? 'bg-green-50 border-green-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                <BatteryCharging className={`mb-1 ${myShop.hasBatterySwap ? 'text-green-600' : 'text-slate-400'}`} size={24} />
                                <span className="text-[10px] font-bold">EV Swap</span>
                            </div>
                            <div onClick={() => toggleService('TELEMED')} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${myShop.isTeleMedPoint ? 'bg-blue-50 border-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                <Stethoscope className={`mb-1 ${myShop.isTeleMedPoint ? 'text-blue-600' : 'text-slate-400'}`} size={24} />
                                <span className="text-[10px] font-bold">Tele-Med</span>
                            </div>
                            <div className="p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" onClick={() => alert("Crop-for-Ride enabled. Scan farmer's app.")}>
                                <Wheat className="text-yellow-600 mb-1" size={24} />
                                <span className="text-[10px] font-bold">Barter</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"><p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1"><DollarSign size={12} /> Total Sales</p><p className="text-2xl font-bold dark:text-white">₹1,250</p></div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"><p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1"><Package size={12} /> Active Listings</p><p className="text-2xl font-bold dark:text-white">{myProducts.length}</p></div>
                        </div>

                        {/* Inventory */}
                        <div>
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg dark:text-white">Inventory</h3><button onClick={() => setShowAddProduct(true)} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-orange-600 transition-colors"><Plus size={14} /> Add Product</button></div>
                            <div className="space-y-3">
                                {myProducts.length === 0 ? <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl"><p>No products yet.</p></div> : myProducts.map(p => (
                                    <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div><h4 className="font-bold dark:text-white">{p.name}</h4><p className="text-xs text-slate-500">₹{p.price} / {p.unit}</p></div>
                                        <div className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold">In Stock</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"><Store size={48} className="text-orange-600" /></div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Open Your Digital Dukan</h3>
                        <p className="text-sm text-slate-500 mb-8 px-6">Sell groceries, clothes, or materials to thousands of local villagers instantly.</p>
                        <Button onClick={handleCreateShop} fullWidth>Open Shop Now</Button>
                    </div>
                )}
            </div>
            <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} onConfirm={handleAddProductSubmit} title="Add New Product" confirmLabel="List Item">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Product Image (Optional)</label>
                        <div className="mt-2 flex items-center gap-4">
                            <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 rounded-xl w-24 h-24 flex flex-col items-center justify-center text-slate-400 hover:text-orange-500 transition-all relative overflow-hidden group">
                                {newProductImage ? <img src={newProductImage} alt="Preview" className="w-full h-full object-cover" /> : <><Camera size={24} className="mb-1" /><span className="text-[9px] font-bold">Add Photo</span></>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Item Name</label><input className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mt-1 outline-none dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Sona Chawal" /></div>
                    <div className="flex gap-4"><div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase">Price (₹)</label><input type="number" className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mt-1 outline-none dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="0" /></div><div className="w-24"><label className="text-xs font-bold text-slate-500 uppercase">Unit</label><input className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mt-1 outline-none dark:text-white" value={newProduct.unit || ''} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="kg/pc" /></div></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mt-1 outline-none h-20 text-sm dark:text-white" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Item details..." /></div>
                </div>
            </Modal>
        </div>
    );
};
