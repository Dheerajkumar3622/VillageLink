
import React, { useEffect, useState, useRef } from 'react';
import { subscribeToUpdates, getActiveBuses } from '../services/transportService';
import { MapPin, Users, Bus, Clock, Map as MapIcon, Hourglass, AlertCircle, Wifi } from 'lucide-react';
import { BusState } from '@villagelink/shared';
import './LiveTracker.css';

interface LiveTrackerProps {
    desiredPath?: string[];
    layout?: 'VERTICAL' | 'HORIZONTAL';
    showHeader?: boolean;
    ticket?: any;
    onBidSuccess?: (ticketId: string, vehicleId: string, updatedPrice: number) => void;
}

export const LiveTracker: React.FC<LiveTrackerProps> = ({
    desiredPath,
    layout = 'VERTICAL',
    showHeader = true,
    ticket,
    onBidSuccess
}) => {
    const [buses, setBuses] = useState<BusState[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState([
        { id: 'VL-821', name: 'Bihar Rajya Transport', regNumber: 'BR-24P-8821', currentStopIndex: 1, capacity: 40, occupancy: 28, speed: 45, type: 'Bus' },
        { id: 'VL-432', name: 'Rohtas Cruiser', regNumber: 'BR-24J-4432', currentStopIndex: 2, capacity: 10, occupancy: 7, speed: 50, type: 'Jeep' },
        { id: 'VL-090', name: 'Mahadeva Express', regNumber: 'BR-24M-1090', currentStopIndex: 0, capacity: 32, occupancy: 12, speed: 40, type: 'Mini-Bus' }
    ]);

    useEffect(() => {
        if (layout !== 'HORIZONTAL') return;
        const interval = setInterval(() => {
            setVehicles(prev => prev.map(v => {
                const stopsCount = desiredPath ? desiredPath.length : 8;
                if (v.currentStopIndex < stopsCount - 1) {
                    const shouldMove = Math.random() > 0.4;
                    return {
                        ...v,
                        currentStopIndex: shouldMove ? v.currentStopIndex + 1 : v.currentStopIndex,
                        occupancy: Math.min(v.capacity, v.occupancy + (Math.random() > 0.8 ? 1 : 0))
                    };
                }
                return v;
            }));
        }, 12000);
        return () => clearInterval(interval);
    }, [desiredPath, layout]);

    const displayVehicles = React.useMemo(() => {
        if (ticket?.driverId) {
            const matchedSim = vehicles.find(v => v.id === ticket.driverId);
            if (matchedSim) return [matchedSim];
            return [{ id: ticket.driverId, name: 'Reserved Vehicle', regNumber: `BR-24-${ticket.driverId.slice(-4).toUpperCase()}`, currentStopIndex: 3, capacity: 40, occupancy: 30, speed: 45, type: 'Bus' }];
        }
        return vehicles;
    }, [vehicles, ticket?.driverId]);

    const [currentTime, setCurrentTime] = useState(new Date());
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            // Fill gauge
            const fillBars = containerRef.current.querySelectorAll('.fill-gauge-bar-container');
            fillBars.forEach(bar => {
                const p = bar.getAttribute('data-fill');
                if (p) (bar as HTMLElement).style.setProperty('--fill-percentage', p);
            });

            // Track progress
            const trackProgress = containerRef.current.querySelector('.track-progress-container');
            if (trackProgress) {
                const p = trackProgress.getAttribute('data-progress');
                if (p) (trackProgress as HTMLElement).style.setProperty('--progress', p);
            }

            // Vertical progress
            const verticalProgress = containerRef.current.querySelector('.vertical-track-container');
            if (verticalProgress) {
                const p = verticalProgress.getAttribute('data-progress');
                if (p) (verticalProgress as HTMLElement).style.setProperty('--vertical-progress', p);
            }
        }
    }, [buses, desiredPath]);

    useEffect(() => {
        setBuses(getActiveBuses());
        subscribeToUpdates(
            () => { },
            (updatedBuses) => {
                setBuses(updatedBuses);
            }
        );
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Filter Buses Logic
    const filteredBuses = React.useMemo(() => {
        if (!desiredPath || desiredPath.length < 2) return buses;
        const startLocation = desiredPath[0];
        const endLocation = desiredPath[desiredPath.length - 1];

        return buses.filter(bus => {
            if (!bus.activePath || bus.activePath.length === 0) return false;
            return bus.activePath.includes(startLocation) || bus.activePath.includes(endLocation);
        });
    }, [buses, desiredPath]);

    const activeBus = filteredBuses.length > 0 ? filteredBuses[0] : null;
    const displayStops = (desiredPath && desiredPath.length > 0) ? desiredPath : (activeBus?.activePath || []);

    if (displayStops.length === 0) {
        return (
            <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
                <Bus className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={32} />
                <p className="text-slate-500 text-sm">No active trip or route selected.</p>
                <p className="text-xs text-slate-400">Search for a village to see live status.</p>
            </div>
        );
    }

    // Determine current position index
    let currentStopIndex = 0;
    if (activeBus && activeBus.activePath) {
        const matchIndex = displayStops.findIndex(s => s === activeBus.activePath[activeBus.currentStopIndex]);
        currentStopIndex = matchIndex !== -1 ? matchIndex : 0;
    }

    // --- FILL-AND-FLY LOGIC (New Feature) ---
    // Calculates estimated departure based on fill rate (common Bihar private bus behavior)
    const getDepartureEstimation = (bus: BusState) => {
        const capacity = bus.capacity || 40; // Fallback capacity
        const occupancy = bus.occupancy || 0;
        const fillPercentage = (occupancy / capacity) * 100;

        // If moving, estimation is 0
        if (bus.telemetry && bus.telemetry.speed > 5) return { time: 0, status: 'MOVING', fillPercentage };

        // Calculate time based on remaining seats assuming 1 passenger per 2 mins (avg rural rate)
        const remainingSeats = capacity - occupancy;
        const estTime = Math.max(0, Math.ceil(remainingSeats * 1.5));

        // Status Logic
        let status = 'WAITING';
        if (fillPercentage > 90) status = 'DEPARTING_SOON';
        else if (fillPercentage > 50) status = 'BOARDING';
        else status = 'FILLING_UP';

        return { time: estTime, status, fillPercentage };
    };

    const departureInfo = activeBus ? getDepartureEstimation(activeBus) : null;

    // Calculate dynamic ETAs
    const getETA = (index: number) => {
        const diff = index - currentStopIndex;
        if (diff < 0) return "Departed";
        if (diff === 0) return "Arriving";

        // Add the "Waiting for fill" time to the travel time
        const waitPenalty = departureInfo && departureInfo.time > 0 ? departureInfo.time : 0;
        const travelTime = diff * 8;

        const mins = travelTime + waitPenalty;
        const etaTime = new Date(currentTime.getTime() + mins * 60000);
        return etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- HORIZONTAL LAYOUT (ACTIVE TRIP) ---
    if (layout === 'HORIZONTAL') {
        const progressPercent = (currentStopIndex / (displayStops.length - 1)) * 100;

        return (
            <div className="w-full relative">
                {showHeader && (
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${departureInfo?.status === 'MOVING' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                {departureInfo?.status === 'MOVING' ? 'En Route' : 'Boarding at Stand'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium"> towards <span className="text-slate-900 dark:text-white font-bold">{displayStops[displayStops.length - 1]}</span></p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-[10px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {activeBus ? `BUS-${activeBus.driverId.slice(-3)}` : 'Waiting...'}
                        </div>
                    </div>
                )}

                {/* NEW: FILL-AND-FLY GAUGE COMPACT */}
                {activeBus && departureInfo?.status !== 'MOVING' && (
                    <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-1">
                                    <Users size={12} className="text-amber-500" /> Fill Status
                                </span>
                                <span className={`text-xs font-bold ${departureInfo!.fillPercentage > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {activeBus.occupancy}/{activeBus.capacity}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden fill-gauge-bar-container"
                                data-fill={`${departureInfo!.fillPercentage}%`}>
                                <div
                                    className={`h-full relative fill-gauge-bar ${departureInfo!.fillPercentage > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                ></div>
                            </div>

                            <div className="mt-2 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Hourglass size={10} className="text-amber-500" />
                                    <span>Departing: <span className="font-bold text-slate-900 dark:text-white">~{departureInfo!.time}m</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative overflow-x-auto pb-4 scrollbar-hide pt-2" ref={scrollRef}>
                    <div className="min-w-[500px] px-2 relative" ref={containerRef}>
                        <div className="track-progress-container" data-progress={`${progressPercent}%`}>
                            {/* Connection Line Background */}
                            <div className="absolute top-2.5 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700 rounded-full"></div>

                            {/* Progress Line (Animated) */}
                            <div
                                className="absolute top-2.5 left-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full track-progress-bar"
                            ></div>

                            {/* Moving Vehicles Icons */}
                            {displayVehicles.map(v => {
                                const leftPercent = (v.currentStopIndex / (displayStops.length - 1)) * 100;
                                const isSelected = selectedVehicleId === v.id;
                                const isReserved = ticket?.driverId === v.id;

                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => {
                                            if (ticket?.driverId) return; // Prevent selection once reserved
                                            setSelectedVehicleId(isSelected ? null : v.id);
                                        }}
                                        className="absolute top-0 z-30 transition-all duration-500 hover:scale-110 active:scale-95 bus-icon-wrapper"
                                        style={{ left: `calc(${leftPercent}% - 14px)` }}
                                    >
                                        <div className={`text-white p-1 rounded-full shadow-lg border-2 flex items-center justify-center transition-all ${
                                            isSelected 
                                                ? 'bg-amber-500 border-white scale-125 ring-4 ring-amber-500/30' 
                                                : (isReserved ? 'bg-emerald-600 border-emerald-400 scale-110 shadow-glow-sm' : 'bg-slate-800 border-slate-700 hover:bg-slate-700')
                                        }`}>
                                            <Bus size={10} />
                                        </div>
                                        {/* Small Vehicle ID Badge */}
                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-black bg-black/70 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap border border-white/10">
                                            {v.regNumber.split('-')[2] || v.id}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* Stops */}
                            <div className="flex justify-between relative z-10 pt-1">
                                {displayStops.map((stop, index) => {
                                    const isPassed = index <= currentStopIndex;
                                    const isNext = index === currentStopIndex + 1;

                                    return (
                                        <div key={stop} className="flex flex-col items-center gap-2 w-20 text-center">
                                            <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${isPassed ? 'bg-emerald-600 border-emerald-600' : (isNext ? 'bg-white border-emerald-500 animate-pulse' : 'border-slate-500 bg-slate-700')}`}></div>
                                            <div>
                                                <p className="text-[10px] leading-tight font-bold" style={{color: isPassed ? '#ffffff' : '#94a3b8'}}>{stop}</p>
                                                <p className="text-[9px] font-mono mt-0.5" style={{color: '#94a3b8'}}>{index === 0 ? 'Start' : (isPassed ? <span style={{color: '#34d399'}}>Passed</span> : getETA(index))}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Bid Console */}
                {selectedVehicleId && !ticket?.driverId && (() => {
                    const v = displayVehicles.find(x => x.id === selectedVehicleId);
                    if (!v) return null;

                    const baseFare = ticket?.totalPrice || 145;
                    const boardingStopName = ticket?.from || displayStops[0];
                    const boardingIndex = displayStops.findIndex(s => s.toLowerCase() === boardingStopName.toLowerCase());
                    const vehicleIndex = v.currentStopIndex;
                    // Kiraya adds based on vehicle's current distance from boarding stop
                    const stopsDistance = Math.max(0, boardingIndex - vehicleIndex);
                    const extraFare = stopsDistance * 15; 
                    const finalPrice = baseFare + extraFare;

                    return (
                        <div className="mt-4 p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 animate-fade-in text-xs space-y-3 shadow-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-black text-white text-sm flex items-center gap-1.5">
                                        <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Bid Available</span>
                                        <span>{v.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({v.regNumber})</span>
                                    </h4>
                                    <p className="text-slate-400 text-[10px] mt-1 font-medium">
                                        Current Position: <span className="text-white font-bold">{displayStops[v.currentStopIndex]}</span> ({stopsDistance === 0 ? 'Arrived at your stop' : `${stopsDistance} stops away`})
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Seats Left</span>
                                    <span className="text-amber-400 font-bold text-sm">{v.capacity - v.occupancy} / {v.capacity} available</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                <div>
                                    <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wider">Bid / Reservation Fare</span>
                                    <span className="text-xl font-black text-white">₹{finalPrice}</span>
                                    <span className="text-[8px] text-slate-500 block mt-0.5">(Includes distance from vehicle's location: +₹{extraFare})</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onBidSuccess && ticket) {
                                            onBidSuccess(ticket.id, v.id, finalPrice);
                                            setSelectedVehicleId(null);
                                        }
                                    }}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
                                >
                                    Reserve Seat & Bid
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Bid Successful Locked Badge */}
                {ticket?.driverId && (
                    <div className="mt-4 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/25 text-center animate-fade-in animate-pulse">
                        <span className="text-emerald-400 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                            ✓ Seat Reserved on vehicle {ticket.driverId} (Platform Locked)
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // --- VERTICAL LAYOUT (DEFAULT) ---
    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-none md:rounded-3xl shadow-xl overflow-hidden relative min-h-[400px] border-t border-slate-200 dark:border-slate-800">

            {showHeader && (
                <div className="bg-brand-600 p-4 text-white flex justify-between items-center shadow-md z-20 relative">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            12802 - Bihar Rajya Transport
                        </h3>
                        <div className="flex items-center gap-3">
                            <p className="text-[9px] opacity-80 flex items-center gap-1 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded">
                                <Clock size={10} /> Live
                            </p>
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                                <Wifi size={10} /> Satellite Sync
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_theme('colors.emerald.400')]"></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white/20 rounded-full hover:bg-white/30" aria-label="View Map"><MapIcon size={18} /></button>
                    </div>
                </div>
            )}

            {/* NEW: BOARDING STATUS HEADER (VERTICAL) */}
            {activeBus && departureInfo?.status !== 'MOVING' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-b border-amber-100 dark:border-amber-800/50">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase">Bus is Waiting (Fill-and-Fly)</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {activeBus.occupancy}/{activeBus.capacity} Seats
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden fill-gauge-bar-container"
                        data-fill={`${departureInfo?.fillPercentage}%`}>
                        <div
                            className="h-full bg-amber-500 rounded-full fill-gauge-bar"
                        ></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                        Estimated Departure: <span className="font-bold text-slate-800 dark:text-white">~{departureInfo?.time} minutes</span> depending on passenger arrival.
                    </p>
                </div>
            )}

            {/* Arrival/Departure Columns Header */}
            <div className="flex bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <div className="w-16 py-2 text-center border-r border-slate-200 dark:border-slate-700">Arrival</div>
                <div className="flex-1 py-2 pl-4">Station / Halt</div>
                <div className="w-16 py-2 text-center border-l border-slate-200 dark:border-slate-700">Departure</div>
            </div>

            {/* Vertical Timeline Container */}
            <div className="relative pb-10 bg-slate-50 dark:bg-slate-950 h-[400px] overflow-y-auto" ref={containerRef}>

                <div className="vertical-track-container" data-progress={`${(currentStopIndex / Math.max(1, displayStops.length - 1)) * 100}%`}>
                    {/* The Vertical Guide Line */}
                    <div className="absolute top-0 bottom-0 left-[74px] w-1 bg-slate-300 dark:bg-slate-800 z-0"></div>

                    {/* The Active Blue Progress Line */}
                    <div
                        className="absolute top-0 left-[74px] w-1 bg-sky-500 z-0 vertical-track-line"
                    ></div>
                </div>

                {displayStops.map((stop, index) => {
                    const isPassed = index <= currentStopIndex;
                    const isCurrent = index === currentStopIndex;
                    const eta = getETA(index);
                    const isDeparted = index < currentStopIndex;

                    const distFromStart = index * 4 + 2;

                    return (
                        <div key={stop + index} className={`relative flex items-stretch min-h-[60px] ${isCurrent ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}>
                            <div className="w-16 flex flex-col items-center justify-center py-2 z-10 shrink-0">
                                <span className={`text-[10px] font-bold ${isDeparted ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {index === 0 ? 'Starts' : eta}
                                </span>
                                {isDeparted && <span className="text-[8px] text-green-600 font-bold">On Time</span>}
                            </div>

                            <div className="w-6 flex flex-col items-center justify-center relative z-10 shrink-0 -ml-3">
                                <div className={`
                            w-3 h-3 rounded-full border-2 shadow-sm flex items-center justify-center transition-all duration-500
                            ${isCurrent
                                        ? 'bg-sky-500 border-white ring-2 ring-sky-300 scale-125 animate-pulse'
                                        : isPassed
                                            ? 'bg-sky-500 border-white'
                                            : 'bg-white border-slate-400 dark:bg-slate-800 dark:border-slate-600'}
                        `}>
                                </div>
                            </div>

                            <div className="flex-1 pl-4 pr-2 py-3 flex flex-col justify-center border-b border-slate-100 dark:border-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <span className={`text-sm font-bold ${isPassed ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                                        {stop}
                                    </span>
                                    <span className={`text-xs w-16 text-center font-mono ${isDeparted ? 'text-slate-400' : 'text-sky-600 dark:text-sky-400'} font-bold`}>
                                        {isDeparted ? eta : (isCurrent ? 'Here' : '--')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] text-slate-400">{distFromStart} km</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
