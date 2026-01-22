/**
 * UserAppRoot - Consumer App Authentication Wrapper
 * Handles auth state and renders either UserAuthView or UserApp
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentUser, logoutUser, getAuthToken } from '../services/authService';
import { initSocketConnection } from '../services/transportService';
import { initializeGeoData } from '../constants';
import { ViewSkeleton } from './LoadingSkeleton';
import UserAuthView from './UserAuthView';
import UserApp from './UserApp';

const UserAppRoot: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [lang, setLang] = useState<'EN' | 'HI'>('EN');

    useEffect(() => {
        // Check auth state from localStorage
        const currentUser = getCurrentUser();
        const token = getAuthToken();

        if (currentUser && token) {
            // Only allow PASSENGER role in User App
            if (currentUser.role === 'PASSENGER' || !currentUser.role) {
                setUser(currentUser);
            } else {
                // Wrong app - redirect to provider
                window.location.href = '/provider.html';
                return;
            }
        }
        setIsInitialized(true);

        // Initialize services in background
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => {
                initializeGeoData();
                if (currentUser && token) {
                    initSocketConnection();
                }
            }, { timeout: 2000 });
        } else {
            setTimeout(() => {
                initializeGeoData();
                if (currentUser && token) {
                    initSocketConnection();
                }
            }, 100);
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
        return <UserAuthView onSuccess={handleLoginSuccess} lang={lang} />;
    }

    return <UserApp user={user} onLogout={handleLogout} lang={lang} />;
};

export default UserAppRoot;
