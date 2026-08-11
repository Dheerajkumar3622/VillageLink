
import express from 'express';
// Using namespace import for ESM/CJS compatibility  
import * as Models from '../models.js';
const {
    User, Shop, FoodVendor,
    BulkOrder, VendorKhata, HygieneAudit, CreditScore, LoanApplication,
    PreOrder, DhabaAmenity, HotspotProvider,
    MenuVote, EatSkipStatus, WasteEntry, PrepSheet,
    GuestProfile, Inventory, PurchaseOrder, TrainingModule
} = Models;
import * as Auth from '../auth.js';
import crypto from 'crypto';

const router = express.Router();

// Helper
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// ==================== VYAPAR SAATHI (Strategies) ====================

// 1. Digital Khata
router.get('/khata', Auth.authenticate, async (req, res) => {
    try {
        const entries = await VendorKhata.find({ vendorId: req.user.id }).sort({ date: -1 });
        res.json(entries);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/khata', Auth.authenticate, async (req, res) => {
    try {
        const { type, amount, description, customerName, customerPhone } = req.body;
        const entry = new VendorKhata({
            id: generateId('KHA'),
            vendorId: req.user.id,
            date: new Date().toISOString(),
            type,
            amount,
            description,
            customerName,
            customerPhone,
            isVoiceEntry: false // Could be true if came from voice
        });
        await entry.save();
        res.json({ success: true, entry });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Bulk Ordering (Aggregation)
router.get('/bulk-orders', Auth.authenticate, async (req, res) => {
    try {
        const orders = await BulkOrder.find({ status: 'OPEN' });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk-orders/join', Auth.authenticate, async (req, res) => {
    try {
        const { orderId, quantity } = req.body;
        const order = await BulkOrder.findOne({ id: orderId });
        if (!order) return res.status(404).json({ error: "Order not found" });

        order.participants.push({
            vendorId: req.user.id,
            quantity,
            joinedAt: new Date().toISOString()
        });
        order.currentQuantity += quantity;

        await order.save();
        res.json({ success: true, order });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Hygiene Audit
router.post('/hygiene/audit', Auth.authenticate, async (req, res) => {
    try {
        const { photoUrl, checklist } = req.body;
        // Mock AI Score
        const aiScore = Math.floor(Math.random() * 20) + 80;

        const audit = new HygieneAudit({
            id: generateId('HYG'),
            vendorId: req.user.id,
            date: new Date().toISOString(),
            photoUrl,
            checklist,
            aiScore,
            status: 'APPROVED' // Auto-approve for demo
        });
        await audit.save();
        res.json({ success: true, audit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Credit Score & Loans
router.get('/credit-score', Auth.authenticate, async (req, res) => {
    try {
        let score = await CreditScore.findOne({ vendorId: req.user.id });
        if (!score) {
            // Generate Mock Score
            score = new CreditScore({
                vendorId: req.user.id,
                score: 720,
                tier: 'GOOD',
                lastUpdated: new Date().toISOString()
            });
            await score.save();
        }
        res.json(score);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/loans/apply', Auth.authenticate, async (req, res) => {
    try {
        const { amount, purpose, scheme } = req.body;
        const application = new LoanApplication({
            id: generateId('LN'),
            vendorId: req.user.id,
            amount,
            purpose,
            scheme,
            status: 'submitted',
            appliedDate: new Date().toISOString()
        });
        await application.save();
        res.json({ success: true, application });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==================== HIGHWAY HOST (Dhaba) ====================

// 1. Amenities
router.get('/dhaba/amenities/:dhabaId', async (req, res) => {
    try {
        const amenities = await DhabaAmenity.findOne({ dhabaId: req.params.dhabaId });
        res.json(amenities || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/dhaba/amenities', Auth.authenticate, async (req, res) => {
    try {
        // Find user's dhaba
        const shop = await Shop.findOne({ ownerId: req.user.id }); // Assuming 1:1
        if (!shop) return res.status(404).json({ error: 'Dhaba not found' });

        const amenities = await DhabaAmenity.findOneAndUpdate(
            { dhabaId: shop.id },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json({ success: true, amenities });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Pre-orders (Just-in-Time)
router.post('/highway/preorder', Auth.authenticate, async (req, res) => {
    try {
        const { dhabaId, items, arrivalTime, vehicleNumber } = req.body;
        const preorder = new PreOrder({
            id: generateId('PRE'),
            userId: req.user.id,
            dhabaId,
            items,
            estimatedArrival: arrivalTime,
            vehicleNumber,
            status: 'CONFIRMED'
        });
        await preorder.save();
        res.json({ success: true, preorder });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==================== MESS MATE (Institutional) ====================

// 1. Menu Voting
router.get('/mess/vote/:messId', Auth.authenticate, async (req, res) => {
    try {
        // Find tomorrow's active voting session (active till end of today)
        let vote = await MenuVote.findOne({ messId: req.params.messId, votingEndsAt: { $gt: new Date() } });
        if (!vote) {
            // Auto-seed a voting session for tomorrow's dinner
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            const votingEndsAt = new Date();
            votingEndsAt.setHours(23, 59, 59, 999); // Active till end of today

            vote = new MenuVote({
                id: `vote_${Date.now()}`,
                messId: req.params.messId,
                date: tomorrowStr,
                mealType: 'DINNER',
                options: [
                    { dishId: 'd1', dishName: 'Aloo Gobi & Dal', votes: 45, voters: [] },
                    { dishId: 'd2', dishName: 'Mix Veg & Kadhi', votes: 32, voters: [] },
                    { dishId: 'd3', dishName: 'Egg Curry & Rice', votes: 78, voters: [] }
                ],
                votingEndsAt: votingEndsAt,
                totalVotes: 155
            });
            await vote.save();
        }
        res.json(vote);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/mess/vote', Auth.authenticate, async (req, res) => {
    try {
        const { voteId, optionId } = req.body;
        const vote = await MenuVote.findOne({ id: voteId });
        if (!vote) return res.status(404).json({ error: "Vote session not found" });

        const userId = req.user.id;
        // Check if user has already voted
        const alreadyVoted = vote.options.some(o => o.voters.includes(userId));
        if (alreadyVoted) {
            return res.status(400).json({ error: "User has already voted in this session" });
        }

        // Find option and increment
        const option = vote.options.find(o => o.dishId === optionId);
        if (option) {
            option.votes += 1;
            option.voters.push(userId);
            vote.totalVotes += 1;
            await vote.save();
            res.json({ success: true, vote });
        } else {
            res.status(400).json({ error: "Invalid dish option" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Prep Sheet
router.get('/mess/prepsheet', Auth.authenticate, async (req, res) => {
    try {
        // Find user's mess shop
        const shop = await Shop.findOne({ ownerId: req.user.id });
        const messId = shop?.id || 'mess_1';
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];

        // Retrieve EatSkipStatus aggregates to determine confirmed headcount
        const statusRecord = await EatSkipStatus.findOne({ messId, date: dateStr, mealType: 'DINNER' });
        
        let eatingCount = 0;
        let skippingCount = 0;
        if (statusRecord) {
            eatingCount = statusRecord.statuses.filter(s => s.eating).length;
            skippingCount = statusRecord.statuses.filter(s => !s.eating).length;
        }

        // Base headcount is 300
        const confirmedHeadcount = Math.max(50, 300 + eatingCount - skippingCount);

        // Dynamically compute raw materials based on confirmed headcount
        const items = [
            {
                dishName: 'Egg Curry',
                portionSize: 2,
                totalToPrep: confirmedHeadcount * 2,
                rawMaterials: [
                    { name: 'Eggs', quantity: Math.round(confirmedHeadcount * 2 * 1.05), unit: 'Pieces' },
                    { name: 'Onion', quantity: Math.round(confirmedHeadcount * 0.05 * 100) / 100, unit: 'KG' }
                ]
            },
            {
                dishName: 'Steam Rice',
                portionSize: 0.2,
                totalToPrep: Math.round(confirmedHeadcount * 0.2 * 100) / 100,
                rawMaterials: [
                    { name: 'Basmati Rice', quantity: Math.round(confirmedHeadcount * 0.2 * 1.05 * 100) / 100, unit: 'KG' }
                ]
            }
        ];

        let prepSheet = await PrepSheet.findOne({ messId, date: dateStr });
        if (!prepSheet) {
            prepSheet = new PrepSheet({
                id: generateId('PREP'),
                messId,
                date: dateStr,
                mealType: 'DINNER',
                confirmedHeadcount,
                items
            });
            await prepSheet.save();
        } else {
            // Update sheet dynamically if it is not approved yet
            if (!prepSheet.approvedBy) {
                prepSheet.confirmedHeadcount = confirmedHeadcount;
                prepSheet.items = items;
                await prepSheet.save();
            }
        }

        res.json({ success: true, sheet: prepSheet });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Waste Logging
router.post('/mess/waste', Auth.authenticate, async (req, res) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user.id });
        const entry = new WasteEntry({
            id: generateId('WASTE'),
            messId: shop?.id || 'mess_1',
            date: new Date().toISOString(),
            ...req.body
        });
        await entry.save();
        res.json({ success: true, entry });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==================== LUXEOS (Fine Dining) ====================

// 1. Guest CRM
router.get('/luxe/guest/:phone', Auth.authenticate, async (req, res) => {
    try {
        const profile = await GuestProfile.findOne({ phone: req.params.phone });
        if (profile) res.json({ success: true, profile });
        else res.status(404).json({ success: false, message: 'Guest not found' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Inventory
router.get('/luxe/inventory', Auth.authenticate, async (req, res) => {
    try {
        const items = await Inventory.find({ restaurantId: req.query.restaurantId });
        res.json({ success: true, items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/luxe/inventory/low-stock', Auth.authenticate, async (req, res) => {
    try {
        const items = await Inventory.find({ restaurantId: req.query.restaurantId, isLowStock: true });
        res.json({ success: true, items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/luxe/po', Auth.authenticate, async (req, res) => {
    try {
        const po = new PurchaseOrder({
            id: generateId('PO'),
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            ...req.body
        });
        await po.save();
        res.json({ success: true, po });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
