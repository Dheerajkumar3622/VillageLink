import express from 'express';
import { processSwarmNegotiation, getSwarmBids } from '../services/lmisSwarmNegotiator.js';

const router = express.Router();

/**
 * POST /api/v2/lmis/swarm/negotiate
 * Evaluates V2V/D2D micro-decisions and logs bid records.
 */
router.post('/negotiate', async (req, res) => {
    try {
        const { bidId, senderAgentId, receiverAgentId, type, details, offerAmountPoints } = req.body;
        
        if (!bidId || !senderAgentId || !receiverAgentId || !type) {
            return res.status(400).json({ error: 'Missing negotiation bid parameters' });
        }

        const negotiation = await processSwarmNegotiation(
            bidId,
            senderAgentId,
            receiverAgentId,
            type,
            details || {},
            offerAmountPoints || 0
        );

        res.json(negotiation);
    } catch (error) {
        console.error('Error in swarm negotiation route:', error);
        res.status(500).json({ error: 'Failed to negotiate swarm routing handoff' });
    }
});

/**
 * GET /api/v2/lmis/swarm/bids
 * Returns the recent swarm bids list.
 */
router.get('/bids', async (req, res) => {
    try {
        const bids = await getSwarmBids();
        res.json(bids);
    } catch (error) {
        console.error('Error listing swarm bids:', error);
        res.status(500).json({ error: 'Failed to retrieve active swarm bids' });
    }
});

export default router;
