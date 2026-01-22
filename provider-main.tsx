/**
 * Provider App Entry Point - Service Provider Application
 * Dedicated React root for the VillageLink Partner experience
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import the Provider App Root (with auth handling)
import ProviderAppRoot from './components/ProviderAppRoot';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ProviderAppRoot />
        </React.StrictMode>
    );
}
