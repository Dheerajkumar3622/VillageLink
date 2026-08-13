/**
 * User App Entry Point - Consumer Application
 * Dedicated React root for the VillageLink Consumer experience
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import the User App Root (with auth handling)
import UserAppRoot from './components/UserAppRoot';
import { LanguageProvider } from './services/i18n';
import { initGlobalErrorReporter } from './utils/errorReporter';

// Initialize global error reporter
initGlobalErrorReporter();

// Global Fetch Interceptor for 401 Unauthorized and Offline Mutation Queuing
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const options = typeof args[0] === 'string' ? (args[1] || {}) : (args[0] as Request);
    const method = (options.method || 'GET').toUpperCase();

    try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            if (!url.includes('/login') && !url.includes('/register') && !url.includes('/forgot-password')) {
                localStorage.removeItem('villagelink_token');
                localStorage.removeItem('villagelink_user');
                window.location.reload();
            }
        }
        return response;
    } catch (error) {
        // Enqueue safe API updates when offline (eventual consistency)
        const isOffline = !navigator.onLine;
        const isSafeMutation = ['POST', 'PUT', 'DELETE'].includes(method) && 
                              (url.includes('/api/bugs') || url.includes('/api/market/shops'));

        if (isOffline && isSafeMutation) {
            console.warn(`📶 Offline. Enqueuing action: ${method} ${url}`);
            const body = options.body ? JSON.parse(options.body as string) : null;
            const headers = options.headers as Record<string, string>;
            const { enqueueAction } = await import('./utils/offlineQueue');
            enqueueAction(url, method, body, headers);
            
            return new Response(JSON.stringify({ 
                success: true, 
                _offlineQueued: true, 
                message: "Saved offline. Will sync when back online." 
            }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        throw error;
    }
};

// Sync queue handler
const runOfflineSync = async () => {
    try {
        const { processOfflineQueue } = await import('./utils/offlineQueue');
        await processOfflineQueue();
    } catch (e) {
        console.error('Offline queue sync error:', e);
    }
};

window.addEventListener('online', runOfflineSync);
if (navigator.onLine) {
    runOfflineSync();
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <LanguageProvider>
                <UserAppRoot />
            </LanguageProvider>
        </React.StrictMode>
    );
}
