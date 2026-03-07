/**
 * Payment Microservice
 * Handles Razorpay, Wallet, GramCoin, and Transaction Ledger
 * Database: PostgreSQL (financial ledger) + MongoDB (detailed logs)
 * Port: 3005
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pg from 'pg';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// PostgreSQL for financial transactions (ACID compliance)
const pool = new pg.Pool({
    connectionString: process.env.PAYMENT_DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20
});

// Razorpay Configuration
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

// Initialize database schema
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            -- Transactions Ledger (immutable)
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(50) PRIMARY KEY,
                user_id UUID NOT NULL,
                type VARCHAR(20) CHECK (type IN ('EARN', 'SPEND', 'REFUND', 'TRANSFER', 'REWARD')) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'INR',
                payment_method VARCHAR(20),
                description TEXT,
                related_entity_id VARCHAR(100),
                razorpay_order_id VARCHAR(100),
                razorpay_payment_id VARCHAR(100),
                status VARCHAR(20) DEFAULT 'COMPLETED',
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Wallet balances (current state)
            CREATE TABLE IF NOT EXISTS wallets (
                user_id UUID PRIMARY KEY,
                balance DECIMAL(10, 2) DEFAULT 0,
                gramcoin_balance DECIMAL(10, 2) DEFAULT 0,
                credit_used DECIMAL(10, 2) DEFAULT 0,
                credit_limit DECIMAL(10, 2) DEFAULT 500,
                last_transaction_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Pending payments (escrow-like)
            CREATE TABLE IF NOT EXISTS pending_payments (
                id VARCHAR(50) PRIMARY KEY,
                from_user_id UUID NOT NULL,
                to_user_id UUID,
                amount DECIMAL(10, 2) NOT NULL,
                type VARCHAR(20),
                expiry TIMESTAMP,
                status VARCHAR(20) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            -- GramCoin rewards tracking
            CREATE TABLE IF NOT EXISTS gramcoin_rewards (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                source VARCHAR(50), -- BOOKING, REFERRAL, REVIEW, DAILY_LOGIN
                source_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(created_at);
            CREATE INDEX IF NOT EXISTS idx_rewards_user ON gramcoin_rewards(user_id);
        `);
        console.log('✅ Payment DB Schema initialized');
    } catch (e) {
        console.error('❌ Payment DB Schema error:', e.message);
    } finally {
        client.release();
    }
};

// ==================== WALLET OPERATIONS ====================

/**
 * Get or create wallet for user
 */
const getWallet = async (userId) => {
    let result = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
        // Create wallet
        result = await pool.query(
            'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
            [userId]
        );
    }

    return result.rows[0];
};

/**
 * Update wallet balance with transaction
 */
const updateWalletBalance = async (userId, amount, type, description, metadata = {}) => {
    const client = await pool.connect();

    try {
        await client.begin();

        // Ensure wallet exists
        await client.query(
            'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
            [userId]
        );

        // Calculate balance change
        const balanceChange = type === 'EARN' || type === 'REFUND' || type === 'REWARD'
            ? Math.abs(amount)
            : -Math.abs(amount);

        // Update wallet
        const walletResult = await client.query(
            `UPDATE wallets SET 
                balance = balance + $1,
                last_transaction_at = NOW(),
                updated_at = NOW()
             WHERE user_id = $2
             RETURNING *`,
            [balanceChange, userId]
        );

        // Create transaction record
        const txnId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, description, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [txnId, userId, type, Math.abs(amount), description, JSON.stringify(metadata)]
        );

        await client.query('COMMIT');

        return {
            success: true,
            balance: parseFloat(walletResult.rows[0].balance),
            transactionId: txnId
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// ==================== RAZORPAY INTEGRATION ====================

/**
 * Create Razorpay order
 */
const createRazorpayOrder = async (amount, currency = 'INR', receipt = null) => {
    const options = {
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency,
        receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    return order;
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpayPayment = (orderId, paymentId, signature) => {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
};

// ==================== GRAMCOIN OPERATIONS ====================

/**
 * Award GramCoins to user
 */
const awardGramCoins = async (userId, amount, source, sourceId = null) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Ensure wallet exists
        await client.query(
            'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
            [userId]
        );

        // Update GramCoin balance
        await client.query(
            `UPDATE wallets SET 
                gramcoin_balance = gramcoin_balance + $1,
                updated_at = NOW()
             WHERE user_id = $2`,
            [amount, userId]
        );

        // Record reward
        await client.query(
            `INSERT INTO gramcoin_rewards (user_id, amount, source, source_id)
             VALUES ($1, $2, $3, $4)`,
            [userId, amount, source, sourceId]
        );

        await client.query('COMMIT');

        console.log(`🪙 Awarded ${amount} GramCoins to user ${userId} (${source})`);
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Spend GramCoins
 */
const spendGramCoins = async (userId, amount, description) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check balance
        const wallet = await client.query(
            'SELECT gramcoin_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
            [userId]
        );

        if (!wallet.rows[0] || parseFloat(wallet.rows[0].gramcoin_balance) < amount) {
            throw new Error('Insufficient GramCoin balance');
        }

        // Deduct GramCoins
        await client.query(
            `UPDATE wallets SET 
                gramcoin_balance = gramcoin_balance - $1,
                updated_at = NOW()
             WHERE user_id = $2`,
            [amount, userId]
        );

        // Create transaction
        const txnId = `GC-${Date.now()}`;
        await client.query(
            `INSERT INTO transactions (id, user_id, type, amount, description, payment_method)
             VALUES ($1, $2, 'SPEND', $3, $4, 'GRAMCOIN')`,
            [txnId, userId, amount, description]
        );

        await client.query('COMMIT');
        return { success: true, transactionId: txnId };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// ==================== API ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'payment',
        razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'missing'
    });
});

