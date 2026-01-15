
import express from 'express';
import { parseIncomingSMS } from '../services/smsGateway.js';
import { handleDriverCommand } from '../services/keypadDriverService.js';
import { sendSMS } from '../services/smsGateway.js';

const router = express.Router();

/**
 * Public Webhook for SMS Provider
 */
router.post('/incoming', async (req, res) => {
    try {
        const incoming = parseIncomingSMS(req.body);
        if (!incoming) return res.status(400).send("Invalid Payload");

        console.log(`📩 Received SMS from ${incoming.from}: ${incoming.text}`);

        // Process command
        const responseText = await handleDriverCommand(incoming.from, incoming.text);

        // Send reply
        await sendSMS(incoming.from, responseText);

        res.status(200).send("OK");
    } catch (error) {
        console.error("SMS Route Error:", error);
        res.status(500).send("Error");
    }
});

/**
 * Simulation Endpoint (for Testing)
 * POST /api/sms/simulate { phoneNumber: "9xxxxxxxxx", text: "SCAN TKT-123" }
 */
router.post('/simulate', async (req, res) => {
    const { phoneNumber, text } = req.body;
    if (!phoneNumber || !text) return res.status(400).json({ error: "Missing fields" });

    const responseText = await handleDriverCommand(phoneNumber, text);

    // In simulation, we just return the "reply" in the response body
    res.json({
        sent: text,
        receivedReply: responseText
    });
});

export default router;
