export interface TourismPackage {
    id: string;
    title: string;
    providerName: string;   // e.g., 'Ramesh Tour Guides', 'Green Valley Tours'
    vehicleType?: string;   // e.g., 'Tata Safari (AC)', 'E-Rickshaw'
    capacity?: number;      // e.g., 6, 4
    price: number;
    includes: string[];
}

export interface TourismSpot {
    id: string;
    name: string;
    type: 'Temple' | 'Museum' | 'Nature' | 'Historic' | 'Waterfall' | 'Other';
    location: { lat: number; lng: number };
    images: string[];
    description: string;
    packages: TourismPackage[];
}

export const TOURISM_SPOTS: TourismSpot[] = [
    {
        id: 'ts_01',
        name: 'Sher Shah Suri Tomb',
        type: 'Historic',
        location: { lat: 24.9495, lng: 84.0326 }, // Sasaram
        images: [
            'https://images.unsplash.com/photo-1590050720455-8cb5d37449fc?auto=format&fit=crop&q=80', // Replace with actual Indian monument if possible
        ],
        description: 'The spectacular mausoleum of Emperor Sher Shah Suri, known as the second Taj Mahal of India. Stands elegantly in the middle of an artificial lake.',
        packages: [
            { id: 'p_01', title: 'Basic Entry', providerName: 'Govt. Ticket Counter', price: 50, includes: ['Entry Ticket'] },
            { id: 'p_02', title: 'Guided Heritage Walk', providerName: 'Ramesh History Tours', capacity: 10, price: 300, includes: ['Entry Ticket', 'Expert Guide'] },
            { id: 'p_03', title: 'Cab + Tour Combo', providerName: 'Singh Travels', vehicleType: 'Innova (AC)', capacity: 6, price: 850, includes: ['Round Trip Cab', 'Entry Ticket', 'Expert Guide'] }
        ]
    },
    {
        id: 'ts_02',
        name: 'Rohtasgarh Fort',
        type: 'Historic',
        location: { lat: 24.6305, lng: 83.9213 }, // Rohtas (Near Sasaram)
        images: [
            'https://images.unsplash.com/photo-1621236104443-4fb450ebd6de?auto=format&fit=crop&q=80',
        ],
        description: 'An ancient hill fort situated on the banks of the Sone River. One of the most historic and massive forts in India built by King Harishchandra.',
        packages: [
            { id: 'p_04', title: 'Adventure Trek', providerName: 'Kaimur Trekkers', capacity: 15, price: 400, includes: ['Trek Guide', 'Snacks'] },
            { id: 'p_05', title: 'Full Day SUV Trip', providerName: 'Yadav Cabs', vehicleType: 'Bolero (AC)', capacity: 7, price: 2500, includes: ['SUV Charter', 'Guide', 'Parking'] }
        ]
    },
    {
        id: 'ts_03',
        name: 'Maa Tara Chandi Temple',
        type: 'Temple',
        location: { lat: 24.9189, lng: 84.0049 }, // Sasaram
        images: [
            'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80',
        ],
        description: 'A prominent Shakti Peetha located on a hill. One of the holiest shrines in the region, highly revered by locals and pilgrims.',
        packages: [
            { id: 'p_06', title: 'Temple Auto Trip', providerName: 'Local Auto Union', vehicleType: 'E-Rickshaw', capacity: 4, price: 100, includes: ['Round-trip Auto'] },
            { id: 'p_07', title: 'Pilgrimage Cab', providerName: 'Sharma Taxi Service', vehicleType: 'Dzire (AC)', capacity: 4, price: 350, includes: ['Round-trip Cab', 'Wait Time'] }
        ]
    },
    {
        id: 'ts_04',
        name: 'Tomb of Hasan Khan Suri',
        type: 'Historic',
        location: { lat: 24.9535, lng: 84.0250 }, // Sasaram
        images: [
            'https://images.unsplash.com/photo-1627464062143-690a786a37e3?auto=format&fit=crop&q=80',
        ],
        description: 'The mausoleum of Hasan Khan Suri, father of Emperor Sher Shah Suri. Features classical Afghan architectural style.',
        packages: [
            { id: 'p_08', title: 'Heritage Combo', providerName: 'Abdul Guided Tours', vehicleType: 'E-Rickshaw', capacity: 4, price: 450, includes: ['Entry', 'Guide', 'E-Rickshaw Transfer'] }
        ]
    },
    {
        id: 'ts_05',
        name: 'Dhua Kund Waterfalls',
        type: 'Waterfall',
        location: { lat: 24.8967, lng: 83.9880 }, // Kaimur Range near Sasaram
        images: [
            'https://images.unsplash.com/photo-1543015403-1262d142d7cd?auto=format&fit=crop&q=80',
        ],
        description: 'A breathtakingly beautiful double waterfall offering a perfect picnic spot amidst lush greenery in the Kaimur hills.',
        packages: [
            { id: 'p_09', title: 'Nature Picnic Drop', providerName: 'Green Valley Cabs', vehicleType: 'Scorpio (AC)', capacity: 7, price: 600, includes: ['Round Trip Cab'] },
            { id: 'p_10', title: 'Guided Hike & Trek', providerName: 'Kaimur Trekkers', capacity: 10, price: 250, includes: ['Guide Services'] }
        ]
    },
    {
        id: 'ts_06',
        name: 'Manjhar Kund',
        type: 'Waterfall',
        location: { lat: 24.8850, lng: 83.9900 }, // Near Dhua Kund
        images: [
            'https://images.unsplash.com/photo-1432405972618-c6000205943c?auto=format&fit=crop&q=80',
        ],
        description: 'Sister waterfall to Dhua Kund, famously known for its serene environment and local fairs during Raksha Bandhan.',
        packages: [
            { id: 'p_11', title: 'Twin Falls Explorer', providerName: 'Singh Travels', vehicleType: 'Innova (AC)', capacity: 6, price: 800, includes: ['Cab Transport', 'Guide'] }
        ]
    },
    {
        id: 'ts_07',
        name: 'Kaimur Wildlife Sanctuary',
        type: 'Nature',
        location: { lat: 24.7891, lng: 83.7198 }, // Kaimur
        images: [
            'https://images.unsplash.com/photo-1549473216-cfc94f061eec?auto=format&fit=crop&q=80',
        ],
        description: 'The largest sanctuary in the state, home to tigers, leopards, and diverse bird species. A haven for nature lovers.',
        packages: [
            { id: 'p_12', title: 'Jeep Safari', providerName: 'Forest Dept. Tours', vehicleType: 'Open Jeep', capacity: 6, price: 1500, includes: ['Jeep Hire', 'Forest Permit', 'Guide'] },
            { id: 'p_13', title: 'Eco-Tour Day Trip', providerName: 'Yadav Cabs', vehicleType: 'Tavera (AC)', capacity: 8, price: 3500, includes: ['AC Cab', 'Safari', 'Meals'] }
        ]
    },
    {
        id: 'ts_08',
        name: 'Bhaluni Dham',
        type: 'Temple',
        location: { lat: 25.0450, lng: 84.1500 }, // Near Sasaram
        images: [
            'https://images.unsplash.com/photo-1600030504786-fb713ed0d859?auto=format&fit=crop&q=80',
        ],
        description: 'An ancient Hindu temple surrounded by scenic beauty and a large pond. Hosts grand festivals during Chhath and Navaratri.',
        packages: [
            { id: 'p_14', title: 'Pilgrim Auto Drop', providerName: 'Local Auto Union', vehicleType: 'E-Rickshaw', capacity: 4, price: 200, includes: ['Direct Auto Ride'] }
        ]
    },
    {
        id: 'ts_09',
        name: 'Tutla Bhawani Waterfall',
        type: 'Waterfall',
        location: { lat: 24.7360, lng: 83.9960 }, // Rohtas
        images: [
            'https://images.unsplash.com/photo-1518182170546-076616fdfaaf?auto=format&fit=crop&q=80',
        ],
        description: 'A mesmerizing waterfall combined with a revered temple, accessed via a beautiful hanging bridge over the Kachhuar river.',
        packages: [
            { id: 'p_15', title: 'Bridge & Falls Trip', providerName: 'Sharma Taxi Service', vehicleType: 'Dzire (AC)', capacity: 4, price: 1200, includes: ['AC Cab Return Fare'] },
            { id: 'p_16', title: 'Premium Temple Darshan', providerName: 'Green Valley Tours', vehicleType: 'Innova (AC)', capacity: 6, price: 1600, includes: ['AC Cab', 'Local Guide', 'Prasad'] }
        ]
    },
    {
        id: 'ts_10',
        name: 'Gupteshwar Mahadev Temple',
        type: 'Temple',
        location: { lat: 24.6150, lng: 83.7650 }, // Rohtas inside cave
        images: [
            'https://images.unsplash.com/photo-1605626966158-b12a8039c32b?auto=format&fit=crop&q=80',
        ],
        description: 'A divine Shiva temple situated naturally inside a deep cave in the Kaimur hills. Famous for its mysterious environment.',
        packages: [
            { id: 'p_17', title: 'Cave Adventure Trip', providerName: 'Kaimur Trekkers', vehicleType: 'Bolero (AC)', capacity: 7, price: 1800, includes: ['SUV Booking', 'Cave Guide'] }
        ]
    }
];

// Haversine formula to calculate distance
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Returns spots within a radius (default 30km)
export const getNearbyTourismSpots = (userLat: number, userLng: number, maxRadiusKm: number = 30): (TourismSpot & { distance: number })[] => {
    return TOURISM_SPOTS.map(spot => ({
        ...spot,
        distance: calculateDistance(userLat, userLng, spot.location.lat, spot.location.lng)
    }))
        .filter(spot => spot.distance <= maxRadiusKm)
        .sort((a, b) => a.distance - b.distance);
};
