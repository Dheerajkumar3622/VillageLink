/**
 * Error Reporting Service
 * 
 * Silently captures and reports all application errors, performance issues,
 * and user experience problems to the backend for analysis.
 * 
 * Features:
 * - Global error handling (window.onerror, unhandledrejection)
 * - Performance monitoring (slow APIs, page loads)
 * - UX tracking (rage clicks, dead clicks, form abandonment)
 * - Offline queue with automatic sync
 * - Batched reporting to reduce network overhead
 */

import { API_BASE_URL } from '../config';
import { getAuthToken, getCurrentUser } from './authService';

// --- CONFIGURATION ---

const CONFIG = {
    BATCH_SIZE: 10,
    FLUSH_INTERVAL: 30000, // 30 seconds
    MAX_QUEUE_SIZE: 100,
    LATENCY_THRESHOLD: 3000, // 3 seconds = slow
    RAGE_CLICK_THRESHOLD: 3,
    RAGE_CLICK_INTERVAL: 500, // ms
    ENABLE_CONSOLE_LOG: false // Set true for debugging
};

// --- TYPES ---

export interface ErrorReport {
    errorId: string;
    type: 'CLIENT_ERROR' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'PERFORMANCE' | 'UX_ISSUE' | 'SERVICE_FAILURE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    stack?: string;
    code?: string;
    url: string;
    component?: string;
    action?: string;
    userId?: string;
    sessionId: string;
    deviceInfo: DeviceInfo;
    performanceMetrics?: PerformanceMetrics;
    networkInfo?: NetworkInfo;
    uxMetrics?: UXMetrics;
    context?: Record<string, any>;
    timestamp: number;
}

interface DeviceInfo {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    screenWidth: number;
    screenHeight: number;
    connectionType?: string;
    effectiveType?: string;
    language: string;
    timezone: string;
}

interface PerformanceMetrics {
    latency?: number;
    loadTime?: number;
    fps?: number;
    memoryUsage?: number;
}

interface NetworkInfo {
    endpoint: string;
    method: string;
    statusCode?: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
}

interface UXMetrics {
    rageClicks?: number;
    deadClicks?: number;
    formAbandonment?: boolean;
    scrollDepth?: number;
    timeOnPage?: number;
}

// --- STATE ---

let errorQueue: ErrorReport[] = [];
let sessionId: string = generateSessionId();
let lastClickTime = 0;
let clickCount = 0;
let lastClickTarget: EventTarget | null = null;
let isInitialized = false;
let flushInterval: ReturnType<typeof setInterval> | null = null;

// --- UTILITIES ---

function generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDeviceInfo(): DeviceInfo {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
        browser: getBrowserName(),
        browserVersion: getBrowserVersion(),
        os: getOS(),
        osVersion: getOSVersion(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

function getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
}

function getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(chrome|firefox|safari|edge|opera|opr)\/?\s*(\d+)/i);
    return match ? match[2] : 'Unknown';
}

function getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
}

function getOSVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(?:windows nt|mac os x|android|ios)\s*([\d._]+)/i);
    return match ? match[1].replace(/_/g, '.') : 'Unknown';
}

function determineSeverity(error: Partial<ErrorReport>): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (error.type === 'SERVICE_FAILURE') return 'CRITICAL';
    if (error.type === 'SERVER_ERROR') return 'HIGH';
    if (error.networkInfo?.statusCode && error.networkInfo.statusCode >= 500) return 'HIGH';
    if (error.performanceMetrics?.latency && error.performanceMetrics.latency > 10000) return 'HIGH';
    if (error.uxMetrics?.rageClicks && error.uxMetrics.rageClicks >= 5) return 'MEDIUM';
    return 'MEDIUM';
}

// --- CORE REPORTING ---

