import express from 'express';
import { FoodVendor, FoodOrder, VendorMenuItem, User, FoodReview, CreditScore, VendorKhata } from '../models.js';
import { authenticate as authenticateToken } from '../auth.js';
import { rewardUserForOrder, rewardVendorBonus } from '../services/rewardService.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to generate unique IDs
const generateId = () => crypto.randomBytes(8).toString('hex');

// ==================== VENDOR REGISTRATION ====================

// Register as vendor
router.post('/register', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name, phone, aadharNumber, photo,
            stallName, stallCategory, location, isMobile,
            operatingHours, isPureVeg, specialties, description,
            fssaiLicense, upiId, bankAccountNumber, ifscCode,
            menuItems
        } = req.body;

        // Check if already registered
        const existing = await FoodVendor.findOne({ userId });
        if (existing) {
            return res.status(400).json({ message: 'Already registered as vendor' });
        }

        const vendorId = generateId();

        // Create vendor profile
        const vendor = new FoodVendor({
            id: vendorId,
            userId,
            name,
            phone,
            aadharNumber,
            photo,
            stallName,
            stallCategory,
            location,
            isMobile: isMobile || false,
            operatingHours: operatingHours || { open: '09:00', close: '21:00' },
            isPureVeg: isPureVeg || false,
            specialties: specialties || [],
            description,
            fssaiLicense,
            status: 'PENDING',
            badges: [],
            upiId,
            bankAccountNumber,
            ifscCode,
            rating: 0,
            totalOrders: 0,
            isOpen: false,
            images: [],
            createdAt: Date.now()
        });

        await vendor.save();

        // Update user role
        await User.findOneAndUpdate({ id: userId }, { role: 'FOOD_VENDOR' });

        // Add initial menu items if provided
        if (menuItems && menuItems.length > 0) {
            for (const item of menuItems) {
                const menuItem = new VendorMenuItem({
                    id: generateId(),
                    vendorId,
                    vendorType: 'STALL',
                    name: item.name,
                    price: item.price,
                    type: item.type || 'VEG',
                    category: item.category || 'SNACKS',
                    description: item.description || '',
                    available: true,
                    createdAt: Date.now()
                });
                await menuItem.save();
            }
        }

        res.json({ success: true, vendor, message: 'Registration submitted for review' });
    } catch (error) {
        console.error('Vendor registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// ==================== VENDOR PROFILE ====================

// Get vendor profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }
        res.json(vendor);
    } catch (error) {
        console.error('Error fetching vendor profile:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

// Update vendor profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOneAndUpdate(
            { userId: req.user.id },
            { $set: req.body },
            { new: true }
        );
        res.json(vendor);
    } catch (error) {
        console.error('Error updating vendor profile:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Toggle open/closed status
router.put('/status', authenticateToken, async (req, res) => {
    try {
        const { isOpen } = req.body;
        const vendor = await FoodVendor.findOneAndUpdate(
            { userId: req.user.id },
            { isOpen },
            { new: true }
        );
        res.json({ success: true, isOpen: vendor.isOpen });
    } catch (error) {
        console.error('Error toggling status:', error);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// Update location (for mobile vendors)
router.put('/location', authenticateToken, async (req, res) => {
    try {
        const { lat, lng, address } = req.body;
        const vendor = await FoodVendor.findOneAndUpdate(
            { userId: req.user.id },
            { coordinates: { lat, lng }, location: address || undefined },
            { new: true }
        );
        res.json({ success: true, coordinates: vendor.coordinates });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ message: 'Failed to update location' });
    }
});

// ==================== VENDOR ORDERS ====================

// Get vendor's orders
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const orders = await FoodOrder.find({ vendorId: vendor.id })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Accept order
router.put('/orders/:orderId/accept', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { estimatedMinutes } = req.body;

        const order = await FoodOrder.findOneAndUpdate(
            { id: orderId },
            {
                status: 'ACCEPTED',
                acceptedAt: Date.now(),
                estimatedReadyTime: Date.now() + (estimatedMinutes || 15) * 60 * 1000
            },
            { new: true }
        );

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({ message: 'Failed to accept order' });
    }
});

// Reject order
router.put('/orders/:orderId/reject', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await FoodOrder.findOneAndUpdate(
            { id: orderId },
            { status: 'REJECTED', rejectionReason: reason },
            { new: true }
        );

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ message: 'Failed to reject order' });
    }
});

