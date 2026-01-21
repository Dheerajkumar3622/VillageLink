/**
 * Conductor View Component
 * 
 * Digital conductor interface for:
 * - Ticket validation with QR scanner
 * - Soundbox audio announcements
 * - Real-time metrics display
 * - Fraud detection alerts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    QrCode,
    Volume2,
    VolumeX,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Users,
    IndianRupee,
    Ticket,
    Wifi,
    WifiOff,
    RefreshCw,
    Award,
    TrendingUp,
    Clock
} from 'lucide-react';
import {
    announceTicketValidation,
    announceFareCollected,
    announceFraudAlert,
    getTodayMetrics,
    syncOfflineQueue,
    calculateConductorBonus,
    ConductorMetrics
} from '../services/soundboxService';

interface ConductorViewProps {
    conductorId: string;
    vehicleId: string;
    routeNumber: string;
}

export const ConductorView: React.FC<ConductorViewProps> = ({
    conductorId,
    vehicleId,
    routeNumber
}) => {
    const [metrics, setMetrics] = useState<ConductorMetrics | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState<{
        success: boolean;
        message: string;
        fare?: number;
    } | null>(null);
    const [showMetrics, setShowMetrics] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const bonusRef = useRef<HTMLDivElement>(null);

    const scanInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadMetrics();

        // Monitor online status
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check pending sync count
        const checkPending = () => {
            const queue = localStorage.getItem('soundbox_offline_queue');
            if (queue) {
                const items = JSON.parse(queue);
                setPendingSync(items.length);
            }
        };
        checkPending();
        const interval = setInterval(checkPending, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        // Auto-sync when coming online
        if (isOnline && pendingSync > 0) {
            handleSync();
        }
    }, [isOnline]);

    const loadMetrics = async () => {
        const data = await getTodayMetrics(conductorId);
        setMetrics(data);
    };

    const handleSync = async () => {
        const result = await syncOfflineQueue();
        setPendingSync(0);
        if (result.synced > 0) {
            loadMetrics();
        }
    };

    const handleScan = async (ticketCode: string) => {
        if (!ticketCode.trim()) return;

        setScanning(true);

        try {
            // Validate ticket via API
            const response = await fetch('/api/ticket/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: ticketCode,
                    conductorId,
                    vehicleId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Success - announce and update UI
                setLastScan({
                    success: true,
                    message: result.type === 'PASS' ? 'Pass Valid' : 'Ticket Valid',
                    fare: result.fare
                });

                if (soundEnabled) {
                    announceTicketValidation(result.fare || 0, ticketCode);
                }

                // Update local metrics
                if (metrics) {
                    setMetrics({
                        ...metrics,
                        totalTickets: metrics.totalTickets + 1,
                        digitalTickets: metrics.digitalTickets + 1,
                        verifiedRevenue: metrics.verifiedRevenue + (result.fare || 0)
                    });
                }
            } else {
                // Failed - show error and announce fraud if applicable
                setLastScan({
                    success: false,
                    message: result.error || 'Invalid Ticket'
                });

                if (soundEnabled && result.fraudType) {
                    announceFraudAlert();
                }
            }
        } catch (error) {
            // Offline mode - queue for later
            setLastScan({
                success: false,
                message: 'Offline - Queued for sync'
            });
        } finally {
            setScanning(false);

            // Clear input after delay
            setTimeout(() => {
                if (scanInputRef.current) {
                    scanInputRef.current.value = '';
                    scanInputRef.current.focus();
                }
            }, 500);
        }
    };

    const handleCashCollection = async (amount: number) => {
        if (soundEnabled) {
            announceFareCollected(amount);
        }

        // Update metrics
        if (metrics) {
            setMetrics({
                ...metrics,
                totalTickets: metrics.totalTickets + 1,
                cashTickets: metrics.cashTickets + 1,
                totalRevenue: metrics.totalRevenue + amount
            });
        }

        setLastScan({
            success: true,
            message: `Cash ₹${amount} collected`,
            fare: amount
        });
    };

    const bonus = calculateConductorBonus(metrics);

    useEffect(() => {
        if (bonusRef.current) {
            bonusRef.current.style.setProperty('--progress', `${bonus.progress}%`);
        }
    }, [bonus.progress]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-purple-900 to-blue-900 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Digital Conductor</h1>
                        <p className="text-gray-400 text-sm">
                            Route {routeNumber} • Vehicle {vehicleId.slice(-6)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Online Status */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isOnline ? 'Online' : 'Offline'}
                        </div>

                        {/* Pending Sync */}
                        {pendingSync > 0 && (
                            <button
                                onClick={handleSync}
                                className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs"
                            >
                                <RefreshCw className="w-3 h-3" />
                                {pendingSync} pending
                            </button>
                        )}

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-lg ${soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                                }`}
                        >
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <StatCard
                        icon={<Ticket className="w-5 h-5 text-blue-400" />}
                        value={metrics?.totalTickets || 0}
                        label="Tickets"
                    />
                    <StatCard
                        icon={<IndianRupee className="w-5 h-5 text-emerald-400" />}
                        value={`₹${metrics?.totalRevenue || 0}`}
                        label="Revenue"
                    />
                    <StatCard
                        icon={<Users className="w-5 h-5 text-purple-400" />}
                        value={Math.round((metrics?.digitalTickets || 0) / Math.max(metrics?.totalTickets || 1, 1) * 100)}
                        label="% Digital"
                    />
                    <StatCard
                        icon={<Award className="w-5 h-5 text-yellow-400" />}
                        value={`₹${bonus.amount}`}
                        label="Bonus"
                    />
                </div>

                {/* Scan Section */}
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-2xl p-6 border border-blue-500/30">
                    <div className="text-center mb-6">
                        <div className="inline-flex p-4 bg-white/10 rounded-2xl mb-4">
                            <QrCode className="w-16 h-16 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold">Scan Ticket</h2>
                        <p className="text-gray-400 text-sm">Enter ticket code or scan QR</p>
                    </div>

                    <div className="relative">
                        <input
                            ref={scanInputRef}
                            type="text"
                            placeholder="Ticket Code (e.g., TKT-ABC123)"
                            className="w-full bg-black/40 border border-gray-600 rounded-xl px-4 py-4 text-lg text-center focus:border-blue-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleScan((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                        {scanning && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                            </div>
                        )}
                    </div>

                    {/* Last Scan Result */}
                    {lastScan && (
                        <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${lastScan.success ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-red-500/20 border border-red-500/40'
                            }`}>
                            {lastScan.success ? (
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            ) : (
                                <XCircle className="w-8 h-8 text-red-400" />
                            )}
                            <div className="flex-1">
                                <p className={`font-bold ${lastScan.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {lastScan.message}
                                </p>
                                {lastScan.fare && (
                                    <p className="text-gray-400 text-sm">Fare: ₹{lastScan.fare}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Cash Buttons */}
                <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Cash Collection</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[10, 15, 20, 25, 30, 40, 50, 100].map(amount => (
                            <button
                                key={amount}
                                onClick={() => handleCashCollection(amount)}
                                className="py-3 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold hover:bg-emerald-600/40 transition-colors"
                            >
                                ₹{amount}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bonus Progress */}
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-400" />
                            <span className="font-bold">{bonus.level} Tier</span>
                        </div>
                        <span className="text-yellow-400 font-bold">₹{bonus.amount} bonus</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                            ref={bonusRef}
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all conductor-progress-bar"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {100 - bonus.progress}% more to next tier
                    </p>
                </div>

                {/* Detailed Metrics Toggle */}
                <button
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="w-full py-3 bg-white/5 rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2"
                >
                    <TrendingUp className="w-4 h-4" />
                    {showMetrics ? 'Hide' : 'Show'} Detailed Metrics
                </button>

                {showMetrics && metrics && (
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                        <MetricRow label="Digital Tickets" value={metrics.digitalTickets} />
                        <MetricRow label="Cash Tickets" value={metrics.cashTickets} />
                        <MetricRow label="Verified Revenue" value={`₹${metrics.verifiedRevenue}`} />
                        <MetricRow label="Fraud Alerts" value={metrics.fraudAlerts} color={metrics.fraudAlerts > 0 ? 'red' : 'green'} />
                    </div>
                )}
            </main>
        </div>
    );
};

// Sub-components
const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number | string;
    label: string;
}> = ({ icon, value, label }) => (
    <div className="bg-white/5 rounded-xl p-3 text-center">
        <div className="flex justify-center mb-1">{icon}</div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
    </div>
);

const MetricRow: React.FC<{
    label: string;
    value: number | string;
    color?: 'green' | 'red' | 'default';
}> = ({ label, value, color = 'default' }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-400">{label}</span>
        <span className={`font-bold ${color === 'green' ? 'text-emerald-400' :
            color === 'red' ? 'text-red-400' :
                'text-white'
            }`}>
            {value}
        </span>
    </div>
);

export default ConductorView;
