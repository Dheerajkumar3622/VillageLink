import { TourismSpot, TourismPackage, TourismBooking, GuideProfile } from '../models/tourismModels.js';

const FALLBACK_TOURISM_SPOTS = [
    {
        _id: 'ts_01',
        id: 'ts_01',
        name: 'Sher Shah Suri Tomb',
        type: 'Historic',
        location: { type: 'Point', coordinates: [84.0326, 24.9495] },
        images: ['https://images.unsplash.com/photo-1590050720455-8cb5d37449fc?auto=format&fit=crop&q=80'],
        description: 'The spectacular mausoleum of Emperor Sher Shah Suri, known as the second Taj Mahal of India. Stands elegantly in the middle of an artificial lake.',
        distance: 1.2,
        packages: [
            { id: 'p_01', title: 'Basic Entry', providerName: 'Govt. Ticket Counter', price: 50, includes: ['Entry Ticket'] },
            { id: 'p_02', title: 'Guided Heritage Walk', providerName: 'Ramesh History Tours', capacity: 10, price: 300, includes: ['Entry Ticket', 'Expert Guide'] },
            { id: 'p_03', title: 'Cab + Tour Combo', providerName: 'Singh Travels', vehicleType: 'Innova (AC)', capacity: 6, price: 850, includes: ['Round Trip Cab', 'Entry Ticket', 'Expert Guide'] }
        ]
    },
    {
        _id: 'ts_02',
        id: 'ts_02',
        name: 'Rohtasgarh Fort',
        type: 'Historic',
        location: { type: 'Point', coordinates: [83.9213, 24.6305] },
        images: ['https://images.unsplash.com/photo-1621236104443-4fb450ebd6de?auto=format&fit=crop&q=80'],
        description: 'An ancient hill fort situated on the banks of the Sone River. One of the most historic and massive forts in India built by King Harishchandra.',
        distance: 18.4,
        packages: [
            { id: 'p_04', title: 'Adventure Trek', providerName: 'Kaimur Trekkers', capacity: 15, price: 400, includes: ['Trek Guide', 'Snacks'] },
            { id: 'p_05', title: 'Full Day SUV Trip', providerName: 'Yadav Cabs', vehicleType: 'Bolero (AC)', capacity: 7, price: 2500, includes: ['SUV Charter', 'Guide', 'Parking'] }
        ]
    },
    {
        _id: 'ts_03',
        id: 'ts_03',
        name: 'Maa Tara Chandi Temple',
        type: 'Temple',
        location: { type: 'Point', coordinates: [84.0049, 24.9189] },
        images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80'],
        description: 'A prominent Shakti Peetha located on a hill. One of the holiest shrines in the region, highly revered by locals and pilgrims.',
        distance: 4.8,
        packages: [
            { id: 'p_06', title: 'Temple Auto Trip', providerName: 'Local Auto Union', vehicleType: 'E-Rickshaw', capacity: 4, price: 100, includes: ['Round-trip Auto'] },
            { id: 'p_07', title: 'Pilgrimage Cab', providerName: 'Sharma Taxi Service', vehicleType: 'Dzire (AC)', capacity: 4, price: 350, includes: ['Round-trip Cab', 'Wait Time'] }
        ]
    },
    {
        _id: 'ts_05',
        id: 'ts_05',
        name: 'Dhua Kund Waterfalls',
        type: 'Waterfall',
        location: { type: 'Point', coordinates: [83.9880, 24.8967] },
        images: ['https://images.unsplash.com/photo-1543015403-1262d142d7cd?auto=format&fit=crop&q=80'],
        description: 'A breathtakingly beautiful double waterfall offering a perfect picnic spot amidst lush greenery in the Kaimur hills.',
        distance: 7.2,
        packages: [
            { id: 'p_09', title: 'Nature Picnic Drop', providerName: 'Green Valley Cabs', vehicleType: 'Scorpio (AC)', capacity: 7, price: 600, includes: ['Round Trip Cab'] },
            { id: 'p_10', title: 'Guided Hike & Trek', providerName: 'Kaimur Trekkers', capacity: 10, price: 250, includes: ['Guide Services'] }
        ]
    },
    {
        _id: 'ts_09',
        id: 'ts_09',
        name: 'Tutla Bhawani Waterfall',
        type: 'Waterfall',
        location: { type: 'Point', coordinates: [83.9960, 24.7360] },
        images: ['https://images.unsplash.com/photo-1518182170546-076616fdfaaf?auto=format&fit=crop&q=80'],
        description: 'A mesmerizing waterfall combined with a revered temple, accessed via a beautiful hanging bridge over the Kachhuar river.',
        distance: 22.0,
        packages: [
            { id: 'p_15', title: 'Bridge & Falls Trip', providerName: 'Sharma Taxi Service', vehicleType: 'Dzire (AC)', capacity: 4, price: 1200, includes: ['AC Cab Return Fare'] },
            { id: 'p_16', title: 'Premium Temple Darshan', providerName: 'Green Valley Tours', vehicleType: 'Innova (AC)', capacity: 6, price: 1600, includes: ['AC Cab', 'Local Guide', 'Prasad'] }
        ]
    }
];

// Get Nearby Tourism Spots with Packages
export const getNearbySpots = async (req, res) => {
    try {
        const { lat, lng, radius = 30 } = req.query; // Radius in km

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        if (isNaN(parsedLat) || isNaN(parsedLng)) {
            return res.json({ success: true, spots: FALLBACK_TOURISM_SPOTS, isFallback: true });
        }

        const spots = await TourismSpot.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                    distanceField: 'distance',
                    maxDistance: (parseFloat(radius) || 30) * 1000, // Convert km to meters
                    spherical: true
                }
            },
            { $match: { isActive: true } }
        ]);

        if (!spots || spots.length === 0) {
            return res.json({ success: true, spots: FALLBACK_TOURISM_SPOTS, isFallback: true });
        }

        // Populate packages for each spot using secondary query
        const populatedSpots = await Promise.all(spots.map(async (spot) => {
            const pkgs = await TourismPackage.find({ spotId: spot._id, isActive: true });
            const packages = pkgs.map(p => ({
                id: p._id.toString(),
                title: p.title,
                providerName: p.providerName || 'Certified Guide',
                vehicleType: p.vehicleType,
                capacity: p.capacity,
                price: p.price,
                includes: p.includes && p.includes.length > 0 ? p.includes : ['Tour Access', 'Guide Assistance']
            }));
            return { 
                ...spot, 
                id: spot._id.toString(),
                packages, 
                distance: parseFloat((spot.distance / 1000).toFixed(1))
            };
        }));

        res.json({ success: true, spots: populatedSpots });
    } catch (error) {
        console.error('Error in getNearbySpots:', error);
        res.json({ success: true, spots: FALLBACK_TOURISM_SPOTS, isFallback: true });
    }
};

// Initiate a booking
export const initiateBooking = async (req, res) => {
    try {
        const { packageId, scheduledDate } = req.body;
        const userId = req.user?.id || req.user?._id;

        let pkg = await TourismPackage.findById(packageId);
        let price = pkg ? pkg.price : 450;

        // Generate a random 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const booking = new TourismBooking({
            userId,
            packageId: pkg ? pkg._id : packageId,
            amount: price,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
            tourOtp: otp,
            bookingStatus: 'INITIATED'
        });
        
        await booking.save();

        res.json({ 
            success: true, 
            booking: {
                _id: booking._id,
                id: booking._id,
                tourOtp: otp,
                bookingStatus: 'INITIATED',
                amount: price
            }, 
            message: 'Booking initiated successfully' 
        });
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
