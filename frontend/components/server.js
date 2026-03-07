
/**
 * VillageLink v11.1 Backend (Logistics & History Update)
 */

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- MONGOOSE SCHEMAS ---
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  role: String,
  password: { type: String, required: true },
  email: String,
  phone: String,
  sessionToken: String,
  isCharterAvailable: Boolean 
});
const User = mongoose.model('User', userSchema);

const ticketSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  driverId: String,
  from: String,
  to: String,
  fromDetails: String,
  toDetails: String,
  status: String,
  paymentMethod: String,
  timestamp: Number,
  passengerCount: Number,
  totalPrice: Number,
  routePath: [String]
});
const Ticket = mongoose.model('Ticket', ticketSchema);

const passSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  from: String,
  to: String,
  type: String, 
  seatConfig: String, 
  validityDays: Number,
  usedDates: [String], 
  purchaseDate: Number,
  expiryDate: Number,
  price: Number,
  status: String 
});
const Pass = mongoose.model('Pass', passSchema);

const rentalBookingSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  vehicleType: String, 
  from: String,
  to: String,
  tripType: String,
  date: String,
  distanceKm: Number,
  totalFare: Number,
  status: String, 
  driverId: String
});
const RentalBooking = mongoose.model('RentalBooking', rentalBookingSchema);

// v11.1 Logistics Schema
const parcelSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  from: String,
  to: String,
  itemType: String,
  weightKg: Number,
  price: Number,
  status: String,
  timestamp: Number
});
const Parcel = mongoose.model('Parcel', parcelSchema);


// --- DB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
let isMockMode = false;
const MOCK_DB = { users: [], tickets: [], passes: [], rentals: [], parcels: [] };

if (!MONGO_URI) {
  console.warn("⚠️ No MONGO_URI found. Running in Memory Mode.");
  isMockMode = true;
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
      console.error('❌ DB Error:', err.message);
      isMockMode = true;
    });
}

// --- DB HELPERS ---
const DB = {
  saveTicket: async (data) => {
    if (isMockMode) { MOCK_DB.tickets.push(data); return data; }
    return await new Ticket(data).save();
  },
  findUser: async (query) => {
    if (isMockMode) return MOCK_DB.users.find(u => u.id === query.id && u.password === query.password);
    return await User.findOne(query);
  },
  saveUser: async (data) => {
    if (isMockMode) { MOCK_DB.users.push(data); return data; }
    return await new User(data).save();
  },
  updateUserCharterStatus: async (userId, isAvailable) => {
    if (isMockMode) {
      const u = MOCK_DB.users.find(u => u.id === userId);
      if (u) u.isCharterAvailable = isAvailable;
      return u;
    }
    return await User.findOneAndUpdate({ id: userId }, { isCharterAvailable: isAvailable });
  },
  savePass: async (data) => {
    if (isMockMode) { MOCK_DB.passes.push(data); return data; }
    return await new Pass(data).save();
  },
  verifyPassUsage: async (passId, dateStr) => {
    if (isMockMode) {
        const pass = MOCK_DB.passes.find(p => p.id === passId);
        if (!pass) return { error: "Pass not found" };
        if (pass.usedDates.includes(dateStr)) return { error: "Already used today" };
        if (pass.expiryDate < Date.now()) return { error: "Pass expired" };
        pass.usedDates.push(dateStr);
        return { success: true, pass };
    }
    const pass = await Pass.findOne({ id: passId });
    if (!pass) return { error: "Pass not found" };
    if (pass.usedDates.includes(dateStr)) return { error: "Already used today" };
    if (pass.expiryDate < Date.now()) return { error: "Pass expired" };
    pass.usedDates.push(dateStr);
    await pass.save();
    return { success: true, pass };
  },
  saveRental: async (data) => {
    if(isMockMode) { MOCK_DB.rentals.push(data); return data; }
    return await new RentalBooking(data).save();
  },
  saveParcel: async (data) => {
    if(isMockMode) { MOCK_DB.parcels.push(data); return data; }
    return await new Parcel(data).save();
  },
  
  // UNIFIED HISTORY QUERY
  getAllHistoryByUser: async (userId) => {
    if (isMockMode) {
        const tickets = MOCK_DB.tickets.filter(t => t.userId === userId).map(t => ({...t, historyType: 'TICKET'}));
        const passes = MOCK_DB.passes.filter(p => p.userId === userId).map(p => ({...p, historyType: 'PASS'}));
        const rentals = MOCK_DB.rentals.filter(r => r.userId === userId).map(r => ({...r, historyType: 'RENTAL'}));
        const parcels = MOCK_DB.parcels.filter(p => p.userId === userId).map(p => ({...p, historyType: 'PARCEL'}));
        return [...tickets, ...passes, ...rentals, ...parcels].sort((a,b) => {
            const timeA = a.timestamp || a.purchaseDate || new Date(a.date).getTime() || 0;
            const timeB = b.timestamp || b.purchaseDate || new Date(b.date).getTime() || 0;
            return timeB - timeA;
        });
    }
    
    // MongoDB Aggregation
    const tickets = await Ticket.find({ userId }).lean().then(d => d.map(x => ({...x, historyType: 'TICKET'})));
    const passes = await Pass.find({ userId }).lean().then(d => d.map(x => ({...x, historyType: 'PASS'})));
    const rentals = await RentalBooking.find({ userId }).lean().then(d => d.map(x => ({...x, historyType: 'RENTAL'})));
    const parcels = await Parcel.find({ userId }).lean().then(d => d.map(x => ({...x, historyType: 'PARCEL'})));
    
    return [...tickets, ...passes, ...rentals, ...parcels].sort((a,b) => {
        const timeA = a.timestamp || a.purchaseDate || new Date(a.date).getTime() || 0;
        const timeB = b.timestamp || b.purchaseDate || new Date(b.date).getTime() || 0;
        return timeB - timeA;
    });
  },
  
  // For Driver View - specific logic
  findRentalsByStatus: async (status) => {
    if(isMockMode) return MOCK_DB.rentals.filter(r => r.status === status);
    return await RentalBooking.find({ status });
  },
  updateRentalStatus: async (rentalId, status, driverId) => {
    if(isMockMode) {
      const r = MOCK_DB.rentals.find(x => x.id === rentalId);
      if(r) { r.status = status; r.driverId = driverId; }
      return r;
    }
    return await RentalBooking.findOneAndUpdate({ id: rentalId }, { status, driverId });
  },
  findPassesByUser: async (userId) => {
    if (isMockMode) return MOCK_DB.passes.filter(p => p.userId === userId);
    return await Pass.find({ userId });
  }
};

