
import express from 'express';
import * as PaymentService from '../services/paymentService.js';
import { FoodOrder, Payment } from '../models.js';
import * as Auth from '../auth.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', Auth.authenticate, async (req, res) => {
    try {
        const { orderId, amount } = req.body; // orderId is our internal ID (Food, Ticket, etc.)

        // Create Razorpay order (amount in paise)
        const rpOrder = await PaymentService.createOrder(Math.round(amount * 100), 'INR', `receipt_${orderId}`);

        // Save payment record as CREATED
        const payment = new Payment({
            id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            razorpayOrderId: rpOrder.id,
            userId: req.user.id,
            orderId: orderId,
            amount: amount,
            currency: 'INR',
            status: 'CREATED',
            createdAt: Date.now()
        });
        await payment.save();

        res.json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
            order: rpOrder
        });
    } catch (error) {
        console.error('Payment order creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify payment signature
router.post('/verify', Auth.authenticate, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

        const isValid = PaymentService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        // Update internal payment record
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId },
            {
                status: 'PAID',
                razorpayPaymentId,
                method: req.body.method || 'unknown'
            },
            { new: true }
        );

        // Update food order status
        await FoodOrder.findOneAndUpdate(
            { id: orderId },
            { status: 'PAID' }
        );

        res.json({ success: true, payment });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Refund payment
router.post('/refund/:orderId', Auth.authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        const payment = await Payment.findOne({ orderId, status: 'PAID' });
        if (!payment) {
            return res.status(404).json({ error: 'Successful payment not found for this order' });
        }

        const refund = await PaymentService.processRefund(payment.razorpayPaymentId);

        payment.status = 'REFUNDED';
        payment.refundId = refund.id;
        payment.refundedAt = Date.now();
        await payment.save();

        // Update food order status if needed
        await FoodOrder.findOneAndUpdate(
            { id: orderId },
            { status: 'CANCELLED' }
        );

        res.json({ success: true, refund });
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment history
// Webhook handler for Razorpay
router.post('/webhook', async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

    const signature = req.headers['x-razorpay-signature'];

    if (PaymentService.verifyWebhookSignature(JSON.stringify(req.body), signature, secret)) {
        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`Razorpay Webhook: ${event}`, payload);

        if (event === 'payment.captured') {
            const paymentId = payload.payment.entity.id;
            const orderId = payload.payment.entity.order_id;

            await Payment.findOneAndUpdate(
                { razorpayOrderId: orderId },
                {
                    status: 'PAID',
                    razorpayPaymentId: paymentId,
                    method: payload.payment.entity.method
                }
            );
        } else if (event === 'payment.failed') {
            const orderId = payload.payment.entity.order_id;
            await Payment.findOneAndUpdate(
                { razorpayOrderId: orderId },
                { status: 'FAILED' }
            );
        }

        res.json({ status: 'ok' });
    } else {
        res.status(400).send('Invalid signature');
    }
});

// Create Subscription Plan
router.post('/create-plan', Auth.authenticate, async (req, res) => {
    try {
        const { name, amount, interval } = req.body;
        const plan = await PaymentService.createPlan(name, Math.round(amount * 100), interval);
        res.json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Subscription
router.post('/subscribe', Auth.authenticate, async (req, res) => {
    try {
        const { planId } = req.body;
        const subscription = await PaymentService.createSubscription(planId);
        res.json({ success: true, subscription });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/history', Auth.authenticate, async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id })
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
