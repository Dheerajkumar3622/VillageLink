/**
 * Provider App Entry Point - Service Provider Application
 * Dedicated React root for the VillageLink Partner experience
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import the Provider App Root (with auth handling)
import ProviderAppRoot from './components/ProviderAppRoot';
import { LanguageProvider } from './services/i18n';

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
            <LanguageProvider>
                <ProviderAppRoot />
            </LanguageProvider>
        </React.StrictMode>
    );
}

