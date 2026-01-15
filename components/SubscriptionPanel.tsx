/**
 * Subscription Panel Component
 * 
 * Zero-commission subscription UI for drivers:
 * - Plan selection (Daily/Monthly/Yearly)
 * - Payment integration
 * - Status display and renewal
 */

import React, { useState, useEffect } from 'react';
import {
    Crown,
    Check,
    Zap,
    Star,
    CreditCard,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Shield,
    Truck,
    HeadphonesIcon,
    Wallet
} from 'lucide-react';
import {
    getSubscriptionPlans,
    getCurrentSubscription,
    createSubscription,
    getRemainingDays,
    needsRenewal,
    formatSubscriptionStatus,
    formatPlanDuration,
    calculateEarningsComparison,
    SubscriptionPlan,
    DriverSubscription
} from '../services/subscriptionService';

interface SubscriptionPanelProps {
    userId: string;
    walletBalance: number;
    onSubscriptionChange?: (subscription: DriverSubscription | null) => void;
    onPaymentRequest?: (amount: number, orderId: string) => void;
}

export const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({
    userId,
    walletBalance,
    onSubscriptionChange,
    onPaymentRequest
}) => {
    const [plans] = useState<SubscriptionPlan[]>(getSubscriptionPlans());
    const [currentSubscription, setCurrentSubscription] = useState<DriverSubscription | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [showComparison, setShowComparison] = useState(false);

    useEffect(() => {
        loadCurrentSubscription();
    }, []);

    const loadCurrentSubscription = async () => {
        try {
            const sub = await getCurrentSubscription();
            setCurrentSubscription(sub);
            onSubscriptionChange?.(sub);
        } catch (error) {
            console.error('Failed to load subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        setSubscribing(true);
        try {
            const plan = plans.find(p => p.id === planId);
            if (!plan) return;

            // Check if wallet has sufficient balance for wallet payment
            const paymentMethod = walletBalance >= plan.price ? 'WALLET' : 'RAZORPAY';

            const result = await createSubscription(planId, paymentMethod);

            if (paymentMethod === 'WALLET') {
                // Immediate activation
                setCurrentSubscription(result.subscription);
                onSubscriptionChange?.(result.subscription);
            } else if (result.paymentUrl) {
                // Redirect to payment
                onPaymentRequest?.(plan.price, result.subscription.id);
            }
        } catch (error) {
            console.error('Subscription failed:', error);
        } finally {
            setSubscribing(false);
        }
    };

    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    const comparison = selectedPlanData
        ? calculateEarningsComparison(8, 150, selectedPlanData)
        : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // Active Subscription View
    if (currentSubscription?.status === 'ACTIVE') {
        const daysRemaining = getRemainingDays(currentSubscription);
        const needsRenew = needsRenewal(currentSubscription);
        const { label, color, icon } = formatSubscriptionStatus(currentSubscription.status);

        return (
            <div className="bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-teal-900/40 rounded-2xl p-6 border border-emerald-500/30">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <Crown className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Premium Subscriber</h3>
                            <p className="text-emerald-300 text-sm">
                                {formatPlanDuration(currentSubscription.plan)}
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 ${color === 'green' ? 'bg-green-500/20 text-green-400' :
                            color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                        }`}>
                        <span>{icon}</span>
                        <span>{label}</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-white">{daysRemaining}</p>
                        <p className="text-sm text-gray-400">Days Remaining</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-emerald-400">100%</p>
                        <p className="text-sm text-gray-400">Fare Retention</p>
                    </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Zero commission on all rides</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Priority ride requests</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Freight mode access</span>
                    </div>
                </div>

                {/* Renewal Alert */}
                {needsRenew && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-yellow-400 font-medium">Renewal Required Soon</p>
                            <p className="text-sm text-gray-400">
                                Your subscription expires in {daysRemaining} days. Renew now to continue earning 100% of your fares.
                            </p>
                        </div>
                    </div>
                )}

                {/* Renew Button */}
                {needsRenew && (
                    <button
                        onClick={() => handleSubscribe(currentSubscription.planId || 'monthly')}
                        disabled={subscribing}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                    >
                        {subscribing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                Renew Now
                            </>
                        )}
                    </button>
                )}
            </div>
        );
    }

    // No Subscription - Show Plans
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full mb-4">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-300 font-medium">Zero Commission Model</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Keep 100% of Your Earnings</h2>
                <p className="text-gray-400">
                    Subscribe once, earn everything. No per-ride commission.
                </p>
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-xl">
                {plans.map((plan) => (
                    <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all relative ${selectedPlan === plan.id
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {plan.popular && (
                            <span className="absolute -top-2 -right-1 px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded-full">
                                BEST
                            </span>
                        )}
                        {plan.name.split(' ')[0]}
                    </button>
                ))}
            </div>

            {/* Selected Plan Details */}
            {selectedPlanData && (
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">{selectedPlanData.name}</h3>
                            <p className="text-gray-400">{formatPlanDuration(selectedPlanData.duration)}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">₹{selectedPlanData.price}</span>
                            </div>
                            {selectedPlanData.savings > 0 && (
                                <p className="text-emerald-400 text-sm">
                                    Save ₹{selectedPlanData.savings}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                        {selectedPlanData.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-gray-300">
                                <div className="p-1 bg-emerald-500/20 rounded-full">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                </div>
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Earnings Comparison Toggle */}
                    <button
                        onClick={() => setShowComparison(!showComparison)}
                        className="w-full py-2 text-sm text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-2"
                    >
                        <span>See earnings comparison</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Comparison Panel */}
                    {showComparison && comparison && (
                        <div className="mt-4 p-4 bg-black/30 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <p className="text-sm text-gray-400 mb-1">With 20% Commission</p>
                                    <p className="text-xl font-bold text-red-400">₹{comparison.withoutSubscription}</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <p className="text-sm text-gray-400 mb-1">With Subscription</p>
                                    <p className="text-xl font-bold text-emerald-400">₹{comparison.withSubscription}</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-400">Your Extra Earnings</p>
                                <p className="text-2xl font-bold text-emerald-400">+₹{comparison.netGain}</p>
                                <p className="text-xs text-gray-500">Based on 8 rides/day @ ₹150 avg fare</p>
                            </div>
                        </div>
                    )}

                    {/* Subscribe Button */}
                    <button
                        onClick={() => handleSubscribe(selectedPlan)}
                        disabled={subscribing}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                    >
                        {subscribing ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-5 h-5" />
                                Subscribe for ₹{selectedPlanData.price}
                            </>
                        )}
                    </button>

                    {/* Wallet Balance Hint */}
                    {walletBalance >= selectedPlanData.price && (
                        <p className="text-center text-sm text-emerald-400 mt-2">
                            ✓ Can be paid from wallet balance (₹{walletBalance.toFixed(0)})
                        </p>
                    )}
                </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                    <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Secure Payment</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                    <Truck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Freight Mode</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                    <HeadphonesIcon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">24/7 Support</p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPanel;
