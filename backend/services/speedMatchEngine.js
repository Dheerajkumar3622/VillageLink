/**
 * Speed Match Engine — 1000x GPS Auto-Verification
 * 
 * Compares passenger GPS speed with driver GPS speed in real-time.
 * If both travel at same speed for 60+ seconds AND ticket is paid online,
 * the ticket auto-verifies without manual QR scan.
 * 
 * For cash tickets → driver scans manually (existing QR flow).
 * 
 * Data flow:
 *   passenger_location_stream → speedBuffer update → checkAllPendingMatches() every 10s
 *   driver_location_stream → speedBuffer update (already exists in server.js)
 */

import { Ticket, DriverLocation, User, StopDemand, Notification } from '../models.js';

// --- CONFIGURATION ---
const MATCH_WINDOW_SECONDS = 60;       // Must match for 60 seconds
const SPEED_TOLERANCE_KMPH = 5;        // Allow ±5 km/h difference
const PROXIMITY_THRESHOLD_KM = 0.05;   // Must be within 50 meters
const CORRELATION_THRESHOLD = 0.85;    // 85% correlation needed
const CHECK_INTERVAL_MS = 10000;       // Check every 10 seconds
const BUFFER_MAX_ENTRIES = 30;         // Max GPS samples per user (5 min at 10s intervals)
const MIN_MOVING_SPEED = 5;            // Minimum speed to consider "moving" (km/h)

// Socket.IO reference
let io = null;

// Speed buffers: userId → [{ speed, lat, lng, timestamp }]
const speedBuffers = new Map();

// Set of ticket IDs already auto-verified (prevent double verify)
const verifiedTickets = new Set();

/**
 * Initialize the Speed Match Engine
 */
export const initializeSpeedMatchEngine = (socketIo) => {
  io = socketIo;
  
  // Run match checker periodically
  setInterval(checkAllPendingMatches, CHECK_INTERVAL_MS);
  
  console.log('⚡ Speed Match Engine initialized (60s window, 85% correlation)');
};

/**
 * Update speed buffer for a user (passenger or driver)
 * Called from Socket.IO location stream handlers
 */
export const updateSpeedBuffer = (userId, locationData) => {
  if (!speedBuffers.has(userId)) {
    speedBuffers.set(userId, []);
  }
  
  const buffer = speedBuffers.get(userId);
  buffer.push({
    speed: locationData.speed || 0,
    lat: locationData.lat,
    lng: locationData.lng,
    timestamp: Date.now()
  });
  
  // Keep only last BUFFER_MAX_ENTRIES entries
  if (buffer.length > BUFFER_MAX_ENTRIES) {
    buffer.splice(0, buffer.length - BUFFER_MAX_ENTRIES);
  }
};

/**
 * Remove user from speed buffer (went offline)
 */
export const clearSpeedBuffer = (userId) => {
  speedBuffers.delete(userId);
};

/**
 * Haversine distance between two points in km
 */
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculate speed correlation between two speed arrays
 * Returns 0-1 score. 1.0 = perfect match
 */
