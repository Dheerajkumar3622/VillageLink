/**
 * VillageLink v3.5 Production Server
 * Geo-Spatial Intelligent Routing Engine & ML Core
 */

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
// dns.setServers(['8.8.8.8', '1.1.1.1']); // Commented out to use system DNS resolver since public DNS servers may be unreachable or blocked
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import compression from 'compression';
import jwt from 'jsonwebtoken';

// Security Imports
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
// Note: xss-clean removed due to ESM incompatibility. Using helmet + mongoSanitize is sufficient.
import Razorpay from 'razorpay';

// Import Modular Components
import Models from './models.js';
const { Ticket, Pass, RentalBooking, Parcel, User, Location, Block, Transaction, Route, RoadReport, Job, MarketItem, NewsItem, Shop, Product, BugReport, ActivityLog, SystemSetting, TripLog } = Models;

import Auth from './auth.js';
const { register, registerUser, registerProvider, login, authenticate, requireAdmin, requestPasswordReset, resetPassword, updateFCMToken } = Auth;

import Logic from './logic.js';
const { getRealRoadPath } = Logic;

// Background Workers
import { startOSMPoller } from './workers/osmPollingWorker.js';

// --- IMPORT ROUTERS ---
import villageRoutes from './routes/villageRoutes.js';
import bugRoutes from './routes/bugRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import adminToolsRoutes from './routes/adminToolsRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import routeIntelRoutes from './routes/routeIntelRoutes.js';
import userRoutes from './routes/userRoutes.js';
import gramMandiRoutes from './routes/gramMandiRoutes.js';
import indiaLocationRoutes from './routes/indiaLocationRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import aeroRoutes from './routes/aeroRoutes.js';
import osmRoutes from './routes/osmRoutes.js'; // Offline Routing

// --- 1000x IMPORTS ---
import driverRoutes from './routes/driverRoutes.js';
import kisanRoutes from './routes/kisanRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { initializeSpeedMatchEngine, updateSpeedBuffer, clearSpeedBuffer, checkAlighting } from './services/speedMatchEngine.js';
import { initializeSeatTracking } from './services/seatTrackingService.js';
import { initializeTrajectoryMatcher, registerTrajectory, updateDriverPosition, removeTrajectory, findMatchingVehicles, findMatchingVehiclesByStops, getActiveTrajectoryCount } from './services/trajectoryMatcher.js';
import { harvestTrajectoryData } from './services/AISmartRoutingService.js';
import { initRouteAnalyzerCron } from './services/tripAnalysisCron.js';

import EmailService from './services/emailService.js';
const { sendEmail } = EmailService;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SERVICES ---
import MarketService from './services/marketService.js';
const { refreshMarketPrices } = MarketService;

import JobService from './services/jobService.js';
const { initializeJobs } = JobService;

import TrafficService from './services/trafficAggregatorService.js';
const { getTrafficInBounds, getTrafficAlongRoute, processDriverLocation } = TrafficService;

import TimeoutManager from './services/driverTimeoutManager.js';
const { initializeTimeoutManager, startTimeout, handleDriverAcceptance, handleDriverRejection } = TimeoutManager;

import TripMonitor from './services/tripMonitorService.js';
const { initializeTripMonitor, getTripLiveStatus, onDriverLocationUpdate } = TripMonitor;

import ReroutingService from './services/dynamicReroutingService.js';
const { initializeReroutingService, acceptReroute, declineReroute, checkTripForRerouteManual } = ReroutingService;

import ErrorAggregator from './services/errorAggregatorService.js';
const { storeErrors, getErrorAnalytics, getRecentErrors, resolveError, getDeviceStats } = ErrorAggregator;
import { RT_EVENT, toRoom, normalizeRealtimePayload } from './services/realtimeContract.js';
import { traceMiddleware } from './services/apiEnvelope.js';
import { registerTransportV1Routes } from './routes/transportV1Routes.js';

const app = express();
const FEATURE_FLAGS = {
    realtimeContractV1: process.env.FEATURE_RT_CONTRACT_V1 !== 'false',
    replaySync: process.env.FEATURE_RT_REPLAY_SYNC !== 'false',
    dualPathLegacyEmit: process.env.FEATURE_DUAL_PATH_LEGACY !== 'false',
    autonomyPhaseD: process.env.FEATURE_AUTONOMY_D === 'true'
};
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_12345';
const metrics = {
    httpRequests: 0,
    idempotencyHits: 0,
    socketConnections: 0,
    socketEventsReplayed: 0
};
const inMemoryCache = new Map();
const idempotencyCache = new Map();
/** Per-route latency samples for /api/metrics/latency (method + path key → ms durations). */
const routeLatencies = new Map();

function latencyPercentile(samples, p) {
    if (!samples?.length) return 0;
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
}

const cacheGet = (key) => {
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        inMemoryCache.delete(key);
        return null;
    }
    return entry.value;
};

const cacheSet = (key, value, ttlMs = 15000) => {
    inMemoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

app.use(compression());
app.set('trust proxy', 1);

// Initialize Real Data in background to allow faster server startup
setImmediate(() => {
    refreshMarketPrices();
    initializeJobs(); // Seed jobs if empty
    initRouteAnalyzerCron(); // Start AI Route analyzer schedule
    Promise.allSettled([
        Ticket.collection.createIndex({ userId: 1, timestamp: -1 }),
        Ticket.collection.createIndex({ id: 1 }, { unique: true, sparse: true }),
        Pass.collection.createIndex({ userId: 1, purchaseDate: -1 }),
        Parcel.collection.createIndex({ userId: 1, timestamp: -1 }),
        Route.collection.createIndex({ id: 1 }, { sparse: true }),
        User.collection.createIndex({ id: 1 }, { unique: true, sparse: true })
    ]).catch(() => { });
});

// --- SECURITY MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(mongoSanitize());

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(traceMiddleware);
app.use((req, res, next) => {
    metrics.httpRequests += 1;
    next();
});

app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const t0 = Date.now();
    res.on('finish', () => {
        const key = `${req.method} ${req.path.split('?')[0]}`;
        if (!routeLatencies.has(key)) routeLatencies.set(key, []);
        const arr = routeLatencies.get(key);
        arr.push(Date.now() - t0);
        if (arr.length > 800) arr.shift();
    });
    next();
});

app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const key = req.headers['x-idempotency-key'];
    if (!key || typeof key !== 'string') return next();
    const cacheKey = `${req.method}:${req.path}:${key}`;
    const cached = idempotencyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        metrics.idempotencyHits += 1;
        return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        idempotencyCache.set(cacheKey, {
            status: res.statusCode || 200,
            body,
            expiresAt: Date.now() + 10 * 60 * 1000
        });
        return originalJson(body);
    };
    next();
});

// Static directory for routing graphs
app.use('/routing_data', express.static(path.join(__dirname, 'public', 'routing_data')));
/** OpenAPI 3 spec for transport v1 (Phase B contract surface). */
app.get('/api/v1/openapi.json', (req, res) => {
    res.type('application/json');
    res.sendFile(path.join(__dirname, 'public', 'openapi-v1.json'));
});

// --- RAZORPAY CONFIGURATION ---
const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
const razorpaySecret = process.env.RAZORPAY_SECRET?.trim();

if (!razorpayKeyId || !razorpaySecret) {
    console.error("❌ CRITICAL: Razorpay Keys Missing in .env!");
} else {
    console.log(`🔑 Razorpay Configured: ${razorpayKeyId.substring(0, 8)}...`);
}

const razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpaySecret,
});

app.get('/api/config/razorpay', (req, res) => {
    res.json({ key: razorpayKeyId });
});

// --- DATABASE STATE ---
let isDbConnected = false;

