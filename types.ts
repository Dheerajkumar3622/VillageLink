

export type Stop = string;

export interface GeoLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface TelemetryData {
  speed: number;       // km/h
  signalStrength: 0 | 1 | 2 | 3 | 4; // Bars
  batteryVoltage: number; // Volts
  engineTemp: number; // Celsius
  rpm: number;
  fuelLevel: number; // %
  suspensionLoad: number; // kg
  isOnline: boolean;
  constellation?: 'GPS' | 'NavIC'; // Satellite Tech
  satComActive?: boolean; // L-Band Backup
}

export enum TicketStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  BOARDED = 'BOARDED',
  COMPLETED = 'COMPLETED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  NONE = 'NONE',
  ESCROW = 'ESCROW', // New v12.0
  GRAMCOIN = 'GRAMCOIN', // New v12.0
  SONIC = 'SONIC', // New v15.0 Audio-Over-Data
  UDHAAR = 'UDHAAR', // New Idea #19
  BARTER = 'BARTER' // Idea: Crop-for-Ride
}

// Flattened Location Interface for Direct Search (v9.1.0)
export interface LocationData {
  name: string;
  address: string; // e.g., "Village Name, Panchayat, Block"
  lat: number;
  lng: number;
  block: string;
  panchayat: string;
  district?: string; // Added for specific display
  villageCode: string;
}

export interface RouteDefinition {
  id: string;
  name: string;
  from: string;
  to: string;
  stops: string[];
  totalDistance: number;
  floodRisk?: 'SAFE' | 'WARNING' | 'CRITICAL'; // SAR Data
}

export interface Ticket {
  id: string;
  userId: string;
  driverId?: string;
  from: string;
  to: string;
  fromDetails?: string;
  toDetails?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  status: TicketStatus;
  paymentMethod: PaymentMethod;
  timestamp: number;
  passengerCount: number;
  totalPrice: number;
  routePath?: string[];
  digitalSignature?: string; // v13.0 Security
  encryptedData?: string; // v13.0 E2EE
  seatNumber?: string; // v14.0 Digital Twin
  isOfflineSync?: boolean; // v14.0 Offline
  isDidiRath?: boolean; // Feature 1: Pink Bus
  hasLivestock?: boolean; // Idea: Pashu Ticket
  hasInsurance?: boolean; // Idea: Micro-Insurance
  fraudFlag?: boolean; // ML Feature 10
  giftedBy?: string; // Gifting Feature
  recipientPhone?: string; // Gifting Feature
  transactionId?: string; // Linked Payment ID
  // --- NEW QR SECURITY FIELDS (v18.0) ---
  qrPayload?: string;       // Base64-encoded QR data
  signature?: string;       // HMAC-SHA256 signature
  expiresAt?: number;       // Ticket validity timestamp
  scanCount?: number;       // Anti-duplicate tracking
  scannedAt?: number;       // Boarding timestamp
  scannedByDriverId?: string; // Driver who scanned
  distanceKm?: number;      // Calculated road distance
  vehicleType?: string;     // Vehicle type for fare
}

// --- NEW PASS TYPES (v10.0 + v12.0 NFT) ---
export type SeatConfig = 'SEAT' | 'STANDING';

export interface Pass {
  id: string;
  userId: string;
  userName: string;
  from: string;
  to: string;
  type: 'MONTHLY' | 'STUDENT' | 'VIDYA_VAHAN'; // Feature 9
  seatConfig: SeatConfig;
  validityDays: number;
  usedDates: string[]; // ISO Date strings YYYY-MM-DD
  purchaseDate: number;
  expiryDate: number;
  price: number;
  status: 'ACTIVE' | 'EXPIRED';
  nftMetadata?: NFTMetadata; // v12.0
  giftedBy?: string; // Gifting Feature
  transactionId?: string;
}

// --- NEW RENTAL TYPES (v11.0 + v12.0 Escrow) ---
export interface RentalVehicle {
  id: string;
  type: 'HATCHBACK' | 'SUV' | 'TRAVELER' | 'WEDDING_FLEET' | 'AMBULANCE'; // Feature 7
  model: string;
  capacity: number;
  baseRate: number; // Per Day or Base Fare
  ratePerKm: number;
  imageIcon: string;
  available: boolean;
  healthScore?: number; // v12.0 Blockchain Health Score
}