const calculateSpeedCorrelation = (passengerSpeeds, driverSpeeds) => {
  if (passengerSpeeds.length < 3 || driverSpeeds.length < 3) return 0;
  
  // Align by timestamp (find overlapping window)
  const now = Date.now();
  const windowStart = now - (MATCH_WINDOW_SECONDS * 1000);
  
  const pFiltered = passengerSpeeds.filter(s => s.timestamp >= windowStart);
  const dFiltered = driverSpeeds.filter(s => s.timestamp >= windowStart);
  
  if (pFiltered.length < 3 || dFiltered.length < 3) return 0;
  
  // Sample at matched time intervals (nearest-neighbor interpolation)
  let matches = 0;
  let total = 0;
  let movingMatches = 0;
  
  for (const pSample of pFiltered) {
    // Find closest driver sample by timestamp
    let closest = dFiltered[0];
    let minTimeDiff = Math.abs(pSample.timestamp - closest.timestamp);
    
    for (const dSample of dFiltered) {
      const timeDiff = Math.abs(pSample.timestamp - dSample.timestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closest = dSample;
      }
    }
    
    // Only compare if timestamps are within 15 seconds of each other
    if (minTimeDiff <= 15000) {
      total++;
      const speedDiff = Math.abs(pSample.speed - closest.speed);
      
      if (speedDiff <= SPEED_TOLERANCE_KMPH) {
        matches++;
        // Extra weight if both are actually moving (not just both stationary)
        if (pSample.speed >= MIN_MOVING_SPEED && closest.speed >= MIN_MOVING_SPEED) {
          movingMatches++;
        }
      }
    }
  }
  
  if (total === 0) return 0;
  
  const baseCorrelation = matches / total;
  
  // Require at least some samples where both were actually moving
  // This prevents false positives from two people both standing still
  if (movingMatches < 2) return 0;
  
  return baseCorrelation;
};

/**
 * Check proximity between passenger and driver
 */
const checkProximity = (passengerBuffer, driverBuffer) => {
  if (passengerBuffer.length === 0 || driverBuffer.length === 0) return false;
  
  const pLast = passengerBuffer[passengerBuffer.length - 1];
  const dLast = driverBuffer[driverBuffer.length - 1];
  
  const distance = haversine(pLast.lat, pLast.lng, dLast.lat, dLast.lng);
  return distance <= PROXIMITY_THRESHOLD_KM;
};

/**
 * Auto-verify a ticket
 */
