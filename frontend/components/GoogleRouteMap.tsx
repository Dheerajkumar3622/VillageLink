import React, { useEffect, useRef, useState } from 'react';

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

export interface GoogleRouteMapProps {
    pathCoordinates?: Coordinate[];
    driverPosition?: DriverPosition | null;
    pickupLocation?: LocationMarker;
    dropoffLocation?: LocationMarker;
    intermediateStops?: LocationMarker[];
    height?: string | number;
    theme?: 'light' | 'dark';
    className?: string;
    interactive?: boolean;
    showControls?: boolean;
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Beautiful premium custom dark cyberpunk style for Google Maps
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f472b6" }]
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#38bdf8" }]
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#022c22" }]
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#4ade80" }]
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1e293b" }]
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#334155" }]
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#94a3b8" }]
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#0f172a" }]
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#334155" }, { weight: 2 }]
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#cbd5e1" }]
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#1e293b" }]
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f43f5e" }]
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0c4a6e" }]
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0284c7" }]
    }
];

export const GoogleRouteMap: React.FC<GoogleRouteMapProps> = ({
    pathCoordinates = [],
    driverPosition = null,
    pickupLocation,
    dropoffLocation,
    intermediateStops = [],
    height = '300px',
    theme = 'dark',
    className = '',
    interactive = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const pickupMarkerRef = useRef<any>(null);
    const dropoffMarkerRef = useRef<any>(null);
    const driverMarkerRef = useRef<any>(null);
    const intermediateMarkersRef = useRef<any[]>([]);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    // Dynamically load Google Maps script if not loaded
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
            setScriptLoaded(true);
            return;
        }

        const scriptId = 'google-maps-script-loader';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initGoogleMapsCallback`;
            script.async = true;
            script.defer = true;

            (window as any).initGoogleMapsCallback = () => {
                setScriptLoaded(true);
            };

            document.head.appendChild(script);
        } else {
            // Script tag exists, wait if not finished
            const checkInterval = setInterval(() => {
                if ((window as any).google && (window as any).google.maps) {
                    setScriptLoaded(true);
                    clearInterval(checkInterval);
                }
            }, 100);
            return () => clearInterval(checkInterval);
        }
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!scriptLoaded || !containerRef.current || mapRef.current) return;

        const defaultCenter = { lat: 24.87, lng: 84.18 }; // Default Nauhatta coordinates
        const maps = (window as any).google.maps;

        const mapOptions = {
            center: defaultCenter,
            zoom: 11,
            styles: theme === 'dark' ? darkMapStyle : [],
            disableDefaultUI: !interactive,
            gestureHandling: interactive ? 'cooperative' : 'none',
            zoomControl: interactive,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false
        };

        mapRef.current = new maps.Map(containerRef.current, mapOptions);
    }, [scriptLoaded, theme, interactive]);

    // Update Route Polyline & Markers
    useEffect(() => {
        if (!mapRef.current) return;
        const maps = (window as any).google.maps;

        // --- 1. Draw Route Polyline ---
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }

        if (pathCoordinates.length > 0) {
            const path = pathCoordinates.map(coord => ({ lat: coord.lat, lng: coord.lng }));
            polylineRef.current = new maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#38bdf8', // Neon Sky Blue
                strokeOpacity: 0.9,
                strokeWeight: 5,
                map: mapRef.current
            });

            // Auto fit bounds
            const bounds = new maps.LatLngBounds();
            path.forEach(pt => bounds.extend(pt));
            mapRef.current.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
        }

        // --- 2. Pickup Marker ---
        if (pickupMarkerRef.current) {
            pickupMarkerRef.current.setMap(null);
        }
        if (pickupLocation && typeof pickupLocation.lat === 'number' && !isNaN(pickupLocation.lat)) {
            pickupMarkerRef.current = new maps.Marker({
                position: { lat: pickupLocation.lat, lng: pickupLocation.lng },
                map: mapRef.current,
                title: pickupLocation.name || 'Pickup',
                label: {
                    text: 'P',
                    color: '#ffffff',
                    fontWeight: 'bold'
                },
                icon: {
                    path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#10b981', // green
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                }
            });
        }

        // --- 3. Dropoff Marker ---
        if (dropoffMarkerRef.current) {
            dropoffMarkerRef.current.setMap(null);
        }
        if (dropoffLocation && typeof dropoffLocation.lat === 'number' && !isNaN(dropoffLocation.lat)) {
            dropoffMarkerRef.current = new maps.Marker({
                position: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
                map: mapRef.current,
                title: dropoffLocation.name || 'Dropoff',
                label: {
                    text: 'D',
                    color: '#ffffff',
                    fontWeight: 'bold'
                },
                icon: {
                    path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#ef4444', // red
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                }
            });
        }

        // --- 4. Intermediate Stops Markers ---
        intermediateMarkersRef.current.forEach(m => m.setMap(null));
        intermediateMarkersRef.current = [];

        if (intermediateStops.length > 0) {
            intermediateStops.forEach(stop => {
                if (typeof stop.lat === 'number' && !isNaN(stop.lat)) {
                    const marker = new maps.Marker({
                        position: { lat: stop.lat, lng: stop.lng },
                        map: mapRef.current,
                        title: stop.name,
                        icon: {
                            path: maps.SymbolPath.CIRCLE,
                            scale: 5,
                            fillColor: '#eab308', // Yellow stop circles
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 1.5
                        }
                    });
                    intermediateMarkersRef.current.push(marker);
                }
            });
        }

    }, [pathCoordinates, pickupLocation, dropoffLocation, intermediateStops]);

    // Update Driver Position Marker
    useEffect(() => {
        if (!mapRef.current) return;
        const maps = (window as any).google.maps;

        if (driverMarkerRef.current) {
            driverMarkerRef.current.setMap(null);
            driverMarkerRef.current = null;
        }

        if (driverPosition && typeof driverPosition.lat === 'number' && !isNaN(driverPosition.lat)) {
            let markerLabel = '🚗';
            if (driverPosition.vehicleType === 'BUS') markerLabel = '🚌';
            if (driverPosition.vehicleType === 'AUTO') markerLabel = '🛺';

            driverMarkerRef.current = new maps.Marker({
                position: { lat: driverPosition.lat, lng: driverPosition.lng },
                map: mapRef.current,
                title: 'Driver Location',
                label: {
                    text: markerLabel,
                    fontSize: '18px'
                },
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#f43f5e', // Glowing rose circle behind emoji
                    fillOpacity: 0.2,
                    strokeColor: '#f43f5e',
                    strokeWeight: 2
                }
            });

            // Center camera if active
            mapRef.current.panTo({ lat: driverPosition.lat, lng: driverPosition.lng });
        }
    }, [driverPosition]);

    return (
        <div style={{ height, width: '100%', position: 'relative' }} className={`rounded-xl overflow-hidden shadow-md ${className}`}>
            {!scriptLoaded && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400 mb-3"></div>
                    <p className="text-sm opacity-80">Loading Premium Map Engine...</p>
                </div>
            )}
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};
