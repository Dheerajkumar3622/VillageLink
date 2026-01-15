
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in paise (e.g., 100 for Rs. 1)
 * @param {string} currency - Currency code (e.g., 'INR')
 * @param {string} receipt - Unique receipt ID
 * @returns {Promise<Object>}
 */
export const createOrder = async (amount, currency = 'INR', receipt) => {
    try {
        const options = {
            amount: amount, // amount in the smallest currency unit
            currency: currency,
            receipt: receipt,
        };
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        throw error;
    }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean}
 */
export const verifySignature = (orderId, paymentId, signature) => {
    const text = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
        .update(text.toString())
        .digest("hex");

    return expectedSignature === signature;
};

/**
 * Process a refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount in paise (optional, full refund if omitted)
 * @returns {Promise<Object>}
 */
export const processRefund = async (paymentId, amount = null) => {
    try {
        const options = {};
        if (amount) options.amount = amount;

        const refund = await razorpay.payments.refund(paymentId, options);
        return refund;
    } catch (error) {
        console.error('Razorpay Refund Error:', error);
        throw error;
    }
};

/**
 * Fetch payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>}
 */
export const getPaymentDetails = async (paymentId) => {
    try {
        return await razorpay.payments.fetch(paymentId);
    } catch (error) {
        console.error('Razorpay Fetch Payment Error:', error);
        throw error;
    }
};

/**
 * Verify Razorpay Webhook Signature
 * @param {string} bodyString - Raw request body as string
 * @param {string} signature - x-razorpay-signature header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export const verifyWebhookSignature = (bodyString, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(bodyString)
        .digest('hex');
    return expectedSignature === signature;
};

/**
 * Create a Subscription Plan (e.g., Monthly Pass)
 * @param {string} name - Plan name
 * @param {number} amount - Amount in paise
 * @param {string} interval - 'daily', 'weekly', 'monthly', 'yearly'
 * @returns {Promise<Object>}
 */
export const createPlan = async (name, amount, interval = 'monthly') => {
    try {
        const plan = await razorpay.plans.create({
            period: interval,
            interval: 1, // Repeat every 1 interval
            item: {
                name: name,
                amount: amount,
                currency: 'INR'
            }
        });
        return plan;
    } catch (error) {
        console.error('Razorpay Plan Creation Error:', error);
        throw error;
    }
};

/**
 * Create a Subscription
 * @param {string} planId - Razorpay Plan ID
 * @param {number} totalCount - Number of billing cycles
 * @returns {Promise<Object>}
 */
export const createSubscription = async (planId, totalCount = 12) => {
    try {
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            total_count: totalCount,
            quantity: 1,
            customer_notify: 1
        });
        return subscription;
    } catch (error) {
        console.error('Razorpay Subscription Creation Error:', error);
        throw error;
    }
};
