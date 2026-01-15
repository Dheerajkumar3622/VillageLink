
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { API_BASE_URL } from './config';
import { getCurrentUser } from './services/authService';

// --- GLOBAL ERROR REPORTER ---
const reportError = (message: string, stack: string, componentStack?: string) => {
  const user = getCurrentUser();
  // Use navigator.sendBeacon for reliable sending even if page unloads
  const payload = JSON.stringify({
    message,
    stackTrace: stack,
    componentStack,
    userId: user?.id || 'ANONYMOUS',
  });

  // Attempt standard fetch first, fallback to beacon
  fetch(`${API_BASE_URL}/api/bugs/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }).catch(() => {
    navigator.sendBeacon(`${API_BASE_URL}/api/bugs/report`, payload);
  });
};

window.onerror = (message, source, lineno, colno, error) => {
  reportError(message.toString(), error?.stack || `${source}:${lineno}:${colno}`);
};

window.onunhandledrejection = (event) => {
  reportError(`Unhandled Promise Rejection: ${event.reason}`, event.reason?.stack || '');
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
