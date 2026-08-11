const GOOGLE_API_KEY = "";
const ROHTAS_MAP_URL = "";
const TEST_USERS = {
  DRIVER: { id: "DRV-888", name: "Raju Driver", role: "DRIVER", password: "drive", vehicleCapacity: 40, vehicleType: "BUS", isVerified: true },
  PASSENGER: { id: "USR-999", name: "Amit Kumar", role: "PASSENGER", password: "pass" },
  SHOPKEEPER: { id: "SHOP-001", name: "Gupta Ji", role: "SHOPKEEPER", password: "shop", isVerified: true },
  VILLAGE_MANAGER: { id: "VM-001", name: "Sarpanch Sahab", role: "VILLAGE_MANAGER", password: "mngr", isVerified: true },
  ADMIN: { id: "ADMIN-001", name: "Admin User", role: "ADMIN", password: "admin123" }
};
const STOP_LANDMARKS = {
  "Sasaram": "https://source.unsplash.com/random/100x100/?temple,ancient",
  "Dehri-on-Sone": "https://source.unsplash.com/random/100x100/?bridge,river",
  "Nokha": "https://source.unsplash.com/random/100x100/?market,vegetable",
  "Chenari": "https://source.unsplash.com/random/100x100/?mountain,hills",
  "Bikramganj": "https://source.unsplash.com/random/100x100/?school,college"
};
const OFFLINE_MEDIA = [
  { id: "MOV-01", title: "Panchayat Season 3 (Ep 1)", category: "MOVIE", sizeMb: 150, downloaded: true },
  { id: "NEWS-01", title: "Bihar Top News Today", category: "NEWS", sizeMb: 25, downloaded: true },
  { id: "AGRI-01", title: "Rabi Crop Guide 2024", category: "FARMING", sizeMb: 45, downloaded: true },
  { id: "EDU-01", title: "Maths Class 10: Algebra", category: "EDUCATION", sizeMb: 80, downloaded: false }
];
const TRANSLATIONS = {
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
    vidya_vahan: "Vidya Vahan",
    active_trip: "Active Trip"
  },
  HI: {
    welcome: "\u0928\u092E\u0938\u094D\u0924\u0947",
    plan_journey: "\u092F\u093E\u0924\u094D\u0930\u093E \u0915\u0940 \u092F\u094B\u091C\u0928\u093E",
    from: "\u0915\u0939\u093E\u0901 \u0938\u0947 (From)",
    to: "\u0915\u0939\u093E\u0901 \u0924\u0915 (To)",
    book_ticket: "\u091F\u093F\u0915\u091F \u092C\u0941\u0915 \u0915\u0930\u0947\u0902",
    buy_pass: "\u092A\u093E\u0938 \u0916\u0930\u0940\u0926\u0947\u0902",
    ticket: "\u091F\u093F\u0915\u091F",
    pass: "\u092A\u093E\u0938",
    total_fare: "\u0915\u0941\u0932 \u0915\u093F\u0930\u093E\u092F\u093E",
    search_bus: "\u092C\u0938 \u0916\u094B\u091C\u0947\u0902",
    offline_mode: "\u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948",
    transport: "\u092F\u093E\u0924\u093E\u092F\u093E\u0924",
    market: "\u0917\u094D\u0930\u093E\u092E-\u0939\u093E\u091F",
    home: "\u0939\u094B\u092E",
    my_passes: "\u092E\u0947\u0930\u0947 \u092A\u093E\u0938",
    parcels: "\u092A\u093E\u0930\u094D\u0938\u0932",
    profile: "\u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932",
    login: "\u0932\u0949\u0917\u093F\u0928 \u0915\u0930\u0947\u0902",
    register: "\u0916\u093E\u0924\u093E \u092C\u0928\u093E\u090F\u0902",
    phone: "\u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930",
    password: "\u092A\u093E\u0938\u0935\u0930\u094D\u0921",
    driver: "\u0921\u094D\u0930\u093E\u0907\u0935\u0930",
    passenger: "\u092F\u093E\u0924\u094D\u0930\u0940",
    shopkeeper: "\u0926\u0941\u0915\u093E\u0928\u0926\u093E\u0930",
    confirm: "\u092A\u0915\u094D\u0915\u093E \u0915\u0930\u0947\u0902",
    scan: "\u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0947\u0902",
    loading: "\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...",
    seats: "\u0938\u0940\u091F\u0947\u0902",
    available: "\u0916\u093E\u0932\u0940 \u0939\u0948\u0902",
    send_parcel: "\u092A\u093E\u0930\u094D\u0938\u0932 \u092D\u0947\u091C\u0947\u0902",
    book_charter: "\u0917\u093E\u095C\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902",
    sos_alert: "\u092E\u0926\u0926 (SOS)",
    verify: "\u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902",
    chutta_wallet: "\u091B\u0941\u091F\u094D\u091F\u093E \u092A\u0948\u0938\u0947",
    monthly: "\u092E\u0939\u0940\u0928\u0947 \u0935\u093E\u0932\u093E",
    vidya_vahan: "\u0935\u093F\u0926\u094D\u092F\u093E \u0935\u093E\u0939\u0928",
    active_trip: "\u0938\u0915\u094D\u0930\u093F\u092F \u092F\u093E\u0924\u094D\u0930\u093E"
  }
};
const RENTAL_FLEET = [
  { id: "V-000", type: "MOTO", model: "Moto Taxi / Bike", capacity: 1, baseRate: 50, ratePerKm: 8, imageIcon: "bike", available: true },
  { id: "V-001", type: "HATCHBACK", model: "Alto 800 / Kwid", capacity: 4, baseRate: 800, ratePerKm: 12, imageIcon: "car", available: true },
  { id: "V-002", type: "SUV", model: "Scorpio N / Bolero", capacity: 7, baseRate: 2500, ratePerKm: 18, imageIcon: "suv", available: true },
  { id: "V-003", type: "TRAVELER", model: "Force Traveler", capacity: 14, baseRate: 4500, ratePerKm: 25, imageIcon: "bus", available: false }
];
const ROHTAS_NETWORK = {};
const ALL_LOCATIONS = [];
const initializeGeoData = async () => {
  console.log("\u26A1 App Loaded: Static Data Removed. Using Real DB.");
};
const STOPS = [];
const STOP_POSITIONS = {};
const STOP_COORDINATES = {};
const TICKET_PRICE = 45;
export {
  ALL_LOCATIONS,
  GOOGLE_API_KEY,
  OFFLINE_MEDIA,
  RENTAL_FLEET,
  ROHTAS_MAP_URL,
  ROHTAS_NETWORK,
  STOPS,
  STOP_COORDINATES,
  STOP_LANDMARKS,
  STOP_POSITIONS,
  TEST_USERS,
  TICKET_PRICE,
  TRANSLATIONS,
  initializeGeoData
};
