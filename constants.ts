import { Stop, NetworkNode, LocationData, RentalVehicle, MediaItem } from './types';
import { API_BASE_URL } from './config';

export const GOOGLE_API_KEY = ""; 
export const ROHTAS_MAP_URL = ""; 

export const TEST_USERS = {
  DRIVER: { id: 'DRV-888', name: 'Raju Driver', role: 'DRIVER', password: 'drive', vehicleCapacity: 40, vehicleType: 'BUS', isVerified: true },
  PASSENGER: { id: 'USR-999', name: 'Amit Kumar', role: 'PASSENGER', password: 'pass' },
  SHOPKEEPER: { id: 'SHOP-001', name: 'Gupta Ji', role: 'SHOPKEEPER', password: 'shop', isVerified: true },
  ADMIN: { id: 'ADMIN-001', name: 'Admin User', role: 'ADMIN', password: 'admin123' }
};

// VISUAL LANDMARKS FOR RURAL NAVIGATION (Keep as UI Assets, not Data Source)
export const STOP_LANDMARKS: Record<string, string> = {
    'Sasaram': 'https://source.unsplash.com/random/100x100/?temple,ancient',
    'Dehri-on-Sone': 'https://source.unsplash.com/random/100x100/?bridge,river',
    'Nokha': 'https://source.unsplash.com/random/100x100/?market,vegetable',
    'Chenari': 'https://source.unsplash.com/random/100x100/?mountain,hills',
    'Bikramganj': 'https://source.unsplash.com/random/100x100/?school,college',
};

export const OFFLINE_MEDIA: MediaItem[] = [
    { id: 'MOV-01', title: 'Panchayat Season 3 (Ep 1)', category: 'MOVIE', sizeMb: 150, downloaded: true },
    { id: 'NEWS-01', title: 'Bihar Top News Today', category: 'NEWS', sizeMb: 25, downloaded: true },
    { id: 'AGRI-01', title: 'Rabi Crop Guide 2024', category: 'FARMING', sizeMb: 45, downloaded: true },
    { id: 'EDU-01', title: 'Maths Class 10: Algebra', category: 'EDUCATION', sizeMb: 80, downloaded: false }
];

export const TRANSLATIONS = {
  EN: {
    welcome: "Namaste",
    plan_journey: "Plan Your Journey",
    from: "From",
    to: "To",
    book_ticket: "Book Ticket",
    buy_pass: "Buy Pass",
    ticket: "Ticket",
    pass: "Pass",
    total_fare: "Total Fare",
    search_bus: "Search Buses",
    offline_mode: "OFFLINE MODE",
    transport: "Transport",
    market: "Gram-Haat",
    home: "Home",
    my_passes: "My Passes",
    parcels: "Parcels",
    profile: "Profile",
    login: "Login",
    register: "Register",
    phone: "Phone Number",
    password: "Password",
    driver: "Driver",
    passenger: "Passenger",
    shopkeeper: "Seller",
    confirm: "Confirm",
    scan: "Scan",
    loading: "Loading...",
    seats: "Seats",
    available: "Available",
    send_parcel: "Send Parcel",
    book_charter: "Book Charter",
    sos_alert: "SOS Help",
    verify: "Verify",
    chutta_wallet: "Chutta",
    monthly: "Monthly",
    vidya_vahan: "Vidya Vahan"
  },
  HI: {
    welcome: "नमस्ते",
    plan_journey: "यात्रा की योजना",
    from: "कहाँ से (From)",
    to: "कहाँ तक (To)",
    book_ticket: "टिकट बुक करें",
    buy_pass: "पास खरीदें",
    ticket: "टिकट",
    pass: "पास",
    total_fare: "कुल किराया",
    search_bus: "बस खोजें",
    offline_mode: "इंटरनेट नहीं है",
    transport: "यातायात",
    market: "ग्राम-हाट",
    home: "होम",
    my_passes: "मेरे पास",
    parcels: "पार्सल",
    profile: "प्रोफाइल",
    login: "लॉगिन करें",
    register: "खाता बनाएं",
    phone: "मोबाइल नंबर",
    password: "पासवर्ड",
    driver: "ड्राइवर",
    passenger: "यात्री",
    shopkeeper: "दुकानदार",
    confirm: "पक्का करें",
    scan: "स्कैन करें",
    loading: "लोड हो रहा है...",
    seats: "सीटें",
    available: "खाली हैं",
    send_parcel: "पार्सल भेजें",
    book_charter: "गाड़ी बुक करें",
    sos_alert: "मदद (SOS)",
    verify: "जांच करें",
    chutta_wallet: "छुट्टा पैसे",
    monthly: "महीने वाला",
    vidya_vahan: "विद्या वाहन"
  }
};

export const RENTAL_FLEET: RentalVehicle[] = [
  { id: "V-001", type: "HATCHBACK", model: "Alto 800 / Kwid", capacity: 4, baseRate: 800, ratePerKm: 12, imageIcon: "car", available: true },
  { id: "V-002", type: "SUV", model: "Scorpio N / Bolero", capacity: 7, baseRate: 2500, ratePerKm: 18, imageIcon: "suv", available: true },
  { id: "V-003", type: "TRAVELER", model: "Force Traveler", capacity: 14, baseRate: 4500, ratePerKm: 25, imageIcon: "bus", available: false }
];

// --- DEPRECATED STATIC DATA ---
export const ROHTAS_NETWORK: Record<string, NetworkNode> = {};
export const ALL_LOCATIONS: LocationData[] = [];

export const initializeGeoData = async () => {
    console.log("⚡ App Loaded: Static Data Removed. Using Real DB.");
};

export const STOPS: Stop[] = [];
export const STOP_POSITIONS: Record<string, number> = {};
export const STOP_COORDINATES: Record<string, { lat: number; lng: number }> = {};

export const TICKET_PRICE = 45;