export interface RentalBooking {
  id: string;
  userId: string;
  userName: string;
  vehicleType: 'HATCHBACK' | 'SUV' | 'TRAVELER' | 'WEDDING_FLEET' | 'AMBULANCE';
  from: string;
  to: string;
  tripType: 'ONE_WAY' | 'ROUND_TRIP';
  date: string; // ISO Date
  distanceKm: number;
  totalFare: number;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  driverId?: string;
  escrowContractId?: string; // v12.0
  bidAmount?: number; // Idea #17
  transactionId?: string;
}

// --- NEW LOGISTICS TYPES (v11.1 + v12.0 TrustChain) ---
export interface TrackingEvent {
  status: 'BOOKED' | 'PICKED_UP' | 'IN_TRANSIT_HUB' | 'ON_BUS' | 'DELIVERED';
  location: string;
  timestamp: number;
  handlerId?: string;
  description?: string;
}

export interface ParcelBooking {
  id: string;
  userId: string;
  from: string;
  to: string;
  itemType: string; // Changed to string to support Encrypted Cipher Text (v13.0)
  weightKg: number;
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'DELIVERED' | 'IN_TRANSIT';
  busId?: string;
  blockchainHash?: string; // v12.0
  isEncrypted: boolean; // v13.0
  trackingEvents: TrackingEvent[]; // Supply Chain History
  isPooled?: boolean; // ML Feature 9
  timestamp: number;
  transactionId?: string;
}

// --- NEW CHATBOT TYPES (v11.1) ---
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'USER' | 'BOT';
  timestamp: number;
  actionLink?: {
    label: string;
    tab: string; // 'BOOK' | 'PASSES' | 'LOGISTICS'
  }
}

// --- BLOCKCHAIN TYPES (v12.0 + v15.0 DePIN) ---
export interface Block {
  index: number;
  timestamp: number;
  data: any;
  previousHash: string;
  hash: string;
  validator: string;
}

export interface Wallet {
  address: string;
  balance: number; // GramCoin
  carbonCredits?: number; // v15.0 DePIN
  fleetTokens?: number; // v15.0 DePIN
  transactions: Transaction[];
  creditLimit?: number; // Idea #19 & #10
  creditUsed?: number; // Idea #19
  gramScore?: number; // ML Feature 7
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: 'EARN' | 'SPEND';
  timestamp: number;
  desc: string;
}

export interface NFTMetadata {
  tokenId: string;
  owner: string;
  assetType: 'PASS' | 'VEHICLE_HISTORY' | 'BADGE' | 'EQUIPMENT';
  mintDate: number;
  data: string;
}

export interface SmartContract {
  id: string;
  type: 'ESCROW' | 'INSURANCE' | 'RENTAL';
  buyer: string;
  seller: string;
  amount: number;
  condition: string;
  status: 'LOCKED' | 'RELEASED' | 'REFUNDED';
}

// --- SECURITY TYPES (v13.0) ---
export interface DeviceFingerprint {
  id: string;
  userAgentHash: string;
  screenRes: string;
  timezone: string;
  canvasHash: string;
  trustScore: number;
}

export interface SecurityContext {
  did: string; // Decentralized ID
  publicKey: JsonWebKey;
  fingerprint: DeviceFingerprint;
  lastLoginLocation?: GeoLocation;
}

