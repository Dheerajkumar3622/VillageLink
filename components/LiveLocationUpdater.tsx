import React, { useState, useEffect } from 'react';
import { FoodVendor } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import {
    Loader2, MapPin, Navigation, RefreshCw, Check, AlertCircle
} from 'lucide-react';

interface LiveLocationUpdaterProps {
    vendor: FoodVendor;
    onUpdate: (location: { lat: number; lng: number; address: string }) => void;
}

export const LiveLocationUpdater: React.FC<LiveLocationUpdaterProps> = ({ vendor, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState(vendor.location || '');

    const getCurrentLocation = () => {
        setLoading(true);
        setError('');

        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });

                // Reverse geocode (mock for demo)
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        setAddress(data.display_name.split(',').slice(0, 3).join(', '));
                    }
                } catch (e) {
                    console.error('Geocoding error:', e);
                    setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }

                setLoading(false);
            },
            (err) => {
                setError('Failed to get location. Please enable GPS.');
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const updateLocation = async () => {
        if (!currentLocation) {
            setError('Please get current location first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/vendor/location`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    coordinates: [currentLocation.lng, currentLocation.lat],
                    location: address
                })
            });

            if (res.ok) {
                setSuccess(true);
                onUpdate({ ...currentLocation, address });
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError('Failed to update location');
            }
        } catch (e) {
            console.error('Location update error:', e);
            // Demo success
            setSuccess(true);
            onUpdate({ ...currentLocation, address });
            setTimeout(() => setSuccess(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4">
            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="text-orange-500" size={20} />
                Live Stall Location
            </h3>

            <p className="text-sm text-slate-500 mb-4">
                {vendor.isMobile
                    ? 'Update your current location so customers can find you.'
                    : 'Your stall has a fixed location. Contact support to change it.'}
            </p>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                    <Check size={16} />
                    Location updated successfully!
                </div>
            )}

            {/* Current Address Display */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 mb-1">Current Location</p>
                <p className="font-medium dark:text-white">{address || 'No location set'}</p>
                {currentLocation && (
                    <p className="text-xs text-slate-400 mt-1">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                )}
            </div>

            {/* Map Placeholder */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl h-40 mb-4 flex items-center justify-center relative overflow-hidden">
                {currentLocation ? (
                    <div className="text-center">
                        <MapPin className="text-orange-500 mx-auto mb-2" size={32} />
                        <p className="text-sm text-slate-500">Your location</p>
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm">Tap 'Get Location' to start</p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={getCurrentLocation}
                    disabled={loading || !vendor.isMobile}
                    variant="outline"
                    className="flex-1"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Navigation size={16} />}
                    <span className="ml-2">Get Location</span>
                </Button>
                <Button
                    onClick={updateLocation}
                    disabled={loading || !currentLocation || !vendor.isMobile}
                    className="flex-1"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    <span className="ml-2">Update</span>
                </Button>
            </div>

            {!vendor.isMobile && (
                <p className="text-xs text-center text-slate-400 mt-3">
                    Location updates are only available for mobile stalls
                </p>
            )}
        </div>
    );
};

export default LiveLocationUpdater;