const autoVerifyTicket = async (ticketId, driverId, passengerId) => {
  if (verifiedTickets.has(ticketId)) return; // Already verified
  verifiedTickets.add(ticketId);
  
  try {
    // 1. Update ticket status
    const ticket = await Ticket.findOneAndUpdate(
      { id: ticketId, status: { $in: ['PENDING', 'PAID'] } },
      {
        status: 'BOARDED',
        scannedAt: Date.now(),
        scannedByDriverId: driverId,
        verificationMethod: 'GPS_SPEED_MATCH',
        scanCount: 1
      },
      { new: true }
    );
    
    if (!ticket) {
      verifiedTickets.delete(ticketId);
      return;
    }
    
    // 2. Update driver's seat count
    const passengerCount = ticket.passengerCount || 1;
    await DriverLocation.findOneAndUpdate(
      { driverId },
      { $inc: { seatsOccupied: passengerCount } }
    );
    
    // 3. Decrease stop demand
    if (ticket.from) {
      await StopDemand.findOneAndUpdate(
        { stopName: ticket.from },
        { $inc: { waitingPassengers: -passengerCount }, lastUpdated: new Date() }
      );
    }
    
    // 4. Get updated seat info for broadcast
    const driverLoc = await DriverLocation.findOne({ driverId }).lean();
    const seatsAvailable = (driverLoc?.seatsTotal || 20) - (driverLoc?.seatsOccupied || 0);
    
    // 5. Get driver & passenger info
    const driver = await User.findOne({ id: driverId }).lean();
    const passenger = await User.findOne({ id: passengerId }).lean();
    
    console.log(`⚡ AUTO-VERIFIED: Ticket ${ticketId} | ${passenger?.name} → Driver ${driver?.name} | Seats: ${driverLoc?.seatsOccupied}/${driverLoc?.seatsTotal}`);
    
    // 6. Socket.IO broadcasts
    if (io) {
      // Notify passenger: "Your ticket has been verified!"
      io.to(`passenger_${passengerId}`).emit('ticket_auto_verified', {
        ticketId,
        driverName: driver?.name,
        vehicleType: driverLoc?.vehicleType,
        seatsAvailable,
        message: `✅ Ticket verified! ${driver?.name} ki gaadi mein seat confirmed.`
      });
      
      // Notify driver: "Ticket #xxx verified, ₹xx received"
      io.to(`driver_${driverId}`).emit('ticket_verified_on_board', {
        ticketId: ticket.id,
        passengerName: passenger?.name || 'Passenger',
        passengerCount,
        amount: ticket.totalPrice,
        paymentMethod: ticket.paymentMethod,
        from: ticket.from,
        to: ticket.to,
        verificationMethod: 'GPS_SPEED_MATCH',
        seatsOccupied: driverLoc?.seatsOccupied || 0,
        seatsTotal: driverLoc?.seatsTotal || 20,
        seatsAvailable
      });
      
      // Broadcast seat update to everyone on this route
      if (driverLoc?.activeRouteId) {
        io.to(`route_${driverLoc.activeRouteId}`).emit('seat_update', {
          driverId,
          driverName: driver?.name,
          vehicleType: driverLoc?.vehicleType,
          seatsOccupied: driverLoc?.seatsOccupied || 0,
          seatsTotal: driverLoc?.seatsTotal || 20,
          seatsAvailable,
          parcelsOnboard: driverLoc?.parcelsOnboard || 0,
          lastUpdated: Date.now()
        });
      }
      
      // Broadcast stop demand update
      io.to(`route_${driverLoc?.activeRouteId}`).emit('stop_demand_update', {
        stopName: ticket.from,
        change: -passengerCount,
        reason: 'BOARDED'
      });
    }
    
    // 7. Save notifications to DB
    await Promise.all([
      new Notification({
        userId: passengerId,
        type: 'SPEED_MATCH',
        title: '✅ Ticket Auto-Verified!',
        body: `Seat confirmed on ${driver?.name} ki ${driverLoc?.vehicleType}. ${ticket.from} → ${ticket.to}`,
        data: { ticketId, driverId, seatsAvailable },
        sentViaFCM: false
      }).save(),
      new Notification({
        userId: driverId,
        type: 'SPEED_MATCH',
        title: `🎫 Ticket ${ticketId.slice(-6)} Verified`,
        body: `${passenger?.name} (${passengerCount} seat) | ₹${ticket.totalPrice} ${ticket.paymentMethod}`,
        data: { ticketId, passengerId, amount: ticket.totalPrice },
        sentViaFCM: false
      }).save()
    ]);
    
    // Clean up: remove from pending check after verify
    setTimeout(() => verifiedTickets.delete(ticketId), 300000); // Clear after 5 min
    
  } catch (error) {
    console.error(`❌ Auto-verify error for ticket ${ticketId}:`, error);
    verifiedTickets.delete(ticketId);
  }
};

/**
 * Auto-detect alighting (passenger reached destination)
 * Called when passenger speed drops to 0 near their 'to' stop
 */
