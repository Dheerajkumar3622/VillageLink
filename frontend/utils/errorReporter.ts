import { API_BASE_URL } from '../config';
import { getCurrentUser } from '../services/authService';

export const reportError = (message: string, stack: string, componentStack?: string) => {
  const user = getCurrentUser();
  const payload = JSON.stringify({
    message,
    stackTrace: stack,
    componentStack,
    userId: user?.id || 'ANONYMOUS',
  });

  fetch(`${API_BASE_URL}/api/bugs/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }).catch(() => {
    navigator.sendBeacon(`${API_BASE_URL}/api/bugs/report`, payload);
  });
};

export const initGlobalErrorReporter = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(message.toString(), error?.stack || `${source}:${lineno}:${colno}`);
  };

  window.onunhandledrejection = (event) => {
    reportError(`Unhandled Promise Rejection: ${event.reason}`, event.reason?.stack || '');
  };
};