// --- ROUTES ---
app.post('/api/auth/login', async (req, res) => {
   try {
     const { loginId, password } = req.body;
     const user = await DB.findUser({ id: loginId, password });
     if (!user) return res.status(401).json({ error: "Invalid" });
     res.json({ success: true, user, token: 'session_token' });
   } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
   try {
     const user = req.body;
     user.id = `USR-${Math.floor(Math.random() * 10000)}`;
     await DB.saveUser(user);
     res.json({ success: true, user, token: 'session_token' });
   } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPGRADED HISTORY ENDPOINT
app.get('/api/user/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const fullHistory = await DB.getAllHistoryByUser(userId);
    res.json(fullHistory);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pass Endpoints
app.post('/api/passes/buy', async (req, res) => {
    try {
        const pass = await DB.savePass(req.body);
        res.json({ success: true, pass });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/passes/list', async (req, res) => {
    try {
        const { userId } = req.query;
        const passes = await DB.findPassesByUser(userId);
        res.json(passes);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/passes/verify', async (req, res) => {
    try {
        const { passId } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const result = await DB.verifyPassUsage(passId, today);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Rental Endpoints
app.post('/api/rentals/book', async (req, res) => {
    try {
        const rental = await DB.saveRental(req.body);
        res.json({ success: true, rental });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rentals/requests', async (req, res) => {
    try {
        // In real app, filter by vehicle type capability of driver
        const requests = await DB.findRentalsByStatus('PENDING');
        res.json(requests);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rentals/respond', async (req, res) => {
    try {
        const { rentalId, driverId, status } = req.body; 
        const rental = await DB.updateRentalStatus(rentalId, status, driverId);
        res.json({ success: true, rental });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Logistics Endpoints (v11.1)
app.post('/api/logistics/book', async (req, res) => {
    try {
        const parcel = await DB.saveParcel(req.body);
        res.json({ success: true, parcel });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


app.post('/api/driver/toggle-charter', async (req, res) => {
    try {
        const { userId, isAvailable } = req.body;
        await DB.updateUserCharterStatus(userId, isAvailable);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});


// --- SOCKET ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
   socket.on('book_ticket', async (data) => {
      await DB.saveTicket(data);
      io.emit('tickets_updated', [data]);
   });
   socket.on('update_ticket', async (data) => {
      io.emit('tickets_updated', []); // Trigger refresh
   });
   socket.on('driver_location_update', (data) => {
      io.emit('vehicles_update', [data]);
   });
   socket.on('driver_connect', (user) => { });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`VillageLink v11.1 Server running on ${PORT}`);
});