/** Atlas: `host.net/?query` needs a DB name → `host.net/test?query`; add retryWrites + w=majority if missing. */
function normalizeMongoUri(uri) {
    if (!uri || typeof uri !== 'string') return uri;
    let u = uri.trim();
    u = u.replace(/\.mongodb\.net\/\?/i, '.mongodb.net/test?');
    u = u.replace(/\.mongodb\.net\?(?!\/)/i, '.mongodb.net/test?');
    if (!/retryWrites\s*=/i.test(u)) {
        u += (u.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
    }
    return u;
}

const MONGO_URI_SRV = normalizeMongoUri(process.env.MONGO_URI || '');
/** Optional alternate connection string from the same Atlas cluster (must match SRV cluster; do not use a random hardcoded host). */
const MONGO_URI_STANDARD = (process.env.MONGO_URI_STANDARD || '').trim();

function printMongoAtlasHelp(reason) {
    console.error('\n════════════════════════════════════════════════════════════');
    console.error(' MongoDB: connection failed — /api routes will return 503 until fixed.');
    console.error(' • Atlas → Network Access → Add IP Address → your current IP');
    console.error('   (or 0.0.0.0/0 for dev only — not for production)');
    console.error(' • Confirm MONGO_URI in backend/.env matches this cluster');
    console.error(' • Optional: set MONGO_URI_STANDARD if you use a second URI for the same cluster');
    console.error(` • Last error: ${reason}`);
    console.error('════════════════════════════════════════════════════════════\n');
}

mongoose.connection.on('connecting', () => console.log('⏳ Connecting to MongoDB...'));
mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB Connected');
    isDbConnected = true;
});
mongoose.connection.on('error', (err) => console.error('❌ MongoDB Connection Error:', err));
mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB Disconnected');
    isDbConnected = false;
});

const connectWithRetry = (uri, isFallback = false) => {
    console.log(`📡 Connecting to: ${uri.includes('+srv') ? 'SRV (MONGO_URI)' : 'Standard (MONGO_URI_STANDARD)'}`);
    mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        maxPoolSize: 500,
    })
        .then(() => {
            isDbConnected = true;
        })
        .catch(async (err) => {
            console.warn(`❌ MongoDB connect failed (${isFallback ? 'fallback' : 'primary'}):`, err.message);
            isDbConnected = false;
            if (!isFallback && uri === MONGO_URI_SRV && MONGO_URI_STANDARD) {
                console.log('🔄 Retrying with MONGO_URI_STANDARD from env...');
                try {
                    await mongoose.disconnect();
                } catch (e) {}
                connectWithRetry(MONGO_URI_STANDARD, true);
            } else {
                printMongoAtlasHelp(err.message);
            }
        });
};

if (MONGO_URI_SRV) {
    connectWithRetry(MONGO_URI_SRV);
} else {
    console.error('❌ MONGO_URI is not set. Add it to backend/.env (or repo root .env loaded by Node).');
    printMongoAtlasHelp('MONGO_URI empty');
}

// --- MIDDLEWARE: ACTIVITY LOGGER ---
const logActivity = async (req, res, next) => {
    if (req.method !== 'GET') {
        try {
            let userId = 'ANONYMOUS';
            new ActivityLog({ userId, action: req.path, ipAddress: req.ip, details: req.body }).save().catch(e => console.error("Log failed", e));
        } catch (e) { }
    }
    next();
};
app.use(logActivity);

// --- KEEP-ALIVE SERVICE (Prevents Render free tier from sleeping) ---
const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes

app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        res.json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            uptime: Math.floor(process.uptime())
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/api/metrics/latency', (req, res) => {
    const httpRouteSamples = {};
    for (const [key, samples] of routeLatencies.entries()) {
        if (!samples.length) continue;
        httpRouteSamples[key] = {
            n: samples.length,
            p50ms: Math.round(latencyPercentile(samples, 50)),
            p95ms: Math.round(latencyPercentile(samples, 95))
        };
    }
    res.json({
        ...metrics,
        featureFlags: FEATURE_FLAGS,
        inMemoryCacheKeys: inMemoryCache.size,
        idempotencyCacheKeys: idempotencyCache.size,
        recentRealtimeEvents: typeof recentRealtimeEvents !== 'undefined' ? recentRealtimeEvents.length : 0,
        httpRouteSamples,
        uptimeSeconds: Math.floor(process.uptime())
    });
});

