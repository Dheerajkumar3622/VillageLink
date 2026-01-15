/**
 * Operator Dashboard Component
 * 
 * Fleet management UI for bus/auto operators:
 * - Vehicle overview with live status
 * - Crew rostering (digital scheduling)
 * - Permit compliance alerts
 * - Revenue analytics
 */

import React, { useState, useEffect } from 'react';
import {
    Bus,
    Users,
    AlertTriangle,
    Clock,
    IndianRupee,
    Settings,
    Calendar,
    FileText,
    TrendingUp,
    RefreshCw,
    MapPin,
    Wrench,
    CheckCircle,
    XCircle,
    ChevronRight,
    Plus,
    Filter
} from 'lucide-react';
import {
    getFleetVehicles,
    getCrewMembers,
    getComplianceStatus,
    getFleetAnalytics,
    getRoster,
    generateRoster,
    formatExpiryDate,
    getDaysUntilExpiry,
    getSeverityColor,
    calculateUtilization,
    FleetVehicle,
    CrewMember,
    PermitCompliance,
    FleetAnalytics,
    DigitalRoster
} from '../services/fleetManagementService';

interface OperatorDashboardProps {
    operatorId: string;
}

type TabType = 'overview' | 'vehicles' | 'crew' | 'roster' | 'compliance' | 'analytics';

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ operatorId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
    const [crew, setCrew] = useState<CrewMember[]>([]);
    const [compliance, setCompliance] = useState<PermitCompliance[]>([]);
    const [analytics, setAnalytics] = useState<FleetAnalytics | null>(null);
    const [roster, setRoster] = useState<DigitalRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'roster') {
            loadRoster(selectedDate);
        }
    }, [activeTab, selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, crewData, complianceData, analyticsData] = await Promise.all([
                getFleetVehicles(),
                getCrewMembers(),
                getComplianceStatus(),
                getFleetAnalytics()
            ]);
            setVehicles(vehiclesData);
            setCrew(crewData);
            setCompliance(complianceData);
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRoster = async (date: string) => {
        const rosterData = await getRoster(date);
        setRoster(rosterData);
    };

    const handleGenerateRoster = async () => {
        const newRoster = await generateRoster(selectedDate);
        if (newRoster) {
            setRoster(newRoster);
        }
    };

    const criticalAlerts = compliance.flatMap(c =>
        c.issues.filter(i => i.severity === 'CRITICAL')
    );

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-5 h-5" /> },
        { id: 'vehicles', label: 'Vehicles', icon: <Bus className="w-5 h-5" /> },
        { id: 'crew', label: 'Crew', icon: <Users className="w-5 h-5" /> },
        { id: 'roster', label: 'Roster', icon: <Calendar className="w-5 h-5" /> },
        { id: 'compliance', label: 'Compliance', icon: <FileText className="w-5 h-5" /> },
        { id: 'analytics', label: 'Analytics', icon: <IndianRupee className="w-5 h-5" /> }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <Bus className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Operator Dashboard</h1>
                            <p className="text-gray-400 text-sm">Fleet Management System</p>
                        </div>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Critical Alerts Banner */}
                {criticalAlerts.length > 0 && (
                    <div className="mt-4 bg-red-500/20 border border-red-500/40 rounded-xl p-3 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-red-300 text-sm">
                            {criticalAlerts.length} critical compliance issue{criticalAlerts.length > 1 ? 's' : ''} require attention
                        </span>
                        <button
                            onClick={() => setActiveTab('compliance')}
                            className="ml-auto text-red-400 text-sm hover:text-red-300"
                        >
                            View All →
                        </button>
                    </div>
                )}
            </header>

            {/* Navigation Tabs */}
            <nav className="flex gap-1 p-2 bg-gray-800/50 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main className="p-4">
                {/* Overview Tab */}
                {activeTab === 'overview' && analytics && (
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                title="Active Vehicles"
                                value={analytics.activeVehicles}
                                subtitle={`of ${analytics.totalVehicles} total`}
                                icon={<Bus className="w-6 h-6 text-emerald-400" />}
                                color="emerald"
                            />
                            <MetricCard
                                title="On Duty Crew"
                                value={analytics.onDutyCrew}
                                subtitle={`of ${analytics.totalCrew} total`}
                                icon={<Users className="w-6 h-6 text-blue-400" />}
                                color="blue"
                            />
                            <MetricCard
                                title="Today's Revenue"
                                value={`₹${analytics.todayRevenue.toLocaleString()}`}
                                subtitle={`${analytics.todayTrips} trips`}
                                icon={<IndianRupee className="w-6 h-6 text-yellow-400" />}
                                color="yellow"
                            />
                            <MetricCard
                                title="Compliance Score"
                                value={`${analytics.complianceScore}%`}
                                subtitle={criticalAlerts.length > 0 ? `${criticalAlerts.length} alerts` : 'All clear'}
                                icon={<CheckCircle className="w-6 h-6 text-purple-400" />}
                                color="purple"
                            />
                        </div>

                        {/* Quick Stats */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Fleet Utilization */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <h3 className="text-lg font-bold mb-4">Fleet Utilization</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 relative">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="48" cy="48" r="40"
                                                fill="none"
                                                stroke="#374151"
                                                strokeWidth="8"
                                            />
                                            <circle
                                                cx="48" cy="48" r="40"
                                                fill="none"
                                                stroke="#10b981"
                                                strokeWidth="8"
                                                strokeDasharray={`${calculateUtilization(analytics) * 2.51} 251`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-bold">{calculateUtilization(analytics)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-sm text-gray-400">Active: {analytics.activeVehicles}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gray-500" />
                                            <span className="text-sm text-gray-400">Idle: {analytics.idleVehicles}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                            <span className="text-sm text-gray-400">Maintenance: {analytics.maintenanceVehicles}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue by Vehicle */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <h3 className="text-lg font-bold mb-4">Top Earning Vehicles</h3>
                                <div className="space-y-3">
                                    {analytics.revenueByVehicle
                                        .sort((a, b) => b.revenue - a.revenue)
                                        .slice(0, 3)
                                        .map((v, idx) => (
                                            <div key={v.vehicleId} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                    <span className="text-gray-300">{v.vehicleNumber}</span>
                                                </div>
                                                <span className="font-bold text-emerald-400">₹{v.revenue.toLocaleString()}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vehicles Tab */}
                {activeTab === 'vehicles' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Fleet Vehicles</h2>
                            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700">
                                <Plus className="w-4 h-4" />
                                Add Vehicle
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {vehicles.map(vehicle => (
                                <VehicleCard key={vehicle.id} vehicle={vehicle} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Crew Tab */}
                {activeTab === 'crew' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Crew Members</h2>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">
                                    <Filter className="w-4 h-4" />
                                    Filter
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700">
                                    <Plus className="w-4 h-4" />
                                    Add Crew
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {crew.map(member => (
                                <CrewCard key={member.id} member={member} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Roster Tab */}
                {activeTab === 'roster' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-xl font-bold">Digital Roster</h2>
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-white/10 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                />
                                <button
                                    onClick={handleGenerateRoster}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Auto Generate
                                </button>
                            </div>
                        </div>

                        {roster ? (
                            <div className="bg-white/5 rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-white/10">
                                        <tr>
                                            <th className="text-left p-4">Vehicle</th>
                                            <th className="text-left p-4">Morning (6AM-2PM)</th>
                                            <th className="text-left p-4">Afternoon (2PM-10PM)</th>
                                            <th className="text-left p-4">Night (10PM-6AM)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.shifts.map(shift => (
                                            <tr key={shift.vehicleId} className="border-t border-gray-700">
                                                <td className="p-4 font-medium">{shift.vehicleNumber}</td>
                                                <td className="p-4">
                                                    {shift.morningShift ? (
                                                        <div className="text-sm">
                                                            <p className="text-emerald-400">D: {shift.morningShift.driver.name}</p>
                                                            {shift.morningShift.conductor && (
                                                                <p className="text-blue-400">C: {shift.morningShift.conductor.name}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {shift.afternoonShift ? (
                                                        <div className="text-sm">
                                                            <p className="text-emerald-400">D: {shift.afternoonShift.driver.name}</p>
                                                            {shift.afternoonShift.conductor && (
                                                                <p className="text-blue-400">C: {shift.afternoonShift.conductor.name}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {shift.nightShift ? (
                                                        <div className="text-sm">
                                                            <p className="text-emerald-400">D: {shift.nightShift.driver.name}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-white/5 rounded-xl p-8 text-center">
                                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                <p className="text-gray-400">No roster for this date</p>
                                <button
                                    onClick={handleGenerateRoster}
                                    className="mt-4 px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                    Generate Roster
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Compliance Tab */}
                {activeTab === 'compliance' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Permit Compliance</h2>

                        {compliance.map(vehicle => (
                            <div
                                key={vehicle.vehicleId}
                                className={`bg-white/5 rounded-xl p-4 border ${vehicle.isCompliant ? 'border-emerald-500/30' : 'border-red-500/30'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Bus className="w-6 h-6 text-gray-400" />
                                        <span className="font-bold">{vehicle.vehicleNumber}</span>
                                    </div>
                                    {vehicle.isCompliant ? (
                                        <span className="flex items-center gap-1 text-emerald-400 text-sm">
                                            <CheckCircle className="w-4 h-4" /> Compliant
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-400 text-sm">
                                            <XCircle className="w-4 h-4" /> Issues Found
                                        </span>
                                    )}
                                </div>

                                {vehicle.issues.length > 0 ? (
                                    <div className="space-y-2">
                                        {vehicle.issues.map((issue, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-lg ${issue.severity === 'CRITICAL' ? 'bg-red-500/10' :
                                                        issue.severity === 'WARNING' ? 'bg-yellow-500/10' :
                                                            'bg-blue-500/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className={`w-4 h-4 ${issue.severity === 'CRITICAL' ? 'text-red-400' :
                                                            issue.severity === 'WARNING' ? 'text-yellow-400' :
                                                                'text-blue-400'
                                                        }`} />
                                                    <span className="text-sm">{issue.description}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {formatExpiryDate(issue.expiryDate)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-emerald-400 text-sm">All documents valid</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && analytics && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Revenue Analytics</h2>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-6 text-center">
                                <p className="text-gray-400 mb-2">Today's Revenue</p>
                                <p className="text-4xl font-bold text-emerald-400">₹{analytics.todayRevenue.toLocaleString()}</p>
                                <p className="text-sm text-gray-500 mt-2">{analytics.todayTrips} trips completed</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl p-6 text-center">
                                <p className="text-gray-400 mb-2">Distance Covered</p>
                                <p className="text-4xl font-bold text-blue-400">{analytics.todayKm} km</p>
                                <p className="text-sm text-gray-500 mt-2">across all vehicles</p>
                            </div>
                            <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-xl p-6 text-center">
                                <p className="text-gray-400 mb-2">Avg Occupancy</p>
                                <p className="text-4xl font-bold text-yellow-400">{analytics.averageOccupancy}%</p>
                                <p className="text-sm text-gray-500 mt-2">seat utilization</p>
                            </div>
                        </div>

                        {/* Revenue Chart Placeholder */}
                        <div className="bg-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-bold mb-4">Revenue Trend (Last 7 Days)</h3>
                            <div className="h-48 flex items-end justify-between gap-2">
                                {[65, 78, 82, 70, 95, 88, 100].map((height, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-500 hover:to-emerald-300"
                                            style={{ height: `${height}%` }}
                                        />
                                        <span className="text-xs text-gray-500 mt-2">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, subtitle, icon, color }) => (
    <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">{title}</span>
            {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
);

const VehicleCard: React.FC<{ vehicle: FleetVehicle }> = ({ vehicle }) => (
    <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${vehicle.status === 'ACTIVE' ? 'bg-emerald-500/20' :
                vehicle.status === 'MAINTENANCE' ? 'bg-yellow-500/20' :
                    'bg-gray-500/20'
            }`}>
            <Bus className={`w-8 h-8 ${vehicle.status === 'ACTIVE' ? 'text-emerald-400' :
                    vehicle.status === 'MAINTENANCE' ? 'text-yellow-400' :
                        'text-gray-400'
                }`} />
        </div>
        <div className="flex-1">
            <p className="font-bold">{vehicle.registrationNumber}</p>
            <p className="text-sm text-gray-400">{vehicle.type} • {vehicle.capacity} seats</p>
        </div>
        <div className="text-right">
            <p className="text-emerald-400 font-bold">₹{vehicle.todayRevenue}</p>
            <p className="text-xs text-gray-500">{vehicle.todayTrips} trips • {vehicle.todayKm} km</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${vehicle.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                vehicle.status === 'MAINTENANCE' ? 'bg-yellow-500/20 text-yellow-400' :
                    vehicle.status === 'BREAKDOWN' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
            }`}>
            {vehicle.status}
        </span>
    </div>
);

const CrewCard: React.FC<{ member: CrewMember }> = ({ member }) => (
    <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${member.role === 'DRIVER' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                }`}>
                <Users className={`w-6 h-6 ${member.role === 'DRIVER' ? 'text-emerald-400' : 'text-blue-400'
                    }`} />
            </div>
            <div className="flex-1">
                <p className="font-bold">{member.name}</p>
                <p className="text-sm text-gray-400">{member.role} • ⭐ {member.rating}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${member.isOnDuty ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                {member.isOnDuty ? 'On Duty' : 'Off Duty'}
            </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500">Trips</p>
                <p className="font-bold">{member.totalTrips}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500">This Week</p>
                <p className="font-bold">{member.weeklyHours}h</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500">Preference</p>
                <p className="font-bold">{member.shiftPreference}</p>
            </div>
        </div>
    </div>
);

export default OperatorDashboard;
