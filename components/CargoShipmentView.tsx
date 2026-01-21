/**
 * CargoShipmentView - Ship Items via VillageLink
 * Part of CargoLink crowdsourced logistics system
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Package, Truck, MapPin, Scale, Clock, DollarSign, Camera,
    ChevronRight, Check, X, Loader2, ArrowLeft, Phone, User,
    Navigation, AlertCircle, Star, CheckCircle, Zap
} from 'lucide-react';

interface CargoShipmentViewProps {
    user: { id: string; name: string; phone?: string };
    shipperType?: 'FARMER' | 'VENDOR' | 'USER' | 'MESS' | 'SHOPKEEPER';
    onBack?: () => void;
    initialPickup?: { name: string; lat: number; lng: number };
    initialDropoff?: { name: string; lat: number; lng: number };
    prefilledItem?: { name: string; type: string; weight: number };
}

interface CargoRequest {
    id: string;
    itemName: string;
    itemType: string;
    weightKg: number;
    pickupLocation: { name: string; lat: number; lng: number };
    dropoffLocation: { name: string; lat: number; lng: number };
    basePrice: number;
    offeredPrice: number;
    status: string;
    matchedDriverName?: string;
    matchedVehicleType?: string;
    pickupOTP?: string;
    deliveryOTP?: string;
    createdAt: number;
}

interface CargoMatch {
    id: string;
    driverName: string;
    vehicleType: string;
    estimatedPickupTime: number;
    estimatedDeliveryTime: number;
    offerPrice: number;
    score: number;
    status: string;
}

type ViewState = 'list' | 'create' | 'matches' | 'tracking' | 'detail';

const ITEM_TYPES = [
    { id: 'PRODUCE', label: '🌾 Farm Produce', icon: '🌾' },
    { id: 'GOODS', label: '📦 General Goods', icon: '📦' },
    { id: 'FOOD', label: '🍱 Food Items', icon: '🍱' },
    { id: 'DOCUMENTS', label: '📄 Documents', icon: '📄' },
    { id: 'PACKAGE', label: '📬 Package', icon: '📬' }
];

const CargoShipmentView: React.FC<CargoShipmentViewProps> = ({
    user,
    shipperType = 'USER',
    onBack,
    initialPickup,
    initialDropoff,
    prefilledItem
}) => {
    const [view, setView] = useState<ViewState>('list');
    const [loading, setLoading] = useState(false);
    const [myCargos, setMyCargos] = useState<CargoRequest[]>([]);
    const [selectedCargo, setSelectedCargo] = useState<CargoRequest | null>(null);
    const [matches, setMatches] = useState<CargoMatch[]>([]);

    // Create cargo form state
    const [itemName, setItemName] = useState(prefilledItem?.name || '');
    const [itemType, setItemType] = useState(prefilledItem?.type || 'PRODUCE');
    const [weightKg, setWeightKg] = useState(prefilledItem?.weight?.toString() || '');
    const [description, setDescription] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [pickupLocation, setPickupLocation] = useState(initialPickup || { name: '', lat: 0, lng: 0 });
    const [dropoffLocation, setDropoffLocation] = useState(initialDropoff || { name: '', lat: 0, lng: 0 });
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [offeredPrice, setOfferedPrice] = useState('');
    const [calculatedPrice, setCalculatedPrice] = useState({ base: 0, min: 0, max: 0, distance: 0 });

    useEffect(() => {
        fetchMyCargos();
    }, []);

    useEffect(() => {
        if (initialPickup && initialDropoff && prefilledItem) {
            setView('create');
        }
    }, []);

    const fetchMyCargos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/shipper/${user.id}`);
            const data = await res.json();
            if (data.success) {
                setMyCargos(data.cargos);
            }
        } catch (error) {
            console.error('Fetch cargos error:', error);
        }
        setLoading(false);
    };

    const calculatePrice = async () => {
        if (!pickupLocation.lat || !dropoffLocation.lat || !weightKg) return;
        try {
            const params = new URLSearchParams({
                weightKg,
                fromLat: pickupLocation.lat.toString(),
                fromLng: pickupLocation.lng.toString(),
                toLat: dropoffLocation.lat.toString(),
                toLng: dropoffLocation.lng.toString(),
                itemType
            });
            const res = await fetch(`${API_BASE_URL}/api/cargo/calculate-price?${params}`);
            const data = await res.json();
            if (data.success) {
                setCalculatedPrice({
                    base: data.basePrice,
                    min: data.minPrice,
                    max: data.maxPrice,
                    distance: data.distanceKm
                });
                if (!offeredPrice) {
                    setOfferedPrice(data.basePrice.toString());
                }
            }
        } catch (error) {
            console.error('Price calc error:', error);
        }
    };

    useEffect(() => {
        calculatePrice();
    }, [pickupLocation, dropoffLocation, weightKg, itemType]);

    const handleCreateCargo = async () => {
        if (!itemName || !weightKg || !pickupLocation.name || !dropoffLocation.name) {
            alert('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipperId: user.id,
                    shipperType,
                    shipperName: user.name,
                    shipperPhone: user.phone,
                    itemType,
                    itemName,
                    description,
                    weightKg: parseFloat(weightKg),
                    isFragile,
                    pickupLocation,
                    dropoffLocation,
                    offeredPrice: parseFloat(offeredPrice) || calculatedPrice.base,
                    receiverName,
                    receiverPhone
                })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedCargo(data.cargo);
                findMatches(data.cargo.id);
            }
        } catch (error) {
            console.error('Create cargo error:', error);
        }
        setLoading(false);
    };

    const findMatches = async (cargoId: string) => {
        setLoading(true);
        setView('matches');
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/match/${cargoId}`);
            const data = await res.json();
            if (data.success) {
                setMatches(data.matches);
            }
        } catch (error) {
            console.error('Find matches error:', error);
        }
        setLoading(false);
    };

    const viewCargoDetail = (cargo: CargoRequest) => {
        setSelectedCargo(cargo);
        if (cargo.status === 'POSTED') {
            findMatches(cargo.id);
        } else {
            setView('detail');
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'POSTED': 'bg-yellow-100 text-yellow-800',
            'MATCHED': 'bg-blue-100 text-blue-800',
            'DRIVER_ACCEPTED': 'bg-purple-100 text-purple-800',
            'PICKED_UP': 'bg-indigo-100 text-indigo-800',
            'IN_TRANSIT': 'bg-cyan-100 text-cyan-800',
            'DELIVERED': 'bg-green-100 text-green-800',
            'CANCELLED': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'POSTED': '🔍 Finding Driver',
            'MATCHED': '🚗 Drivers Available',
            'DRIVER_ACCEPTED': '✅ Driver Assigned',
            'PICKED_UP': '📦 Picked Up',
            'IN_TRANSIT': '🚛 In Transit',
            'DELIVERED': '✅ Delivered',
            'CANCELLED': '❌ Cancelled'
        };
        return labels[status] || status;
    };

    // ==================== RENDER VIEWS ====================

    const renderHeader = () => (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Go Back">
                        <ArrowLeft size={24} />
                    </button>
                )}
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Package size={24} /> CargoLink
                    </h1>
                    <p className="text-sm text-white/80">Ship items via traveling vehicles</p>
                </div>
                <button
                    onClick={() => setView('create')}
                    className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                    <Zap size={18} /> Ship Now
                </button>
            </div>
        </div>
    );

    const renderListView = () => (
        <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-orange-600">
                        {myCargos.filter(c => c.status === 'DELIVERED').length}
                    </p>
                    <p className="text-xs text-gray-600">Delivered</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-blue-600">
                        {myCargos.filter(c => ['POSTED', 'MATCHED', 'DRIVER_ACCEPTED'].includes(c.status)).length}
                    </p>
                    <p className="text-xs text-gray-600">Active</p>
                </div>
                <div className="bg-green-50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-600">
                        ₹{myCargos.filter(c => c.status === 'DELIVERED').reduce((a, c) => a + (c.offeredPrice || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-600">Saved</p>
                </div>
            </div>

            {/* My Shipments */}
            <div>
                <h2 className="font-semibold text-gray-800 mb-3">My Shipments</h2>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                    </div>
                ) : myCargos.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <Package size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No shipments yet</p>
                        <button
                            onClick={() => setView('create')}
                            className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg"
                        >
                            Create First Shipment
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myCargos.map(cargo => (
                            <div
                                key={cargo.id}
                                onClick={() => viewCargoDetail(cargo)}
                                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">
                                            {ITEM_TYPES.find(t => t.id === cargo.itemType)?.icon || '📦'}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-gray-800">{cargo.itemName}</p>
                                            <p className="text-xs text-gray-500">{cargo.id}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cargo.status)}`}>
                                        {getStatusLabel(cargo.status)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin size={14} className="text-green-500" />
                                    <span className="truncate flex-1">{cargo.pickupLocation.name}</span>
                                    <ChevronRight size={14} />
                                    <MapPin size={14} className="text-red-500" />
                                    <span className="truncate flex-1">{cargo.dropoffLocation.name}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">{cargo.weightKg} kg</span>
                                    <span className="font-semibold text-orange-600">₹{cargo.offeredPrice}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCreateView = () => (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Back to List">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-gray-800">New Shipment</h2>
            </div>

            {/* Item Type Selection */}
            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">What are you shipping?</label>
                <div className="grid grid-cols-3 gap-2">
                    {ITEM_TYPES.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setItemType(type.id)}
                            className={`p-3 rounded-xl border-2 transition-all ${itemType === type.id
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-orange-300'
                                }`}
                        >
                            <span className="text-2xl block mb-1" aria-hidden="true">{type.icon}</span>
                            <span className="text-xs text-gray-600">{type.label.split(' ')[1]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Item Details */}
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Item Name *</label>
                    <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g., Tomatoes, Rice bags, Documents"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        aria-label="Item Name"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (kg) *</label>
                        <input
                            type="number"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            placeholder="5"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                            aria-label="Weight in Kg"
                        />
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer w-full">
                            <input
                                type="checkbox"
                                checked={isFragile}
                                onChange={(e) => setIsFragile(e.target.checked)}
                                className="w-4 h-4 text-orange-500"
                                aria-label="Is Fragile"
                            />
                            <span className="text-sm">⚠️ Fragile</span>
                        </label>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any special handling instructions..."
                        rows={2}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* Locations */}
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                        <MapPin size={14} className="text-green-500" /> Pickup Location *
                    </label>
                    <input
                        type="text"
                        value={pickupLocation.name}
                        onChange={(e) => setPickupLocation({ ...pickupLocation, name: e.target.value })}
                        placeholder="Where to pick up from?"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                        aria-label="Pickup Location"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                        <MapPin size={14} className="text-red-500" /> Dropoff Location *
                    </label>
                    <input
                        type="text"
                        value={dropoffLocation.name}
                        onChange={(e) => setDropoffLocation({ ...dropoffLocation, name: e.target.value })}
                        placeholder="Where to deliver?"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
                        aria-label="Dropoff Location"
                    />
                </div>
            </div>

            {/* Receiver Details */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Receiver Name</label>
                        <input
                            type="text"
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                            placeholder="Recipient name"
                            className="w-full p-3 border border-gray-300 rounded-xl"
                            aria-label="Receiver Name"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Receiver Phone</label>
                        <input
                            type="tel"
                            value={receiverPhone}
                            onChange={(e) => setReceiverPhone(e.target.value)}
                            placeholder="Phone number"
                            className="w-full p-3 border border-gray-300 rounded-xl"
                            aria-label="Receiver Phone"
                        />
                    </div>
                </div>
            </div>

            {/* Price Section */}
            {calculatedPrice.base > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Estimated Distance</span>
                        <span className="font-semibold">{calculatedPrice.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-600">Suggested Price</span>
                        <span className="font-bold text-lg text-orange-600">₹{calculatedPrice.base}</span>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Your Offer Price</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">₹</span>
                            <input
                                type="number"
                                value={offeredPrice}
                                onChange={(e) => setOfferedPrice(e.target.value)}
                                className="flex-1 p-3 border border-orange-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-orange-500"
                                aria-label="Offered Price"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Range: ₹{calculatedPrice.min} - ₹{calculatedPrice.max}
                        </p>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleCreateCargo}
                disabled={loading || !itemName || !weightKg || !pickupLocation.name || !dropoffLocation.name}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <Loader2 className="animate-spin" size={24} />
                ) : (
                    <>
                        <Truck size={24} /> Find Driver
                    </>
                )}
            </button>
        </div>
    );

    const renderMatchesView = () => (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setView('list'); fetchMyCargos(); }} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Back to List">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-gray-800">Available Drivers</h2>
            </div>

            {selectedCargo && (
                <div className="bg-orange-50 p-3 rounded-xl mb-4">
                    <p className="font-semibold">{selectedCargo.itemName}</p>
                    <p className="text-sm text-gray-600">
                        {selectedCargo.pickupLocation.name} → {selectedCargo.dropoffLocation.name}
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                        <Loader2 className="animate-spin text-orange-500" size={48} />
                        <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600" size={20} />
                    </div>
                    <p className="mt-4 text-gray-600">Finding drivers on your route...</p>
                </div>
            ) : matches.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-yellow-500 mb-3" />
                    <p className="text-gray-600 font-medium">No drivers available right now</p>
                    <p className="text-sm text-gray-500 mt-1">We'll notify you when a driver is found</p>
                    <button
                        onClick={() => { setView('list'); fetchMyCargos(); }}
                        className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg"
                    >
                        Back to Shipments
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.map((match, idx) => (
                        <div
                            key={match.id}
                            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                        <Truck size={24} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{match.driverName}</p>
                                        <p className="text-sm text-gray-500">{match.vehicleType}</p>
                                    </div>
                                </div>
                                {idx === 0 && (
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                        ⭐ Best Match
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Pickup ETA</p>
                                    <p className="font-semibold text-orange-600">{match.estimatedPickupTime} min</p>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Delivery ETA</p>
                                    <p className="font-semibold text-green-600">{match.estimatedDeliveryTime} min</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-gray-500">Price: </span>
                                    <span className="font-bold text-lg text-orange-600">₹{match.offerPrice}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                                        Counter
                                    </button>
                                    <button className="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 flex items-center gap-1">
                                        <Check size={18} /> Accept
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderDetailView = () => {
        if (!selectedCargo) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => { setView('list'); setSelectedCargo(null); }} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Back to List">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-semibold text-gray-800">Shipment Details</h2>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">
                            {ITEM_TYPES.find(t => t.id === selectedCargo.itemType)?.icon || '📦'}
                        </span>
                        <div>
                            <h3 className="font-bold text-lg">{selectedCargo.itemName}</h3>
                            <p className="text-sm text-gray-500">{selectedCargo.id}</p>
                        </div>
                        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCargo.status)}`}>
                            {getStatusLabel(selectedCargo.status)}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin size={20} className="text-green-500 mt-1" />
                            <div>
                                <p className="text-xs text-gray-500">Pickup</p>
                                <p className="font-medium">{selectedCargo.pickupLocation.name}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin size={20} className="text-red-500 mt-1" />
                            <div>
                                <p className="text-xs text-gray-500">Dropoff</p>
                                <p className="font-medium">{selectedCargo.dropoffLocation.name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Weight</p>
                            <p className="font-semibold">{selectedCargo.weightKg} kg</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Price</p>
                            <p className="font-semibold text-orange-600">₹{selectedCargo.offeredPrice}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="font-semibold">{new Date(selectedCargo.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Driver Info */}
                {selectedCargo.matchedDriverName && (
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-2">Assigned Driver</p>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Truck size={24} className="text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold">{selectedCargo.matchedDriverName}</p>
                                <p className="text-sm text-gray-500">{selectedCargo.matchedVehicleType}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* OTP Section */}
                {['DRIVER_ACCEPTED', 'PICKED_UP'].includes(selectedCargo.status) && (
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-2">
                            {selectedCargo.status === 'DRIVER_ACCEPTED' ? 'Pickup OTP' : 'Delivery OTP'}
                        </p>
                        <p className="text-3xl font-bold tracking-widest text-center text-blue-600">
                            {selectedCargo.status === 'DRIVER_ACCEPTED' ? selectedCargo.pickupOTP : selectedCargo.deliveryOTP}
                        </p>
                        <p className="text-xs text-center text-gray-500 mt-2">Share with driver for verification</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {renderHeader()}
            {view === 'list' && renderListView()}
            {view === 'create' && renderCreateView()}
            {view === 'matches' && renderMatchesView()}
            {view === 'detail' && renderDetailView()}
        </div>
    );
};

export default CargoShipmentView;
