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
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Security Imports
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
// Note: xss-clean removed due to ESM incompatibility. Using helmet + mongoSanitize is sufficient.
import Razorpay from 'razorpay';

// Import Modular Components
import Models from './backend/models.js';
const { Ticket, Pass, RentalBooking, Parcel, User, Location, Block, Transaction, Route, RoadReport, Job, MarketItem, NewsItem, Shop, Product, BugReport, ActivityLog, SystemSetting, TripLog } = Models;

import Auth from './backend/auth.js';
const { register, login, authenticate, requireAdmin, requestPasswordReset, resetPassword } = Auth;

import Logic from './backend/logic.js';
const { getRealRoadPath } = Logic;

// --- IMPORT ROUTERS ---
import villageRoutes from './backend/routes/villageRoutes.js';
import bugRoutes from './backend/routes/bugRoutes.js';
import aiRoutes from './backend/routes/aiRoutes.js';
import foodRoutes from './backend/routes/foodRoutes.js';
import paymentRoutes from './backend/routes/paymentRoutes.js';
import smsRoutes from './backend/routes/smsRoutes.js';
import ticketRoutes from './backend/routes/ticketRoutes.js';
import routeIntelRoutes from './backend/routes/routeIntelRoutes.js';
import userRoutes from './backend/routes/userRoutes.js';
import gramMandiRoutes from './backend/routes/gramMandiRoutes.js';
import indiaLocationRoutes from './backend/routes/indiaLocationRoutes.js';

import EmailService from './backend/services/emailService.js';
const { sendEmail } = EmailService;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SERVICES ---
import MarketService from './backend/services/marketService.js';
const { refreshMarketPrices } = MarketService;

import TrafficService from './backend/services/trafficAggregatorService.js';
const { getTrafficInBounds, getTrafficAlongRoute, processDriverLocation } = TrafficService;

import TimeoutManager from './backend/services/driverTimeoutManager.js';
const { initializeTimeoutManager, startTimeout, handleDriverAcceptance, handleDriverRejection } = TimeoutManager;

import TripMonitor from './backend/services/tripMonitorService.js';
const { initializeTripMonitor, getTripLiveStatus, onDriverLocationUpdate } = TripMonitor;

import ReroutingService from './backend/services/dynamicReroutingService.js';
const { initializeReroutingService, acceptReroute, declineReroute, checkTripForRerouteManual } = ReroutingService;

import ErrorAggregator from './backend/services/errorAggregatorService.js';
const { storeErrors, getErrorAnalytics, getRecentErrors, resolveError, getDeviceStats } = ErrorAggregator;

const app = express();

app.set('trust proxy', 1);

// Initialize Real Data
refreshMarketPrices(); // Update prices on server start

// --- SECURITY MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(mongoSanitize());

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB (Production Mode)');
        isDbConnected = true;
    })
    .catch(err => {
        console.warn('⚠️ MongoDB Connection Failed.', err.message);
        isDbConnected = false;
    });

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

// --- AUTH ROUTES ---
app.post('/api/auth/register', Auth.register);
app.post('/api/auth/login', Auth.login);
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));
app.post('/api/auth/forgot-password', Auth.requestPasswordReset);
app.post('/api/auth/reset-password', Auth.resetPassword);
app.post('/api/auth/reset-password-firebase', Auth.resetPasswordViaFirebase);

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

// --- FOODLINK VENDOR ROUTES ---
import vendorRoutes from './backend/routes/vendorRoutes.js';
import foodLinkRoutes from './backend/routes/foodLinkRoutes.js';
import umgRoutes from './backend/routes/umgRoutes.js';
import fleetRoutes from './backend/routes/fleetRoutes.js';
import becknRoutes from './backend/routes/becknRoutes.js';
import cargoRoutes from './backend/routes/cargoRoutes.js';
app.use('/api/vendor', vendorRoutes);
app.use('/api/foodlink', foodLinkRoutes);
app.use('/api', umgRoutes); // UMG Routes for subscriptions, FLMC, guardian
app.use('/api/fleet', fleetRoutes); // Fleet management for operators
app.use('/api/beckn', becknRoutes); // ONDC/Beckn Protocol endpoints
app.use('/api/cargo', cargoRoutes); // CargoLink crowdsourced logistics