function startKeepAlive() {
    // Pings a deployed URL to reduce Render cold-starts. Not useful on local dev — causes noisy 503s when Render sleeps.
    if (process.env.NODE_ENV !== 'production' && process.env.KEEP_ALIVE_REMOTE !== 'true') {
        console.log('⏰ Remote keep-alive skipped in development (set KEEP_ALIVE_REMOTE=true to ping Render from this machine).');
        return;
    }

    const PRODUCTION_URL = 'https://villagelink-jh20.onrender.com';
    const serverUrl = process.env.RENDER_EXTERNAL_URL || PRODUCTION_URL || `http://localhost:${process.env.PORT || 3001}`;

    console.log(`⏰ Keep-Alive Service started (interval: ${KEEP_ALIVE_INTERVAL / 60000} min)`);
    console.log(`📡 Target URL: ${serverUrl}`);

    setInterval(async () => {
        try {
            const response = await fetch(`${serverUrl}/api/health`);
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            console.log(`💓 Heartbeat: [${data.status.toUpperCase()}] | DB: ${data.database} | ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            console.warn('⚠️ Heartbeat:', error.message);
            if (serverUrl !== PRODUCTION_URL) {
                try {
                    await fetch(`${PRODUCTION_URL}/api/health`);
                    console.log('🔄 Fallback Heartbeat OK');
                } catch (e) { /* remote may be sleeping */ }
            }
        }
    }, KEEP_ALIVE_INTERVAL);
}
// --- DATABASE HEALTH MIDDLEWARE ---
app.use('/api', (req, res, next) => {
    // Prevent 10-second Mongoose timeout hangs when DB is unreachable (e.g., due to IP whitelist)
    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
        return res.status(503).json({ 
            error: "Database offline. Please whitelist your IP in MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0).",
            code: "DB_OFFLINE"
        });
    }
    next();
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', Auth.register);              // Legacy
app.post('/api/auth/register/user', Auth.registerUser);      // 1000x: User panel
app.post('/api/auth/register/provider', Auth.registerProvider); // 1000x: Provider panel
app.post('/api/auth/login', Auth.login);
app.post('/api/auth/login-firebase', Auth.loginViaFirebase);
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));
app.post('/api/auth/forgot-password', Auth.requestPasswordReset);
app.post('/api/auth/reset-password', Auth.resetPassword);
app.post('/api/auth/reset-password-firebase', Auth.resetPasswordViaFirebase);
app.post('/api/auth/register-firebase', Auth.registerViaFirebase);
app.post('/api/auth/update-fcm-token', Auth.authenticate, Auth.updateFCMToken); // 1000x: FCM

// --- GRAMMANDI ROUTES (Food Ecosystem) ---
app.use('/api/grammandi', gramMandiRoutes);

// --- ERROR REPORTING ROUTES ---
app.post('/api/errors/report', async (req, res) => {
    try {
        const { errors } = req.body;
        if (!errors || !Array.isArray(errors)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }
        const result = await storeErrors(errors);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Error storing error reports:', err);
        res.status(500).json({ error: 'Failed to store errors' });
    }
});

app.get('/api/errors/analytics', authenticate, requireAdmin, async (req, res) => {
    try {
        const { days, type, severity } = req.query;
        const analytics = await getErrorAnalytics({
            days: parseInt(days) || 7,
            type,
            severity
        });
        res.json(analytics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/errors/recent', authenticate, requireAdmin, async (req, res) => {
    try {
        const { limit, type, severity, resolved } = req.query;
        const errors = await getRecentErrors({
            limit: parseInt(limit) || 50,
            type,
            severity,
            resolved: resolved === 'true' ? true : resolved === 'false' ? false : null
        });
        res.json(errors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/errors/:errorId/resolve', authenticate, requireAdmin, async (req, res) => {
    try {
        const { errorId } = req.params;
        const { resolution } = req.body;
        await resolveError(errorId, req.user.id, resolution);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/errors/device-stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const stats = await getDeviceStats(parseInt(req.query.days) || 7);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROUTERS ---
app.use('/api/locations', villageRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/route', routeIntelRoutes);
app.use('/api/user', userRoutes);
app.use('/api/india', indiaLocationRoutes); // Pan-India location search API
app.use('/api/osm', osmRoutes); // Offline OSM Downloader

// --- FOODLINK VENDOR ROUTES ---
import vendorRoutes from './routes/vendorRoutes.js';
import foodLinkRoutes from './routes/foodLinkRoutes.js';
import umgRoutes from './routes/umgRoutes.js';
import fleetRoutes from './routes/fleetRoutes.js';
import becknRoutes from './routes/becknRoutes.js';
import cargoRoutes from './routes/cargoRoutes.js';
app.use('/api/vendor', vendorRoutes);
app.use('/api/foodlink', foodLinkRoutes);
app.use('/api', umgRoutes); // UMG Routes for subscriptions, FLMC, guardian
app.use('/api/fleet', fleetRoutes); // Fleet management for operators
app.use('/api/beckn', becknRoutes); // ONDC/Beckn Protocol endpoints
app.use('/api/cargo', cargoRoutes); // CargoLink crowdsourced logistics

// --- USS v3.0 ROUTES (Unified Supply Chain System) ---
import qrRoutes from './routes/qrRoutes.js';
import supplyChainRoutes from './routes/supplyChainRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import reelsRoutes from './routes/reelsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import villageManagerRoutes from './routes/villageManagerRoutes.js';
app.use('/api/qr', qrRoutes);                   // Universal QR Scanner
app.use('/api/supply', supplyChainRoutes);      // Supply Chain Marketplace
app.use('/api/pricing', pricingRoutes);         // Admin Pricing Control
app.use('/api/reels', reelsRoutes);             // Instagram-style Reels
app.use('/api/chat', chatRoutes);               // WhatsApp-style Chat
app.use('/api/village-manager', villageManagerRoutes); // Village Manager Proxy Services
app.use('/api/social', socialRoutes);           // Village Circles & Gamification
app.use('/api/aero', aeroRoutes);               // Smart Aeroponics IoT

// --- 1000x ROUTES ---
app.use('/api/driver', driverRoutes);            // Smart Driver Panel
app.use('/api/kisan', kisanRoutes);              // Kisan Crop Marketplace
app.use('/api/dashboard', dashboardRoutes);      // Unified Role-Based Dashboard
app.use('/api/system', adminToolsRoutes);        // Admin & System Admin Tools

// --- SAFETY ENDPOINTS (Didi Style) ---



// --- CROWDSOURCING ENDPOINTS ---
app.post('/api/locations/suggest', Auth.authenticate, async (req, res) => {
    try {
        const { name, lat, lng, type } = req.body;
        const newLocation = new Location({
            name: `${name} (User Suggested)`,
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { NAME: name, SOURCE: 'USER_CROWDSOURCE', SUB_DIST: 'Unknown' }
        });
        await newLocation.save();
        res.json({ success: true, location: newLocation });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- COMMUNITY ROUTES (Jobs) ---
app.get('/api/community/jobs', async (req, res) => {
    try {
        // Fetch from Real DB
        let jobs = await Job.find({});
        res.json(jobs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PAYMENT ENDPOINTS ---
app.post('/api/payment/create-order', Auth.authenticate, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        console.log(`💳 Initiating Payment: Amount=${amount}, Currency=${currency}`);
        console.log(`🔑 Key ID Loaded: ${process.env.RAZORPAY_KEY_ID ? 'YES' : 'NO'}`);

        if (!amount) {
            throw new Error("Amount is required");
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };

        console.log("Razorpay Options:", options);
        const order = await razorpay.orders.create(options);
        console.log("✅ Order Created:", order.id);
        res.json(order);
    } catch (error) {
        console.error("❌ Razorpay Order Creation Failed:", error);
        res.status(500).json({ error: "Payment initiation failed", details: error.message });
    }
});

app.post('/api/payment/verify', Auth.authenticate, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET || 'a5EZHDxPfUtRYnAw2c0huVp5')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            const txn = new Transaction({
                id: razorpay_payment_id,
                userId: req.user.id,
                type: 'SPEND',
                amount: req.body.amount / 100 || 0,
                desc: "Online Payment Verified",
                timestamp: Date.now(),
                relatedEntityId: razorpay_order_id
            });
            await txn.save();
            res.json({ status: 'success', transactionId: razorpay_payment_id });
        } else {
            res.status(400).json({ status: 'failure', message: "Invalid Signature" });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- MARKET DATA (REAL DB PERISTENCE) ---
app.get('/api/market/commodities', async (req, res) => {
    try {
        const cacheKey = 'market:commodities';
        const cached = cacheGet(cacheKey);
        if (cached) return res.json(cached);

        // Fetch strictly from DB. No random generation.
        const items = await MarketItem.find({ type: 'COMMODITY' }).sort({ name: 1 }).lean();
        if (items.length === 0) {
            return res.json([]); // Return empty if no data, don't fake it
        }
        const payload = items.map(i => ({
            crop: i.name,
            price: i.price,
            trend: i.properties?.trend || 'STABLE',
            satelliteInsight: i.properties?.insight || "Standard Market Rate"
        }));
        cacheSet(cacheKey, payload, 30000);
        res.json(payload);
    } catch (e) {
        res.status(500).json({ error: "Market Data Unavailable" });
    }
});

app.get('/api/market/shops', async (req, res) => {
    try { const shops = await Shop.find({}).lean(); res.json(shops); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/market/shops', Auth.authenticate, async (req, res) => {
    try { const shop = new Shop(req.body); await shop.save(); res.json(shop); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/market/products', async (req, res) => {
    try {
        const { shopId } = req.query;
        const query = shopId ? { shopId } : {};
        const products = await Product.find(query).lean();
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/market/products', Auth.authenticate, async (req, res) => {
    try { const product = new Product(req.body); await product.save(); res.json(product); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/passes/buy', Auth.authenticate, async (req, res) => {
    try { const pass = new Pass(req.body); await pass.save(); res.json({ success: true, pass }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/passes/list', Auth.authenticate, async (req, res) => {
    try { const passes = await Pass.find({ userId: req.query.userId }).lean(); res.json(passes); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DRIVER SCAN TICKET ---
app.post('/api/driver/scan-ticket', Auth.authenticate, async (req, res) => {
    try {
        const { ticketId, driverId } = req.body;
        console.log(`Scan Request: Ticket=${ticketId}, Driver=${driverId}`);

        // 1. Handle Pass Scanning (Case Insensitive)
        if (ticketId.toUpperCase().startsWith('PASS-')) {
            const pass = await Pass.findOne({ id: { $regex: new RegExp(`^${ticketId}$`, 'i') } });
            if (!pass) return res.status(404).json({ error: "Pass Not Found" });
            if (pass.expiryDate < Date.now()) return res.status(400).json({ error: "Pass Expired" });
            return res.json({ success: true, type: 'PASS', message: 'Pass Verified', earnings: 0, balance: 0 });
        }

        // 2. Handle Ticket Scanning (Case Insensitive)
        const ticket = await Ticket.findOne({ id: { $regex: new RegExp(`^${ticketId}$`, 'i') } });

        if (!ticket) {
            console.warn(`Ticket not found: ${ticketId}`);
            return res.status(404).json({ error: "Ticket Not Found" });
        }

        // Check if ticket is already used
        if (ticket.status === 'BOARDED' || ticket.status === 'COMPLETED') {
            return res.status(400).json({ error: "Ticket already used" });
        }

        const driver = await User.findOne({ id: driverId });
        if (!driver) return res.status(404).json({ error: "Driver profile error" });

        const PLATFORM_FEE_PERCENT = 0.10;
        let financialMessage = "";
        let transactionType = "";
        let amountChange = 0;

        // --- PAYMENT LOGIC ---
        // CASE 1: Online Paid Ticket -> Add earnings to driver wallet
        if (ticket.paymentMethod === 'ONLINE' || ticket.paymentMethod === 'GRAMCOIN') {
            const driverShare = ticket.totalPrice * (1 - PLATFORM_FEE_PERCENT);
            driver.walletBalance += driverShare;
            financialMessage = `Online Paid. Earnings added: ₹${driverShare.toFixed(2)}`;
            transactionType = 'EARN';
            amountChange = driverShare;
        }
        // CASE 2: Cash Ticket (Status PENDING) -> Deduct fee from driver wallet (Driver keeps cash)
        else if (ticket.paymentMethod === 'CASH') {
            const platformFee = ticket.totalPrice * PLATFORM_FEE_PERCENT;
            driver.walletBalance -= platformFee;
            financialMessage = `Cash Collected: ₹${ticket.totalPrice}. Fee deducted: ₹${platformFee.toFixed(2)}`;
            transactionType = 'SPEND';
            amountChange = platformFee;
        }

        ticket.status = 'BOARDED';
        ticket.driverId = driverId;
        await ticket.save();
        await driver.save();

        if (amountChange > 0) {
            const txn = new Transaction({
                id: `TXN-${Date.now()}`,
                userId: driverId,
                type: transactionType,
                amount: amountChange,
                desc: ticket.paymentMethod === 'CASH' ? `Platform Fee (${ticketId})` : `Ticket Earnings (${ticketId})`,
                timestamp: Date.now(),
                relatedEntityId: ticketId
            });
            await txn.save();
        }

        res.json({
            success: true,
            type: 'TICKET',
            message: 'Verified',
            paymentMethod: ticket.paymentMethod,
            financialDetails: financialMessage,
            balance: driver.walletBalance
        });

    } catch (e) {
        console.error("Scan Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/driver/withdraw', Auth.authenticate, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const driver = await User.findOne({ id: userId });
        if (driver.walletBalance < amount) return res.status(400).json({ error: "Insufficient" });
        driver.walletBalance -= amount;
        await driver.save();
        res.json({ success: true, balance: driver.walletBalance, transactionId: `WD-${Date.now()}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rentals/book', Auth.authenticate, async (req, res) => {
    try { const rental = new RentalBooking(req.body); await rental.save(); res.json({ success: true, rental }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/rentals/requests', Auth.authenticate, async (req, res) => {
    try { const requests = await RentalBooking.find({ status: 'PENDING' }).lean(); res.json(requests); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/logistics/book', Auth.authenticate, async (req, res) => {
    try { const parcel = new Parcel(req.body); await parcel.save(); res.json({ success: true, parcel }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/logistics/all', Auth.authenticate, async (req, res) => {
    try { const parcels = await Parcel.find({}).lean(); res.json(parcels); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/pricing', Auth.requireAdmin, async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: 'PRICING_CONFIG' });
        res.json(setting ? setting.value : { baseFare: 10, perKmRate: 6 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/pricing', Auth.requireAdmin, async (req, res) => {
    try {
        const { baseFare, perKmRate } = req.body;
        await SystemSetting.findOneAndUpdate({ key: 'PRICING_CONFIG' }, { value: { baseFare, perKmRate }, updatedAt: Date.now() }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ROUTE DEFINITIONS (Admin Route CRUD) ---
app.get('/api/routes', async (req, res) => {
    try {
        const cacheKey = 'routes:all';
        const cached = cacheGet(cacheKey);
        if (cached) return res.json(cached);
        const routes = await Route.find({}).lean();
        cacheSet(cacheKey, routes, 20000);
        res.json(routes);
    } catch (e) { res.json([]); }
});

app.post('/api/routes', Auth.authenticate, async (req, res) => {
    try {
        const route = new Route(req.body);
        await route.save();
        res.json(route);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/routes/:id', Auth.authenticate, async (req, res) => {
    try {
        await Route.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REAL ROUTE ANALYSIS (OSRM INTEGRATION) ---
app.post('/api/routes/analyze', async (req, res) => {
    try {
        const { start, end } = req.body;
        if (!start.lat || !end.lat) {
            return res.json({ path: [start.name, end.name], distance: 10000, pathDetails: [] });
        }

        let pathDetails = [];
        let distanceMeters = 0;
        let durationSeconds = 0;
        let alternatives = [];

        // 1. Fetch path from OSRM with alternatives
        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
            const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) });
            if (osrmRes.ok) {
                const data = await osrmRes.json();
                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    pathDetails = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                    distanceMeters = data.routes[0].distance;
                    durationSeconds = data.routes[0].duration;

                    if (data.routes.length > 1) {
                        alternatives = data.routes.slice(1).map(r => ({
                            distance: r.distance,
                            estimatedTime: r.duration,
                            pathDetails: r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
                        }));
                    }
                }
            }
        } catch (e) {
            console.warn("[Backend OSRM] failed, using linear path:", e.message);
        }

        if (pathDetails.length === 0) {
            pathDetails = [
                { lat: start.lat, lng: start.lng },
                { lat: end.lat, lng: end.lng }
            ];
            distanceMeters = 10000;
            durationSeconds = 600;
        }

        // 2. Fetch precise Google Distance Matrix
        const distanceKey = "AIzaSyChdzuy7TWgVVH4GboCc39bZb6oLw7bins";
        let trafficLevel = 'LIGHT';
        try {
            const dmUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${start.lat},${start.lng}&destinations=${end.lat},${end.lng}&departure_time=now&traffic_model=best_guess&key=${distanceKey}`;
            const dmRes = await fetch(dmUrl, { signal: AbortSignal.timeout(3500) });
            if (dmRes.ok) {
                const dmData = await dmRes.json();
                if (dmData.status === 'OK' && dmData.rows?.[0]?.elements?.[0]?.status === 'OK') {
                    const element = dmData.rows[0].elements[0];
                    distanceMeters = element.distance.value;
                    const durationVal = element.duration.value;
                    const durationInTrafficVal = element.duration_in_traffic?.value || durationVal;
                    durationSeconds = durationInTrafficVal;

                    if (durationInTrafficVal > 1.35 * durationVal) {
                        trafficLevel = 'HEAVY';
                    } else if (durationInTrafficVal > 1.12 * durationVal) {
                        trafficLevel = 'MODERATE';
                    } else {
                        trafficLevel = 'LIGHT';
                    }
                }
            }
        } catch (e) {
            console.warn("[Backend Distance Matrix] failed, using OSRM value:", e.message);
        }

        // Calibrate alternative distances against Google Distance Matrix ratio
        const primaryOsrmDist = distanceMeters || 1;
        const calibrationRatio = distanceMeters / primaryOsrmDist;
        alternatives = alternatives.map(alt => ({
            ...alt,
            distance: Math.round(alt.distance * calibrationRatio),
            estimatedTime: Math.round(alt.estimatedTime * calibrationRatio)
        }));

        // 3. Find intermediate villages along the path
        const checkPoints = [];
        if (pathDetails.length > 0) {
            checkPoints.push(pathDetails[0]);
            let acc = 0;
            for (let i = 1; i < pathDetails.length; i++) {
                const prev = pathDetails[i - 1];
                const curr = pathDetails[i];
                const d = Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2)) * 111; // approx km
                acc += d;
                if (acc >= 0.5) { // check every 0.5 km (500 meters) to capture all nodes/junctions
                    checkPoints.push(curr);
                    acc = 0;
                }
            }
            if (checkPoints[checkPoints.length - 1] !== pathDetails[pathDetails.length - 1]) {
                checkPoints.push(pathDetails[pathDetails.length - 1]);
            }
        }

        const villagePromises = checkPoints.map(pt =>
            Location.findOne({
                geometry: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
                        $maxDistance: 99999 // Unlimited: always consider nearest village for each node/junction
                    }
                }
            }).select('name').lean()
        );

        const results = await Promise.all(villagePromises);
        const intermediates = [
            ...new Set(
                results
                    .filter(v => v && v.name)
                    .map(v => v.name)
                    .filter(n => n && n !== start.name && n !== end.name)
            )
        ];

        res.json({
            path: [start.name, ...intermediates, end.name],
            distance: distanceMeters,
            estimatedTime: durationSeconds,
            pathDetails,
            trafficLevel,
            alternatives: alternatives.length > 0 ? alternatives : undefined
        });

    } catch (e) {
        console.error("Routing Error:", e);
        res.status(500).json({ error: "Routing Failed", path: [start.name, end.name], distance: 10000 });
    }
});

// --- PHASE 5: TRAJECTORY MATCHING API ---
app.post('/api/routes/find-vehicles', async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng, maxSnapKm } = req.body;
        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ error: 'Start and End coordinates required' });
        }
        
        const vehicles = findMatchingVehicles(
            parseFloat(startLat), parseFloat(startLng),
            parseFloat(endLat), parseFloat(endLng),
            parseFloat(maxSnapKm) || 1.5
        );
        
        res.json({
            count: vehicles.length,
            activeDriversTotal: getActiveTrajectoryCount(),
            vehicles
        });
    } catch (e) {
        console.error('Vehicle matching error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/routes/match-segment-stops', async (req, res) => {
    try {
        const { fromStop, toStop, maxEtaMinutes } = req.body;
        if (!fromStop || !toStop) {
            return res.status(400).json({ error: 'fromStop and toStop required' });
        }
        const vehicles = findMatchingVehiclesByStops(
            String(fromStop).trim(),
            String(toStop).trim(),
            Math.min(120, Math.max(5, parseInt(maxEtaMinutes, 10) || 30))
        );
        res.json({
            count: vehicles.length,
            activeDriversTotal: getActiveTrajectoryCount(),
            vehicles
        });
    } catch (e) {
        console.error('Segment stop match error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/user/wallet', Auth.authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(20);
        res.json({ address: user.did || `0x${user.id}`, balance: user.walletBalance, transactions, creditLimit: user.creditLimit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/user/transaction', Auth.authenticate, async (req, res) => {
    try {
        const { amount, type, desc } = req.body;
        const user = await User.findOne({ id: req.user.id });
        if (type === 'EARN') user.walletBalance += amount;
        if (type === 'SPEND') user.walletBalance -= amount;
        await user.save();

        const txn = new Transaction({ id: `TXN-${Date.now()}`, userId: user.id, type, amount, desc, timestamp: Date.now() });
        await txn.save();
        res.json({ success: true, balance: user.walletBalance, transactionId: txn.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/history', Auth.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📜 Fetching History for User: ${userId}`);
        const [tickets, passes, rentals, parcels] = await Promise.all([
            Ticket.find({ userId }).sort({ timestamp: -1 }).lean(),
            Pass.find({ userId }).sort({ purchaseDate: -1 }).lean(),
            RentalBooking.find({ userId }).sort({ date: -1 }).lean(),
            Parcel.find({ userId }).sort({ timestamp: -1 }).lean()
        ]);
        console.log(`Found: ${tickets.length} tickets, ${passes.length} passes, ${rentals.length} rentals, ${parcels.length} parcels`);
        const history = [
            ...tickets.map(t => ({ ...t, historyType: 'TICKET', sortDate: t.timestamp })),
            ...passes.map(p => ({ ...p, historyType: 'PASS', sortDate: p.purchaseDate })),
            ...rentals.map(r => ({ ...r, historyType: 'RENTAL', sortDate: new Date(r.date).getTime() })),
            ...parcels.map(p => ({ ...p, historyType: 'PARCEL', sortDate: p.timestamp }))
        ];
        history.sort((a, b) => b.sortDate - a.sortDate);
        res.json(history);
    } catch (e) {
        console.error("❌ History fetch error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Admin Routes
app.get('/api/admin/stats', Auth.requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const pendingDrivers = await User.countDocuments({ role: { $in: ['DRIVER', 'SHOPKEEPER'] }, isVerified: false });
        const activeTrips = await Ticket.countDocuments({ status: 'BOARDED' });
        res.json({ totalUsers, pendingDrivers, activeTrips, totalRevenue: 0, systemHealth: 100 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/users', Auth.requireAdmin, async (req, res) => {
    try { const users = await User.find({}, '-password').sort({ _id: -1 }).lean(); res.json(users); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/verify-driver', Auth.requireAdmin, async (req, res) => {
    try { await User.findOneAndUpdate({ id: req.body.userId }, { isVerified: req.body.isVerified }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/toggle-ban', Auth.requireAdmin, async (req, res) => {
    try { await User.findOneAndUpdate({ id: req.body.userId }, { isBanned: req.body.isBanned }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/ticket/:ticketId', Auth.requireAdmin, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findOne({ id: { $regex: new RegExp(`^${ticketId}$`, 'i') } }).lean();
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const passenger = await User.findOne({ id: ticket.userId }).lean();
        const driver = ticket.driverId || ticket.scannedByDriverId ? await User.findOne({ id: ticket.driverId || ticket.scannedByDriverId }).lean() : null;
        
        // Fetch ledger (Transactions) related to this ticket
        const transactions = await Transaction.find({ relatedEntityId: ticket.id }).lean();

        res.json({
            ticket,
            passenger: passenger ? { id: passenger.id, name: passenger.name, phone: passenger.phone } : null,
            driver: driver ? { id: driver.id, name: driver.name, phone: driver.phone, vehicleType: driver.vehicleType } : null,
            transactions
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TRAFFIC API ENDPOINTS ---
app.get('/api/traffic/overlay', async (req, res) => {
    try {
        const { north, south, east, west } = req.query;
        if (!north || !south || !east || !west) {
            return res.status(400).json({ error: 'Bounds required (north, south, east, west)' });
        }
        const bounds = { north: parseFloat(north), south: parseFloat(south), east: parseFloat(east), west: parseFloat(west) };
        const traffic = await getTrafficInBounds(bounds);
        res.json(traffic);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/traffic/route', async (req, res) => {
    try {
        const { coordinates } = req.body;
        if (!coordinates || coordinates.length < 2) {
            return res.status(400).json({ error: 'Route coordinates required' });
        }
        const traffic = await getTrafficAlongRoute(coordinates);
        res.json(traffic);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/trip/:tripId/status', Auth.authenticate, async (req, res) => {
    try {
        const status = await getTripLiveStatus(req.params.tripId);
        if (!status) return res.status(404).json({ error: 'Trip not found' });
        res.json(status);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const RECENT_RT_EVENTS_LIMIT = 1000;
const DRIVER_STREAM_THROTTLE_MS = 400;
const recentRealtimeEvents = [];
const lastDriverBroadcastAt = new Map();

const pushRealtimeEvent = (room, event, payload = {}) => {
    const message = normalizeRealtimePayload(event, payload);
    recentRealtimeEvents.push({ room, ...message });
    if (recentRealtimeEvents.length > RECENT_RT_EVENTS_LIMIT) {
        recentRealtimeEvents.shift();
    }
    io.to(room).emit(event, message);
    return message;
};

const replayRealtimeEvents = (room, sinceTimestamp) => {
    if (!sinceTimestamp) return [];
    return recentRealtimeEvents.filter((evt) => evt.room === room && evt.timestamp > sinceTimestamp);
};

// SUPER APP PHASE 3: Massive Clustering via Redis Pub/Sub
if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('🔗 Redis Adapter linked to Socket.IO. Clustering enabled!');
    }).catch(e => console.error("Redis clustering failed:", e));
} else {
    console.log('⚠️ REDIS_URL not provided. Socket.IO running in single-instance memory mode.');
}

registerTransportV1Routes(app, { io, pushRealtimeEvent });

/** Providers who joined `join_provider_room` also join this room — ticket demand deltas (no global `io.emit`). */
const PROVIDERS_TRANSPORT_DEMAND = 'providers_transport_demand';

function emitTicketsUpdated(ioInstance, ticketDoc) {
    if (!ticketDoc || !ioInstance) return;
    const plain = ticketDoc.toObject
        ? ticketDoc.toObject()
        : typeof ticketDoc === 'object'
            ? { ...ticketDoc }
            : null;
    if (!plain?.id) return;
    const uid = plain.userId;
    const did = plain.driverId;
    if (uid) ioInstance.to(toRoom.user(String(uid))).emit('tickets_updated', [plain]);
    if (did) ioInstance.to(toRoom.provider(String(did))).emit('tickets_updated', [plain]);
    ioInstance.to(PROVIDERS_TRANSPORT_DEMAND).emit('tickets_updated', [plain]);
}

app.post('/api/tickets/book', Auth.authenticate, async (req, res) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.json({ success: true, ticket });
        emitTicketsUpdated(io, ticket);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.set('emitTicketsDelta', (doc) => emitTicketsUpdated(io, doc));

// ---------------------------------------------------------
// WebSocket Event Handlers
io.on('connection', (socket) => {
    metrics.socketConnections += 1;
    console.log(`🔌 Socket connected: ${socket.id}`);
    let socketUser = null;
    try {
        const token = socket.handshake?.auth?.token || '';
        if (token) {
            const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
            socketUser = jwt.verify(raw, JWT_SECRET);
        }
    } catch (e) {
        socket.emit('auth_error', { message: 'Invalid socket token' });
    }

    socket.on('join_user_room', (userId) => {
        if (!userId) return;
        if (!socketUser || socketUser.id !== userId) return;
        socket.join(toRoom.user(userId));
    });

    socket.on('join_provider_room', (providerId) => {
        if (!providerId) return;
        if (!socketUser || socketUser.id !== providerId) return;
        if (socketUser.role === 'PASSENGER') return;
        socket.join(toRoom.provider(providerId));
        socket.join(PROVIDERS_TRANSPORT_DEMAND);
    });

    socket.on('join_order_room', (orderId) => {
        if (!orderId) return;
        socket.join(toRoom.order(orderId));
    });

    socket.on('replay_events_since', ({ room, sinceTimestamp }) => {
        if (!FEATURE_FLAGS.replaySync) return;
        if (!room || !sinceTimestamp) return;
        const events = replayRealtimeEvents(room, Number(sinceTimestamp));
        metrics.socketEventsReplayed += events.length;
        socket.emit('events_replay', { room, events });
    });

    // Legacy handler
    socket.on('driver_location_update', (data) => io.emit('vehicles_update', [data]));

    // --- NEW: Real-time Location Streaming ---

    // Driver goes online
    socket.on('driver_go_online', async (driverId) => {
        try {
            const { setDriverOnline } = await import('./services/driverAllocationService.js');
            await setDriverOnline(driverId);
            socket.join(`driver_${driverId}`);
            socket.driverId = driverId;
            console.log(`🟢 Driver ${driverId} online via socket ${socket.id}`);
        } catch (e) {
            console.error('Driver online error:', e);
        }
    });

    // Driver goes offline
    socket.on('driver_go_offline', async (driverId) => {
        try {
            const { setDriverOffline } = await import('./services/driverAllocationService.js');
            await setDriverOffline(driverId);
            socket.leave(`driver_${driverId}`);
            console.log(`⚫ Driver ${driverId} offline`);
        } catch (e) {
            console.error('Driver offline error:', e);
        }
    });

    // Driver location stream (high frequency updates)
    socket.on('driver_location_stream', async (data) => {
        try {
            const lastTs = lastDriverBroadcastAt.get(data.driverId) || 0;
            const now = Date.now();
            if (now - lastTs < DRIVER_STREAM_THROTTLE_MS) return;
            lastDriverBroadcastAt.set(data.driverId, now);

            const { updateDriverLocation } = await import('./services/driverAllocationService.js');
            await updateDriverLocation(data.driverId, data);

            // Process for traffic aggregation
            await processDriverLocation(data);

            // Update active trip if applicable
            await onDriverLocationUpdate(data.driverId, data);

            // 1000x: Feed driver speed into Speed Match Engine
            updateSpeedBuffer(data.driverId, {
                speed: data.speed || 0,
                lat: data.lat,
                lng: data.lng
            });

            // Broadcast to passengers subscribed to this driver
            io.to(toRoom.tracking(data.driverId)).emit('driver_location_broadcast', {
                driverId: data.driverId,
                lat: data.lat,
                lng: data.lng,
                heading: data.heading,
                speed: data.speed,
                timestamp: data.timestamp,
                isStationary: data.isStationary
            });
            pushRealtimeEvent(
                toRoom.provider(data.driverId),
                RT_EVENT.PROVIDER_LOCATION_UPDATED,
                { data: { driverId: data.driverId, lat: data.lat, lng: data.lng, speed: data.speed } }
            );

            // Also emit for legacy vehicle tracking
            if (FEATURE_FLAGS.dualPathLegacyEmit) {
                try {
                    const { getSeatInfo } = await import('./services/seatTrackingService.js');
                    const seatInfo = await getSeatInfo(data.driverId);
                    io.emit('vehicles_update', [{
                        id: data.driverId,
                        lat: data.lat,
                        lng: data.lng,
                        heading: data.heading,
                        speed: data.speed,
                        capacity: seatInfo?.seatsTotal || 20,
                        occupancy: seatInfo?.seatsOccupied || 0,
                        parcelsOnboard: seatInfo?.parcelsOnboard || 0
                    }]);
                } catch (err) {
                    io.emit('vehicles_update', [{
                        id: data.driverId,
                        lat: data.lat,
                        lng: data.lng,
                        heading: data.heading,
                        speed: data.speed
                    }]);
                }
            }

            // Silent route log recording for machine learning / scheduling training
            try {
                if (mongoose.connection && mongoose.connection.db) {
                    await mongoose.connection.db.collection('locationlogs').insertOne({
                        driverId: data.driverId,
                        location: {
                            type: 'Point',
                            coordinates: [parseFloat(data.lng), parseFloat(data.lat)]
                        },
                        speed: data.speed || 0,
                        timestamp: new Date()
                    });
                }
            } catch (err) {
                // Silently ignore logging failures to prevent stream interruption
            }

            // Phase 5: Snap driver position on their active trajectory
            updateDriverPosition(data.driverId, data.lat, data.lng);
        } catch (e) {
            console.error('Location stream error:', e);
        }
    });

    // Passenger subscribes to driver location
    socket.on('subscribe_driver', (driverId) => {
        socket.join(toRoom.tracking(driverId));
        console.log(`👁️ Socket ${socket.id} subscribed to driver ${driverId}`);
    });

    socket.on('unsubscribe_driver', (driverId) => {
        socket.leave(toRoom.tracking(driverId));
    });

    // --- 1000x: PASSENGER LOCATION STREAM (for Speed Match Engine) ---
    socket.on('passenger_location_stream', (data) => {
        if (!data.passengerId || !data.lat || !data.lng) return;
        socket.join(`passenger_${data.passengerId}`);
        socket.passengerId = data.passengerId;
        
        // Feed into speed match engine for auto-verification
        updateSpeedBuffer(data.passengerId, {
            speed: data.speed || 0,
            lat: data.lat,
            lng: data.lng
        });

        // Check if passenger is alighting (speed=0 near destination)
        if ((data.speed || 0) < 3) {
            checkAlighting(data.passengerId, data.lat, data.lng, data.speed || 0).catch(() => {});
        }
    });

    // --- 1000x: JOIN ROUTE ROOM (for live seat updates) ---
    socket.on('join_route', (routeId) => {
        socket.join(toRoom.route(routeId));
    });

    socket.on('leave_route', (routeId) => {
        socket.leave(toRoom.route(routeId));
    });

    // --- PHASE 5: TRAJECTORY MATCHING SOCKET EVENTS ---
    
    // Driver starts a trip and registers their trajectory polyline
    socket.on('driver_start_trip', async (data) => {
        try {
            let pathDetails = data.pathDetails;
            let distanceKm = data.distanceKm;
            let durationMin = data.durationMin;

            if (!pathDetails || pathDetails.length < 2) {
                const routeData = await Logic.getRealRoadPath(data.startLat, data.startLng, data.endLat, data.endLng);
                if (routeData && routeData.pathDetails && routeData.pathDetails.length > 0) {
                    pathDetails = routeData.pathDetails;
                    distanceKm = routeData.distance;
                    durationMin = routeData.duration;
                }
            }

            const trajPoints = (pathDetails || []).map((p) => ({
                lat: p.lat,
                lng: p.lng
            }));

            if (trajPoints.length >= 2) {
                registerTrajectory(data.driverId, trajPoints, {
                    driverName: data.driverName || 'Driver',
                    vehicleType: data.vehicleType || 'AUTO',
                    startName: data.startName || '',
                    endName: data.endName || '',
                    stopNames: Array.isArray(data.stopNames) ? data.stopNames : [],
                    distanceKm: distanceKm || 0,
                    durationMin: durationMin || 0
                });

                socket.emit('trip_trajectory_ready', {
                    success: true,
                    pointCount: trajPoints.length,
                    distanceKm: distanceKm || 0,
                    durationMin: durationMin || 0
                });

                console.log(`🛣️ Trip started: ${data.driverId} (${trajPoints.length} pts) stopNames=${(data.stopNames || []).length}`);
            } else {
                socket.emit('trip_trajectory_ready', { success: false, error: 'Could not calculate route' });
            }
        } catch (e) {
            console.error('Trip start error:', e);
            socket.emit('trip_trajectory_ready', { success: false, error: e.message });
        }
    });
    
    // Driver ends their trip
    socket.on('driver_end_trip', async (data) => {
        // Phase 5: HMM Map Matching & Shadow Logging
        // data should contain { driverId, vehicleType, startNode, endNode }
        // We retrieve their raw trajectory from the matcher before removing it
        try {
            const { activeDrivers } = await import('./services/trajectoryMatcher.js').catch(() => ({}));
            // NOTE: activeDrivers is internal to trajectoryMatcher, so we should instead
            // either expose a getter or pass the raw trip ping array directly in the socket payload.
            // For now, if the client sends rawPings back:
            if (data.rawPings && data.rawPings.length > 5) {
                harvestTrajectoryData({
                    driverId: data.driverId,
                    vehicleType: data.vehicleType || 'AUTO',
                    startNode: data.startNode || 'Unknown Start',
                    endNode: data.endNode || 'Unknown End',
                    rawPings: data.rawPings
                });
            }
        } catch(e) { console.error('Trajectory Harvest Err:', e); }

        removeTrajectory(data.driverId);
        console.log(`🏁 Trip ended: ${data.driverId}`);
    });
    
    socket.on('find_segment_by_stops', (data) => {
        try {
            const { fromStop, toStop, maxEtaMinutes } = data || {};
            if (!fromStop || !toStop) return;
            const vehicles = findMatchingVehiclesByStops(
                String(fromStop).trim(),
                String(toStop).trim(),
                Math.min(120, Math.max(5, parseInt(maxEtaMinutes, 10) || 30))
            );
            socket.emit('segment_vehicles', {
                count: vehicles.length,
                vehicles,
                fromStop,
                toStop,
                searchedAt: Date.now()
            });
            for (const v of vehicles) {
                socket.join(toRoom.tracking(v.driverId));
            }
        } catch (e) {
            console.error('find_segment_by_stops', e);
        }
    });

    // Passenger searches for vehicles on their route
    socket.on('find_vehicles_on_route', (data) => {
        // data = { startLat, startLng, endLat, endLng, passengerId }
        const vehicles = findMatchingVehicles(
            data.startLat, data.startLng,
            data.endLat, data.endLng,
            data.maxSnapKm || 1.5
        );
        
        socket.emit('vehicles_on_route', {
            count: vehicles.length,
            vehicles,
            searchedAt: Date.now()
        });
        
        // Auto-subscribe passenger to matching drivers for live tracking
        for (const v of vehicles) {
            socket.join(toRoom.tracking(v.driverId));
        }
        
        // Notify matched drivers about waiting passenger
        for (const v of vehicles) {
            io.to(`driver_${v.driverId}`).emit('passenger_waiting_ahead', {
                passengerId: data.passengerId,
                pickupName: data.startName || 'Pickup',
                dropoffName: data.endName || 'Dropoff',
                pickupLat: data.startLat,
                pickupLng: data.startLng,
                etaMinutes: v.etaMinutes
            });
        }
    });

    // Request ride - find nearby driver
    socket.on('request_ride', async (data) => {
        try {
            const { findBestDriver, assignDriverToTrip } = await import('./services/driverAllocationService.js');
            const { ActiveTrip } = await import('./models.js');

            const tripId = `TRIP-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            // Create pending trip
            const trip = new ActiveTrip({
                tripId,
                ticketId: data.ticketId,
                passengerId: data.passengerId,
                pickupLocation: data.pickup,
                dropoffLocation: data.dropoff,
                routePolyline: data.routePolyline || [],
                distanceKm: data.distanceKm,
                originalEtaMinutes: data.etaMinutes,
                currentEtaMinutes: data.etaMinutes,
                status: 'SEARCHING'
            });
            await trip.save();

            // Find best driver
            const driver = await findBestDriver(data.pickup.lat, data.pickup.lng);

            if (driver) {
                await assignDriverToTrip(tripId, driver.driverId);

                // Notify driver
                io.to(`driver_${driver.driverId}`).emit('ride_request', {
                    tripId,
                    pickup: data.pickup,
                    dropoff: data.dropoff,
                    passengerName: data.passengerName,
                    fare: data.fare
                });

                // Notify passenger
                socket.emit('driver_found', {
                    tripId,
                    driver: {
                        id: driver.driverId,
                        name: driver.driverName,
                        distance: driver.distance,
                        location: driver.location,
                        vehicleType: driver.vehicleType
                    }
                });
                pushRealtimeEvent(
                    toRoom.order(tripId),
                    RT_EVENT.ORDER_ASSIGNED,
                    { data: { tripId, providerId: driver.driverId, passengerId: data.passengerId, status: 'ASSIGNED' } }
                );
            } else {
                socket.emit('no_drivers_available', { tripId });
            }
        } catch (e) {
            console.error('Request ride error:', e);
            socket.emit('ride_error', { error: e.message });
        }
    });

    // Driver accepts/rejects ride
    socket.on('accept_ride', async (data) => {
        try {
            const { ActiveTrip } = await import('./models.js');
            await ActiveTrip.findOneAndUpdate(
                { tripId: data.tripId },
                { status: 'EN_ROUTE_PICKUP' }
            );

            const trip = await ActiveTrip.findOne({ tripId: data.tripId });
            if (trip) {
                io.to(`passenger_${trip.passengerId}`).emit('ride_accepted', {
                    tripId: data.tripId,
                    driverId: data.driverId,
                    eta: data.etaMinutes
                });
                pushRealtimeEvent(
                    toRoom.order(data.tripId),
                    RT_EVENT.ORDER_ACCEPTED,
                    { data: { tripId: data.tripId, providerId: data.driverId, passengerId: trip.passengerId, eta: data.etaMinutes } }
                );
            }
        } catch (e) {
            console.error('Accept ride error:', e);
        }
    });

    socket.on('order_status_update', (payload) => {
        if (!FEATURE_FLAGS.realtimeContractV1) return;
        if (!payload?.orderId || !payload?.status) return;
        const message = pushRealtimeEvent(
            toRoom.order(payload.orderId),
            RT_EVENT.ORDER_STATUS_CHANGED,
            { data: payload }
        );
        if (payload.userId) io.to(toRoom.user(payload.userId)).emit(RT_EVENT.ORDER_STATUS_CHANGED, message);
        if (payload.providerId) io.to(toRoom.provider(payload.providerId)).emit(RT_EVENT.ORDER_STATUS_CHANGED, message);
    });

    socket.on('reject_ride', async (data) => {
        try {
            const { releaseDriver, findBestDriver, assignDriverToTrip } = await import('./services/driverAllocationService.js');
            const { ActiveTrip } = await import('./models.js');

            await releaseDriver(data.driverId);

            // Try to find another driver
            const trip = await ActiveTrip.findOne({ tripId: data.tripId });
            if (trip) {
                const newDriver = await findBestDriver(trip.pickupLocation.lat, trip.pickupLocation.lng);
                if (newDriver && newDriver.driverId !== data.driverId) {
                    await assignDriverToTrip(data.tripId, newDriver.driverId);
                    io.to(`driver_${newDriver.driverId}`).emit('ride_request', {
                        tripId: data.tripId,
                        pickup: trip.pickupLocation,
                        dropoff: trip.dropoffLocation
                    });
                } else {
                    io.to(`passenger_${trip.passengerId}`).emit('no_drivers_available', { tripId: data.tripId });
                }
            }
        } catch (e) {
            console.error('Reject ride error:', e);
        }
    });

    // --- DYNAMIC RE-ROUTING HANDLERS ---
    socket.on('accept_reroute', async (data) => {
        try {
            await acceptReroute(data.tripId, data.driverId);
            console.log(`✅ Reroute accepted for trip ${data.tripId}`);
        } catch (e) {
            console.error('Accept reroute error:', e);
        }
    });

    socket.on('decline_reroute', async (data) => {
        try {
            await declineReroute(data.tripId);
            console.log(`❌ Reroute declined for trip ${data.tripId}`);
        } catch (e) {
            console.error('Decline reroute error:', e);
        }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
        if (socket.driverId) {
            try {
                const { setDriverOffline } = await import('./services/driverAllocationService.js');
                await setDriverOffline(socket.driverId);
                clearSpeedBuffer(socket.driverId); // 1000x: Clean up speed buffer
                console.log(`⚫ Driver ${socket.driverId} disconnected`);
            } catch (e) { }
        }
        if (socket.passengerId) {
            clearSpeedBuffer(socket.passengerId); // 1000x: Clean up passenger buffer
        }
        // Phase 5: Clean up trajectory on disconnect
        if (socket.driverId) {
            removeTrajectory(socket.driverId);
        }
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });

    // FIX: SAVE TICKET TO DB ON SOCKET EVENT
    socket.on('book_ticket', async (data) => {
        try {
            if (data && data.id) {
                const exists = await Ticket.findOne({ id: data.id });
                if (!exists) {
                    await new Ticket(data).save();
                    console.log(`🎟️ Ticket Saved via Socket: ${data.id}`);
                }
            }
        } catch (e) { console.error("Socket Booking Save Error", e); }
        if (data && data.id) {
            const row = await Ticket.findOne({ id: data.id }).lean();
            if (row) emitTicketsUpdated(io, row);
        }
    });

    /** Driver device decoded ultrasonic payload — server authorizes and notifies passenger. */
    socket.on('ultrasonic_verify_request', async (body) => {
        try {
            const payload = body?.payload;
            const driverId = body?.driverId;
            if (typeof payload !== 'string' || !driverId) return;
            if (!socketUser || String(socketUser.id) !== String(driverId)) return;

            let ticketId;
            let userIdFromPayload;
            if (payload.startsWith('TK|')) {
                const parts = payload.split('|');
                ticketId = parts[1]?.trim();
                userIdFromPayload = parts[2]?.trim();
            } else {
                ticketId = payload.trim();
            }
            if (!ticketId) return;

            const ticket = await Ticket.findOne({ id: ticketId });
            if (!ticket) {
                socket.emit('acoustic_verification_ack', { success: false, ticketId, reason: 'NOT_FOUND', version: 'v1' });
                return;
            }
            if (userIdFromPayload && String(ticket.userId) !== String(userIdFromPayload)) {
                const bad = { success: false, ticketId, reason: 'USER_MISMATCH', version: 'v1' };
                socket.emit('acoustic_verification_ack', bad);
                io.to(toRoom.user(String(ticket.userId))).emit('acoustic_verification_ack', bad);
                return;
            }
            if (ticket.driverId && String(ticket.driverId) !== String(driverId)) {
                socket.emit('acoustic_verification_ack', { success: false, ticketId, reason: 'WRONG_DRIVER', version: 'v1' });
                return;
            }
            if (ticket.status === 'BOARDED' || ticket.status === 'COMPLETED') {
                const ack = { success: true, ticketId, driverId, alreadyVerified: true, version: 'v1' };
                io.to(toRoom.user(String(ticket.userId))).emit('acoustic_verification_ack', ack);
                socket.emit('acoustic_verification_ack', ack);
                return;
            }
            if (ticket.status !== 'PENDING' && ticket.status !== 'PAID') {
                socket.emit('acoustic_verification_ack', {
                    success: false,
                    ticketId,
                    reason: 'INVALID_STATUS',
                    status: ticket.status,
                    version: 'v1'
                });
                return;
            }

            ticket.status = 'BOARDED';
            if (!ticket.driverId) ticket.driverId = driverId;
            await ticket.save();
            const plain = ticket.toObject ? ticket.toObject() : ticket;
            emitTicketsUpdated(io, plain);

            // Silently sync seat tracking numbers on boarding
            try {
                const { onPassengerBoard } = await import('./services/seatTrackingService.js');
                await onPassengerBoard(driverId, ticket.passengerCount || 1);
            } catch (seatErr) {
                console.error("Seat occupancy update failed during ultrasonic verify:", seatErr);
            }

            const ack = { success: true, ticketId, driverId, version: 'v1' };
            io.to(toRoom.user(String(ticket.userId))).emit('acoustic_verification_ack', ack);
            socket.emit('acoustic_verification_ack', ack);
        } catch (e) {
            console.error('ultrasonic_verify_request', e);
            socket.emit('acoustic_verification_ack', { success: false, reason: 'SERVER_ERROR', version: 'v1' });
        }
    });

    // Keep ticket status synchronized across user and provider clients.
    socket.on('update_ticket', async (payload) => {
        try {
            const ticketId = payload?.ticketId;
            const status = payload?.status;
            if (!ticketId || !status) return;

            const existing = await Ticket.findOne({ id: ticketId });
            if (!existing) return;
            if (!socketUser) return;
            const isOwner = String(existing.userId || '') === String(socketUser.id || '');
            const isAssignedProvider = String(existing.driverId || '') === String(socketUser.id || '');
            const isPrivileged = socketUser.role && socketUser.role !== 'PASSENGER';
            if (!isOwner && !isAssignedProvider && !isPrivileged) return;

            const updated = await Ticket.findOneAndUpdate(
                { id: ticketId },
                { $set: { status } },
                { new: true }
            );
            if (!updated) return;

            const ticket = updated.toObject ? updated.toObject() : updated;
            emitTicketsUpdated(io, ticket);
        } catch (e) {
            console.error('Socket ticket update error', e);
        }
    });
});


const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
// SPA fallback: only for non-.html routes. Explicit *.html requests must hit real MPA files
// (user.html, provider.html) or 404 — avoids returning index.html when those entries are missing from dist.
app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.endsWith('.html') && req.path !== '/index.html') {
        return res.status(404).type('text/plain').send('Not found');
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`VillageLink v3.5 Secure Server running on ${PORT}`);

    // Initialize real-time services with Socket.IO
    initializeTimeoutManager(io);
    initializeReroutingService(io);

    // 1000x: Initialize Speed Match Engine & Seat Tracking
    initializeSpeedMatchEngine(io);
    initializeSeatTracking(io);
    
    // Phase 5: Initialize Trajectory Matcher
    initializeTrajectoryMatcher(io);
    
    // Start Heavy Background Services
    startOSMPoller();
    startKeepAlive();
    console.log('🚀 Real-time Route Allocation Services initialized');
});
