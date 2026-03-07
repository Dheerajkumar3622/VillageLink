/**
 * Auth Microservice
 * Handles user authentication, registration, and JWT management
 * Database: PostgreSQL
 * Port: 3001
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window for auth endpoints
    message: 'Too many authentication attempts, please try again later'
});

// PostgreSQL Connection Pool
const pool = new pg.Pool({
    connectionString: process.env.AUTH_DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Initialize database schema
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone VARCHAR(15) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN', 'SHOPKEEPER', 'VENDOR')) DEFAULT 'PASSENGER',
                email VARCHAR(255),
                wallet_balance DECIMAL(10, 2) DEFAULT 0,
                credit_limit DECIMAL(10, 2) DEFAULT 500,
                is_verified BOOLEAN DEFAULT FALSE,
                is_banned BOOLEAN DEFAULT FALSE,
                did VARCHAR(100),
                profile_image TEXT,
                home_location JSONB,
                work_location JSONB,
                vehicle_type VARCHAR(50),
                license_number VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `);
        console.log('✅ Auth DB Schema initialized');
    } catch (e) {
        console.error('❌ Auth DB Schema error:', e.message);
    } finally {
        client.release();
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'auth',
        timestamp: new Date().toISOString()
    });
});

// Register
app.post('/register', authLimiter, async (req, res) => {
    const { name, phone, password, role = 'PASSENGER', email } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ error: 'Name, phone, and password are required' });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }

    try {
        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const did = `did:vl:${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;

        const result = await pool.query(
            `INSERT INTO users (name, phone, password, role, email, did) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, phone, role, email, wallet_balance, is_verified, did, created_at`,
            [name, phone, hashedPassword, role, email, did]
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, phone: user.phone, role: user.role },
            process.env.JWT_SECRET || 'villagelink-secret-2026',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                email: user.email,
                walletBalance: parseFloat(user.wallet_balance),
                isVerified: user.is_verified,
                did: user.did
            },
            token
        });
    } catch (e) {
        console.error('Registration error:', e);
        res.status(500).json({ error: 'Registration failed', details: e.message });
    }
});

// Login
app.post('/login', authLimiter, async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: 'Phone and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.is_banned) {
            return res.status(403).json({ error: 'Account has been suspended' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, phone: user.phone, role: user.role },
            process.env.JWT_SECRET || 'villagelink-secret-2026',
            { expiresIn: '30d' }
        );

        // Update last login
        await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                email: user.email,
                walletBalance: parseFloat(user.wallet_balance),
                creditLimit: parseFloat(user.credit_limit),
                isVerified: user.is_verified,
                did: user.did,
                vehicleType: user.vehicle_type,
                homeLocation: user.home_location,
                workLocation: user.work_location
            },
            token
        });
    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify Token
app.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ valid: false, error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'villagelink-secret-2026');
        const result = await pool.query(
            'SELECT id, name, phone, role, email, wallet_balance, is_verified, did FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ valid: false, error: 'User not found' });
        }

        res.json({ valid: true, user: result.rows[0] });
    } catch (e) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});

// Get User Profile
app.get('/profile/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, phone, role, email, wallet_balance, credit_limit, 
                    is_verified, did, profile_image, home_location, work_location,
                    vehicle_type, license_number, created_at
             FROM users WHERE id = $1`,
            [req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update User Profile
app.put('/profile/:userId', async (req, res) => {
    const { name, email, homeLocation, workLocation, vehicleType, licenseNumber, profileImage } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET 
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                home_location = COALESCE($3, home_location),
                work_location = COALESCE($4, work_location),
                vehicle_type = COALESCE($5, vehicle_type),
                license_number = COALESCE($6, license_number),
                profile_image = COALESCE($7, profile_image),
                updated_at = NOW()
             WHERE id = $8
             RETURNING id, name, phone, role, email, wallet_balance, is_verified`,
            [name, email, homeLocation, workLocation, vehicleType, licenseNumber, profileImage, req.params.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update Wallet Balance (internal use)
app.post('/wallet/update', async (req, res) => {
    const { userId, amount, type } = req.body; // type: 'ADD' or 'DEDUCT'

    try {
        const operator = type === 'ADD' ? '+' : '-';
        const result = await pool.query(
            `UPDATE users SET wallet_balance = wallet_balance ${operator} $1, updated_at = NOW()
             WHERE id = $2 RETURNING id, wallet_balance`,
            [Math.abs(amount), userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, balance: parseFloat(result.rows[0].wallet_balance) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Password Reset Request
app.post('/forgot-password', authLimiter, async (req, res) => {
    const { phone } = req.body;

    try {
        const result = await pool.query('SELECT id, name FROM users WHERE phone = $1', [phone]);

        if (result.rows.length === 0) {
            // Don't reveal if user exists
            return res.json({ success: true, message: 'If account exists, OTP will be sent' });
        }

        // Generate OTP (would integrate with SMS service)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in Redis or temp table (simplified here)
        // In production, use Redis with TTL

        res.json({ success: true, message: 'OTP sent to registered phone' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: List all users
app.get('/admin/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, phone, role, email, wallet_balance, is_verified, is_banned, created_at
             FROM users ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Verify/Ban User
app.post('/admin/user-action', async (req, res) => {
    const { userId, action, value } = req.body; // action: 'verify' or 'ban'

    try {
        const field = action === 'verify' ? 'is_verified' : 'is_banned';
        await pool.query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [value, userId]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🔐 Auth Microservice running on port ${PORT}`);
        console.log(`   Database: PostgreSQL`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
});

export default app;