// Mark order as ready
router.put('/orders/:orderId/ready', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await FoodOrder.findOneAndUpdate(
            { id: orderId },
            { status: 'READY', readyAt: Date.now() },
            { new: true }
        );

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error marking order ready:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

// Verify QR and complete order
router.post('/orders/:orderId/verify', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { qrPayload } = req.body;

        const order = await FoodOrder.findOne({ id: orderId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify QR payload matches
        if (order.qrPayload && order.qrPayload !== qrPayload) {
            return res.status(400).json({ message: 'Invalid QR code' });
        }

        order.status = 'COMPLETED';
        order.completedAt = Date.now();
        await order.save();

        // Update vendor stats
        await FoodVendor.findOneAndUpdate(
            { id: order.vendorId },
            { $inc: { totalOrders: 1 } }
        );

        // --- REWARD LOGIC ---
        const rewardedCoins = await rewardUserForOrder(order.userId, order.totalAmount);
        await rewardVendorBonus(order.vendorId);

        res.json({ success: true, order, rewardedCoins });
    } catch (error) {
        console.error('Error verifying order:', error);
        res.status(500).json({ message: 'Failed to verify order' });
    }
});

// ==================== VENDOR MENU ====================

// Get vendor's menu
router.get('/menu', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const menu = await VendorMenuItem.find({ vendorId: vendor.id }).sort({ createdAt: -1 });
        res.json(menu);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ message: 'Failed to fetch menu' });
    }
});

// Add menu item
router.post('/menu', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const { name, price, type, category, description, image, spiceLevels, addOns } = req.body;

        const menuItem = new VendorMenuItem({
            id: generateId(),
            vendorId: vendor.id,
            vendorType: 'STALL',
            name,
            price,
            type: type || 'VEG',
            category: category || 'SNACKS',
            description,
            image,
            available: true,
            spiceLevels,
            addOns,
            createdAt: Date.now()
        });

        await menuItem.save();
        res.json({ success: true, item: menuItem });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: 'Failed to add item' });
    }
});

// Update menu item
router.put('/menu/:itemId', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await VendorMenuItem.findOneAndUpdate(
            { id: itemId },
            { $set: req.body },
            { new: true }
        );
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ message: 'Failed to update item' });
    }
});

// Delete menu item
router.delete('/menu/:itemId', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        await VendorMenuItem.findOneAndDelete({ id: itemId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});

// ==================== VENDOR ANALYTICS ====================

// Get vendor analytics
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's orders
        const todayOrders = await FoodOrder.find({
            vendorId: vendor.id,
            createdAt: { $gte: today.getTime() },
            status: 'COMPLETED'
        });

        const todayEarnings = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Get reviews for average rating
        const reviews = await FoodReview.find({ vendorId: vendor.id });
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
            : 0;

        res.json({
            todayOrders: todayOrders.length,
            todayEarnings,
            avgRating: Math.round(avgRating * 10) / 10,
            totalOrders: vendor.totalOrders,
            totalReviews: reviews.length
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
});

// ==================== ADMIN VERIFICATION ====================

// Get pending vendors (admin only)
router.get('/admin/pending', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const pendingVendors = await FoodVendor.find({ status: 'PENDING' });
        res.json(pendingVendors);
    } catch (error) {
        console.error('Error fetching pending vendors:', error);
        res.status(500).json({ message: 'Failed to fetch vendors' });
    }
});

// Verify vendor (admin only)
router.put('/admin/:vendorId/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { vendorId } = req.params;
        const vendor = await FoodVendor.findOneAndUpdate(
            { id: vendorId },
            {
                status: 'VERIFIED',
                verifiedAt: Date.now(),
                $addToSet: { badges: 'VERIFIED' }
            },
            { new: true }
        );

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('Error verifying vendor:', error);
        res.status(500).json({ message: 'Failed to verify vendor' });
    }
});

// Reject vendor (admin only)
router.put('/admin/:vendorId/reject', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { vendorId } = req.params;
        const { reason } = req.body;

        const vendor = await FoodVendor.findOneAndUpdate(
            { id: vendorId },
            { status: 'REJECTED', rejectionReason: reason },
            { new: true }
        );

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('Error rejecting vendor:', error);
        res.status(500).json({ message: 'Failed to reject vendor' });
    }
});

// Suspend vendor (admin only)
router.put('/admin/:vendorId/suspend', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { vendorId } = req.params;
        const { reason } = req.body;

        const vendor = await FoodVendor.findOneAndUpdate(
            { id: vendorId },
            { status: 'SUSPENDED', suspensionReason: reason },
            { new: true }
        );

        res.json({ success: true, vendor });
    } catch (error) {
        console.error('Error suspending vendor:', error);
        res.status(500).json({ message: 'Failed to suspend vendor' });
    }
});

// ==================== FSSAI & COMPLIANCE ====================

