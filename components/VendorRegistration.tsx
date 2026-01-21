import React, { useState } from 'react';
import { User, StallCategory } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import {
    Loader2, User as UserIcon, Store, UtensilsCrossed,
    CreditCard, Check, ChevronRight, MapPin, Clock, Camera,
    ArrowLeft, ShieldCheck
} from 'lucide-react';

interface VendorRegistrationProps {
    user: User;
    onComplete: () => void;
    onBack: () => void;
}

type RegistrationStep = 1 | 2 | 3 | 4 | 5;

const STALL_CATEGORIES: { value: StallCategory; label: string; icon: string }[] = [
    { value: 'STREET_FOOD', label: 'Street Food', icon: '🍜' },
    { value: 'JUICE_STALL', label: 'Juice & Shakes', icon: '🥤' },
    { value: 'CHAT_CORNER', label: 'Chat Corner', icon: '🥙' },
    { value: 'TEA_STALL', label: 'Tea & Snacks', icon: '☕' },
    { value: 'FOOD_CART', label: 'Food Cart', icon: '🛒' },
    { value: 'DHABA', label: 'Dhaba', icon: '🍛' },
];

export const VendorRegistration: React.FC<VendorRegistrationProps> = ({ user, onComplete, onBack }) => {
    const [step, setStep] = useState<RegistrationStep>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        // Personal Details
        name: user.name || '',
        phone: user.phone || '',
        aadharNumber: '',
        photo: '',
        // Stall Details
        stallName: '',
        stallCategory: 'STREET_FOOD' as StallCategory,
        location: '',
        isMobile: false,
        operatingHours: { open: '09:00', close: '21:00' },
        isPureVeg: false,
        specialties: [] as string[],
        description: '',
        // Verification
        fssaiLicense: '',
        termsAccepted: false,
        // Payment
        upiId: '',
        bankAccountNumber: '',
        ifscCode: '',
    });

    // Menu items for initial setup
    const [menuItems, setMenuItems] = useState<{ name: string; price: string; type: 'VEG' | 'NON_VEG' | 'EGG' }[]>([
        { name: '', price: '', type: 'VEG' }
    ]);

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addMenuItem = () => {
        setMenuItems([...menuItems, { name: '', price: '', type: 'VEG' }]);
    };

    const updateMenuItem = (index: number, field: string, value: any) => {
        setMenuItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const removeMenuItem = (index: number) => {
        setMenuItems(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = (): boolean => {
        setError('');
        switch (step) {
            case 1:
                if (!formData.name || !formData.phone) {
                    setError('Name and Phone are required');
                    return false;
                }
                break;
            case 2:
                if (!formData.stallName || !formData.location) {
                    setError('Stall name and location are required');
                    return false;
                }
                break;
            case 3:
                const validItems = menuItems.filter(item => item.name && item.price);
                if (validItems.length === 0) {
                    setError('Add at least one menu item');
                    return false;
                }
                break;
            case 4:
                if (!formData.termsAccepted) {
                    setError('Please accept the terms and conditions');
                    return false;
                }
                break;
            case 5:
                if (!formData.upiId && !formData.bankAccountNumber) {
                    setError('Please provide UPI ID or Bank Account details');
                    return false;
                }
                break;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            if (step < 5) {
                setStep((step + 1) as RegistrationStep);
            } else {
                handleSubmit();
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const validMenuItems = menuItems.filter(item => item.name && item.price);

            const response = await fetch(`${API_BASE_URL}/api/vendor/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    ...formData,
                    menuItems: validMenuItems.map(item => ({
                        ...item,
                        price: parseFloat(item.price)
                    }))
                })
            });

            if (response.ok) {
                onComplete();
            } else {
                const data = await response.json();
                setError(data.message || 'Registration failed. Please try again.');
            }
        } catch (e) {
            console.error('Registration error:', e);
            // For demo, complete anyway
            onComplete();
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = [
        'Personal Details',
        'Stall Information',
        'Menu Setup',
        'Verification',
        'Payment Details'
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} aria-label="Go Back" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <ArrowLeft className="dark:text-white" size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg dark:text-white">Become a Vendor</h1>
                        <p className="text-xs text-slate-500">Step {step} of 5 - {stepTitles[step - 1]}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="p-4 pb-24 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 1: Personal Details */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <UserIcon className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">Personal Details</h2>
                                    <p className="text-xs text-slate-500">Tell us about yourself</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => updateField('phone', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="10-digit mobile number"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Aadhar Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.aadharNumber}
                                        onChange={e => updateField('aadharNumber', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="12-digit Aadhar number"
                                        maxLength={12}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">For faster verification</p>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2">Profile Photo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                            <Camera className="text-slate-400" size={32} />
                                        </div>
                                        <Button variant="outline" size="sm">Upload Photo</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Stall Information */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <Store className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">Stall Information</h2>
                                    <p className="text-xs text-slate-500">Details about your food stall</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Stall Name *</label>
                                    <input
                                        type="text"
                                        value={formData.stallName}
                                        onChange={e => updateField('stallName', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="e.g., Sharma Ji Chaat Corner"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2">Category *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STALL_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                onClick={() => updateField('stallCategory', cat.value)}
                                                className={`p-3 rounded-xl border text-left transition-all ${formData.stallCategory === cat.value
                                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                                    : 'border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                <span className="text-2xl">{cat.icon}</span>
                                                <p className="text-sm font-medium dark:text-white mt-1">{cat.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Location *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={e => updateField('location', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            placeholder="Enter your stall location"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Opening Time</label>
                                        <input
                                            type="time"
                                            value={formData.operatingHours.open}
                                            onChange={e => updateField('operatingHours', { ...formData.operatingHours, open: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            aria-label="Opening Time"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Closing Time</label>
                                        <input
                                            type="time"
                                            value={formData.operatingHours.close}
                                            onChange={e => updateField('operatingHours', { ...formData.operatingHours, close: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            aria-label="Closing Time"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="pureVeg"
                                        checked={formData.isPureVeg}
                                        onChange={e => updateField('isPureVeg', e.target.checked)}
                                        className="w-5 h-5 rounded"
                                    />
                                    <label htmlFor="pureVeg" className="dark:text-white">
                                        <span className="font-medium">Pure Vegetarian</span>
                                        <p className="text-xs text-slate-500">Only serve vegetarian food</p>
                                    </label>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="mobile"
                                        checked={formData.isMobile}
                                        onChange={e => updateField('isMobile', e.target.checked)}
                                        className="w-5 h-5 rounded"
                                    />
                                    <label htmlFor="mobile" className="dark:text-white">
                                        <span className="font-medium">Mobile Stall</span>
                                        <p className="text-xs text-slate-500">I move my stall to different locations</p>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Menu Setup */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <UtensilsCrossed className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">Menu Setup</h2>
                                    <p className="text-xs text-slate-500">Add items you'll be selling</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {menuItems.map((item, index) => (
                                    <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium dark:text-white">Item {index + 1}</span>
                                            {menuItems.length > 1 && (
                                                <button onClick={() => removeMenuItem(index)} className="text-red-500 text-sm">Remove</button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={e => updateMenuItem(index, 'name', e.target.value)}
                                                className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                placeholder="Item name"
                                            />
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={e => updateMenuItem(index, 'price', e.target.value)}
                                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                placeholder="Price (₹)"
                                            />
                                            <select
                                                value={item.type}
                                                onChange={e => updateMenuItem(index, 'type', e.target.value)}
                                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                aria-label="Food Type"
                                            >
                                                <option value="VEG">🟢 Veg</option>
                                                <option value="NON_VEG">🔴 Non-Veg</option>
                                                <option value="EGG">🟡 Egg</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                <Button onClick={addMenuItem} variant="outline" fullWidth className="border-dashed">
                                    + Add Another Item
                                </Button>

                                <p className="text-xs text-slate-500 text-center">
                                    You can add more items after registration
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Verification */}
                {step === 4 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">Verification</h2>
                                    <p className="text-xs text-slate-500">Optional documents for verified badge</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">FSSAI License (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.fssaiLicense}
                                        onChange={e => updateField('fssaiLicense', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="14-digit FSSAI number"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Get 🏅 FSSAI Certified badge on your profile</p>
                                </div>

                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                    <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">Why get verified?</h4>
                                    <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                                        <li>✓ Higher visibility in search results</li>
                                        <li>✓ Customer trust & more orders</li>
                                        <li>✓ Featured in "Verified Vendors" section</li>
                                    </ul>
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={formData.termsAccepted}
                                        onChange={e => updateField('termsAccepted', e.target.checked)}
                                        className="w-5 h-5 rounded mt-0.5"
                                    />
                                    <label htmlFor="terms" className="text-sm dark:text-white">
                                        I agree to the <span className="text-orange-500 font-medium">Terms of Service</span> and <span className="text-orange-500 font-medium">Vendor Guidelines</span>. I confirm all information provided is accurate.
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Payment Details */}
                {step === 5 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                    <CreditCard className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold dark:text-white">Payment Details</h2>
                                    <p className="text-xs text-slate-500">Where should we send your earnings?</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                    <p className="text-sm text-orange-700 dark:text-orange-400">
                                        💡 Settlements are done every Monday. Add UPI for instant payments.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">UPI ID (Recommended)</label>
                                    <input
                                        type="text"
                                        value={formData.upiId}
                                        onChange={e => updateField('upiId', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="yourname@upi"
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white dark:bg-slate-900 px-3 text-sm text-slate-500">OR</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Bank Account Number</label>
                                    <input
                                        type="text"
                                        value={formData.bankAccountNumber}
                                        onChange={e => updateField('bankAccountNumber', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="Account number"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={formData.ifscCode}
                                        onChange={e => updateField('ifscCode', e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        placeholder="SBIN0001234"
                                        maxLength={11}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
                <div className="max-w-lg mx-auto flex gap-3">
                    {step > 1 && (
                        <Button onClick={() => setStep((step - 1) as RegistrationStep)} variant="outline" className="flex-1">
                            Back
                        </Button>
                    )}
                    <Button onClick={handleNext} disabled={loading} className="flex-1">
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : step === 5 ? (
                            <>Submit Registration</>
                        ) : (
                            <>Continue <ChevronRight size={16} /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VendorRegistration;