function queueError(error: Partial<ErrorReport>): void {
    const user = getCurrentUser();

    const report: ErrorReport = {
        errorId: generateErrorId(),
        type: error.type || 'CLIENT_ERROR',
        severity: error.severity || determineSeverity(error),
        message: error.message || 'Unknown error',
        stack: error.stack,
        code: error.code,
        url: window.location.href,
        component: error.component,
        action: error.action,
        userId: user?.id,
        sessionId,
        deviceInfo: getDeviceInfo(),
        performanceMetrics: error.performanceMetrics,
        networkInfo: error.networkInfo,
        uxMetrics: error.uxMetrics,
        context: error.context,
        timestamp: Date.now()
    };

    if (CONFIG.ENABLE_CONSOLE_LOG) {
        console.log('[ErrorReporting] Queued:', report);
    }

    errorQueue.push(report);

    // Immediate flush for critical errors
    if (report.severity === 'CRITICAL') {
        flushQueue();
    } else if (errorQueue.length >= CONFIG.BATCH_SIZE) {
        flushQueue();
    }

    // Trim queue if too large
    if (errorQueue.length > CONFIG.MAX_QUEUE_SIZE) {
        errorQueue = errorQueue.slice(-CONFIG.MAX_QUEUE_SIZE);
    }
}

