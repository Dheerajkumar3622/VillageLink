
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { API_BASE_URL } from './config';
import { getCurrentUser } from './services/authService';
import { bootstrapOTA } from './src/OTABootstrap';
import { OTAService } from './src/OTAService';

import { initGlobalErrorReporter } from './utils/errorReporter';

// Initialize global error reporter
initGlobalErrorReporter();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

function main() {
  // 1. Mount React App IMMEDIATELY - never block on non-critical tasks
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // 2. Non-blocking: clean up old OTA tmp debris in background
  requestAnimationFrame(() => {
    bootstrapOTA().catch(() => {});
  });

  // 3. Check for updates in the background (Non-blocking)
  setTimeout(() => {
    OTAService.getInstance().checkForUpdate().catch(console.error);
  }, 8000);
}

main();

// PWA: only in production; dev + @vitejs/plugin-basic-ssl uses an untrusted cert and browsers block SW fetch/registration.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] SW registered:', reg.scope))
      .catch((err) => console.log('[PWA] SW failed:', err));
  });
}
