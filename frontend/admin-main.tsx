import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AdminAppRoot from './components/AdminAppRoot';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <AdminAppRoot />
        </React.StrictMode>
    );
}
