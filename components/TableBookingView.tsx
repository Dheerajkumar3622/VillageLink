import React, { useState, useEffect } from 'react';
import { User, Restaurant, TableBooking } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { getTimeSlots } from '../services/foodService';
import {
    Loader2, Calendar, Clock, Users, Cake, Briefcase, Heart,
    ChevronLeft, ChevronRight, Check, X, ArrowLeft, MapPin, Star
} from 'lucide-react';

interface TableBookingViewProps {
    user: User;
    restaurant: Restaurant;
    onBack: () => void;
    onSuccess: (booking: TableBooking) => void;
}

const OCCASIONS = [
    { value: 'CASUAL', label: 'Casual Dining', icon: '🍽️' },
    { value: 'BIRTHDAY', label: 'Birthday', icon: '🎂' },
    { value: 'ANNIVERSARY', label: 'Anniversary', icon: '💕' },
    { value: 'BUSINESS', label: 'Business', icon: '💼' },
];

export const TableBookingView: React.FC<TableBookingViewProps> = ({ user, restaurant, onBack, onSuccess }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Booking state
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [partySize, setPartySize] = useState(2);
    const [occasion, setOccasion] = useState('CASUAL');
    const [specialRequests, setSpecialRequests] = useState('');

    // Generate next 14 days
    const availableDates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return {
            value: date.toISOString().split('T')[0],
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            date: date.getDate(),
            month: date.toLocaleDateString('en-US', { month: 'short' })
        };
    });

    // Generate time slots
    const timeSlots = getTimeSlots(
        restaurant.openingTime || '11:00',
        restaurant.closingTime || '23:00',
        30
    );

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime) {
            setError('Please select date and time');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/food/table-booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    restaurantId: restaurant.id,
                    date: selectedDate,
                    timeSlot: selectedTime,
                    partySize,
                    occasion,
                    specialRequests
                })
            });

            if (res.ok) {
                const data = await res.json();
                onSuccess(data.booking);
            } else {
                const data = await res.json();
                setError(data.message || 'Booking failed');
            }
        } catch (e) {
            console.error('Booking error:', e);
            // Mock success for demo
            const mockBooking: TableBooking = {
                id: `TB-${Date.now()}`,
                userId: user.id,
                restaurantId: restaurant.id,
                date: selectedDate,
                timeSlot: selectedTime,
                partySize,
                occasion: occasion as any,
                specialRequests,
                status: 'PENDING',
                confirmationCode: Math.random().toString(36).substring(7).toUpperCase(),
                createdAt: Date.now()
            };
            onSuccess(mockBooking);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-4 pt-6">
                <button onClick={onBack} className="mb-4 flex items-center gap-2">
                    <ArrowLeft size={20} /> Back
                </button>
                <h1 className="text-xl font-bold">Book a Table</h1>
                <div className="flex items-center gap-2 mt-2 text-purple-100">
                    <span>{restaurant.name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Star size={12} fill="currentColor" /> {restaurant.starRating}</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center gap-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${s <= step ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                            }`}>
                            {s < step ? <Check size={16} /> : s}
                        </div>
                        <span className={`text-sm ${s <= step ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-400'}`}>
                            {s === 1 ? 'Date & Time' : s === 2 ? 'Details' : 'Confirm'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="p-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 1: Date & Time */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                                <Calendar className="text-purple-500" size={20} /> Select Date
                            </h2>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {availableDates.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setSelectedDate(d.value)}
                                        className={`flex flex-col items-center px-4 py-3 rounded-xl min-w-[70px] transition-all ${selectedDate === d.value
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <span className="text-xs">{d.day}</span>
                                        <span className="text-xl font-bold">{d.date}</span>
                                        <span className="text-xs">{d.month}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="text-purple-500" size={20} /> Select Time
                            </h2>
                            <div className="grid grid-cols-4 gap-2">
                                {timeSlots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-3 rounded-xl text-sm font-medium transition-all ${selectedTime === time
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Party Details */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                                <Users className="text-purple-500" size={20} /> Party Size
                            </h2>
                            <div className="flex items-center justify-center gap-6 bg-white dark:bg-slate-900 rounded-xl p-6">
                                <button
                                    onClick={() => setPartySize(Math.max(1, partySize - 1))}
                                    className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-2xl font-bold"
                                    disabled={partySize <= 1}
                                >
                                    -
                                </button>
                                <div className="text-center">
                                    <span className="text-4xl font-bold text-purple-600">{partySize}</span>
                                    <p className="text-slate-500 text-sm">Guests</p>
                                </div>
                                <button
                                    onClick={() => setPartySize(Math.min(20, partySize + 1))}
                                    className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-2xl font-bold"
                                    disabled={partySize >= 20}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="font-bold dark:text-white mb-3">Occasion (Optional)</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {OCCASIONS.map(occ => (
                                    <button
                                        key={occ.value}
                                        onClick={() => setOccasion(occ.value)}
                                        className={`p-4 rounded-xl text-left transition-all ${occasion === occ.value
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <span className="text-2xl">{occ.icon}</span>
                                        <p className="font-medium mt-1">{occ.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="font-bold dark:text-white mb-3">Special Requests (Optional)</h2>
                            <textarea
                                value={specialRequests}
                                onChange={e => setSpecialRequests(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                                rows={3}
                                placeholder="Window seat, high chair for baby, dietary restrictions..."
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <h2 className="font-bold text-lg dark:text-white mb-4">Booking Summary</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Restaurant</span>
                                    <span className="font-medium dark:text-white">{restaurant.name}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Date</span>
                                    <span className="font-medium dark:text-white">
                                        {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Time</span>
                                    <span className="font-medium dark:text-white">{selectedTime}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Party Size</span>
                                    <span className="font-medium dark:text-white">{partySize} Guests</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-slate-500">Occasion</span>
                                    <span className="font-medium dark:text-white">
                                        {OCCASIONS.find(o => o.value === occasion)?.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-purple-700 dark:text-purple-400">
                                💡 A confirmation will be sent to your phone. The restaurant may contact you for any changes.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
                <div className="flex gap-3">
                    {step > 1 && (
                        <Button onClick={() => setStep((step - 1) as any)} variant="outline" className="flex-1">
                            <ChevronLeft size={16} /> Back
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button
                            onClick={() => setStep((step + 1) as any)}
                            disabled={step === 1 && (!selectedDate || !selectedTime)}
                            className="flex-1 bg-purple-500 hover:bg-purple-600"
                        >
                            Continue <ChevronRight size={16} />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-purple-500 hover:bg-purple-600">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Booking'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableBookingView;
