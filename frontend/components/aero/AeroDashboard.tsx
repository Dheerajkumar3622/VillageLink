/**
 * AeroDashboard - Smart Aeroponics Main Dashboard
 * Matching existing KisanApp design language
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Droplets, Thermometer, Activity, Battery, Wifi, WifiOff,
    Play, Square, Zap, Settings, ChevronRight, AlertTriangle,
    TrendingUp, Calendar, Clock, Leaf, RefreshCw, Bell, Plus
} from 'lucide-react';
import { Button } from '../Button';
import {
    getDevices,
    getLiveData,
    sendCommand,
    getHarvestPrediction,
    getCropPresets,
    getAlerts,
    acknowledgeAlert,
    getHistory,
    subscribeToLiveData,
    disconnectAeroSocket,
    cacheData,
    getCachedData,
    formatStatus,
    getStatusColor,
    pairDevice
} from '../../services/aeroService';
import type {
    AeroDevice,
    AeroLiveDataWithStatus,
    AeroHarvestPrediction,
    CropPreset,
    AeroAlert,
    AeroTower
} from '@villagelink/shared';

interface AeroDashboardProps {
    userId: string;
    onBack?: () => void;
}

// Hindi translations
const T = {
    title: 'मेरा एरोपोनिक्स',
    titleEn: 'My Aeroponics',
    liveParams: 'लाइव पैरामीटर',
    towers: 'टावर',
    controls: 'नियंत्रण',
    alerts: 'अलर्ट',
    prediction: 'अनुमानित कटाई',
    pH: 'pH स्तर',
    ec: 'EC स्तर',
    waterTemp: 'पानी का तापमान',
    tankLevel: 'टैंक स्तर',
    pumpStatus: 'पंप स्थिति',
    startMist: 'मिस्ट शुरू करें',
    stopMist: 'बंद करें',
    autoMode: 'ऑटो मोड',
    manualMode: 'मैनुअल मोड',
    selectCrop: 'फसल चुनें',
    daysRemaining: 'दिन शेष',
    health: 'स्वास्थ्य',
    noDevice: 'कोई डिवाइस नहीं',
    offline: 'ऑफ़लाइन',
    online: 'ऑनलाइन',
    lastUpdate: 'अंतिम अपडेट',
    history: 'इतिहास',
    pairDevice: 'नया टावर जोड़ें',
    pairingCode: 'पेयरिंग कोड दर्ज करें',
    claimDevice: 'कनेक्ट करें',
    deviceRegistered: 'सफलतापूर्वक जुड़ गया'
};

const AeroDashboard: React.FC<AeroDashboardProps> = ({ userId, onBack }) => {
    // State
    const [devices, setDevices] = useState<AeroDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<AeroDevice | null>(null);
    const [selectedTower, setSelectedTower] = useState<AeroTower | null>(null);
    const [liveData, setLiveData] = useState<AeroLiveDataWithStatus | null>(null);
    const [prediction, setPrediction] = useState<AeroHarvestPrediction | null>(null);
    const [alerts, setAlerts] = useState<AeroAlert[]>([]);
    const [presets, setPresets] = useState<CropPreset[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [showPairing, setShowPairing] = useState(false);
    const [pairingId, setPairingId] = useState('');
    const [pairingMac, setPairingMac] = useState('');
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

    // Load initial data
    useEffect(() => {
        loadData();
        return () => disconnectAeroSocket();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [devicesData, presetsData] = await Promise.all([
                getDevices(),
                getCropPresets()
            ]);

            setDevices(devicesData);
            setPresets(presetsData);

            if (devicesData.length > 0) {
                // If we previously had a selected device/tower, try to keep it
                const prevDeviceId = selectedDevice?.id;
                const newDevice = devicesData.find(d => d.id === prevDeviceId) || devicesData[0];
                setSelectedDevice(newDevice);

                if (newDevice.towers?.length > 0) {
                    const prevTowerId = selectedTower?.id;
                    const newTower = newDevice.towers.find(t => t.id === prevTowerId) || newDevice.towers[0];
                    setSelectedTower(newTower);
                }
            }
        } catch (error) {
            console.error('Error loading aero data:', error);
        }
        setLoading(false);
    };

    const handlePairDevice = async () => {
        if (!pairingId || !pairingMac) return;
        setSending(true);
        try {
            const result = await pairDevice(pairingId, pairingMac);
            if (result.success) {
                setShowPairing(false);
                setPairingId('');
                setPairingMac('');
                await loadData();
            } else {
                alert(result.error || 'Pairing failed');
            }
        } catch (error) {
            alert('Connection error');
        }
        setSending(false);
    };

    // Load live data when device selected
    useEffect(() => {
        if (!selectedDevice) return;

        const loadLiveData = async () => {
            // Try cache first
            const cached = getCachedData(selectedDevice.id);
            if (cached) setLiveData(cached as AeroLiveDataWithStatus);

            // Fetch fresh data
            const data = await getLiveData(selectedDevice.id);
            if (data) {
                setLiveData(data);
                cacheData(selectedDevice.id, data);
            }

            // Load prediction and alerts
            const [pred, alertsData] = await Promise.all([
                getHarvestPrediction(selectedDevice.id, selectedTower?.id),
                getAlerts(selectedDevice.id, true)
            ]);
            setPrediction(pred);
            setAlerts(alertsData);
        };

        loadLiveData();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToLiveData(selectedDevice.id, (data) => {
            setLiveData(data as AeroLiveDataWithStatus);
            cacheData(selectedDevice.id, data);
        });

        // Refresh every 30 seconds
        const interval = setInterval(loadLiveData, 30000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [selectedDevice?.id, selectedTower?.id]);

    // Command handlers
    const handleCommand = async (command: string, value?: any) => {
        if (!selectedDevice) return;
        setSending(true);
        try {
            await sendCommand(selectedDevice.id, command as any, value, selectedTower?.id);
            // Refresh data after command
            const data = await getLiveData(selectedDevice.id);
            if (data) setLiveData(data);
        } catch (error) {
            console.error('Command error:', error);
        }
        setSending(false);
    };

    const handlePlantCrop = async (preset: CropPreset) => {
        if (!selectedTower) return;
        setSending(true);
        try {
            const res = await fetch(`/api/aero/tower/${selectedTower.id}/plant`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('villagelink_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ presetId: preset.id })
            });
            if (res.ok) {
                setShowPresets(false);
                await loadData();
            }
        } catch (error) {
            console.error('Plant error:', error);
        }
        setSending(false);
    };

    const handleAcknowledgeAlert = async (alertId: string) => {
        await acknowledgeAlert(alertId);
        setAlerts(alerts.filter(a => a.id !== alertId));
    };

    // Render helpers
    const getStatusIcon = (value: number, type: 'pH' | 'ec' | 'tank' | 'temp', preset?: CropPreset) => {
        let status = 'NORMAL';
        if (type === 'pH' && preset) {
            if (value < preset.pHMin) status = 'LOW';
            else if (value > preset.pHMax) status = 'HIGH';
        } else if (type === 'ec' && preset) {
            if (value < preset.ecMin) status = 'LOW';
            else if (value > preset.ecMax) status = 'HIGH';
        } else if (type === 'tank') {
            if (value < 20) status = 'LOW';
            else if (value > 90) status = 'FULL';
        }
        return status;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="animate-spin text-green-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-full bg-white/80 shadow-sm" title="Go back">
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                            <Leaf className="text-green-600" />
                            {T.title}
                        </h1>
                        <p className="text-sm text-green-600">{T.titleEn}</p>
                    </div>
                </div>

                {/* Online/Offline Status */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${liveData?.isOnline
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {liveData?.isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                    {liveData?.isOnline ? T.online : T.offline}
                </div>
            </div>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                        <Bell className="animate-pulse" size={18} />
                        {T.alerts} ({alerts.length})
                    </div>
                    <div className="space-y-2">
                        {alerts.slice(0, 2).map(alert => (
                            <div key={alert.id} className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                                <span className="text-sm text-amber-800">{alert.messageHi}</span>
                                <button
                                    onClick={() => handleAcknowledgeAlert(alert.id)}
                                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded"
                                >
                                    ✓
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tower Selector - Dynamic N Towers */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-700">{T.towers}</p>
                    <button
                        onClick={() => setShowPairing(true)}
                        className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-100/50 px-2 py-1 rounded-lg"
                    >
                        <Plus size={14} /> {T.pairDevice}
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {selectedDevice?.towers?.map((tower) => (
                        <button
                            key={tower.id}
                            onClick={() => setSelectedTower(tower)}
                            className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all min-w-[100px] ${selectedTower?.id === tower.id
                                ? 'bg-green-600 text-white border-green-600 shadow-lg'
                                : 'bg-white text-green-700 border-green-200 hover:border-green-400'
                                }`}
                        >
                            <div className="font-bold flex items-center gap-1">
                                <Leaf size={14} />
                                {tower.nameHi}
                            </div>
                            <div className="text-[10px] opacity-80 truncate uppercase tracking-tighter">
                                {tower.currentCropHi || 'Planted: None'}
                            </div>
                        </button>
                    ))}

                    {/* Empty state if no towers */}
                    {(!selectedDevice?.towers || selectedDevice.towers.length === 0) && (
                        <div className="w-full p-4 bg-white/50 rounded-xl border border-dashed border-green-300 text-center text-sm text-green-600">
                            Click 'Add' to connect your first tower
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('live')}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${activeTab === 'live'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-700'
                        }`}
                >
                    {T.liveParams}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${activeTab === 'history'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-700'
                        }`}
                >
                    {T.history}
                </button>
            </div>

            {activeTab === 'live' && (
                <>
                    {/* Live Parameters Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* pH */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <Droplets size={18} />
                                <span className="text-sm font-medium">{T.pH}</span>
                            </div>
                            <div className="text-3xl font-bold text-green-800">
                                {liveData?.pH?.toFixed(1) || '--'}
                            </div>
                            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${liveData?.pHStatus === 'NORMAL'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                                }`}>
                                {formatStatus(liveData?.pHStatus || 'NORMAL')}
                            </div>
                        </div>

                        {/* EC */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <Activity size={18} />
                                <span className="text-sm font-medium">{T.ec}</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-800">
                                {liveData?.ec?.toFixed(1) || '--'}
                                <span className="text-sm font-normal ml-1">mS/cm</span>
                            </div>
                            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${liveData?.ecStatus === 'NORMAL'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                                }`}>
                                {formatStatus(liveData?.ecStatus || 'NORMAL')}
                            </div>
                        </div>

                        {/* Water Temperature */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                            <div className="flex items-center gap-2 text-orange-600 mb-2">
                                <Thermometer size={18} />
                                <span className="text-sm font-medium">{T.waterTemp}</span>
                            </div>
                            <div className="text-3xl font-bold text-orange-800">
                                {liveData?.waterTemp?.toFixed(0) || '--'}
                                <span className="text-sm font-normal ml-1">°C</span>
                            </div>
                        </div>

                        {/* Tank Level */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                            <div className="flex items-center gap-2 text-cyan-600 mb-2">
                                <Battery size={18} />
                                <span className="text-sm font-medium">{T.tankLevel}</span>
                            </div>
                            <div className="text-3xl font-bold text-cyan-800">
                                {liveData?.tankLevel?.toFixed(0) || '--'}%
                            </div>
                            <div className="w-full bg-cyan-100 rounded-full h-2 mt-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${(liveData?.tankLevel || 0) < 20 ? 'bg-red-500' : 'bg-cyan-500'
                                        }`}
                                    data-width={`${liveData?.tankLevel || 0}%`}
                                    ref={(el) => { if (el) el.style.width = el.dataset.width || '0%'; }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Harvest Prediction Card */}
                    {prediction && prediction.daysRemaining !== undefined && (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 mb-4 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar size={20} />
                                <span className="font-medium">{T.prediction}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-4xl font-bold">{prediction.daysRemaining}</div>
                                    <div className="text-sm opacity-80">{T.daysRemaining}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-medium">{prediction.cropNameHi}</div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <TrendingUp size={14} />
                                        {T.health}: {prediction.healthScore}%
                                    </div>
                                </div>
                            </div>
                            {prediction.recommendationHi && (
                                <div className="mt-3 pt-3 border-t border-white/20 text-sm">
                                    💡 {prediction.recommendationHi}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 mb-4">
                        <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
                            <Settings size={18} />
                            {T.controls}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => handleCommand('START_MIST')}
                                disabled={sending || liveData?.mistingActive}
                                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl"
                            >
                                <Play size={18} />
                                {T.startMist}
                            </Button>

                            <Button
                                onClick={() => handleCommand('STOP_MIST')}
                                disabled={sending || !liveData?.mistingActive}
                                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl"
                            >
                                <Square size={18} />
                                {T.stopMist}
                            </Button>

                            <Button
                                onClick={() => handleCommand('SET_MODE', 'AUTO')}
                                disabled={sending}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl ${liveData?.pumpStatus === 'AUTO'
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-purple-100 text-purple-700'
                                    }`}
                            >
                                <Zap size={18} />
                                {T.autoMode}
                            </Button>

                            <Button
                                onClick={() => setShowPresets(true)}
                                disabled={sending}
                                className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl"
                            >
                                <Leaf size={18} />
                                {T.selectCrop}
                            </Button>
                        </div>
                    </div>

                    {/* Last Update */}
                    {liveData?.lastUpdate && (
                        <div className="text-center text-sm text-green-600 flex items-center justify-center gap-1">
                            <Clock size={14} />
                            {T.lastUpdate}: {new Date(liveData.lastUpdate).toLocaleTimeString('hi-IN')}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'history' && (
                <AeroHistoryChart deviceId={selectedDevice?.id || ''} towerId={selectedTower?.id} />
            )}

            {/* Crop Preset Modal */}
            {showPresets && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50">
                    <div className="bg-white w-full rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-green-800">{T.selectCrop}</h3>
                            <button onClick={() => setShowPresets(false)} className="text-gray-400">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {presets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePlantCrop(preset)}
                                    className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-left hover:border-green-500 transition"
                                >
                                    <div className="text-3xl mb-2">{preset.icon}</div>
                                    <div className="font-bold text-green-800">{preset.nameHi}</div>
                                    <div className="text-sm text-green-600">{preset.nameEn}</div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {preset.expectedDays} दिन
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pairing Modal */}
            {showPairing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-800">{T.pairDevice}</h3>
                            <button onClick={() => setShowPairing(false)} className="text-slate-400 p-2">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Device ID / QR Code</p>
                                <input
                                    value={pairingId}
                                    onChange={(e) => setPairingId(e.target.value.toUpperCase())}
                                    placeholder="e.g. AERO_W72X"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">MAC Address / Security Code</p>
                                <input
                                    value={pairingMac}
                                    onChange={(e) => setPairingMac(e.target.value.toUpperCase())}
                                    placeholder="e.g. AA:BB:CC:DD:EE:FF"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-green-500 outline-none transition-all"
                                />
                            </div>

                            <Button
                                onClick={handlePairDevice}
                                disabled={sending || !pairingId || !pairingMac}
                                className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 shadow-glow-md flex items-center justify-center gap-2"
                            >
                                {sending ? <RefreshCw className="animate-spin" /> : <><Wifi size={20} /> <span className="text-lg uppercase font-black">{T.claimDevice}</span></>}
                            </Button>

                            <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                                You can find these codes on the distributor label attached to your Tower Controller Box.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// History Chart Component (simplified)
const AeroHistoryChart: React.FC<{ deviceId: string; towerId?: string }> = ({ deviceId, towerId }) => {
    const [data, setData] = useState<any[]>([]);
    const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            const historyData = await getHistory(deviceId, period, towerId);
            setData(historyData);
            setLoading(false);
        };
        loadHistory();
    }, [deviceId, towerId, period]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="animate-spin text-green-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex gap-2 mb-4">
                {(['24h', '7d', '30d'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1 rounded-lg text-sm ${period === p
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700'
                            }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {data.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    कोई डेटा उपलब्ध नहीं है
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Simple data visualization */}
                    <div className="grid grid-cols-4 text-xs text-gray-500 font-medium">
                        <div>समय</div>
                        <div>pH</div>
                        <div>EC</div>
                        <div>टैंक</div>
                    </div>
                    {data.slice(-10).map((reading, idx) => (
                        <div key={idx} className="grid grid-cols-4 text-sm py-1 border-b border-gray-50">
                            <div>{new Date(reading.recordedAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div>{reading.pH?.toFixed(1)}</div>
                            <div>{reading.ec?.toFixed(1)}</div>
                            <div>{reading.tankLevel}%</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AeroDashboard;