// Validate FSSAI License Number
router.get('/fssai/validate/:licenseNumber', authenticateToken, async (req, res) => {
    try {
        const { licenseNumber } = req.params;
        // Simple regex check for 14-digit FSSAI number
        const isValid = /^\d{14}$/.test(licenseNumber);

        res.json({
            isValid,
            details: isValid ? {
                licenseNo: licenseNumber,
                status: 'ACTIVE',
                category: 'Petty Food Manufacturer',
                expires: '2026-12-31'
            } : null
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Check vendor compliance status
router.get('/fssai/compliance/:vendorId', authenticateToken, async (req, res) => {
    try {
        const vendor = await FoodVendor.findOne({ id: req.params.vendorId });
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const isCompliant = vendor.status === 'VERIFIED' && !!vendor.fssaiLicense;
        const pendingActions = [];

        if (!vendor.fssaiLicense) pendingActions.push('Upload FSSAI License');
        if (vendor.status !== 'VERIFIED') pendingActions.push('Complete Verification');

        res.json({ isCompliant, pendingActions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Credit Score
router.get('/credit-score', authenticateToken, async (req, res) => {
    try {
        let score = await CreditScore.findOne({ vendorId: req.user.id });
        
        // Calculate the actual credit score dynamically based on the vendor's digital Khata history!
        const khata = await VendorKhata.findOne({ vendorId: req.user.id });
        
        let avgDailySales = 0;
        let upiRatio = 0.5; // default 50%
        let totalSalesCount = 0;
        let scoreVal = 600; // default baseline

        if (khata && khata.entries && khata.entries.length > 0) {
            const sales = khata.entries.filter(e => e.type === 'SALE');
            totalSalesCount = sales.length;
            
            const totalSalesSum = sales.reduce((sum, s) => sum + s.amount, 0);
            avgDailySales = Math.round(totalSalesSum / Math.max(1, Math.min(30, khata.entries.length)));
            
            const upiSales = sales.filter(e => e.paymentMethod === 'UPI' || e.paymentMethod === 'DIGITAL');
            upiRatio = sales.length > 0 ? upiSales.length / sales.length : 0.5;

            scoreVal = 500 + Math.min(250, Math.round(totalSalesSum / 100)) + Math.round(upiRatio * 100);
            scoreVal = Math.min(850, Math.max(300, scoreVal));
        }

        let tier = 'GOOD';
        if (scoreVal >= 750) tier = 'EXCELLENT';
        else if (scoreVal >= 700) tier = 'VERY_GOOD';
        else if (scoreVal >= 650) tier = 'GOOD';
        else if (scoreVal >= 550) tier = 'FAIR';
        else tier = 'UNSCORED';

        const loanEligibility = {
            pmSvanidhi: { 
                eligible: scoreVal >= 600, 
                maxAmount: scoreVal >= 750 ? 50000 : (scoreVal >= 650 ? 20000 : 10000), 
                tier: scoreVal >= 750 ? 3 : (scoreVal >= 650 ? 2 : 1) 
            },
            workingCapital: { 
                eligible: scoreVal >= 650, 
                maxAmount: Math.round(avgDailySales * 15), 
                interestRate: scoreVal >= 750 ? 8.5 : 12.0 
            }
        };

        const factors = [
            { name: 'UPI Velocity', impact: upiRatio >= 0.7 ? 'POSITIVE' : 'NEUTRAL', weight: 30, value: Math.round(upiRatio * 100) },
            { name: 'Sales Consistency', impact: totalSalesCount >= 5 ? 'POSITIVE' : 'NEUTRAL', weight: 40, value: totalSalesCount },
            { name: 'Daily Average Volume', impact: avgDailySales >= 500 ? 'POSITIVE' : 'NEUTRAL', weight: 30, value: avgDailySales }
        ];

        if (!score) {
            score = new CreditScore({
                vendorId: req.user.id,
                score: scoreVal,
                tier,
                factors,
                metrics: {
                    avgDailySales,
                    salesConsistencyScore: Math.min(100, totalSalesCount * 10),
                    upiTransactionRatio: Math.round(upiRatio * 100),
                    repaymentHistory: 100,
                    businessAge: 3,
                    appEngagementScore: 85
                },
                loanEligibility,
                lastCalculated: new Date()
            });
        } else {
            score.score = scoreVal;
            score.tier = tier;
            score.factors = factors;
            score.metrics = {
                avgDailySales,
                salesConsistencyScore: Math.min(100, totalSalesCount * 10),
                upiTransactionRatio: Math.round(upiRatio * 100),
                repaymentHistory: 100,
                businessAge: 3,
                appEngagementScore: 85
            };
            score.loanEligibility = loanEligibility;
            score.lastCalculated = new Date();
        }

        await score.save();
        res.json({ success: true, score });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

export default router;
