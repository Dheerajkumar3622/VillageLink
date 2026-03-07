/**
 * CargoDriverView - Driver's Cargo Management Panel
 * For drivers to manage cargo capacity and accept shipments
 */

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
    Package, Truck, MapPin, Scale, Clock, DollarSign,
    Check, X, Loader2, Settings, ToggleLeft, ToggleRight,
    Navigation, Phone, Camera, AlertCircle, ChevronRight, Zap
} from 'lucide-react';

interface CargoDriverViewProps {
    driverId: string;
    driverName: string;
    currentRoute?: { from: string; to: string; fromLat: number; fromLng: number; toLat: number; toLng: number };
    onBack?: () => void;
}

interface CargoCapacity {
    driverId: string;
    vehicleType: string;
    maxWeightKg: number;
    currentLoadKg: number;
    acceptingCargo: boolean;
    acceptedTypes: string[];
    pricePerKmPerKg: number;
    rating: number;
    totalDeliveries: number;
}

interface CargoRequest {
    id: string;
    itemName: string;
    itemType: string;
    weightKg: number;
    pickupLocation: { name: string };
    dropoffLocation: { name: string };
    offeredPrice: number;
    shipperName: string;
    shipperPhone: string;
    status: string;
    pickupOTP?: string;
    deliveryOTP?: string;
}

interface CargoMatch {
    id: string;
    cargoRequestId: string;
    estimatedPickupTime: number;
    estimatedDeliveryTime: number;
    offerPrice: number;
    score: number;
    status: string;
}

const VEHICLE_CAPACITIES: Record<string, { weight: number; volume: number }> = {
    'AUTO': { weight: 20, volume: 50 },
    'BUS': { weight: 100, volume: 200 },
    'TEMPO': { weight: 500, volume: 1000 },
    'TRUCK': { weight: 2000, volume: 5000 },
    'BIKE': { weight: 5, volume: 20 },
    'CAR': { weight: 30, volume: 100 }
};

const ITEM_TYPES = ['PRODUCE', 'GOODS', 'FOOD', 'DOCUMENTS', 'PACKAGE'];

