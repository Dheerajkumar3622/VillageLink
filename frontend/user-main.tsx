/**
 * User App Entry Point - Consumer Application
 * Dedicated React root for the VillageLink Consumer experience
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import the User App Root (with auth handling)
import UserAppRoot from './components/UserAppRoot';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <UserAppRoot />
        </React.StrictMode>
    );
}
