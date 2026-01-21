import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, Minus, Info, ShoppingBag } from 'lucide-react';
import './Mess3DView.css';

// Placeholder images - in real app these would be imported assets or dynamic URLs
// Assets moved to CSS classes for better performance and lint compliance

interface Mess3DViewProps {
    onBack: () => void;
}

type Screen = 'SHOP' | 'MENU' | 'SUCCESS';

export const Mess3DView: React.FC<Mess3DViewProps> = ({ onBack }) => {
    const [screen, setScreen] = useState<Screen>('SHOP');
    const [selectedShop, setSelectedShop] = useState<string>('');
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({
        dal: false,
        paneer: false,
        rice: false
    });
    const [totalPrice, setTotalPrice] = useState(0);

    const MENU_ITEMS = [
        { id: 'dal', name: 'Special Dal Tadka', desc: 'Smoky tempered lentils', price: 120, icon: '🥣' },
        { id: 'paneer', name: 'Paneer Butter Masala', desc: 'Rich creamy gravy', price: 180, icon: '🥘' },
        { id: 'rice', name: 'Basmati Jeera Rice', desc: 'Aromatic cumin rice', price: 90, icon: '🍚' }
    ];

    const shops = [
        { name: 'Restaurant', icon: '🏢' },
        { name: 'Street Stall', icon: '🛖' },
        { name: 'Dhaba', icon: '🚜' },
        { name: 'Mess', icon: '🥣' }
    ];

    const handleShopSelect = (name: string) => {
        setSelectedShop(name);
        setScreen('MENU');
    };

    const toggleItem = (id: string, price: number) => {
        const isSelected = selectedItems[id];
        setSelectedItems(prev => ({ ...prev, [id]: !isSelected }));
        setTotalPrice(prev => isSelected ? prev - price : prev + price);
    };

    const placeOrder = () => {
        if (totalPrice === 0) {
            alert('Please add items to your plate first!');
            return;
        }
        setScreen('SUCCESS');
    };

    const reset = () => {
        setScreen('SHOP');
        setSelectedItems({ dal: false, paneer: false, rice: false });
        setTotalPrice(0);
        setSelectedShop('');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden mess-3d-container">
            {/* Header */}
            <div className="p-4 flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-500">
                        MESS•LINK 3D
                    </span>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-xs font-bold tracking-widest backdrop-blur-md">
                    PREMIUM
                </div>
            </div>

            {/* SCREEN: SHOP SELECTION */}
            {screen === 'SHOP' && (
                <div className="px-6 pt-10 animate-fade-in">
                    <h1 className="text-4xl font-black leading-tight mb-2">
                        Choose your <br />
                        <span className="text-orange-500">Destination</span>
                    </h1>
                    <p className="text-slate-400 mb-8">Select where you want to eat today</p>

                    <div className="grid grid-cols-2 gap-4">
                        {shops.map((shop) => (
                            <button
                                key={shop.name}
                                onClick={() => handleShopSelect(shop.name)}
                                className="shop-card-3d bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center gap-2 group outline-none focus:ring-2 focus:ring-orange-500"
                                aria-label={`Select ${shop.name}`}
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform block mb-2" aria-hidden="true">
                                    {shop.icon}
                                </span>
                                <span className="font-bold uppercase tracking-wider text-sm">
                                    {shop.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onBack}
                        className="mt-12 w-full py-4 text-slate-500 font-bold text-sm tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                        aria-label="Exit 3D View"
                    >
                        <ArrowLeft size={16} /> EXIT EXPERIENCE
                    </button>
                </div>
            )}

            {/* SCREEN: MENU & PLATE BUILDER */}
            {screen === 'MENU' && (
                <div className="h-full flex flex-col animate-fade-in">
                    <div className="px-4 flex items-center gap-4 mb-4">
                        <button
                            onClick={() => setScreen('SHOP')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            aria-label="Back to Shop Selection"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-2xl font-black">{selectedShop}</h2>
                    </div>

                    <div className="flex-1 relative flex flex-col items-center">
                        <p className="text-slate-400 text-sm mb-8">Design your plate. Tap to add items.</p>

                        {/* 3D Plate Visualization */}
                        <div className="thali-container relative w-72 h-72 mb-8">
                            {/* Base Plate */}
                            <div
                                className="thali-base absolute inset-0 bg-contain bg-center bg-no-repeat z-0 bg-thali"
                            >
                                {/* Visual circle if image fails */}
                                <div className="w-full h-full rounded-full border-4 border-slate-700 bg-slate-800/50 shadow-2xl"></div>
                            </div>

                            {/* Items on Plate - Positioned Absolutely */}
                            <div
                                className={`item-on-plate absolute top-10 left-32 w-20 h-20 bg-contain bg-center bg-no-repeat bg-dal ${selectedItems.dal ? 'active' : ''}`}
                            >
                                {/* <div className="w-16 h-16 rounded-full bg-yellow-600/90 border-2 border-yellow-500 shadow-lg flex items-center justify-center text-xs font-bold transform -rotate-45">DAL</div> */}
                            </div>

                            <div
                                className={`item-on-plate absolute top-24 left-10 w-20 h-20 bg-contain bg-center bg-no-repeat bg-paneer ${selectedItems.paneer ? 'active' : ''}`}
                            >
                                {/* <div className="w-16 h-16 rounded-full bg-orange-600/90 border-2 border-orange-500 shadow-lg flex items-center justify-center text-xs font-bold transform -rotate-45">PANEER</div> */}
                            </div>

                            <div
                                className={`item-on-plate absolute top-36 left-36 w-20 h-20 bg-contain bg-center bg-no-repeat bg-rice ${selectedItems.rice ? 'active' : ''}`}
                            >
                                {/* <div className="w-16 h-16 rounded-full bg-white/90 border-2 border-slate-300 shadow-lg flex items-center justify-center text-xs font-bold text-slate-800 transform -rotate-45">RICE</div> */}
                            </div>
                        </div>

                        {/* Menu List */}
                        <div className="w-full px-4 space-y-3 pb-32 overflow-y-auto">
                            {MENU_ITEMS.map(item => (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${selectedItems[item.id]
                                        ? 'bg-orange-500/10 border-orange-500/50'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">{item.name}</h3>
                                            <p className="text-xs text-slate-400">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-orange-500">₹{item.price}</span>
                                        <button
                                            onClick={() => toggleItem(item.id, item.price)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedItems[item.id]
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                }`}
                                            aria-label={selectedItems[item.id] ? `Remove ${item.name}` : `Add ${item.name}`}
                                        >
                                            {selectedItems[item.id] ? 'REMOVE' : 'ADD'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Price Panel */}
                        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex justify-between items-center z-20">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Amount</p>
                                <p className="text-2xl font-black text-white">₹{totalPrice}</p>
                            </div>
                            <button
                                onClick={placeOrder}
                                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:scale-105 active:scale-95"
                                aria-label={`Place order for ₹${totalPrice}`}
                            >
                                REQUEST THALI
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREEN: SUCCESS */}
            {screen === 'SUCCESS' && (
                <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in z-50">
                    <div className="glow-effect absolute w-64 h-64 rounded-full opacity-20"></div>

                    <div className="success-thali relative w-64 h-64 mb-8">
                        {/* Recreate visual stack for success */}
                        <div className="w-full h-full rounded-full border-4 border-slate-700 bg-slate-800/80 flex items-center justify-center relative shadow-2xl bg-cover bg-center bg-thali">
                            {/* Render items */}
                            {selectedItems.dal && <div className="absolute top-10 left-32 w-20 h-20 bg-contain bg-no-repeat bg-dal"></div>}
                            {selectedItems.paneer && <div className="absolute top-24 left-10 w-20 h-20 bg-contain bg-no-repeat bg-paneer"></div>}
                            {selectedItems.rice && <div className="absolute top-36 left-36 w-20 h-20 bg-contain bg-no-repeat bg-rice"></div>}
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-center mb-2">Order Visualized!</h1>
                    <p className="text-slate-400 text-center mb-8">Your premium thali request has been sent to the kitchen.</p>

                    <button
                        onClick={reset}
                        className="w-full max-w-xs bg-white/10 border border-white/20 text-white py-4 rounded-full font-bold hover:bg-white/20 transition-all"
                    >
                        BACK TO START
                    </button>
                </div>
            )}
        </div>
    );
};
