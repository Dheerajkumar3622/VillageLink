
import React, { useState, useEffect } from 'react';
import { User, VendorKhata, VendorKhataEntry, CreditScore, BulkOrder, HygieneAudit } from '../types';
import { Button } from './Button';
import {
    getVendorKhata, recordKhataEntry,
    getMockCreditScore, getOpenBulkOrders,
    submitHygieneSelfAudit
} from '../services/vyaparSaathiService';
import {
    Mic, Camera, ShoppingBag, TrendingUp,
    ShieldCheck, IndianRupee, Users, ArrowRight,
    AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';

interface VyaparSaathiViewProps {
    user: User;
    onBack?: () => void;
}

type Tab = 'DASHBOARD' | 'KHATA' | 'PROCURE' | 'LOANS' | 'HYGIENE';

export const VyaparSaathiView: React.FC<VyaparSaathiViewProps> = ({ user, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
    const [isLoading, setIsLoading] = useState(false);
    const [khata, setKhata] = useState<VendorKhata | null>(null);
    const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
    const [nearbyOrders, setNearbyOrders] = useState<BulkOrder[]>([]);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            // Parallel fetch simulation
            const khataRes = await getVendorKhata();
            // For demo, we use mock credit score if API fails or returns nothing
            const score = getMockCreditScore();
            const ordersRes = await getOpenBulkOrders(0, 0); // Mock lat/lng

            if (khataRes.success) setKhata(khataRes.khata || null);
            setCreditScore(score);
            if (ordersRes.success) setNearbyOrders(ordersRes.orders || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceCommand = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            // Simulate listening
            setTimeout(() => {
                setIsRecording(false);
                setTranscribedText("Sold 20 plates Pani Puri for 400 rupees");
                // Auto-add entry simulation
                handleQuickAddEntry(400, 'SALE', 'Sold 20 plates Pani Puri');
            }, 3000);
        }
    };

    const handleQuickAddEntry = async (amount: number, type: 'SALE' | 'EXPENSE', note: string) => {
        const newEntry: Partial<VendorKhataEntry> = {
            amount,
            type,
            note,
            paymentMethod: 'CASH',
            timestamp: new Date().toISOString()
        };
        await recordKhataEntry(newEntry);
        loadDashboardData(); // Refresh
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Voice Assistant Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Namaste, {user.name} ji!</h2>
                    <p className="text-orange-100 mb-6">Aaj ka dhanda kaisa hai?</p>

                    <button
                        onClick={handleVoiceCommand}
                        className={`flex items-center gap-3 px-6 py-4 rounded-full font-bold text-lg transition-all ${isRecording
                                ? 'bg-red-100 text-red-600 animate-pulse'
                                : 'bg-white text-orange-600 shadow-md active:scale-95'
                            }`}
                    >
                        <Mic className={`w-6 h-6 ${isRecording ? 'animate-bounce' : ''}`} />
                        {isRecording ? 'Listening...' : 'Bol Kar Entry Karein'}
                    </button>

                    {transcribedText && (
                        <div className="mt-4 bg-black/20 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-sm">Detected: "{transcribedText}"</p>
                        </div>
                    )}
                </div>

                {/* Background Pattern */}
                <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
                    <TrendingUp size={150} />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                        <IndianRupee className="w-5 h-5" />
                        <span className="font-semibold">Today's Sale</span>
                    </div>
                    <p className="text-2xl font-bold">₹{khata?.dailySummary?.totalSales || 2450}</p>
                    <p className="text-xs text-gray-400 mt-1">+12% from yesterday</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-semibold">Trust Score</span>
                    </div>
                    <p className="text-2xl font-bold">{creditScore?.score || '---'}</p>
                    <p className="text-xs text-gray-400 mt-1">{creditScore?.tier} Tier</p>
                </div>
            </div>

            {/* Feature Cards Carousel */}
            <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 ml-1">Grow Your Business</h3>
                <div className="grid grid-cols-1 gap-4">

                    {/* Bulk Procurement Card */}
                    <div
                        onClick={() => setActiveTab('PROCURE')}
                        className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between cursor-pointer active:bg-purple-100"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">Sasti Kharid (Bulk)</h4>
                                <p className="text-sm text-gray-500">Save up to 20% on Potatoes</p>
                            </div>
                        </div>
                        <Users className="w-5 h-5 text-purple-300" />
                    </div>

                    {/* Loan Card */}
                    <div
                        onClick={() => setActiveTab('LOANS')}
                        className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between cursor-pointer active:bg-green-100"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-full text-green-600">
                                <IndianRupee className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">PM SVANidhi Loan</h4>
                                <p className="text-sm text-gray-500">You are eligible for ₹10,000</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-green-300" />
                    </div>

                    {/* Hygiene Audit Card */}
                    <div
                        onClick={() => setActiveTab('HYGIENE')}
                        className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between cursor-pointer active:bg-blue-100"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                                <Camera className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">Daily Hygiene Check</h4>
                                <p className="text-sm text-gray-500">Upload photo to get badge</p>
                            </div>
                        </div>
                        <AlertCircle className="w-5 h-5 text-blue-300" />
                    </div>

                </div>
            </div>
        </div>
    );

    const renderProcurement = () => (
        <div className="space-y-4">
            <div className="bg-purple-600 text-white p-6 rounded-b-3xl -mx-4 -mt-4 mb-4">
                <h2 className="text-2xl font-bold">Group Buying</h2>
                <p className="opacity-90">Join nearby vendors to get wholesale rates</p>
            </div>

            <div className="space-y-4">
                {/* Active Bulk Orders */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-lg">Potato (Aloo) - Large</h3>
                            <p className="text-sm text-gray-500">Closing in 2 hours</p>
                        </div>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                            SAVE 18%
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-4">
                        <div>
                            <span className="block text-gray-400 text-xs">Market Price</span>
                            <span className="line-through text-red-400">₹28/kg</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                        <div>
                            <span className="block text-gray-400 text-xs">Our Price</span>
                            <span className="font-bold text-green-600">₹23/kg</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                        <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <p className="text-xs text-right text-gray-500 mb-4">350kg / 500kg collected</p>

                    <Button
                        fullWidth
                        variant="primary"
                        onClick={() => alert("Joining Order...")}
                    >
                        Join Order (Min 10kg)
                    </Button>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-lg">Onion (Pyaaz) - Nasik</h3>
                            <p className="text-sm text-gray-500">Closing tomorrow 10 AM</p>
                        </div>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                            SAVE 15%
                        </span>
                    </div>

                    <Button
                        fullWidth
                        variant="outline"
                        className="mt-2"
                    >
                        Join Order (Min 5kg)
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Top Nav */}
            {activeTab !== 'DASHBOARD' && (
                <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-20">
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('DASHBOARD')}>
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </Button>
                    <h1 className="font-bold text-lg capitalize">{activeTab.toLowerCase().replace('_', ' ')}</h1>
                </div>
            )}

            {/* Main Content */}
            <div className={`p-4 ${activeTab === 'DASHBOARD' ? 'pt-4' : ''}`}>
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'DASHBOARD' && renderDashboard()}
                        {activeTab === 'PROCURE' && renderProcurement()}
                        {activeTab === 'KHATA' && <div className="text-center py-20 text-gray-400">Ledger Coming Soon</div>}
                        {activeTab === 'LOANS' && <div className="text-center py-20 text-gray-400">PM SVANidhi Integration Coming Soon</div>}
                        {activeTab === 'HYGIENE' && <div className="text-center py-20 text-gray-400">AI Audit Camera Coming Soon</div>}
                    </>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30">
                <button
                    onClick={() => setActiveTab('DASHBOARD')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'DASHBOARD' ? 'text-orange-600' : 'text-gray-400'}`}
                >
                    <TrendingUp className="w-6 h-6" />
                    <span className="text-xs font-medium">Home</span>
                </button>
                <button
                    onClick={() => setActiveTab('KHATA')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'KHATA' ? 'text-orange-600' : 'text-gray-400'}`}
                >
                    <IndianRupee className="w-6 h-6" />
                    <span className="text-xs font-medium">Khata</span>
                </button>
                <button
                    onClick={() => setActiveTab('PROCURE')}
                    className={`relative -top-6 bg-orange-600 text-white p-4 rounded-full shadow-lg border-4 border-gray-50`}
                >
                    <ShoppingBag className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setActiveTab('LOANS')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'LOANS' ? 'text-orange-600' : 'text-gray-400'}`}
                >
                    <ShieldCheck className="w-6 h-6" />
                    <span className="text-xs font-medium">Loans</span>
                </button>
                <button
                    onClick={() => setActiveTab('HYGIENE')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'HYGIENE' ? 'text-orange-600' : 'text-gray-400'}`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-medium">Audit</span>
                </button>
            </div>
        </div>
    );
};