export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SHOPKEEPER' | 'MESS_MANAGER' | 'FOOD_VENDOR' | null;
export type VehicleType = 'BUS' | 'TAXI' | 'AUTO' | 'BIKE';
export type VehicleStatusLabel = 'EN_ROUTE' | 'DELAYED' | 'MAINTENANCE' | 'IDLE';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  vehicleCapacity?: number;
  vehicleType?: VehicleType;
  sessionToken?: string;
  isCharterAvailable?: boolean;
  walletAddress?: string; // v12.0
  did?: string; // v13.0
  isVerified?: boolean; // v16.0 - Master Panel Control
  isBanned?: boolean; // v16.0 - Master Panel Control
  referralCode?: string; // Idea #18
  gender?: 'MALE' | 'FEMALE' | 'OTHER'; // Didi-First
  isDidiVerified?: boolean; // New Security Flag for Didi Rath
  guardianPhone?: string; // Feature 3
  isMobileATM?: boolean; // Idea: Chalta-Firta Bank
  creditLimit?: number; // Idea #19 & #10
  creditUsed?: number; // Idea #19
  walletBalance?: number; // Added to fix type error in DriverView
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  otp?: string;
}

export interface BusState {
  driverId: string;
  driverName: string;
  isOnline: boolean;
  location: GeoLocation | null;
  activePath: string[];
  currentStopIndex: number;
  routeProgress: number;
  capacity: number;
  occupancy: number;
  vehicleType: VehicleType;
  telemetry?: TelemetryData;
  status?: VehicleStatusLabel;
  isATM?: boolean; // Idea: Chalta-Firta Bank
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'Hub' | 'Stop';
  connections: string[];
}

// --- ML TYPES (v10.1) ---

export interface DeviationProposal {
  id: string;
  detourVillage: string;
  extraDistance: number;
  estimatedRevenue: number;
  passengerCount: number;
  confidenceScore: number;
  satelliteReason?: string; // e.g. "Flood Detected via SAR"
}

export interface CrowdAnalysisResult {
  detectedCount: number;
  expectedCount: number;
  discrepancy: number;
  confidence: number;
  imageUrl?: string;
}

export interface ChurnRiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  churnProbability: number;
  recommendedOffer?: {
    discountPercent: number;
    code: string;
    description: string;
  };
}

// --- DIGITAL TWIN TYPES (v14.0 + v15.0) ---
export interface SeatMap {
  rows: number;
  cols: number;
  seats: {
    id: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED_FEMALE' | 'CARGO';
    row: number;
    col: number;
  }[];
}

export interface VehicleComponentHealth {
  id: string;
  name: string;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  healthPercent: number;
  predictedFailureKm?: number;
}

// --- DRIVER UTILITIES (New Driver Features) ---
export interface LedgerEntry {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: 'TICKET' | 'FUEL' | 'MAINTENANCE' | 'FOOD' | 'OTHER' | 'CHALLAN';
  amount: number;
  description: string;
  timestamp: number;
}

export interface DriverDocument {
  id: string;
  type: 'DL' | 'RC' | 'INSURANCE' | 'PERMIT' | 'POLLUTION';
  number: string;
  expiryDate: string; // ISO
  status: 'VALID' | 'EXPIRING' | 'EXPIRED';
  imageUrl?: string;
}

export interface FuelAdvice {
  currentEfficiency: number; // km/l
  terrainType: 'FLAT' | 'UPHILL' | 'DOWNHILL' | 'ROUGH';
  recommendedGear: string;
  recommendedSpeed: number;
  savingsPotential: number; // INR
}

// --- OFFLINE & MESH TYPES (v14.0 + v15.0) ---
export interface OfflineAction {
  id: string;
  type: 'BOOK_TICKET' | 'BOOK_RENTAL' | 'SEND_PARCEL';
  payload: any;
  timestamp: number;
}

export interface MeshPeer {
  id: string;
  name: string;
  signalStrength: number;
  lastSeen: number;
  deviceType?: string;
}

export type GoogleLocationData = LocationData;

export interface DynamicFareResult {
  totalFare: number;
  baseFare: number;
  surgeAmount: number;
  discountAmount: number;
  isRushHour: boolean;
  isHappyHour: boolean;
  message: string;
}

export interface CrowdForecast {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  occupancyPercent: number;
  label: string;
  hour: number;
}

// --- ADMIN TYPES (v16.0) ---
export interface AdminStats {
  totalUsers: number;
  pendingDrivers: number;
  activeTrips: number;
  totalRevenue: number;
  systemHealth: number;
}