const CargoDriverView: React.FC<CargoDriverViewProps> = ({
    driverId,
    driverName,
    currentRoute,
    onBack
}) => {
    const [loading, setLoading] = useState(false);
    const [capacity, setCapacity] = useState<CargoCapacity | null>(null);
    const [assignedCargo, setAssignedCargo] = useState<CargoRequest[]>([]);
    const [availableCargo, setAvailableCargo] = useState<CargoRequest[]>([]);
    const [pendingMatches, setPendingMatches] = useState<CargoMatch[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [selectedCargo, setSelectedCargo] = useState<CargoRequest | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchCapacity();
        fetchDriverCargo();
        const interval = setInterval(fetchDriverCargo, 10000);
        return () => clearInterval(interval);
    }, [driverId]);

    const fetchCapacity = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/capacity/${driverId}`);
            const data = await res.json();
            if (data.success) {
                setCapacity(data.capacity);
            }
        } catch (error) {
            console.error('Fetch capacity error:', error);
        }
    };

    const fetchDriverCargo = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/driver/${driverId}`);
            const data = await res.json();
            if (data.success) {
                setAssignedCargo(data.assignedCargo || []);
                setAvailableCargo(data.availableCargo || []);
                setPendingMatches(data.pendingMatches || []);
            }
        } catch (error) {
            console.error('Fetch cargo error:', error);
        }
    };

    const updateCapacity = async (updates: Partial<CargoCapacity>) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/capacity/${driverId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...capacity, ...updates, driverName })
            });
            const data = await res.json();
            if (data.success) {
                setCapacity(data.capacity);
            }
        } catch (error) {
            console.error('Update capacity error:', error);
        }
        setLoading(false);
    };

    const toggleAcceptingCargo = () => {
        if (capacity) {
            updateCapacity({ acceptingCargo: !capacity.acceptingCargo });
        }
    };

    const acceptCargo = async (match: CargoMatch) => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: match.id,
                    driverId,
                    acceptedPrice: match.offerPrice
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchDriverCargo();
                alert('✅ Cargo accepted! Pickup OTP will be shown.');
            }
        } catch (error) {
            console.error('Accept cargo error:', error);
        }
        setActionLoading(false);
    };

    const confirmPickup = async () => {
        if (!selectedCargo) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/pickup/${selectedCargo.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    otp: otpInput,
                    driverId,
                    photo: '' // Would capture in real app
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Pickup confirmed! Deliver to: ' + selectedCargo.dropoffLocation.name);
                setShowPickupModal(false);
                setOtpInput('');
                fetchDriverCargo();
            } else {
                alert('❌ ' + data.error);
            }
        } catch (error) {
            console.error('Pickup error:', error);
        }
        setActionLoading(false);
    };

    const confirmDelivery = async () => {
        if (!selectedCargo) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cargo/deliver/${selectedCargo.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    otp: otpInput,
                    driverId,
                    photo: ''
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Delivery confirmed! Earnings added to wallet.');
                setShowDeliveryModal(false);
                setOtpInput('');
                fetchDriverCargo();
                fetchCapacity(); // Refresh stats
            } else {
                alert('❌ ' + data.error);
            }
        } catch (error) {
            console.error('Delivery error:', error);
        }
        setActionLoading(false);
    };

    const getItemEmoji = (type: string) => {
        const emojis: Record<string, string> = {
            'PRODUCE': '🌾',
            'GOODS': '📦',
            'FOOD': '🍱',
            'DOCUMENTS': '📄',
            'PACKAGE': '📬'
        };
        return emojis[type] || '📦';
    };

    const renderCapacityStats = () => (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <Truck size={18} /> Cargo Status
                </h3>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-slate-700/50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-white">
                        {capacity?.currentLoadKg || 0}kg
                    </p>
                    <p className="text-xs text-slate-400">Current Load</p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                        {capacity?.maxWeightKg || 20}kg
                    </p>
                    <p className="text-xs text-slate-400">Capacity</p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-400">
                        {capacity?.totalDeliveries || 0}
                    </p>
                    <p className="text-xs text-slate-400">Deliveries</p>
                </div>
            </div>

            <button
                onClick={toggleAcceptingCargo}
                className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${capacity?.acceptingCargo
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : 'bg-slate-700/50 border border-slate-600'
                    }`}
                aria-label={capacity?.acceptingCargo ? "Stop Accepting Cargo" : "Start Accepting Cargo"}
            >
                <span className="text-sm font-medium text-white">Accept Cargo Requests</span>
                {capacity?.acceptingCargo ? (
                    <ToggleRight size={24} className="text-emerald-400" />
                ) : (
                    <ToggleLeft size={24} className="text-slate-400" />
                )}
            </button>
        </div>
    );

    const renderSettings = () => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Cargo Settings</h4>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Vehicle Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(VEHICLE_CAPACITIES).map(type => (
                            <button
                                key={type}
                                onClick={() => updateCapacity({
                                    vehicleType: type,
                                    maxWeightKg: VEHICLE_CAPACITIES[type].weight
                                })}
                                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${capacity?.vehicleType === type
                                    ? 'bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                    : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Accepted Item Types</label>
                    <div className="flex flex-wrap gap-2">
                        {ITEM_TYPES.map(type => {
                            const isSelected = capacity?.acceptedTypes?.includes(type);
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        const current = capacity?.acceptedTypes || [];
                                        const updated = isSelected
                                            ? current.filter(t => t !== type)
                                            : [...current, type];
                                        updateCapacity({ acceptedTypes: updated });
                                    }}
                                    className={`py-1.5 px-3 rounded-full text-xs font-medium border transition-all ${isSelected
                                        ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    {getItemEmoji(type)} {type}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Price per km/kg: ₹{capacity?.pricePerKmPerKg || 2}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={capacity?.pricePerKmPerKg || 2}
                        onChange={(e) => updateCapacity({ pricePerKmPerKg: parseInt(e.target.value) })}
                        className="w-full"
                        aria-label="Price per km/kg"
                    />
                </div>
            </div>
        </div>
    );

    const renderAssignedCargo = () => (
        <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Package size={16} className="text-orange-500" /> Active Cargo ({assignedCargo.length})
            </h4>

            {assignedCargo.length === 0 ? (
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl text-center">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No active cargo</p>
                </div>
            ) : (
                assignedCargo.map(cargo => (
                    <div
                        key={cargo.id}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{getItemEmoji(cargo.itemType)}</span>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-white">{cargo.itemName}</p>
                                    <p className="text-xs text-slate-500">{cargo.weightKg}kg • ₹{cargo.offeredPrice}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cargo.status === 'DRIVER_ACCEPTED' ? 'bg-purple-100 text-purple-700' :
                                cargo.status === 'PICKED_UP' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {cargo.status === 'DRIVER_ACCEPTED' ? '📍 Pickup' : cargo.status === 'PICKED_UP' ? '🚛 Deliver' : cargo.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                            <MapPin size={14} className="text-green-500" />
                            <span className="truncate">{cargo.pickupLocation.name}</span>
                            <ChevronRight size={14} />
                            <MapPin size={14} className="text-red-500" />
                            <span className="truncate">{cargo.dropoffLocation.name}</span>
                        </div>

                        <div className="flex gap-2">
                            {cargo.status === 'DRIVER_ACCEPTED' && (
                                <button
                                    onClick={() => { setSelectedCargo(cargo); setShowPickupModal(true); }}
                                    className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Confirm Pickup
                                </button>
                            )}
                            {cargo.status === 'PICKED_UP' && (
                                <button
                                    onClick={() => { setSelectedCargo(cargo); setShowDeliveryModal(true); }}
                                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Confirm Delivery
                                </button>
                            )}
                            <a
                                href={`tel:${cargo.shipperPhone}`}
                                className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg"
                                aria-label="Call Shipper"
                            >
                                <Phone size={16} className="text-slate-600 dark:text-slate-300" />
                            </a>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderAvailableCargo = () => (
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" /> Available on Your Route ({availableCargo.length})
            </h4>

            {availableCargo.length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-center border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300">No cargo available on your route</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Keep cargo acceptance ON to receive requests</p>
                </div>
            ) : (
                availableCargo.map((cargo, idx) => {
                    const match = pendingMatches.find(m => m.cargoRequestId === cargo.id);
                    return (
                        <div
                            key={cargo.id}
                            className="bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getItemEmoji(cargo.itemType)}</span>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-white">{cargo.itemName}</p>
                                        <p className="text-xs text-slate-500">{cargo.weightKg}kg from {cargo.shipperName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-orange-600">₹{cargo.offeredPrice}</p>
                                    {currentRoute && (cargo.pickupLocation.name === currentRoute.from || cargo.dropoffLocation.name === currentRoute.to) && (
                                        <div className="flex items-center gap-1 bg-brand-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse mt-1">
                                            <Zap size={10} /> Smart Match
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                <MapPin size={14} className="text-green-500" />
                                <span className="truncate">{cargo.pickupLocation.name}</span>
                                <ChevronRight size={14} />
                                <MapPin size={14} className="text-red-500" />
                                <span className="truncate">{cargo.dropoffLocation.name}</span>
                            </div>

                            {
                                match && (
                                    <div className="flex gap-2 text-xs text-slate-500 mb-3">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            <Clock size={10} className="inline mr-1" />
                                            Pickup: {match.estimatedPickupTime} min
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            Delivery: {match.estimatedDeliveryTime} min
                                        </span>
                                    </div>
                                )
                            }

                            <div className="flex gap-2">
                                <button
                                    onClick={() => match && acceptCargo(match)}
                                    disabled={actionLoading}
                                    className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Check size={16} /> Accept
                                </button>
                                <button className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 px-4 rounded-lg font-semibold text-sm">
                                    Counter
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div >
    );

    const renderOTPModal = (type: 'pickup' | 'delivery') => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 text-center">
                    {type === 'pickup' ? '📦 Confirm Pickup' : '✅ Confirm Delivery'}
                </h3>

                {selectedCargo && (
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl mb-4">
                        <p className="font-semibold">{selectedCargo.itemName}</p>
                        <p className="text-sm text-slate-500">
                            {type === 'pickup' ? selectedCargo.pickupLocation.name : selectedCargo.dropoffLocation.name}
                        </p>
                    </div>
                )}

                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
                    Ask {type === 'pickup' ? 'shipper' : 'receiver'} for OTP
                </p>

                <input
                    type="text"
                    aria-label="Enter OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    maxLength={4}
                    className="w-full p-4 text-center text-2xl tracking-widest font-bold border border-slate-300 dark:border-slate-600 rounded-xl mb-4"
                />

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            type === 'pickup' ? setShowPickupModal(false) : setShowDeliveryModal(false);
                            setOtpInput('');
                        }}
                        className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={type === 'pickup' ? confirmPickup : confirmDelivery}
                        disabled={actionLoading || otpInput.length !== 4}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                        Verify
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {renderCapacityStats()}
            {showSettings && renderSettings()}
            {renderAssignedCargo()}
            {renderAvailableCargo()}
            {showPickupModal && renderOTPModal('pickup')}
            {showDeliveryModal && renderOTPModal('delivery')}
        </div>
    );
};

export default CargoDriverView;
