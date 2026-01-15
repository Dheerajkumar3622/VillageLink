/**
 * Multimodal Journey Planner Component
 * 
 * Plans and displays multimodal journeys:
 * - Share Auto (First Mile)
 * - Bus/Metro (Main Journey)
 * - Walk (Last Mile)
 */

import React, { useState, useEffect } from 'react';
import {
    Navigation,
    MapPin,
    Clock,
    IndianRupee,
    ChevronRight,
    RefreshCw,
    Footprints,
    Bus,
    Train,
    Truck
} from 'lucide-react';
import {
    planMultimodalJourney,
    getOccupancyIndicator,
    formatETA,
    getModeIcon,
    MultimodalJourney,
    JourneySegment
} from '../services/shareAutoService';

interface JourneyPlannerProps {
    origin: { lat: number; lng: number; name: string };
    destination: { lat: number; lng: number; name: string };
    onJourneySelected?: (journey: MultimodalJourney) => void;
    onBookSegment?: (segment: JourneySegment) => void;
}

export const JourneyPlanner: React.FC<JourneyPlannerProps> = ({
    origin,
    destination,
    onJourneySelected,
    onBookSegment
}) => {
    const [journeys, setJourneys] = useState<MultimodalJourney[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        if (origin.lat && destination.lat) {
            loadJourneys();
        }
    }, [origin, destination]);

    const loadJourneys = async () => {
        setLoading(true);
        try {
            const results = await planMultimodalJourney(origin, destination);
            setJourneys(results);
            if (results.length > 0) {
                onJourneySelected?.(results[0]);
            }
        } catch (error) {
            console.error('Failed to plan journey:', error);
        } finally {
            setLoading(false);
        }
    };

    const getModeDetails = (mode: JourneySegment['mode']) => {
        switch (mode) {
            case 'WALK':
                return { icon: Footprints, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Walk' };
            case 'SHARE_AUTO':
                return { icon: Truck, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Share Auto' };
            case 'AUTO':
                return { icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Auto' };
            case 'BUS':
                return { icon: Bus, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Bus' };
            case 'METRO':
                return { icon: Train, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Metro' };
            default:
                return { icon: Navigation, color: 'text-gray-400', bg: 'bg-gray-500/20', label: mode };
        }
    };

    const selectedJourney = journeys[selectedIndex];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 bg-white/5 rounded-xl">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                <span className="ml-3 text-gray-400">Planning your journey...</span>
            </div>
        );
    }

    if (!selectedJourney) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Journey Summary */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-4 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Your Journey</h3>
                        <p className="text-gray-400 text-sm">{origin.name} → {destination.name}</p>
                    </div>
                    <button
                        onClick={loadJourneys}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                        <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{selectedJourney.totalDuration}</p>
                        <p className="text-xs text-gray-500">min</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                        <IndianRupee className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">₹{selectedJourney.totalFare}</p>
                        <p className="text-xs text-gray-500">total</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                        <Navigation className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{selectedJourney.totalDistance.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">km</p>
                    </div>
                </div>

                {/* Journey Options */}
                {journeys.length > 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {journeys.map((journey, idx) => (
                            <button
                                key={journey.id}
                                onClick={() => {
                                    setSelectedIndex(idx);
                                    onJourneySelected?.(journey);
                                }}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${idx === selectedIndex
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                    }`}
                            >
                                Option {idx + 1} • ₹{journey.totalFare}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Journey Segments */}
            <div className="space-y-2">
                {selectedJourney.segments.map((segment, idx) => {
                    const modeDetails = getModeDetails(segment.mode);
                    const ModeIcon = modeDetails.icon;
                    const isExpanded = expanded === `${selectedJourney.id}-${idx}`;

                    return (
                        <div key={idx} className="relative">
                            {/* Connector Line */}
                            {idx > 0 && (
                                <div className="absolute left-6 -top-2 w-0.5 h-4 bg-gray-700" />
                            )}

                            <div
                                className={`bg-white/5 rounded-xl border transition-all ${isExpanded ? 'border-white/20' : 'border-transparent'
                                    }`}
                            >
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : `${selectedJourney.id}-${idx}`)}
                                    className="w-full p-4 flex items-center gap-4"
                                >
                                    {/* Mode Icon */}
                                    <div className={`p-3 rounded-xl ${modeDetails.bg}`}>
                                        <ModeIcon className={`w-6 h-6 ${modeDetails.color}`} />
                                    </div>

                                    {/* Segment Info */}
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{modeDetails.label}</span>
                                            {segment.details?.routeNumber && (
                                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">
                                                    {segment.details.routeNumber}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm">{segment.from.name}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right">
                                        <p className="text-white font-medium">{segment.duration} min</p>
                                        <p className="text-gray-400 text-sm">
                                            {segment.fare > 0 ? `₹${segment.fare}` : 'Free'}
                                        </p>
                                    </div>

                                    {/* Expand Arrow */}
                                    <ChevronRight
                                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''
                                            }`}
                                    />
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 space-y-3">
                                        <div className="h-px bg-gray-700" />

                                        {/* From/To */}
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                <div className="w-0.5 h-8 bg-gray-600" />
                                                <div className="w-3 h-3 rounded-full border-2 border-red-500" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500">From</p>
                                                    <p className="text-white text-sm">{segment.from.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">To</p>
                                                    <p className="text-white text-sm">{segment.to.name}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        {segment.details?.occupancy && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500">Expected crowd:</span>
                                                <span className={
                                                    segment.details.occupancy > 70 ? 'text-red-400' :
                                                        segment.details.occupancy > 40 ? 'text-yellow-400' :
                                                            'text-green-400'
                                                }>
                                                    {segment.details.occupancy}% full
                                                </span>
                                            </div>
                                        )}

                                        {/* Book Button for bookable segments */}
                                        {(segment.mode === 'SHARE_AUTO' || segment.mode === 'AUTO') && (
                                            <button
                                                onClick={() => onBookSegment?.(segment)}
                                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Book {modeDetails.label} • ₹{segment.fare}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Single Payment CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-bold">Pay Once, Travel All</p>
                        <p className="text-blue-200 text-sm">Single QR for entire journey</p>
                    </div>
                    <button
                        onClick={() => onJourneySelected?.(selectedJourney)}
                        className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors"
                    >
                        Book Journey • ₹{selectedJourney.totalFare}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JourneyPlanner;
