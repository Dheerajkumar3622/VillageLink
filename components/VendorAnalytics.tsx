import React, { useState, useEffect, useRef } from 'react';
import { FoodVendor } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import {
    Loader2, TrendingUp, DollarSign, ShoppingBag, Star, Clock,
    BarChart3, Calendar, ChevronDown, ArrowUp, ArrowDown, PieChart
} from 'lucide-react';

interface VendorAnalyticsProps {
    vendor: FoodVendor;
}

interface AnalyticsData {
    revenue: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        growth: number;
    };
    orders: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        averageValue: number;
    };
    ratings: {
        average: number;
        total: number;
        distribution: number[];
    };
    bestSellers: {
        name: string;
        orders: number;
        revenue: number;
    }[];
    peakHours: {
        hour: string;
        orders: number;
    }[];
}

export const VendorAnalytics: React.FC<VendorAnalyticsProps> = ({ vendor }) => {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const analyticsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (analyticsRef.current) {
            // Fix peak hours bars
            const bars = analyticsRef.current.querySelectorAll('.analytics-chart-bar');
            bars.forEach(bar => {
                const h = bar.getAttribute('data-height');
                if (h) (bar as HTMLElement).style.setProperty('--height', h);
            });

            // Fix ratings bars
            const progressBars = analyticsRef.current.querySelectorAll('.mess-progress-bar');
            progressBars.forEach(bar => {
                const p = bar.getAttribute('data-progress');
                if (p) (bar as HTMLElement).style.setProperty('--progress', p);
            });
        }
    }, [data, timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/vendor/analytics?range=${timeRange}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (res.ok) {
                const analyticsData = await res.json();
                setData(analyticsData);
            }
        } catch (e) {
            console.error('Analytics error:', e);
            // Mock data
            setData({
                revenue: {
                    today: 2450,
                    thisWeek: 15800,
                    thisMonth: 58000,
                    growth: 12.5
                },
                orders: {
                    today: 18,
                    thisWeek: 124,
                    thisMonth: 480,
                    averageValue: 120
                },
                ratings: {
                    average: 4.5,
                    total: 342,
                    distribution: [5, 12, 35, 120, 170]
                },
                bestSellers: [
                    { name: 'Pani Puri', orders: 156, revenue: 4680 },
                    { name: 'Dahi Bhalla', orders: 98, revenue: 3920 },
                    { name: 'Aloo Tikki', orders: 87, revenue: 4350 },
                    { name: 'Papdi Chaat', orders: 76, revenue: 3420 },
                    { name: 'Chole Bhature', orders: 52, revenue: 4160 }
                ],
                peakHours: [
                    { hour: '11:00', orders: 12 },
                    { hour: '12:00', orders: 28 },
                    { hour: '13:00', orders: 35 },
                    { hour: '14:00', orders: 22 },
                    { hour: '17:00', orders: 18 },
                    { hour: '18:00', orders: 32 },
                    { hour: '19:00', orders: 45 },
                    { hour: '20:00', orders: 38 },
                    { hour: '21:00', orders: 25 }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    if (!data) return null;

    const maxPeakOrders = Math.max(...data.peakHours.map(h => h.orders));

    return (
        <div className="space-y-6 pb-6" ref={analyticsRef}>
            {/* Time Range Selector */}
            <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl">
                {(['week', 'month', 'year'] as const).map(range => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range
                            ? 'bg-orange-500 text-white'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        This {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                ))}
            </div>

            {/* Revenue & Orders */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={20} />
                        <span className="text-green-100 text-sm">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold">₹{data.revenue.thisMonth.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-sm mt-1 ${data.revenue.growth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {data.revenue.growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {Math.abs(data.revenue.growth)}% vs last month
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag size={20} />
                        <span className="text-blue-100 text-sm">Orders</span>
                    </div>
                    <p className="text-2xl font-bold">{data.orders.thisMonth}</p>
                    <p className="text-blue-200 text-sm mt-1">
                        Avg: ₹{data.orders.averageValue}
                    </p>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{data.orders.today}</p>
                    <p className="text-xs text-slate-500">Today</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">₹{data.revenue.today}</p>
                    <p className="text-xs text-slate-500">Today's Earning</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                        {data.ratings.average} <Star size={14} fill="currentColor" />
                    </p>
                    <p className="text-xs text-slate-500">{data.ratings.total} Reviews</p>
                </div>
            </div>

            {/* Best Sellers */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="text-orange-500" size={20} />
                    Best Sellers
                </h3>
                <div className="space-y-3">
                    {data.bestSellers.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                idx === 1 ? 'bg-slate-200 text-slate-700' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-500'
                                }`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <p className="font-medium dark:text-white text-sm">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.orders} orders</p>
                            </div>
                            <p className="font-bold text-green-500 text-sm">₹{item.revenue}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="text-orange-500" size={20} />
                    Peak Hours
                </h3>
                <div className="flex items-end gap-1 h-32">
                    {data.peakHours.map(hour => (
                        <div key={hour.hour} className="flex-1 flex flex-col items-center">
                            <div
                                className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-sm analytics-chart-bar"
                                data-height={`${(hour.orders / maxPeakOrders) * 100}%`}
                            ></div>
                            <span className="text-[10px] text-slate-500 mt-1 rotate-45 origin-left">{hour.hour}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ratings Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                    <Star className="text-orange-500" size={20} />
                    Ratings Breakdown
                </h3>
                <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars, idx) => {
                        const count = data.ratings.distribution[4 - idx];
                        const percentage = (count / data.ratings.total) * 100;
                        return (
                            <div key={stars} className="flex items-center gap-2">
                                <span className="text-sm w-8 text-slate-500">{stars}★</span>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full mess-progress-bar"
                                        data-progress={`${percentage}%`}
                                    ></div>
                                </div>
                                <span className="text-xs text-slate-500 w-12 text-right">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VendorAnalytics;