async function flushQueue(): Promise<void> {
    if (errorQueue.length === 0) return;

    const batch = [...errorQueue];
    errorQueue = [];

    try {
        const token = getAuthToken();
        await fetch(`${API_BASE_URL}/api/errors/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ errors: batch })
        });
    } catch (err) {
        // Re-queue on failure
        errorQueue = [...batch, ...errorQueue].slice(0, CONFIG.MAX_QUEUE_SIZE);

        // Store in localStorage for later sync
        try {
            const stored = JSON.parse(localStorage.getItem('errorQueue') || '[]');
            localStorage.setItem('errorQueue', JSON.stringify([...stored, ...batch].slice(-50)));
        } catch (e) { }
    }
}

// --- GLOBAL ERROR HANDLERS ---

function setupGlobalHandlers(): void {
    // Uncaught JavaScript errors
    window.onerror = (message, source, lineno, colno, error) => {
        queueError({
            type: 'CLIENT_ERROR',
            message: String(message),
            stack: error?.stack,
            context: { source, lineno, colno }
        });
        return false; // Don't prevent default handling
    };

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        queueError({
            type: 'CLIENT_ERROR',
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack,
            context: { type: 'unhandledrejection' }
        });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
        if (event.target && (event.target as HTMLElement).tagName) {
            const el = event.target as HTMLElement;
            if (['IMG', 'SCRIPT', 'LINK'].includes(el.tagName)) {
                queueError({
                    type: 'NETWORK_ERROR',
                    severity: 'LOW',
                    message: `Failed to load ${el.tagName.toLowerCase()}: ${(el as any).src || (el as any).href}`,
                    context: { tagName: el.tagName }
                });
            }
        }
    }, true);
}

// --- PERFORMANCE MONITORING ---

function setupPerformanceMonitoring(): void {
    // Page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;

            if (loadTime > CONFIG.LATENCY_THRESHOLD) {
                queueError({
                    type: 'PERFORMANCE',
                    severity: 'LOW',
                    message: `Slow page load: ${loadTime}ms`,
                    performanceMetrics: {
                        loadTime,
                    }
                });
            }
        }, 0);
    });

    // Long tasks detection
    if ('PerformanceObserver' in window) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 100) { // Task longer than 100ms
                        queueError({
                            type: 'PERFORMANCE',
                            severity: 'LOW',
                            message: `Long task detected: ${Math.round(entry.duration)}ms`,
                            performanceMetrics: { latency: entry.duration }
                        });
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) { }
    }
}

// --- UX MONITORING ---

function setupUXMonitoring(): void {
    // Rage click detection
    document.addEventListener('click', (event) => {
        const now = Date.now();

        if (event.target === lastClickTarget && now - lastClickTime < CONFIG.RAGE_CLICK_INTERVAL) {
            clickCount++;
            if (clickCount >= CONFIG.RAGE_CLICK_THRESHOLD) {
                queueError({
                    type: 'UX_ISSUE',
                    severity: 'MEDIUM',
                    message: 'Rage clicks detected',
                    uxMetrics: { rageClicks: clickCount },
                    context: {
                        target: (event.target as HTMLElement)?.tagName,
                        className: (event.target as HTMLElement)?.className
                    }
                });
                clickCount = 0;
            }
        } else {
            clickCount = 1;
        }

        lastClickTime = now;
        lastClickTarget = event.target;
    });

    // Form abandonment detection
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            const activeForms = document.querySelectorAll('form');
            activeForms.forEach(form => {
                const inputs = form.querySelectorAll('input, textarea, select');
                let hasValue = false;
                inputs.forEach(input => {
                    if ((input as HTMLInputElement).value) hasValue = true;
                });
                if (hasValue) {
                    queueError({
                        type: 'UX_ISSUE',
                        severity: 'LOW',
                        message: 'Potential form abandonment',
                        uxMetrics: { formAbandonment: true }
                    });
                }
            });
            // Flush on page hide
            flushQueue();
        }
    });
}

// --- API WRAPPER ---

/**
 * Wrapper for fetch that automatically reports network errors and slow responses
 */
export async function monitoredFetch(
    url: string,
    options?: RequestInit,
    context?: { component?: string; action?: string }
): Promise<Response> {
    const startTime = Date.now();

    try {
        const response = await fetch(url, options);
        const duration = Date.now() - startTime;

        // Log slow responses
        if (duration > CONFIG.LATENCY_THRESHOLD) {
            queueError({
                type: 'PERFORMANCE',
                severity: 'MEDIUM',
                message: `Slow API response: ${url}`,
                component: context?.component,
                action: context?.action,
                networkInfo: {
                    endpoint: url,
                    method: options?.method || 'GET',
                    statusCode: response.status,
                    responseTime: duration
                }
            });
        }

        // Log error responses
        if (!response.ok) {
            queueError({
                type: 'NETWORK_ERROR',
                severity: response.status >= 500 ? 'HIGH' : 'MEDIUM',
                message: `API error: ${response.status} ${response.statusText}`,
                component: context?.component,
                action: context?.action,
                networkInfo: {
                    endpoint: url,
                    method: options?.method || 'GET',
                    statusCode: response.status,
                    responseTime: duration
                }
            });
        }

        return response;
    } catch (error: any) {
        const duration = Date.now() - startTime;
        queueError({
            type: 'NETWORK_ERROR',
            severity: 'HIGH',
            message: error.message || 'Network request failed',
            component: context?.component,
            action: context?.action,
            networkInfo: {
                endpoint: url,
                method: options?.method || 'GET',
                responseTime: duration
            }
        });
        throw error;
    }
}

// --- PUBLIC API ---

/**
 * Manually report an error
 */
export function reportError(
    message: string,
    options: {
        type?: ErrorReport['type'];
        severity?: ErrorReport['severity'];
        component?: string;
        action?: string;
        context?: Record<string, any>;
        stack?: string;
    } = {}
): void {
    queueError({
        message,
        ...options
    });
}

/**
 * Report a service failure (e.g., Firebase, Razorpay)
 */
export function reportServiceFailure(
    serviceName: string,
    error: Error | string,
    context?: Record<string, any>
): void {
    queueError({
        type: 'SERVICE_FAILURE',
        severity: 'CRITICAL',
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'string' ? undefined : error.stack,
        component: serviceName,
        context
    });
}

/**
 * Report a performance issue
 */
export function reportPerformanceIssue(
    message: string,
    metrics: PerformanceMetrics,
    context?: Record<string, any>
): void {
    queueError({
        type: 'PERFORMANCE',
        message,
        performanceMetrics: metrics,
        context
    });
}

/**
 * Initialize the error reporting service
 */
export function initErrorReporting(): void {
    if (isInitialized || typeof window === 'undefined') return;

    setupGlobalHandlers();
    setupPerformanceMonitoring();
    setupUXMonitoring();

    // Periodic flush
    flushInterval = setInterval(flushQueue, CONFIG.FLUSH_INTERVAL);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
        flushQueue();
    });

    // Sync any stored errors from previous sessions
    try {
        const stored = JSON.parse(localStorage.getItem('errorQueue') || '[]');
        if (stored.length > 0) {
            errorQueue = [...errorQueue, ...stored];
            localStorage.removeItem('errorQueue');
            flushQueue();
        }
    } catch (e) { }

    isInitialized = true;
    console.log('[ErrorReporting] Initialized');
}

/**
 * Cleanup (for testing)
 */
export function destroyErrorReporting(): void {
    if (flushInterval) {
        clearInterval(flushInterval);
        flushInterval = null;
    }
    isInitialized = false;
}

// Auto-initialize
if (typeof window !== 'undefined') {
    // Delay init to not block page load
    setTimeout(initErrorReporting, 1000);
}
