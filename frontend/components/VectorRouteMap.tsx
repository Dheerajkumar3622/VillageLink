import React, { useEffect, useRef, useState, useMemo } from 'react';
import Map, { Source, Layer, Marker, ViewStateChangeEvent } from 'react-map-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { smoothCoordinate } from '../utils/interpolation';

// --- CONFIGURATION ---
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.dummy_mapbox_token_replace_me';

// --- INTERFACES ---
export interface Coordinate {
    lat: number;
    lng: number;
}

export interface DriverPosition extends Coordinate {
    heading?: number;
    speed?: number;
    isStationary?: boolean;
    vehicleType?: 'BUS' | 'AUTO' | 'CAR';
}

export interface LocationMarker extends Coordinate {
    name: string;
}

export interface VectorRouteMapProps {
    pathCoordinates?: Coordinate[];
    driverPosition?: DriverPosition | null;
    pickupLocation?: LocationMarker;
    dropoffLocation?: LocationMarker;
    intermediateStops?: LocationMarker[];
    height?: string | number;
    theme?: 'light' | 'dark';
    className?: string;
    interactive?: boolean; // Control if user can pan/zoom
}

// Ensure mapbox knows the token
const mapStyle = "mapbox://styles/mapbox/navigation-light-v11"; 

export const VectorRouteMap: React.FC<VectorRouteMapProps> = ({
    pathCoordinates = [],
    driverPosition = null,
    pickupLocation,
    dropoffLocation,
    intermediateStops = [],
    height = '300px',
    theme = 'light',
    className = '',
    interactive = true
}) => {
    // 1. Initial State Setup
    const [viewState, setViewState] = useState({
        longitude: 84.9913,
        latitude: 24.7913,
        zoom: 12,
        pitch: 0,
        bearing: 0
    });

    const mapRef = useRef<any>();
    const requestRef = useRef<number>();

    // 2. Smooth Interpolation State for Driver
    const [displayPos, setDisplayPos] = useState<DriverPosition | null>(driverPosition);
    const prevPosRef = useRef<DriverPosition | null>(driverPosition);

    useEffect(() => {
        if (!driverPosition) return;
        
        // Setup simple straight-line interpolation for smooth moving in UI
        if (!prevPosRef.current) {
            prevPosRef.current = driverPosition;
            setDisplayPos(driverPosition);
            return;
        }

        const startPos = prevPosRef.current;
        const endPos = driverPosition;
        const duration = 1000; // time between network sockets
        const start = performance.now();

        const animate = (time: number) => {
            let progress = (time - start) / duration;
            if (progress > 1) progress = 1;

            const smoothDist = smoothCoordinate(
                [startPos.lat, startPos.lng],
                [endPos.lat, endPos.lng],
                progress
            );
            
            // Simple Heading interpolation
            let rawHeadingDiff = (endPos.heading || 0) - (startPos.heading || 0);
            if (rawHeadingDiff > 180) rawHeadingDiff -= 360;
            if (rawHeadingDiff < -180) rawHeadingDiff += 360;
            const currentHeading = (startPos.heading || 0) + rawHeadingDiff * progress;

            setDisplayPos({
                lat: smoothDist[0],
                lng: smoothDist[1],
                heading: currentHeading,
                speed: endPos.speed,
                isStationary: endPos.isStationary,
                vehicleType: endPos.vehicleType
            });

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                prevPosRef.current = endPos;
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [driverPosition]);


    // 3. Convert path coordinates into GeoJSON for Mapbox Render
    const routeGeoJSON = useMemo(() => {
        if (!pathCoordinates || pathCoordinates.length < 2) return null;
        
        // Filter out undefined/null/NaN coordinates to prevent Mapbox GL crashes
        const validCoords = pathCoordinates
            .filter(c => typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng))
            .map(c => [c.lng, c.lat]);
            
        if (validCoords.length < 2) return null;
        
        return {
            type: 'Feature' as const,
            properties: {},
            geometry: {
                type: 'LineString' as const,
                coordinates: validCoords
            }
        };
    }, [pathCoordinates]);

    // 4. Auto-fit bounds logic
    useEffect(() => {
        if (!mapRef.current) return;
        
        const points = [];
        if (pathCoordinates && pathCoordinates.length > 0) points.push(...pathCoordinates);
        if (pickupLocation) points.push(pickupLocation);
        if (dropoffLocation) points.push(dropoffLocation);

        if (points.length >= 2) {
            const validPoints = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng));
            if (validPoints.length >= 2) {
                const line = turf.lineString(validPoints.map(p => [p.lng, p.lat]));
                const bbox = turf.bbox(line);
                mapRef.current.fitBounds(
                    [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
                    { padding: 40, duration: 1000 }
                );
            } else if (displayPos && typeof displayPos.lat === 'number' && !isNaN(displayPos.lat)) {
                mapRef.current.flyTo({
                    center: [displayPos.lng, displayPos.lat],
                    zoom: 14,
                    duration: 1000
                });
            }
        } else if (displayPos && typeof displayPos.lat === 'number' && !isNaN(displayPos.lat)) {
             mapRef.current.flyTo({
                center: [displayPos.lng, displayPos.lat],
                zoom: 14,
                duration: 1000
             })
        }
    }, [pathCoordinates, pickupLocation, dropoffLocation]);

    // Display rendering configuration
    const isReady = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'pk.dummy_mapbox_token_replace_me';

    return (
        <div style={{ height, width: '100%', position: 'relative' }} className={`rounded-xl overflow-hidden shadow-md ${className}`}>
             {!isReady && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 text-white p-4 text-center">
                    <span className="text-4xl mb-2">🗺️</span>
                    <h3 className="font-bold text-lg mb-1">Mapbox Not Configured</h3>
                    <p className="text-sm opacity-80 max-w-[250px]">
                        The system is using dummy variables. Once the real API key is ready, the 1000x map will automatically load here.
                    </p>
                </div>
            )}
            
            {isReady && (
                <Map
                    {...viewState}
                    ref={mapRef}
                    onMove={evt => setViewState(evt.viewState)}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={theme === 'dark' ? "mapbox://styles/mapbox/navigation-night-v1" : mapStyle}
                    scrollZoom={interactive}
                    dragPan={interactive}
                    dragRotate={interactive}
                    doubleClickZoom={interactive}
                >
                    {/* Render the polyline route */}
                    {routeGeoJSON && (
                        <Source type="geojson" data={routeGeoJSON}>
                            {/* Shadow/Border layer */}
                            <Layer 
                                id="route-line-bg" 
                                type="line" 
                                layout={{ "line-join": "round", "line-cap": "round" }}
                                paint={{ "line-color": "#1E40AF", "line-width": 8, "line-opacity": 0.3 }}
                            />
                            {/* Main Route Highlight */}
                            <Layer 
                                id="route-line-fg" 
                                type="line" 
                                layout={{ "line-join": "round", "line-cap": "round" }}
                                paint={{ "line-color": "#3B82F6", "line-width": 5 }}
                            />
                        </Source>
                    )}

                    {/* Pickup and Dropoff Markers */}
                    {pickupLocation && typeof pickupLocation.lat === 'number' && typeof pickupLocation.lng === 'number' && !isNaN(pickupLocation.lat) && (
                        <Marker longitude={pickupLocation.lng} latitude={pickupLocation.lat} anchor="bottom">
                            <div className="text-3xl filter drop-shadow-md">📍</div>
                        </Marker>
                    )}

                    {dropoffLocation && typeof dropoffLocation.lat === 'number' && typeof dropoffLocation.lng === 'number' && !isNaN(dropoffLocation.lat) && (
                        <Marker longitude={dropoffLocation.lng} latitude={dropoffLocation.lat} anchor="bottom">
                            <div className="text-3xl filter drop-shadow-md">🏁</div>
                        </Marker>
                    )}

                    {/* Gliding Driver Marker */}
                    {displayPos && typeof displayPos.lat === 'number' && typeof displayPos.lng === 'number' && !isNaN(displayPos.lat) && (
                        <Marker 
                            longitude={displayPos.lng} 
                            latitude={displayPos.lat} 
                            anchor="center"
                            style={{ zIndex: 10 }}
                        >
                            <div 
                                className="text-4xl filter drop-shadow-lg transition-transform"
                                style={{ 
                                    transform: `rotate(${displayPos.heading || 0}deg)`,
                                    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.5))'
                                }}
                            >
                                {displayPos.vehicleType === 'AUTO' ? '🛺' : displayPos.vehicleType === 'CAR' ? '🚗' : '🚗'}
                            </div>
                        </Marker>
                    )}
                </Map>
            )}
        </div>
    );
}

export default VectorRouteMap;
