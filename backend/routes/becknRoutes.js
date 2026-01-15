/**
 * Beckn Protocol API Routes
 * 
 * ONDC-compliant endpoints for:
 * - Discovery (search)
 * - Selection
 * - Ordering
 * - Fulfillment tracking
 * - Cancellation
 * - Rating
 */

import express from 'express';

const router = express.Router();

// Beckn Protocol Version
const BECKN_VERSION = '1.1.0';
const DOMAIN = 'nic2004:60221'; // Mobility domain

// Network Registry (simulated)
const PROVIDERS = {
    'villagelink.in': {
        id: 'villagelink.in',
        name: 'VillageLink',
        modes: ['AUTO', 'SHARE_AUTO', 'BUS']
    },
    'namma-yatri.in': {
        id: 'namma-yatri.in',
        name: 'Namma Yatri',
        modes: ['AUTO', 'TAXI']
    }
};

// In-memory order storage
const orders = new Map();

// --- HELPER FUNCTIONS ---

function createContext(action, transactionId, messageId) {
    return {
        domain: DOMAIN,
        country: 'IND',
        city: 'std:080',
        action,
        core_version: BECKN_VERSION,
        bap_id: 'villagelink.in',
        bap_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/beckn`,
        transaction_id: transactionId || `txn_${Date.now()}`,
        message_id: messageId || `msg_${Date.now()}`,
        timestamp: new Date().toISOString()
    };
}

function parseGPS(gps) {
    const [lat, lng] = gps.split(',').map(Number);
    return { lat, lng };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- BECKN PROTOCOL ENDPOINTS ---

/**
 * Search - Find rides across network
 * POST /api/beckn/search
 */
router.post('/search', async (req, res) => {
    try {
        const { context, message } = req.body;
        const intent = message?.intent;

        if (!intent?.fulfillment) {
            return res.status(400).json({ error: 'Invalid search intent' });
        }

        const pickup = parseGPS(intent.fulfillment.start.location.gps);
        const dropoff = parseGPS(intent.fulfillment.end.location.gps);
        const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

        // Generate catalog with available rides
        const catalog = {
            descriptor: { name: 'VillageLink Mobility' },
            providers: [
                {
                    id: 'villagelink.in',
                    descriptor: { name: 'VillageLink', short_desc: 'Zero-commission mobility' },
                    items: [
                        {
                            id: `vl_auto_${Date.now()}`,
                            descriptor: { name: 'Auto Rickshaw', code: 'AUTO' },
                            price: { currency: 'INR', value: String(Math.round(20 + distance * 10)) },
                            fulfillment_id: 'auto_fulfill',
                            time: { duration: `PT${Math.round(distance * 3)}M` }
                        },
                        {
                            id: `vl_share_${Date.now()}`,
                            descriptor: { name: 'Share Auto', code: 'SHARE_AUTO' },
                            price: { currency: 'INR', value: String(Math.round(10 + distance * 5)) },
                            fulfillment_id: 'share_fulfill',
                            time: { duration: `PT${Math.round(distance * 4)}M` }
                        }
                    ],
                    fulfillments: [
                        {
                            id: 'auto_fulfill',
                            type: 'AUTO',
                            tracking: true,
                            start: { location: { gps: intent.fulfillment.start.location.gps } },
                            end: { location: { gps: intent.fulfillment.end.location.gps } }
                        },
                        {
                            id: 'share_fulfill',
                            type: 'SHARE_AUTO',
                            tracking: true,
                            start: { location: { gps: intent.fulfillment.start.location.gps } },
                            end: { location: { gps: intent.fulfillment.end.location.gps } }
                        }
                    ]
                }
            ]
        };

        // Return on_search callback format
        res.json({
            context: createContext('on_search', context?.transaction_id, context?.message_id),
            message: { catalog }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Select - Choose a specific ride option
 * POST /api/beckn/select
 */
router.post('/select', async (req, res) => {
    try {
        const { context, message } = req.body;
        const order = message?.order;

        if (!order?.items?.length) {
            return res.status(400).json({ error: 'No items selected' });
        }

        const item = order.items[0];
        const price = parseInt(item.price?.value) || 50;

        // Create quote with breakup
        const quote = {
            price: { currency: 'INR', value: String(price) },
            breakup: [
                { title: 'Base Fare', price: { currency: 'INR', value: '20' } },
                { title: 'Distance Charge', price: { currency: 'INR', value: String(price - 20) } }
            ]
        };

        res.json({
            context: createContext('on_select', context?.transaction_id),
            message: {
                order: {
                    ...order,
                    quote,
                    state: 'SELECTED'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Init - Initialize order with customer details
 * POST /api/beckn/init
 */
router.post('/init', async (req, res) => {
    try {
        const { context, message } = req.body;
        const order = message?.order;

        if (!order) {
            return res.status(400).json({ error: 'Order required' });
        }

        // Generate order ID
        const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const initializedOrder = {
            id: orderId,
            ...order,
            state: 'INITIALIZED',
            payment: {
                type: 'PRE-FULFILLMENT',
                status: 'NOT-PAID',
                params: {
                    amount: order.quote?.price?.value || '50',
                    currency: 'INR'
                }
            }
        };

        // Store order
        orders.set(orderId, initializedOrder);

        res.json({
            context: createContext('on_init', context?.transaction_id),
            message: { order: initializedOrder }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Confirm - Confirm and pay for order
 * POST /api/beckn/confirm
 */
router.post('/confirm', async (req, res) => {
    try {
        const { context, message } = req.body;
        const order = message?.order;

        if (!order?.id) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        const storedOrder = orders.get(order.id);
        if (!storedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status
        storedOrder.state = 'CONFIRMED';
        storedOrder.payment.status = 'PAID';
        storedOrder.fulfillment = {
            ...storedOrder.fulfillment,
            state: { descriptor: { code: 'SEARCHING', name: 'Searching for driver' } },
            agent: {
                name: 'Assigning Driver...',
                phone: ''
            }
        };

        orders.set(order.id, storedOrder);

        // Simulate driver assignment after 3 seconds
        setTimeout(() => {
            const updatedOrder = orders.get(order.id);
            if (updatedOrder) {
                updatedOrder.fulfillment.state = {
                    descriptor: { code: 'DRIVER_ASSIGNED', name: 'Driver assigned' }
                };
                updatedOrder.fulfillment.agent = {
                    name: 'Ramesh Kumar',
                    phone: '9876543210',
                    rating: '4.5'
                };
                updatedOrder.fulfillment.vehicle = {
                    registration: 'KA-01-AB-1234',
                    category: 'AUTO'
                };
                orders.set(order.id, updatedOrder);
            }
        }, 3000);

        res.json({
            context: createContext('on_confirm', context?.transaction_id),
            message: { order: storedOrder }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Status - Get order status
 * POST /api/beckn/status
 */
router.post('/status', async (req, res) => {
    try {
        const { context, message } = req.body;
        const orderId = message?.order_id;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        const order = orders.get(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            context: createContext('on_status', context?.transaction_id),
            message: { order }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Track - Get real-time tracking
 * POST /api/beckn/track
 */
router.post('/track', async (req, res) => {
    try {
        const { context, message } = req.body;
        const orderId = message?.order_id;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        const order = orders.get(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return tracking info
        res.json({
            context: createContext('on_track', context?.transaction_id),
            message: {
                tracking: {
                    url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${orderId}`,
                    status: order.fulfillment?.state?.descriptor?.code || 'UNKNOWN'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Cancel - Cancel order
 * POST /api/beckn/cancel
 */
router.post('/cancel', async (req, res) => {
    try {
        const { context, message } = req.body;
        const orderId = message?.order_id;
        const reason = message?.cancellation_reason_id;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID required' });
        }

        const order = orders.get(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.state = 'CANCELLED';
        order.cancellation = {
            reason: reason || 'User requested cancellation',
            cancelled_at: new Date().toISOString()
        };

        orders.set(orderId, order);

        res.json({
            context: createContext('on_cancel', context?.transaction_id),
            message: { order }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Rating - Submit rating
 * POST /api/beckn/rating
 */
router.post('/rating', async (req, res) => {
    try {
        const { context, message } = req.body;
        const rating = message?.rating;

        if (!rating?.id || rating?.value === undefined) {
            return res.status(400).json({ error: 'Rating details required' });
        }

        // Store rating (in production, save to database)
        console.log(`Rating received: Order ${rating.id}, Value: ${rating.value}`);

        res.json({
            context: createContext('on_rating', context?.transaction_id),
            message: {
                feedback_ack: true,
                rating_ack: true
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Support - Get support info
 * POST /api/beckn/support
 */
router.post('/support', async (req, res) => {
    try {
        const { context } = req.body;

        res.json({
            context: createContext('on_support', context?.transaction_id),
            message: {
                phone: '+91-1800-XXX-XXXX',
                email: 'support@villagelink.in',
                url: 'https://villagelink.in/support'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NETWORK DISCOVERY ---

/**
 * Get network participants
 */
router.get('/network/providers', (req, res) => {
    res.json(Object.values(PROVIDERS));
});

export default router;
