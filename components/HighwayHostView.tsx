
import React, { useState, useEffect } from 'react';
import { User, PreOrder, DhabaAmenity, Restaurant } from '../types';
import { Button } from './Button';
import {
    createPreOrder, getActivePreOrders,
    getDhabaAmenities, rateAmenity
} from '../services/highwayHostService';
import {
    Navigation, Wifi, ParkingCircle, Star,
    Coffee, MapPin, Clock, Truck,
    CheckCircle, Loader2
} from 'lucide-react';

interface HighwayHostViewProps {
    user: User;
    onBack?: () => void;
}

type Tab = 'FIND_DHABA' | 'MY_ORDERS' | 'AMENITIES' | 'HOTSPOT';

export const HighwayHostView: React.FC<HighwayHostViewProps> = ({ user, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('FIND_DHABA');
    const [dhabas, setDhabas] = useState<Restaurant[]>([]);
    const [activeOrders, setActiveOrders] = useState<PreOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        // Simulate API calls
        // setDhabas(getMockDhabas());
        setDhabas([]); // Initialize as empty, waiting for real search

        const ordersRes = await getActivePreOrders();
        if (ordersRes.success) setActiveOrders(ordersRes.orders || []);
        setIsLoading(false);
    };

    const handlePreOrder = async (dhaba: Restaurant) => {
        const mockEta = 45; // 45 mins away
        // Simple mock pre-order with 1 item
        const preOrder: PreOrder = {
            id: `po_${Date.now()}`,
            userId: user.id,
            dhabaId: dhaba.id,
            items: [{ itemId: 'item_1', name: 'Combo Thali', price: 150, quantity: 2 }],
            totalAmount: 300,
            estimatedArrival: new Date(Date.now() + mockEta * 60 * 1000).toISOString(),
            etaMinutes: mockEta,
            status: 'PLACED',
            partySize: 2,
            createdAt: Date.now()
        };
        const res = await createPreOrder(preOrder);
        if (res.success) {
            alert(`Pre-order placed at ${dhaba.name}! Kitchen will have it ready in ${mockEta} mins.`);
            loadData();
            setActiveTab('MY_ORDERS');
        }
    };

    const renderFindDhaba = () => (
        <div className="space-y-4">
            {/* Highway Mode Header */}
            <div className="bg-slate-800 text-white p-6 rounded-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Truck className="text-yellow-400" />
                        Highway Mode
                    </h2>
                    <p className="text-slate-300 text-sm mt-1">Smart recommendations for your route</p>

                    <div className="mt-4 flex gap-3">
                        <div className="bg-slate-700/50 px-3 py-2 rounded-lg backdrop-blur-sm">
                            <span className="block text-xs text-slate-400">Next Stop</span>
                            <span className="font-bold">Sher-e-Punjab</span>
                        </div>
                        <div className="bg-slate-700/50 px-3 py-2 rounded-lg backdrop-blur-sm">
                            <span className="block text-xs text-slate-400">Distance</span>
                            <span className="font-bold">12 km</span>
                        </div>
                    </div>
                </div>
            </div>

            <h3 className="font-bold text-gray-700 ml-1">Nearby Dhabas</h3>

            {dhabas.map(dhaba => (
                <div key={dhaba.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-lg">{dhaba.name}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {dhaba.location} • {dhaba.distanceKm || 45} km away
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> {dhaba.starRating}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">Pure Veg: {dhaba.isPureVeg ? 'Yes' : 'No'}</span>
                        </div>
                    </div>

                    {/* Amenities Badges */}
                    <div className="flex gap-2 my-3">
                        {dhaba.features.includes('WIFI') && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md flex items-center gap-1">
                                <Wifi className="w-3 h-3" /> Wi-Fi Zone
                            </span>
                        )}
                        {dhaba.features.includes('PARKING') && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1">
                                <ParkingCircle className="w-3 h-3" /> Safe Parking
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button
                            size="sm"
                            fullWidth
                            onClick={() => handlePreOrder(dhaba)}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Pre-Order Food
                        </Button>
                        <Button size="sm" variant="outline" fullWidth>
                            View Menu
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderActiveOrders = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-700">Live Orders</h3>
            {activeOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active highway orders</p>
                </div>
            ) : (
                activeOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-xl shadow-md border-l-4 border-yellow-400">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-lg">Order #{order.id.slice(-4)}</span>
                            <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold">
                                PREPARING
                            </span>
                        </div>

                        <div className="flex items-center gap-4 py-4 border-t border-b border-gray-100 my-2">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-gray-800">{order.etaMinutes}</span>
                                <span className="text-xs text-gray-500">mins ETA</span>
                            </div>
                            <div className="flex-1">
                                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                                </div>
                                <p className="text-xs text-gray-400 text-center">Kitchen is syncing with your arrival</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">{order.items.length} Items • ₹{order.totalAmount}</span>
                            <Button size="sm" variant="outline">
                                Update Location
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Top Bar */}
            <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-20">
                {onBack && (
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <Navigation className="w-5 h-5 rotate-180" />
                    </Button>
                )}
                <h1 className="font-bold text-lg">Highway Host</h1>
            </div>

            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'FIND_DHABA' && renderFindDhaba()}
                        {activeTab === 'MY_ORDERS' && renderActiveOrders()}
                        {activeTab === 'AMENITIES' && <div className="text-center py-20 text-gray-400">Amenity Ratings Coming Soon</div>}
                        {activeTab === 'HOTSPOT' && <div className="text-center py-20 text-gray-400">Wi-Fi Hotspot Coming Soon</div>}
                    </>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30">
                <button
                    onClick={() => setActiveTab('FIND_DHABA')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'FIND_DHABA' ? 'text-slate-800' : 'text-gray-400'}`}
                >
                    <Navigation className="w-6 h-6" />
                    <span className="text-xs font-medium">Find</span>
                </button>
                <button
                    onClick={() => setActiveTab('MY_ORDERS')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'MY_ORDERS' ? 'text-slate-800' : 'text-gray-400'}`}
                >
                    <Clock className="w-6 h-6" />
                    <span className="text-xs font-medium">Orders</span>
                </button>
                <button
                    onClick={() => setActiveTab('AMENITIES')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'AMENITIES' ? 'text-slate-800' : 'text-gray-400'}`}
                >
                    <Star className="w-6 h-6" />
                    <span className="text-xs font-medium">Rate</span>
                </button>
                <button
                    onClick={() => setActiveTab('HOTSPOT')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'HOTSPOT' ? 'text-slate-800' : 'text-gray-400'}`}
                >
                    <Wifi className="w-6 h-6" />
                    <span className="text-xs font-medium">Wi-Fi</span>
                </button>
            </div>
        </div>
    );
};