// --- MANDI & LOCAL UTILITY (New Idea #4) ---
export interface MandiRate {
  crop: string;
  price: number; // per quintal
  trend: 'UP' | 'DOWN' | 'STABLE';
  satelliteInsight?: string; // e.g. "EO Data: Harvest ready in Chenari"
  predictedPrice?: number; // ML Feature 4
}

// --- COMMUNITY & JOBS (New Ideas #2, #12, #20) ---
export interface JobOpportunity {
  id: string;
  title: string;
  location: string;
  wage: string;
  contact: string;
  type: 'DAILY' | 'CONTRACT';
}

export interface MarketItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  supplier: string;
  inStock: boolean;
  isDidiProduct?: boolean; // Feature 5: Gram-Lakshmi
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  location: string;
  timestamp: number;
  videoUrl?: string; // For Idea #13
}

export interface PilgrimagePackage {
  id: string;
  name: string;
  locations: string[];
  price: number;
  duration: string;
  image: string;
}

export interface RoadReport {
  id: string;
  type: 'ACCIDENT' | 'TRAFFIC' | 'POLICE_CHECK' | 'POTHOLE';
  location: string;
  timestamp: number;
  upvotes: number;
}

export interface LostItem {
  id: string;
  item: string;
  location: string;
  date: string;
  contact: string;
  status: 'LOST' | 'FOUND';
}

// --- MARKETING MODE TYPES (GRAM-HAAT) ---
// UPDATED: Only Construction Material allowed
export type ShopCategory = 'CONSTRUCTION';

export interface Product {
  id: string;
  shopId: string;
  name: string;
  price: number;
  unit: string;
  image: string; // URL or icon name
  available: boolean;
  description?: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  category: ShopCategory;
  location: string;
  rating: number;
  isOpen: boolean;
  themeColor: string;
  hasBatterySwap?: boolean; // Idea: EV Battery Swap
  isTeleMedPoint?: boolean; // Idea: Tele-Medicine
}

// --- OFFLINE MEDIA (Data Mule) ---
export interface MediaItem {
  id: string;
  title: string;
  category: 'MOVIE' | 'NEWS' | 'FARMING' | 'EDUCATION';
  sizeMb: number;
  downloaded: boolean;
  thumbnail?: string;
}

// --- ML SPECIFIC TYPES ---
export interface LeafDiagnosisResult {
  disease: string;
  confidence: number;
  remedy: string;
  productLink?: string;
}

export interface ParcelScanResult {
  weightKg: number;
  dimensions: string;
  recommendedType: string;
}

// --- FOOD / MESS INTERFACES (v17.0) ---

export interface FoodItem {
  id: string;
  messId: string;
  name: string;
  price: number;
  type: 'VEG' | 'NON_VEG' | 'EGG';
  category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  description?: string;
  image?: string;
  available: boolean;
  isRecommended?: boolean; // ML Feature
  nutritionalInfo?: string;
}

