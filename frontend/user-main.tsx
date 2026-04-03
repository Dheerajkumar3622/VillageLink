/**
 * User App Entry Point - Consumer Application
 * Dedicated React root for the VillageLink Consumer experience
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import the User App Root (with auth handling)
import UserAppRoot from './components/UserAppRoot';

// Global Fetch Interceptor for 401 Unauthorized (Invalid Token)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (!url.includes('/login') && !url.includes('/register') && !url.includes('/forgot-password')) {
            localStorage.removeItem('villagelink_token');
            localStorage.removeItem('villagelink_user');
            window.location.reload();
        }
    }
    return response;
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <UserAppRoot />
        </React.StrictMode>
    );
}
