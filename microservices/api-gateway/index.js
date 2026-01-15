/**
 * API Gateway / Service Registry
 * Routes requests to appropriate microservices
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests, please try again later'
});
app.use(globalLimiter);

// Service URLs (from environment or defaults)
const SERVICES = {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    BOOKING: process.env.BOOKING_SERVICE_URL || 'http://localhost:3002',
    TRACKING: process.env.TRACKING_SERVICE_URL || 'http://localhost:3003',
    FOOD: process.env.FOOD_SERVICE_URL || 'http://localhost:3004',
    PAYMENT: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    ML: process.env.ML_SERVICE_URL || 'http://localhost:5000',
    LEGACY: process.env.LEGACY_SERVER_URL || 'http://localhost:3000'
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        services: Object.keys(SERVICES)
    });
});

// Check all services health
app.get('/health/all', async (req, res) => {
    const results = {};

    for (const [name, url] of Object.entries(SERVICES)) {
        try {
            const response = await fetch(`${url}/health`, {
                timeout: 5000,
                signal: AbortSignal.timeout(5000)
            });
            results[name] = response.ok ? 'healthy' : 'unhealthy';
        } catch (e) {
            results[name] = 'unreachable';
        }
    }

    res.json({ gateway: 'healthy', services: results });
});

// ==================== ROUTE PROXIES ====================

// Auth Service Routes
app.use('/api/auth', createProxyMiddleware({
    target: SERVICES.AUTH,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
    onError: (err, req, res) => {
        console.error('Auth Proxy Error:', err);
        res.status(502).json({ error: 'Auth service unavailable' });
    }
}));

// Payment Service Routes
app.use('/api/payments', createProxyMiddleware({
    target: SERVICES.PAYMENT,
    changeOrigin: true,
    pathRewrite: { '^/api/payments': '' },
    onError: (err, req, res) => {
        res.status(502).json({ error: 'Payment service unavailable' });
    }
}));

// Notification Service Routes
app.use('/api/notifications', createProxyMiddleware({
    target: SERVICES.NOTIFICATION,
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }
}));

// ML Service Routes
app.use('/api/ml', createProxyMiddleware({
    target: SERVICES.ML,
    changeOrigin: true,
    pathRewrite: { '^/api/ml': '' }
}));

// Food Service Routes
app.use('/api/food', createProxyMiddleware({
    target: SERVICES.FOOD,
    changeOrigin: true,
    pathRewrite: { '^/api/food': '' }
}));

// Tracking Service Routes
app.use('/api/tracking', createProxyMiddleware({
    target: SERVICES.TRACKING,
    changeOrigin: true,
    pathRewrite: { '^/api/tracking': '' }
}));

// Booking Service Routes
app.use('/api/bookings', createProxyMiddleware({
    target: SERVICES.BOOKING,
    changeOrigin: true,
    pathRewrite: { '^/api/bookings': '' }
}));

// ==================== FALLBACK TO LEGACY SERVER ====================
// Routes not handled by microservices go to the legacy monolith

app.use('/api', createProxyMiddleware({
    target: SERVICES.LEGACY,
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('Legacy Proxy Error:', err);
        res.status(502).json({ error: 'Service unavailable' });
    }
}));

// Static files (serve from legacy)
app.use('/', createProxyMiddleware({
    target: SERVICES.LEGACY,
    changeOrigin: true
}));

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
    console.error('Gateway Error:', err);
    res.status(500).json({
        error: 'Internal Gateway Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Gateway
const PORT = process.env.GATEWAY_PORT || 8080;

app.listen(PORT, () => {
    console.log(`🌐 API Gateway running on port ${PORT}`);
    console.log(`   Routing to ${Object.keys(SERVICES).length} services`);
    Object.entries(SERVICES).forEach(([name, url]) => {
        console.log(`   - ${name}: ${url}`);
    });
});

export default app;