export interface FoodBooking {
  id: string;
  userId: string;
  messId: string;
  items: { itemId: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'REDEEMED' | 'CANCELLED';
  token: string;
  mealTime: 'LUNCH' | 'DINNER' | 'BREAKFAST';
  scheduledDate: string;
  bookingTime: number;
}

export interface FoodSubscription {
  id: string;
  userId: string;
  messId: string;
  planName: string;
  type: 'WEEKLY' | 'MONTHLY';
  startDate: number;
  endDate: number;
  status: 'ACTIVE' | 'EXPIRED';
}

// --- FOODLINK V18.0: VENDOR & RESTAURANT ECOSYSTEM ---

// Budget & Category Types
export type BudgetTier = 'BUDGET' | 'MID_RANGE' | 'PREMIUM' | 'LUXURY';
export type RestaurantCategory = 'DHABA' | 'MESS' | 'FAST_FOOD' | 'RESTAURANT' | 'CAFE' | 'STREET_STALL' | 'FINE_DINING';
export type CuisineType = 'NORTH_INDIAN' | 'SOUTH_INDIAN' | 'CHINESE' | 'CONTINENTAL' | 'STREET_FOOD' | 'MULTI_CUISINE';
export type StallCategory = 'STREET_FOOD' | 'JUICE_STALL' | 'CHAT_CORNER' | 'TEA_STALL' | 'FOOD_CART' | 'DHABA';
export type VendorStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';

// Food Vendor Interface
export interface FoodVendor {
  id: string;
  userId: string;
  // Personal Details
  name: string;
  phone: string;
  aadharNumber?: string;
  photo?: string;
  // Stall Details
  stallName: string;
  stallCategory: StallCategory;
  location: string;
  coordinates?: { lat: number; lng: number };
  pincode?: string;
  isMobile: boolean;
  operatingHours: { open: string; close: string };
  // Verification
  fssaiLicense?: string;
  status: VendorStatus;
  verifiedAt?: number;
  badges: ('VERIFIED' | 'FSSAI_CERTIFIED' | 'HYGIENE_RATED' | 'TOP_RATED')[];
  // Bank/Payment
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  // Stats
  rating: number;
  totalOrders: number;
  isOpen: boolean;
  isPureVeg: boolean;
  specialties: string[];
  images: string[];
  description?: string;
  createdAt: number;
}

// Enhanced Restaurant Interface
export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  category: RestaurantCategory;
  budgetTier: BudgetTier;
  starRating: 1 | 2 | 3 | 4 | 5;
  cuisines: CuisineType[];
  location: string;
  coordinates?: { lat: number; lng: number };
  pincode?: string;
  distanceKm?: number;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  avgCostForTwo: number;
  hasTableBooking: boolean;
  hasParcel: boolean;
  hasSubscription: boolean;
  isPureVeg: boolean;
  images: string[];
  features: ('AC' | 'WIFI' | 'PARKING' | 'CARD_ACCEPTED' | 'HOME_DELIVERY')[];
  crowdLevel?: 'QUIET' | 'MODERATE' | 'BUSY' | 'VERY_BUSY';
  waitTimeMinutes?: number;
  description?: string;
  phone?: string;
}

// Table Booking
export interface TableBooking {
  id: string;
  userId: string;
  restaurantId: string;
  date: string;
  timeSlot: string;
  partySize: number;
  occasion?: 'BIRTHDAY' | 'ANNIVERSARY' | 'BUSINESS' | 'CASUAL';
  specialRequests?: string;
  preOrderItems?: { itemId: string; quantity: number }[];
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  confirmationCode: string;
  createdAt: number;
}

// Enhanced Mess Pass
export interface MessPass {
  id: string;
  userId: string;
  restaurantId: string;
  planType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  meals: ('BREAKFAST' | 'LUNCH' | 'DINNER')[];
  startDate: number;
  endDate: number;
  pausedUntil?: number;
  price: number;
  mealsUsed: number;
  mealsTotal: number;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  transactionId?: string;
}

// Food Customization
export interface FoodCustomization {
  spiceLevel: 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY';
  addOns: { name: string; price: number }[];
  exclusions: string[];
  specialInstructions?: string;
}

// Order Types
export type FoodOrderType = 'DINE_IN' | 'TAKEAWAY' | 'PRE_ORDER';
export type FoodOrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

// Enhanced Food Order
export interface FoodOrder {
  id: string;
  userId: string;
  vendorId: string;
  vendorType: 'RESTAURANT' | 'STALL';
  orderType: FoodOrderType;
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    customization?: FoodCustomization;
  }[];
  totalAmount: number;
  packagingCharges?: number;
  scheduledFor?: number;
  tableBookingId?: string;
  status: FoodOrderStatus;
  token: string;
  qrPayload?: string;
  estimatedReadyTime?: number;
  acceptedAt?: number;
  readyAt?: number;
  completedAt?: number;
  createdAt: number;
}

// Food Review
export interface FoodReview {
  id: string;
  userId: string;
  userName: string;
  vendorId: string;
  vendorType: 'RESTAURANT' | 'STALL';
  ratings: {
    food: number;
    service: number;
    value: number;
    hygiene: number;
  };
  overallRating: number;
  comment?: string;
  photos?: string[];
  orderedItems?: string[];
  createdAt: number;
  helpfulCount: number;
}

export interface Wallet {
  balance: number;
  address: string;
  nfts: NFTMetadata[];
}
