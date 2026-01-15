/**
 * Notification Microservice
 * Handles SMS (MSG91), Email, and Push Notifications
 * Database: Redis (queue) + MongoDB (logs)
 * Port: 3006
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ==================== SMS SERVICE (MSG91) ====================

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'VLINKS';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_API_URL = 'https://control.msg91.com/api/v5';

/**
 * Send SMS via MSG91
 * @param {string} to - Phone number (10 digits for India)
 * @param {string} message - SMS content
 * @param {string} templateId - Optional MSG91 template ID
 */
export const sendSMS = async (to, message, templateId = null) => {
    // Format phone number for India
    const formattedPhone = to.startsWith('+91') ? to :
        to.startsWith('91') ? `+${to}` :
            `+91${to}`;

    // Check if MSG91 is configured
    if (!MSG91_AUTH_KEY) {
        console.warn('⚠️ SMS: MSG91 not configured, using simulation mode');
        console.log(`📱 [SMS SIMULATION] To: ${formattedPhone}`);
        console.log(`   Message: ${message}`);

        return {
            success: true,
            messageId: `SIM-${Date.now()}`,
            simulated: true
        };
    }

    try {
        // MSG91 Flow API for transactional SMS
        const response = await fetch(`${MSG91_API_URL}/flow/`, {
            method: 'POST',
            headers: {
                'authkey': MSG91_AUTH_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                flow_id: templateId || MSG91_TEMPLATE_ID,
                sender: MSG91_SENDER_ID,
                mobiles: formattedPhone.replace('+', ''),
                VAR1: message // Variable in template
            })
        });

        const data = await response.json();

        if (data.type === 'success') {
            console.log(`✅ SMS Sent via MSG91: ${data.request_id}`);
            return {
                success: true,
                messageId: data.request_id,
                provider: 'MSG91'
            };
        } else {
            throw new Error(data.message || 'MSG91 API Error');
        }
    } catch (error) {
        console.error('❌ SMS Error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send OTP via MSG91
 */
export const sendOTP = async (phone, otp) => {
    const message = `Your VillageLink OTP is ${otp}. Valid for 10 minutes. Do not share.`;
    return await sendSMS(phone, message, process.env.MSG91_OTP_TEMPLATE_ID);
};

/**
 * Send Ticket Confirmation SMS
 */
export const sendTicketSMS = async (phone, ticketData) => {
    const message = `✅ VillageLink Ticket Booked!\nFrom: ${ticketData.from}\nTo: ${ticketData.to}\nID: ${ticketData.ticketId}\nFare: ₹${ticketData.fare}`;
    return await sendSMS(phone, message, process.env.MSG91_TICKET_TEMPLATE_ID);
};

/**
 * Send SOS Alert SMS
 */
export const sendSOSAlert = async (phone, location) => {
    const mapLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    const message = `🚨 SOS ALERT! User needs help.\nLocation: ${mapLink}`;
    return await sendSMS(phone, message, process.env.MSG91_SOS_TEMPLATE_ID);
};

// ==================== EMAIL SERVICE ====================

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'villagelink.official@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send Email
 */
export const sendEmail = async (to, subject, htmlContent) => {
    if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_app_specific_password') {
        console.warn('⚠️ Email: Credentials not configured, using simulation');
        console.log(`📧 [EMAIL SIMULATION] To: ${to}`);
        console.log(`   Subject: ${subject}`);
        return { success: true, simulated: true };
    }

    try {
        const info = await emailTransporter.sendMail({
            from: `"VillageLink" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        });

        console.log(`✅ Email Sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email Error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Welcome Email
 */
export const sendWelcomeEmail = async (to, userName) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🚌 VillageLink</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Rural Transportation Made Simple</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Welcome, ${userName}! 🎉</h2>
                <p style="color: #666; line-height: 1.6;">
                    Thank you for joining VillageLink. You can now:
                </p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>Book tickets for village-to-village travel</li>
                    <li>Track buses in real-time</li>
                    <li>Order from local food vendors</li>
                    <li>Send parcels across villages</li>
                    <li>Earn GramCoins with every trip!</li>
                </ul>
                <a href="https://villagelink.in" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    Start Exploring
                </a>
            </div>
            <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>VillageLink - Connecting Rural India</p>
            </div>
        </div>
    `;
    return await sendEmail(to, 'Welcome to VillageLink! 🚌', html);
};

/**
 * Send SOS Emergency Email
 */
export const sendSOSEmail = async (alertData) => {
    const { userId, userName, location, type } = alertData;
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #ff0000;">
            <div style="background: #ff0000; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🚨 EMERGENCY SOS ALERT 🚨</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #ff0000;">Immediate Attention Required</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>User:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${userName} (${userId})</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${type}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString('en-IN')}</td></tr>
                    <tr><td style="padding: 10px;"><strong>Location:</strong></td><td style="padding: 10px;"><a href="${mapLink}" style="color: #0066cc;">View on Map</a></td></tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 6px;">
                    <strong>⚠️ Action Required:</strong> Contact local authorities and dispatch help immediately.
                </div>
            </div>
        </div>
    `;

    return await sendEmail(
        process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        `🚨 SOS EMERGENCY - ${type} - ${userName}`,
        html
    );
};

// ==================== PUSH NOTIFICATIONS ====================

// Would integrate with Firebase Cloud Messaging (FCM) for mobile push
export const sendPushNotification = async (userId, title, body, data = {}) => {
    // Placeholder for FCM integration
    console.log(`📲 [PUSH] User: ${userId}, Title: ${title}`);
    return { success: true, simulated: true };
};

// ==================== API ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'notification',
        providers: {
            sms: MSG91_AUTH_KEY ? 'MSG91' : 'SIMULATION',
            email: process.env.EMAIL_PASS ? 'Gmail' : 'SIMULATION',
            push: 'FCM (pending)'
        }
    });
});

