import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, RefreshCw, Radio, Ticket, Bus } from 'lucide-react';
import {
    findUpcomingVehiclesRest,
    bookSegmentRide,
    subscribeToDriverLive,
    unsubscribeFromDriverLive,
    onDriverLocationBroadcast,
    joinOrderRoom,
} from '../services/transportService';
import { User } from '@villagelink/shared';

type VehicleRow = {
    driverId: string;
    etaMinutes: number;
    segmentDistKm?: number;
    confidence?: number;
    etaWindow?: { min: number; max: number };
    meta?: { driverName?: string; vehicleType?: string };
};

export interface SegmentRidePanelProps {
    user: User;
    onBooked?: (orderId: string) => void;
    /** Synced from journey: first route stop or pickup village name */
    initialFromStop?: string;
    /** Synced from journey: last route stop or drop village name */
    initialToStop?: string;
    /** Match main journey card (PassengerView) instead of standalone green card */
    embedded?: boolean;
}

/**
 * Upcoming vehicles for a stop-to-stop segment (REST v1). Embedded in PassengerView journey flow.
 */
export const SegmentRidePanel: React.FC<SegmentRidePanelProps> = ({
    user,
    onBooked,
    initialFromStop = '',
    initialToStop = '',
    embedded = false,
}) => {
    const [fromStop, setFromStop] = useState(initialFromStop);
    const [toStop, setToStop] = useState(initialToStop);
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
    const [trackingId, setTrackingId] = useState<string | null>(null);
    const [lastSearch, setLastSearch] = useState(0);
    const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (initialFromStop) setFromStop(initialFromStop);
    }, [initialFromStop]);

    useEffect(() => {
        if (initialToStop) setToStop(initialToStop);
    }, [initialToStop]);

    const runSearch = useCallback(async () => {
        if (!fromStop.trim() || !toStop.trim()) return;
        setLoading(true);
        try {
            const data = await findUpcomingVehiclesRest(fromStop.trim(), toStop.trim(), 30);
            setVehicles((data?.vehicles || data?.data?.vehicles || []) as VehicleRow[]);
            setLastSearch(Date.now());
        } catch {
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }, [fromStop, toStop]);

    useEffect(() => {
        if (!fromStop.trim() || !toStop.trim() || lastSearch === 0) return;
        const id = setInterval(() => {
            findUpcomingVehiclesRest(fromStop.trim(), toStop.trim(), 30).then((data: any) => {
                setVehicles((data?.vehicles || []) as VehicleRow[]);
            }).catch(() => {});
        }, 25000);
        return () => clearInterval(id);
    }, [fromStop, toStop, lastSearch]);

    useEffect(() => {
        if (!trackingId) {
            setLivePos(null);
            return;
        }
        subscribeToDriverLive(trackingId);
        const unsub = onDriverLocationBroadcast((p) => {
            if (p.driverId === trackingId && p.lat != null && p.lng != null) {
                setLivePos({ lat: p.lat, lng: p.lng });
            }
        });
        return () => {
            unsub();
            unsubscribeFromDriverLive(trackingId);
        };
    }, [trackingId]);

    const handleBook = async (v: VehicleRow) => {
        if (!fromStop.trim() || !toStop.trim()) return;
        setBooking(v.driverId);
        try {
            const idem = `seg-${user.id}-${fromStop}-${toStop}-${v.driverId}-${Date.now()}`;
            const out = await bookSegmentRide({
                fromStop: fromStop.trim(),
                toStop: toStop.trim(),
                driverId: v.driverId,
                passengerCount: 1,
                paymentMethod: 'ONLINE',
                idempotencyKey: idem,
            });
            const orderId = out?.orderId || out?.ticket?.id;
            if (orderId) {
                joinOrderRoom(orderId);
                onBooked?.(orderId);
            }
        } catch (e: any) {
            alert(e?.message || 'Booking failed');
        } finally {
            setBooking(null);
        }
    };

    const shell = embedded
        ? 'mt-4 pt-4 border-t border-white/10 rounded-b-2xl'
        : 'mx-4 mb-6 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 shadow-lg';

    return (
        <div className={shell}>
            <div className={`flex items-center gap-2 mb-2 ${embedded ? 'px-0' : 'mb-3'}`}>
                <div className={`p-1.5 rounded-lg ${embedded ? 'bg-brand-500/20 text-brand-300' : 'bg-emerald-500/15 text-emerald-600'}`}>
                    <Bus className="w-4 h-4" />
                </div>
                <div>
                    <h3 className={`font-black tracking-tight ${embedded ? 'text-xs text-brand-200 uppercase' : 'text-slate-900 dark:text-white text-sm'}`}>
                        {embedded ? 'Live buses · this route' : 'Route segment · Live buses'}
                    </h3>
                    <p className={`${embedded ? 'text-[10px] text-slate-500' : 'text-[11px] text-slate-500'} leading-snug`}>
                        {embedded
                            ? 'Stops match driver route names. Search refreshes every ~25s after first run.'
                            : 'Boarding aur utarne wale stop ka naam likho (driver ke route ke stop names jaisa).'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                    <label className={`text-[10px] font-bold uppercase ${embedded ? 'text-slate-500' : 'text-slate-500'}`}>From stop</label>
                    <input
                        value={fromStop}
                        onChange={(e) => setFromStop(e.target.value)}
                        className={`w-full mt-1 px-3 py-2 rounded-xl border text-sm ${
                            embedded
                                ? 'border-white/10 bg-black/20 text-white placeholder:text-slate-500'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                        placeholder="Pickup stop"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">To stop</label>
                    <input
                        value={toStop}
                        onChange={(e) => setToStop(e.target.value)}
                        className={`w-full mt-1 px-3 py-2 rounded-xl border text-sm ${
                            embedded
                                ? 'border-white/10 bg-black/20 text-white placeholder:text-slate-500'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                        placeholder="Drop stop"
                    />
                </div>
            </div>
            <div className="flex gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => runSearch()}
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
                        embedded
                            ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Find live buses
                </button>
                <button
                    type="button"
                    onClick={() => runSearch()}
                    className={`px-3 rounded-xl border ${embedded ? 'border-white/15 text-brand-200' : 'border-slate-200 dark:border-slate-600'}`}
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {vehicles.length === 0 && lastSearch > 0 && (
                <p className={`text-xs mb-2 ${embedded ? 'text-amber-400/90' : 'text-amber-600 dark:text-amber-400'}`}>
                    No match — align stop names with the driver&apos;s route; driver must have started the trip.
                </p>
            )}

            <ul className="space-y-2">
                {vehicles.map((v) => (
                    <li
                        key={v.driverId}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl border ${
                            embedded
                                ? 'bg-black/25 border-white/10'
                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700'
                        }`}
                    >
                        <div>
                            <p className={`font-bold text-sm ${embedded ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                {v.meta?.driverName || 'Driver'} · {v.meta?.vehicleType || 'BUS'}
                            </p>
                            <p className={`text-[11px] ${embedded ? 'text-slate-400' : 'text-slate-500'}`}>
                                ~{v.etaMinutes} min · {v.segmentDistKm ?? '—'} km
                                {v.confidence != null ? ` · ${(v.confidence * 100).toFixed(0)}% match` : ''}
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setTrackingId(v.driverId);
                                    setLivePos(null);
                                }}
                                className={`text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1 ${
                                    trackingId === v.driverId
                                        ? embedded
                                            ? 'bg-brand-500 text-white'
                                            : 'bg-emerald-600 text-white'
                                        : embedded
                                          ? 'bg-white/10 text-white'
                                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                                }`}
                            >
                                <Radio className="w-3 h-3" /> Track
                            </button>
                            <button
                                type="button"
                                disabled={booking === v.driverId}
                                onClick={() => handleBook(v)}
                                className={`text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50 ${
                                    embedded
                                        ? 'bg-luxe-gold text-slate-900'
                                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                }`}
                            >
                                <Ticket className="w-3 h-3" /> Book
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {trackingId && (
                <div
                    className={`mt-3 p-3 rounded-2xl border text-[11px] ${
                        embedded
                            ? 'bg-brand-500/10 border-brand-500/25 text-brand-100'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                    }`}
                >
                    <strong>Tracking:</strong> …{trackingId.slice(-8)}
                    {livePos && (
                        <span className="block mt-1 font-mono">
                            {livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}
                        </span>
                    )}
                    {!livePos && <span className="block mt-1 opacity-80">Waiting for GPS…</span>}
                    {livePos && (
                        <a
                            className={`inline-block mt-2 underline ${embedded ? 'text-brand-200' : 'text-emerald-700 dark:text-emerald-300'}`}
                            href={`https://www.openstreetmap.org/?mlat=${livePos.lat}&mlon=${livePos.lng}#map=16/${livePos.lat}/${livePos.lng}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open map
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};
