import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AdminAppRoot from './components/AdminAppRoot';
import { LanguageProvider } from './services/i18n';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <LanguageProvider>
                <AdminAppRoot />
            </LanguageProvider>
        </React.StrictMode>
    );
}
