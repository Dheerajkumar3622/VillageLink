/**
 * ProviderAppRoot - Service Provider App Authentication Wrapper
 * Handles auth state and renders either ProviderAuthView or ProviderApp
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentUser, logoutUser, getAuthToken } from '../services/authService';
import { initSocketConnection } from '../services/transportService';
import { ViewSkeleton } from './LoadingSkeleton';
import ProviderAuthView from './ProviderAuthView';
import ProviderApp from './ProviderApp';

const ProviderAppRoot: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Check auth state from localStorage
        const currentUser = getCurrentUser();
        const token = getAuthToken();

        if (currentUser && token) {
            // Only allow provider roles in Provider App
            const providerRoles = ['DRIVER', 'FARMER', 'VENDOR', 'SHOPKEEPER', 'MESS_MANAGER', 'FOOD_VENDOR', 'RESTAURANT_MANAGER', 'STORAGE_OPERATOR', 'LOGISTICS_PARTNER', 'VILLAGE_MANAGER'];
            if (currentUser.role && providerRoles.includes(currentUser.role)) {
                setUser(currentUser);
            } else if (currentUser.role === 'PASSENGER') {
                // Wrong app - redirect to user app
                window.location.href = '/user.html';
                return;
            } else {
                // Unknown role, allow in provider app (for role registration)
                setUser(currentUser);
            }
        }
        setIsInitialized(true);

        // Initialize socket in background
        if (currentUser && token) {
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => initSocketConnection(), { timeout: 1000 });
            } else {
                setTimeout(() => initSocketConnection(), 100);
            }
        }
    }, []);

    const handleLoginSuccess = (u: User) => {
        setUser(u);
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => initSocketConnection(), { timeout: 1000 });
        } else {
            setTimeout(() => initSocketConnection(), 100);
        }
    };

    const handleLogout = () => {
        logoutUser();
        setUser(null);
    };

    if (!isInitialized) {
        return <ViewSkeleton />;
    }

    if (!user) {
        return <ProviderAuthView onSuccess={handleLoginSuccess} />;
    }

    return <ProviderApp user={user} onLogout={handleLogout} />;
};

export default ProviderAppRoot;