// Get Razorpay config (public key only)
app.get('/config', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// Get wallet balance
app.get('/wallet/:userId', async (req, res) => {
    try {
        const wallet = await getWallet(req.params.userId);
        res.json({
            balance: parseFloat(wallet.balance),
            gramcoinBalance: parseFloat(wallet.gramcoin_balance),
            creditUsed: parseFloat(wallet.credit_used),
            creditLimit: parseFloat(wallet.credit_limit),
            availableCredit: parseFloat(wallet.credit_limit) - parseFloat(wallet.credit_used)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get transaction history
app.get('/transactions/:userId', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const result = await pool.query(
            `SELECT * FROM transactions WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [req.params.userId, limit, offset]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create Razorpay order
app.post('/order/create', async (req, res) => {
    try {
        const { amount, currency = 'INR', userId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }

        const order = await createRazorpayOrder(amount, currency, `order_${userId}_${Date.now()}`);
        res.json(order);
    } catch (e) {
        console.error('Order creation error:', e);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify payment
app.post('/order/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = req.body;

        const isValid = verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        // Add to wallet
        const result = await updateWalletBalance(userId, amount, 'EARN', 'Wallet Recharge', {
            razorpay_order_id,
            razorpay_payment_id
        });

        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Process payment for booking
app.post('/pay', async (req, res) => {
    try {
        const { userId, amount, paymentMethod, description, relatedEntityId } = req.body;

        if (paymentMethod === 'WALLET') {
            // Check wallet balance
            const wallet = await getWallet(userId);
            if (parseFloat(wallet.balance) < amount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            // Deduct from wallet
            const result = await updateWalletBalance(userId, amount, 'SPEND', description, { relatedEntityId });
            return res.json({ success: true, ...result });
        }

        if (paymentMethod === 'GRAMCOIN') {
            const result = await spendGramCoins(userId, amount, description);
            return res.json(result);
        }

        if (paymentMethod === 'CREDIT') {
            // Use credit line
            const wallet = await getWallet(userId);
            const availableCredit = parseFloat(wallet.credit_limit) - parseFloat(wallet.credit_used);

            if (availableCredit < amount) {
                return res.status(400).json({ error: 'Credit limit exceeded' });
            }

            await pool.query(
                'UPDATE wallets SET credit_used = credit_used + $1 WHERE user_id = $2',
                [amount, userId]
            );

            return res.json({ success: true, creditUsed: amount });
        }

        // For ONLINE payment, caller should use create order + verify flow
        res.json({ success: true, paymentMethod, requiresOnlinePayment: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add earnings (for drivers)
app.post('/earnings/add', async (req, res) => {
    try {
        const { userId, amount, description, relatedEntityId } = req.body;
        const result = await updateWalletBalance(userId, amount, 'EARN', description, { relatedEntityId });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Award GramCoins
app.post('/gramcoin/award', async (req, res) => {
    try {
        const { userId, amount, source, sourceId } = req.body;
        await awardGramCoins(userId, amount, source, sourceId);
        res.json({ success: true, awarded: amount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Withdraw request
app.post('/withdraw', async (req, res) => {
    try {
        const { userId, amount, bankDetails } = req.body;

        const wallet = await getWallet(userId);
        if (parseFloat(wallet.balance) < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create pending withdrawal
        const withdrawId = `WD-${Date.now()}`;
        await pool.query(
            `INSERT INTO pending_payments (id, from_user_id, amount, type, status)
             VALUES ($1, $2, $3, 'WITHDRAWAL', 'PENDING')`,
            [withdrawId, userId, amount]
        );

        // Deduct from wallet
        await updateWalletBalance(userId, amount, 'SPEND', 'Withdrawal Request', { withdrawId });

        res.json({ success: true, withdrawId, status: 'PENDING' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start server
const PORT = process.env.PAYMENT_SERVICE_PORT || 3005;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`💳 Payment Microservice running on port ${PORT}`);
        console.log(`   Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured'}`);
        console.log(`   Database: PostgreSQL`);
    });
});

export default app;
