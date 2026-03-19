import { TourismSpot, TourismPackage, TourismBooking, GuideProfile } from '../models/tourismModels.js';

// Get Nearby Tourism Spots with Packages
export const getNearbySpots = async (req, res) => {
    try {
        const { lat, lng, radius = 30 } = req.query; // Radius in km

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        const spots = await TourismSpot.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: 'distance',
                    maxDistance: radius * 1000, // Convert km to meters
                    spherical: true
                }
            },
            { $match: { isActive: true } }
        ]);

        // Populate packages for each spot using an aggregation lookup or secondary query
        // Easiest is to manually fetch packages if spots are few, or use $lookup
        const populatedSpots = await Promise.all(spots.map(async (spot) => {
            const packages = await TourismPackage.find({ spotId: spot._id, isActive: true });
            return { ...spot, packages, distance: spot.distance / 1000 }; // Ensure distance is returned in km
        }));

        res.json({ success: true, spots: populatedSpots });
    } catch (error) {
        console.error('Error in getNearbySpots:', error);
        res.status(500).json({ error: 'Failed to fetch tourism spots' });
    }
};

// Initiate a booking
export const initiateBooking = async (req, res) => {
    try {
        const { packageId, scheduledDate } = req.body;
        const userId = req.user.id; // Assumed authenticated user

        const pkg = await TourismPackage.findById(packageId);
        if (!pkg) return res.status(404).json({ error: 'Package not found' });

        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const booking = new TourismBooking({
            userId,
            packageId,
            amount: pkg.price,
            scheduledDate: new Date(scheduledDate),
            tourOtp: otp
        });
        
        await booking.save();

        // In a real flow, you would generate a Razorpay order here
        // const order = await razorpay.orders.create({ amount: pkg.price * 100, currency: "INR", receipt: booking._id.toString() });
        // booking.razorpayOrderId = order.id; await booking.save();

        res.json({ success: true, booking, message: 'Booking initiated' });
    } catch (error) {
        console.error('Error initiating booking:', error);
        res.status(500).json({ error: 'Failed to initiate booking' });
    }
};

// Cancel a booking
export const cancelTour = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const userId = req.user.id; // Verify ownership

        const booking = await TourismBooking.findOne({ _id: bookingId, userId });
        if (!booking) return res.status(404).json({ error: 'Booking not found or unauthorized' });

        if (booking.bookingStatus === 'COMPLETED' || booking.bookingStatus === 'CANCELLED') {
            return res.status(400).json({ error: `Cannot cancel a ${booking.bookingStatus} booking` });
        }

        booking.bookingStatus = 'CANCELLED';
        await booking.save();

        res.json({ success: true, message: 'Tour cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling tour:', error);
        res.status(500).json({ error: 'Failed to cancel tour' });
    }
};


// Vendor Accepts Tour
export const acceptTour = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const vendorUserId = req.user.id; // Vendor's user ID

        const guide = await GuideProfile.findOne({ userId: vendorUserId });
        if (!guide) return res.status(403).json({ error: 'Not registered as a Guide/Vendor' });

        const booking = await TourismBooking.findById(bookingId).populate('packageId');
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        
        // Ensure vendor has the required capability
        if (booking.packageId.vendorTypeRequired !== 'NONE') {
             if (!guide.capabilities.includes(booking.packageId.vendorTypeRequired)) {
                 return res.status(403).json({ error: `Requires ${booking.packageId.vendorTypeRequired} capability.`});
             }
        }

        if (booking.bookingStatus !== 'SEARCHING_GUIDE' && booking.bookingStatus !== 'INITIATED') {
            return res.status(400).json({ error: `Booking already ${booking.bookingStatus}` });
        }

        booking.assignedGuideId = guide._id;
        booking.bookingStatus = 'ACCEPTED';
        await booking.save();

        // Here an Event would be emitted to notify the tourist that a vendor accepted
        // e.g. emitToUser(booking.userId, 'tour_accepted', { guide: guide });

        res.json({ success: true, booking, message: 'Tour accepted successfully' });
    } catch (error) {
        console.error('Error accepting tour:', error);
        res.status(500).json({ error: 'Failed to accept tour' });
    }
};

// Get Pending Tourism Bookings for Vendors
export const getPendingTours = async (req, res) => {
    try {
        const bookings = await TourismBooking.find({ 
            bookingStatus: { $in: ['INITIATED', 'SEARCHING_GUIDE'] } 
        }).populate('packageId');
        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Error fetching pending tours:', error);
        res.status(500).json({ error: 'Failed to fetch pending tours' });
    }
};