export const checkAlighting = async (passengerId, lat, lng, speed) => {
  if (speed > MIN_MOVING_SPEED) return; // Still moving, not alighting
  
  try {
    // Find active BOARDED tickets for this passenger
    const activeTickets = await Ticket.find({
      userId: passengerId,
      status: 'BOARDED'
    }).lean();
    
    if (activeTickets.length === 0) return;
    
    for (const ticket of activeTickets) {
      // Find the route to get destination coordinates
      // For now, check if passenger is near any stop that matches ticket.to
      // This requires Route model with stop coordinates
      const { Route } = await import('../models.js');
      const route = await Route.findOne({
        stops: { $in: [ticket.to] }
      }).lean();
      
      if (!route || !route.stopCoordinates) continue;
      
      // Find destination stop coordinates
      const destIndex = route.stops.indexOf(ticket.to);
      if (destIndex === -1) continue;
      
      const destCoords = route.stopCoordinates?.[destIndex];
      if (!destCoords) continue;
      
      const distToDest = haversine(lat, lng, destCoords.lat, destCoords.lng);
      
      if (distToDest <= 0.1) { // Within 100 meters of destination
        // Mark ticket completed
        await Ticket.findOneAndUpdate(
          { id: ticket.id },
          { status: 'COMPLETED', completedAt: Date.now() }
        );
        
        // Decrement driver seat count
        if (ticket.scannedByDriverId) {
          const passengerCount = ticket.passengerCount || 1;
          await DriverLocation.findOneAndUpdate(
            { driverId: ticket.scannedByDriverId },
            { $inc: { seatsOccupied: -passengerCount } }
          );
          
          // Broadcast updated seat count
          const driverLoc = await DriverLocation.findOne({ driverId: ticket.scannedByDriverId }).lean();
          if (io && driverLoc?.activeRouteId) {
            const seatsAvailable = (driverLoc.seatsTotal || 20) - (driverLoc.seatsOccupied || 0);
            io.to(`route_${driverLoc.activeRouteId}`).emit('seat_update', {
              driverId: ticket.scannedByDriverId,
              seatsOccupied: driverLoc.seatsOccupied || 0,
              seatsTotal: driverLoc.seatsTotal || 20,
              seatsAvailable,
              lastUpdated: Date.now()
            });
          }
        }
        
        console.log(`🚏 AUTO-ALIGHTED: ${passengerId} reached ${ticket.to} — ticket ${ticket.id} completed`);
      }
    }
  } catch (error) {
    console.error('Alighting check error:', error);
  }
};

/**
 * Main check loop: Find all pending online-paid tickets and try to match
 */
const checkAllPendingMatches = async () => {
  try {
    // Find tickets that are PAID online and not yet boarded
    const pendingTickets = await Ticket.find({
      status: { $in: ['PENDING', 'PAID'] },
      paymentMethod: { $ne: 'CASH' },
      timestamp: { $gte: Date.now() - 24 * 60 * 60 * 1000 } // Last 24 hours only
    }).lean();
    
    if (pendingTickets.length === 0) return;
    
    // Get all online drivers
    const onlineDrivers = await DriverLocation.find({
      isOnline: true,
      activeRouteId: { $ne: null }
    }).lean();
    
    if (onlineDrivers.length === 0) return;
    
    for (const ticket of pendingTickets) {
      if (verifiedTickets.has(ticket.id)) continue;
      
      const passengerId = ticket.userId;
      const passengerBuffer = speedBuffers.get(passengerId);
      
      if (!passengerBuffer || passengerBuffer.length < 3) continue;
      
      // Find drivers on the same route as this ticket
      for (const driver of onlineDrivers) {
        const driverBuffer = speedBuffers.get(driver.driverId);
        if (!driverBuffer || driverBuffer.length < 3) continue;
        
        // 1. Check proximity first (cheap check)
        if (!checkProximity(passengerBuffer, driverBuffer)) continue;
        
        // 2. Calculate speed correlation (more expensive)
        const correlation = calculateSpeedCorrelation(passengerBuffer, driverBuffer);
        
        if (correlation >= CORRELATION_THRESHOLD) {
          console.log(`🎯 Speed match found! Passenger ${passengerId} ↔ Driver ${driver.driverId} (correlation: ${(correlation * 100).toFixed(1)}%)`);
          await autoVerifyTicket(ticket.id, driver.driverId, passengerId);
        }
      }
    }
  } catch (error) {
    console.error('Speed match check error:', error);
  }
};

/**
 * Get engine stats for debugging/dashboard
 */
export const getSpeedMatchStats = () => {
  return {
    activeBuffers: speedBuffers.size,
    verifiedCount: verifiedTickets.size,
    bufferSizes: Object.fromEntries(
      [...speedBuffers.entries()].map(([k, v]) => [k, v.length])
    )
  };
};

export default {
  initializeSpeedMatchEngine,
  updateSpeedBuffer,
  clearSpeedBuffer,
  checkAlighting,
  getSpeedMatchStats
};