// Send SMS
app.post('/sms/send', async (req, res) => {
    const { to, message, templateId } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Phone and message required' });
    }

    const result = await sendSMS(to, message, templateId);
    res.json(result);
});

// Send OTP
app.post('/sms/otp', async (req, res) => {
    const { phone } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await sendOTP(phone, otp);

    // Store OTP in Redis (would integrate with Redis)
    // For now, return OTP in dev mode
    if (process.env.NODE_ENV !== 'production') {
        result.otp = otp; // Only for testing
    }

    res.json(result);
});

// Send Ticket SMS
app.post('/sms/ticket', async (req, res) => {
    const { phone, ticketData } = req.body;
    const result = await sendTicketSMS(phone, ticketData);
    res.json(result);
});

// Send Email
app.post('/email/send', async (req, res) => {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'To, subject, and html required' });
    }

    const result = await sendEmail(to, subject, html);
    res.json(result);
});

// Send Welcome Email
app.post('/email/welcome', async (req, res) => {
    const { email, userName } = req.body;
    const result = await sendWelcomeEmail(email, userName);
    res.json(result);
});

// Send SOS Alerts (SMS + Email)
app.post('/sos', async (req, res) => {
    const { userId, userName, phone, location, type = 'EMERGENCY' } = req.body;

    // Send to emergency contacts
    const smsResult = await sendSOSAlert(process.env.EMERGENCY_PHONE || phone, location);

    // Send to admin email
    const emailResult = await sendSOSEmail({ userId, userName, location, type });

    res.json({
        success: true,
        sms: smsResult,
        email: emailResult
    });
});

// Bulk notifications for drivers
app.post('/broadcast/drivers', async (req, res) => {
    const { driverPhones, message } = req.body;

    const results = await Promise.all(
        driverPhones.map(phone => sendSMS(phone, message))
    );

    res.json({
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    });
});

// Start server
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3006;

app.listen(PORT, () => {
    console.log(`📢 Notification Microservice running on port ${PORT}`);
    console.log(`   SMS Provider: ${MSG91_AUTH_KEY ? 'MSG91' : 'Simulation'}`);
    console.log(`   Email Provider: ${process.env.EMAIL_PASS ? 'Gmail' : 'Simulation'}`);
});

export default app;
