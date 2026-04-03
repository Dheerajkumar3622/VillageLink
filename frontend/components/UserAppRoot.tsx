/**
 * UserAppRoot - Consumer App Authentication Wrapper
 * Handles auth state and renders either UserAuthView or UserApp
 */

import React, { useState, useEffect } from 'react';
import { User } from '@villagelink/shared';
import { getCurrentUser, logoutUser, getAuthToken } from '../services/authService';
import { initSocketConnection } from '../services/transportService';
import { initializeGeoData } from '@villagelink/shared';
import { ViewSkeleton } from './LoadingSkeleton';
import UserAuthView from './UserAuthView';
import UserApp from './UserApp';

const UserAppRoot: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [lang, setLang] = useState<'EN' | 'HI'>('EN');
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('vl_theme');
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('vl_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('vl_theme', 'light');
        }
    }, [darkMode]);

    const toggleTheme = () => setDarkMode(prev => !prev);

    useEffect(() => {
        // Check auth state from localStorage
        const currentUser = getCurrentUser();
        const token = getAuthToken();

        if (currentUser && token) {
            // Only allow PASSENGER role in User App
            if (currentUser.role === 'PASSENGER' || !currentUser.role) {
                setUser(currentUser);
            } else {
                // Wrong session from Provider App - clear it and show User login
                // DO NOT redirect to provider.html (causes infinite loop on shared localStorage)
                localStorage.removeItem('villagelink_token');
                localStorage.removeItem('villagelink_user');
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
        if (u.role !== 'PASSENGER' && u.role !== undefined) {
            logoutUser();
            alert("Error: This account is registered as a Partner. Please use the Provider App.");
            return;
        }
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

    return <UserApp user={user} onLogout={handleLogout} lang={lang} darkMode={darkMode} toggleTheme={toggleTheme} />;
};

export default UserAppRoot;
