/**
 * RouteMap Component v2.0
 * Interactive Leaflet-based map with traffic-aware polylines,
 * animated driver markers, ETA bubbles, and real-time tracking
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- CUSTOM ICONS ---

const createIcon = (emoji: string, size: number = 32) => {
    return L.divIcon({
        html: `<div style="font-size: ${size}px; line-height: 1;">${emoji}</div>`,
        className: 'custom-div-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
};

const pickupIcon = createIcon('📍', 36);
const dropoffIcon = createIcon('🏁', 36);
const stopIcon = createIcon('⚪', 16);

// Enhanced rotating vehicle icon with pulse effect
const createVehicleIcon = (heading: number, vehicleType: 'BUS' | 'AUTO' | 'CAR' = 'BUS', isMoving: boolean = true) => {
    const emoji = vehicleType === 'BUS' ? '🚌' : vehicleType === 'AUTO' ? '🛺' : '🚗';
    const pulseClass = isMoving ? 'animate-pulse' : '';

    return L.divIcon({
        html: `
            <div class="driver-marker-container">
                <div class="driver-marker ${pulseClass}" style="transform: rotate(${heading - 90}deg);">
                    <span style="font-size: 36px;">${emoji}</span>
                </div>
            </div>
        `,
        className: 'custom-driver-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24]
    });
};

// Driver icon with ETA bubble
const createDriverIconWithETA = (heading: number, etaMinutes: number | null, vehicleType: 'BUS' | 'AUTO' | 'CAR' = 'BUS') => {
    const emoji = vehicleType === 'BUS' ? '🚌' : vehicleType === 'AUTO' ? '🛺' : '🚗';
    const etaBubble = etaMinutes !== null && etaMinutes >= 0
        ? `<div class="eta-bubble">${etaMinutes} min</div>`
        : '';

    return L.divIcon({
        html: `
            <div class="driver-marker-container">
                ${etaBubble}
                <div class="driver-marker" style="transform: rotate(${heading - 90}deg);">
                    <span style="font-size: 36px;">${emoji}</span>
                </div>
            </div>
        `,
        className: 'custom-driver-icon',
        iconSize: [48, 60],
        iconAnchor: [24, 36],
        popupAnchor: [0, -36]
    });
};

// --- INTERFACES ---

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface LocationMarker extends Coordinate {
    name: string;
}

export interface DriverPosition extends Coordinate {
    heading?: number;
    speed?: number;
    isStationary?: boolean;
    vehicleType?: 'BUS' | 'AUTO' | 'CAR';
}

export interface TrafficSegment {
    start: Coordinate;
    end: Coordinate;
    congestionLevel: 'FREE' | 'SLOW' | 'HEAVY' | 'JAM';
    speedKmh?: number;
}

export interface RouteMapProps {
    pathCoordinates?: Coordinate[];
    driverPosition?: DriverPosition | null;
    pickupLocation?: LocationMarker;
    dropoffLocation?: LocationMarker;
    intermediateStops?: LocationMarker[];
    trafficSegments?: TrafficSegment[];
    showTraffic?: boolean;
    etaMinutes?: number | null;
    height?: string | number;
    showControls?: boolean;
    onMapReady?: () => void;
    className?: string;
    theme?: 'light' | 'dark';
    showAccuracyCircle?: boolean;
    accuracyMeters?: number;
}

// --- TRAFFIC COLORS ---

const trafficColors: Record<TrafficSegment['congestionLevel'], string> = {
    FREE: '#22C55E',    // Green
    SLOW: '#F59E0B',    // Yellow/Amber
    HEAVY: '#F97316',   // Orange
    JAM: '#EF4444'      // Red
};

// --- MAP CONTROLLER COMPONENT ---

const MapController: React.FC<{
    pathCoordinates?: Coordinate[];
    pickupLocation?: LocationMarker;
    dropoffLocation?: LocationMarker;
    driverPosition?: DriverPosition | null;
}> = ({ pathCoordinates, pickupLocation, dropoffLocation, driverPosition }) => {
    const map = useMap();

    useEffect(() => {
        // Collect all points to fit
        const points: Coordinate[] = [];

        if (pathCoordinates && pathCoordinates.length > 0) {
            points.push(...pathCoordinates);
        }
        if (pickupLocation) points.push(pickupLocation);
        if (dropoffLocation) points.push(dropoffLocation);
        if (driverPosition) points.push(driverPosition);

        if (points.length >= 2) {
            const bounds = L.latLngBounds(
                points.map(c => [c.lat, c.lng] as L.LatLngTuple)
            );
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        } else if (points.length === 1) {
            map.setView([points[0].lat, points[0].lng], 14);
        }
    }, [map, pathCoordinates, pickupLocation, dropoffLocation, driverPosition]);

    return null;
};

// --- ANIMATED DRIVER MARKER ---

const AnimatedDriverMarker: React.FC<{
    position: DriverPosition;
    etaMinutes?: number | null;
    showAccuracyCircle?: boolean;
    accuracyMeters?: number;
}> = ({ position, etaMinutes, showAccuracyCircle, accuracyMeters = 50 }) => {
    const [displayPos, setDisplayPos] = useState<DriverPosition>(position);
    const prevPosRef = useRef<DriverPosition>(position);
    const animationRef = useRef<number>();

    useEffect(() => {
        // Cancel any running animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const startPos = prevPosRef.current;
        const endPos = position;
        const duration = 500; // Animation duration in ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out interpolation
            const eased = 1 - Math.pow(1 - progress, 3);

            const interpolatedPos: DriverPosition = {
                lat: startPos.lat + (endPos.lat - startPos.lat) * eased,
                lng: startPos.lng + (endPos.lng - startPos.lng) * eased,
                heading: interpolateAngle(startPos.heading || 0, endPos.heading || 0, eased),
                speed: endPos.speed,
                isStationary: endPos.isStationary,
                vehicleType: endPos.vehicleType
            };

            setDisplayPos(interpolatedPos);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                prevPosRef.current = endPos;
            }
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [position]);

    const icon = etaMinutes !== undefined
        ? createDriverIconWithETA(displayPos.heading || 0, etaMinutes, displayPos.vehicleType)
        : createVehicleIcon(displayPos.heading || 0, displayPos.vehicleType, !displayPos.isStationary);

    return (
        <>
            {showAccuracyCircle && (
                <Circle
                    center={[displayPos.lat, displayPos.lng]}
                    radius={accuracyMeters}
                    pathOptions={{
                        color: '#3B82F6',
                        fillColor: '#3B82F6',
                        fillOpacity: 0.1,
                        weight: 1
                    }}
                />
            )}
            <Marker
                position={[displayPos.lat, displayPos.lng]}
                icon={icon}
            >
                <Popup>
                    <div className="text-sm">
                        <strong>🚌 Driver Location</strong>
                        <br />
                        {displayPos.speed !== undefined && displayPos.speed !== null && (
                            <span>Speed: {Math.round(displayPos.speed)} km/h</span>
                        )}
                        {displayPos.isStationary && <span className="text-amber-600 block">⏸️ Stationary</span>}
                        {etaMinutes !== null && etaMinutes !== undefined && (
                            <span className="text-blue-600 block font-bold">ETA: {etaMinutes} min</span>
                        )}
                    </div>
                </Popup>
            </Marker>
        </>
    );
};

// Helper to interpolate angles correctly (handling 360° wrap)
const interpolateAngle = (start: number, end: number, progress: number): number => {
    let diff = end - start;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (start + diff * progress + 360) % 360;
};

// --- TRAFFIC-AWARE POLYLINE ---

const TrafficPolyline: React.FC<{
    coordinates: Coordinate[];
    trafficSegments?: TrafficSegment[];
}> = ({ coordinates, trafficSegments }) => {
    const segments = useMemo(() => {
        if (!trafficSegments || trafficSegments.length === 0) {
            // No traffic data - render single polyline
            return null;
        }

        // Match coordinates to traffic segments
        return trafficSegments.map((segment, idx) => ({
            positions: [[segment.start.lat, segment.start.lng], [segment.end.lat, segment.end.lng]] as [number, number][],
            color: trafficColors[segment.congestionLevel],
            congestionLevel: segment.congestionLevel
        }));
    }, [trafficSegments]);

    if (!segments) {
        // Default polyline with gradient effect
        const positions: [number, number][] = coordinates.map(c => [c.lat, c.lng]);
        return (
            <>
                {/* Background shadow */}
                <Polyline
                    positions={positions}
                    pathOptions={{
                        color: '#1E40AF',
                        weight: 8,
                        opacity: 0.3,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                />
                {/* Main route */}
                <Polyline
                    positions={positions}
                    pathOptions={{
                        color: '#3B82F6',
                        weight: 5,
                        opacity: 0.9,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                />
            </>
        );
    }

    return (
        <>
            {segments.map((seg, idx) => (
                <Polyline
                    key={`traffic-${idx}`}
                    positions={seg.positions}
                    pathOptions={{
                        color: seg.color,
                        weight: 6,
                        opacity: 0.9,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                />
            ))}
        </>
    );
};

// --- MAIN COMPONENT ---

export const RouteMap: React.FC<RouteMapProps> = ({
    pathCoordinates = [],
    driverPosition = null,
    pickupLocation,
    dropoffLocation,
    intermediateStops = [],
    trafficSegments,
    showTraffic = false,
    etaMinutes,
    height = '300px',
    showControls = true,
    onMapReady,
    className = '',
    theme = 'light',
    showAccuracyCircle = false,
    accuracyMeters = 50
}) => {
    const [mapReady, setMapReady] = useState(false);

    // Default center (Bihar, India)
    const defaultCenter: [number, number] = [24.7913, 84.9913];

    // Calculate center from locations
    const center: [number, number] = driverPosition
        ? [driverPosition.lat, driverPosition.lng]
        : pickupLocation
            ? [pickupLocation.lat, pickupLocation.lng]
            : pathCoordinates.length > 0
                ? [pathCoordinates[0].lat, pathCoordinates[0].lng]
                : defaultCenter;

    useEffect(() => {
        if (mapReady && onMapReady) {
            onMapReady();
        }
    }, [mapReady, onMapReady]);

    // Tile layer based on theme
    const tileUrl = theme === 'dark'
        ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return (
        <div
            className={`rounded-2xl overflow-hidden shadow-lg relative isolate ${className}`}
            style={{ height, width: '100%', zIndex: 0 }}
        >
            {/* CSS for animations */}
            <style>{`
                .driver-marker-container {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .driver-marker {
                    transition: transform 0.3s ease-out;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }
                .eta-bubble {
                    position: absolute;
                    top: -28px;
                    background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
                    animation: bounce 2s infinite;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .custom-driver-icon {
                    background: transparent !important;
                    border: none !important;
                }
                .custom-div-icon {
                    background: transparent !important;
                    border: none !important;
                }
                /* Fix Leaflet z-index to prevent modal overlap */
                .leaflet-pane,
                .leaflet-control-container {
                    z-index: 1 !important;
                }
                .leaflet-control-zoom {
                    z-index: 2 !important;
                }
            `}</style>

            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={showControls}
                dragging={showControls}
                zoomControl={showControls}
                attributionControl={false}
                whenReady={() => setMapReady(true)}
            >
                {/* Map Tiles */}
                <TileLayer
                    url={tileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Map Controller for auto-fitting bounds */}
                <MapController
                    pathCoordinates={pathCoordinates}
                    pickupLocation={pickupLocation}
                    dropoffLocation={dropoffLocation}
                    driverPosition={driverPosition}
                />

                {/* Route Polyline (with optional traffic coloring) */}
                {pathCoordinates.length > 1 && (
                    <TrafficPolyline
                        coordinates={pathCoordinates}
                        trafficSegments={showTraffic ? trafficSegments : undefined}
                    />
                )}

                {/* Pickup Marker */}
                {pickupLocation && (
                    <Marker
                        position={[pickupLocation.lat, pickupLocation.lng]}
                        icon={pickupIcon}
                    >
                        <Popup>
                            <strong>📍 Pickup</strong>
                            <br />
                            {pickupLocation.name}
                        </Popup>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                {dropoffLocation && (
                    <Marker
                        position={[dropoffLocation.lat, dropoffLocation.lng]}
                        icon={dropoffIcon}
                    >
                        <Popup>
                            <strong>🏁 Destination</strong>
                            <br />
                            {dropoffLocation.name}
                        </Popup>
                    </Marker>
                )}

                {/* Intermediate Stops */}
                {intermediateStops.map((stop, index) => (
                    <Marker
                        key={`stop-${index}`}
                        position={[stop.lat, stop.lng]}
                        icon={stopIcon}
                    >
                        <Popup>{stop.name}</Popup>
                    </Marker>
                ))}

                {/* Driver Position (Animated) */}
                {driverPosition && (
                    <AnimatedDriverMarker
                        position={driverPosition}
                        etaMinutes={etaMinutes}
                        showAccuracyCircle={showAccuracyCircle}
                        accuracyMeters={accuracyMeters}
                    />
                )}
            </MapContainer>

            {/* Traffic Legend */}
            {showTraffic && trafficSegments && trafficSegments.length > 0 && (
                <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-800/90 rounded-lg p-2 text-xs z-[1000] shadow-lg">
                    <div className="font-bold mb-1">Traffic</div>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#22C55E' }}></span>Clear</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#F59E0B' }}></span>Slow</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#EF4444' }}></span>Heavy</span>
                    </div>
                </div>
            )}

            {/* OSM Attribution */}
            <div className="absolute bottom-1 right-1 bg-white/80 dark:bg-black/80 text-[8px] px-1 rounded pointer-events-none text-slate-500 z-[1000]">
                © OpenStreetMap
            </div>
        </div>
    );
};

// --- MINI MAP COMPONENT ---

export const MiniRouteMap: React.FC<{
    from: Coordinate;
    to: Coordinate;
    pathCoordinates?: Coordinate[];
    driverPosition?: DriverPosition | null;
}> = ({ from, to, pathCoordinates, driverPosition }) => {
    return (
        <RouteMap
            pickupLocation={{ ...from, name: 'Start' }}
            dropoffLocation={{ ...to, name: 'End' }}
            pathCoordinates={pathCoordinates}
            driverPosition={driverPosition}
            height="120px"
            showControls={false}
            className="opacity-90"
        />
    );
};

// --- FULL SCREEN MAP FOR ACTIVE TRIPS ---

export const FullTripMap: React.FC<{
    pickupLocation: LocationMarker;
    dropoffLocation: LocationMarker;
    pathCoordinates: Coordinate[];
    driverPosition: DriverPosition | null;
    etaMinutes: number | null;
    trafficSegments?: TrafficSegment[];
    showTraffic?: boolean;
}> = (props) => {
    return (
        <RouteMap
            {...props}
            height="100%"
            showControls={true}
            showAccuracyCircle={true}
            accuracyMeters={30}
            className="rounded-none"
        />
    );
};

export default RouteMap;