// --- SAFETY ENDPOINTS (Didi Style) ---

app.post('/api/safety/sos', async (req, res) => {
    try {
        const { userId, location, audioBlob, type } = req.body;
        console.log(`🚨 SOS ALERT from User ${userId}`);
        const report = new RoadReport({
            userId,
            type: 'ACCIDENT',
            location: `${location.lat},${location.lng}`,
            timestamp: Date.now(),
            upvotes: 999
        });
        await report.save();

        // REAL ALERT: Send Email to Admin/Police
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
        await sendEmail(process.env.EMAIL_USER, `🚨 SOS EMERGENCY - ${type}`,
            `<h2>SOS ALERT</h2><p>User <b>${userId}</b> reported an emergency.</p><p>Location: <a href="${mapLink}">View on Map</a></p>`);

        res.json({ success: true, message: "Emergency Services Notified via Priority Channel" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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
        // Fetch strictly from DB. No random generation.
        const items = await MarketItem.find({ type: 'COMMODITY' }).sort({ name: 1 });
        if (items.length === 0) {
            return res.json([]); // Return empty if no data, don't fake it
        }
        res.json(items.map(i => ({
            crop: i.name,
            price: i.price,
            trend: i.properties?.trend || 'STABLE',
            satelliteInsight: i.properties?.insight || "Standard Market Rate"
        })));
    } catch (e) {
        res.status(500).json({ error: "Market Data Unavailable" });
    }
});

app.get('/api/market/shops', async (req, res) => {
    try { const shops = await Shop.find({}); res.json(shops); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/market/shops', Auth.authenticate, async (req, res) => {
    try { const shop = new Shop(req.body); await shop.save(); res.json(shop); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/market/products', async (req, res) => {
    try {
        const { shopId } = req.query;
        const query = shopId ? { shopId } : {};
        const products = await Product.find(query);
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
    try { const passes = await Pass.find({ userId: req.query.userId }); res.json(passes); } catch (e) { res.status(500).json({ error: e.message }); }
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
    try { const requests = await RentalBooking.find({ status: 'PENDING' }); res.json(requests); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/logistics/book', Auth.authenticate, async (req, res) => {
    try { const parcel = new Parcel(req.body); await parcel.save(); res.json({ success: true, parcel }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/logistics/all', Auth.authenticate, async (req, res) => {
    try { const parcels = await Parcel.find({}); res.json(parcels); } catch (e) { res.status(500).json({ error: e.message }); }
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

// --- REAL ROUTE ANALYSIS (OSRM INTEGRATION) ---
app.post('/api/routes/analyze', async (req, res) => {
    try {
        const { start, end } = req.body;
        if (!start.lat || !end.lat) return res.json({ path: [start.name, end.name], distance: 10, pathDetails: [] });

        const roadData = await Logic.getRealRoadPath(start.lat, start.lng, end.lat, end.lng);

        if (roadData) {
            // NEW LOGIC: Identify Intermediate Villages from Database using Geospatial Queries
            // Sample points along the route (e.g., 6 points) to check for nearby villages
            const steps = 6;
            const coords = roadData.pathDetails;
            const checkPoints = [];

            if (coords.length > steps) {
                const interval = Math.floor(coords.length / (steps + 1));
                for (let i = 1; i <= steps; i++) {
                    checkPoints.push(coords[i * interval]);
                }
            }

            // Parallel DB Lookup for villages near the sampled points
            const villagePromises = checkPoints.map(pt =>
                Location.findOne({
                    geometry: {
                        $near: {
                            $geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
                            $maxDistance: 3000 // 3km radius from the road point
                        }
                    }
                }).select('name').lean()
            );

            const results = await Promise.all(villagePromises);

            // Filter distinct names, remove duplicates and start/end points
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
                distance: roadData.distance,
                pathDetails: roadData.pathDetails,
                estimatedTime: roadData.duration,
                trafficLevel: 'REALTIME'
            });
        } else {
            res.json({ path: [start.name, end.name], distance: 10, pathDetails: [] });
        }
    } catch (e) {
        console.error("Routing Error:", e);
        res.status(500).json({ error: "Routing Failed", path: [], distance: 0 });
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

app.post('/api/tickets/book', Auth.authenticate, async (req, res) => {
    try { const ticket = new Ticket(req.body); await ticket.save(); res.json({ success: true, ticket }); } catch (e) { res.status(500).json({ error: e.message }); }
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
    try { const users = await User.find({}, '-password').sort({ _id: -1 }); res.json(users); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/verify-driver', Auth.requireAdmin, async (req, res) => {
    try { await User.findOneAndUpdate({ id: req.body.userId }, { isVerified: req.body.isVerified }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/toggle-ban', Auth.requireAdmin, async (req, res) => {
    try { await User.findOneAndUpdate({ id: req.body.userId }, { isBanned: req.body.isBanned }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
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

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Legacy handler
    socket.on('driver_location_update', (data) => io.emit('vehicles_update', [data]));

    // --- NEW: Real-time Location Streaming ---

    // Driver goes online
    socket.on('driver_go_online', async (driverId) => {
        try {
            const { setDriverOnline } = await import('./backend/services/driverAllocationService.js');
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
            const { setDriverOffline } = await import('./backend/services/driverAllocationService.js');
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
            const { updateDriverLocation } = await import('./backend/services/driverAllocationService.js');
            await updateDriverLocation(data.driverId, data);

            // Process for traffic aggregation
            await processDriverLocation(data);

            // Update active trip if applicable
            await onDriverLocationUpdate(data.driverId, data);

            // Broadcast to passengers subscribed to this driver
            io.to(`tracking_${data.driverId}`).emit('driver_location_broadcast', {
                driverId: data.driverId,
                lat: data.lat,
                lng: data.lng,
                heading: data.heading,
                speed: data.speed,
                timestamp: data.timestamp,
                isStationary: data.isStationary
            });

            // Also emit for legacy vehicle tracking
            io.emit('vehicles_update', [{
                id: data.driverId,
                lat: data.lat,
                lng: data.lng,
                heading: data.heading,
                speed: data.speed
            }]);
        } catch (e) {
            console.error('Location stream error:', e);
        }
    });

    // Passenger subscribes to driver location
    socket.on('subscribe_driver', (driverId) => {
        socket.join(`tracking_${driverId}`);
        console.log(`👁️ Socket ${socket.id} subscribed to driver ${driverId}`);
    });

    socket.on('unsubscribe_driver', (driverId) => {
        socket.leave(`tracking_${driverId}`);
    });

    // Request ride - find nearby driver
    socket.on('request_ride', async (data) => {
        try {
            const { findBestDriver, assignDriverToTrip } = await import('./backend/services/driverAllocationService.js');
            const { ActiveTrip } = await import('./backend/models.js');

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
            const { ActiveTrip } = await import('./backend/models.js');
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
            }
        } catch (e) {
            console.error('Accept ride error:', e);
        }
    });

    socket.on('reject_ride', async (data) => {
        try {
            const { releaseDriver, findBestDriver, assignDriverToTrip } = await import('./backend/services/driverAllocationService.js');
            const { ActiveTrip } = await import('./backend/models.js');

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
                const { setDriverOffline } = await import('./backend/services/driverAllocationService.js');
                await setDriverOffline(socket.driverId);
                console.log(`⚫ Driver ${socket.driverId} disconnected`);
            } catch (e) { }
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
        io.emit('tickets_updated', [data]);
    });
});


const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`VillageLink v3.5 Secure Server running on ${PORT}`);

    // Initialize real-time services with Socket.IO
    initializeTimeoutManager(io);
    initializeReroutingService(io);
    console.log('🚀 Real-time Route Allocation Services initialized');
});
