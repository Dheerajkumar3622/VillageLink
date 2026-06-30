/**
 * Seat Tracking Service — Real-time vehicle capacity management
 * 
 * Tracks occupied/available seats per driver in real-time.
 * Updated on:
 *   - Ticket auto-verified (GPS speed match) → seatsOccupied++
 *   - Ticket manually verified (QR scan) → seatsOccupied++
 *   - Passenger alights (speed=0 near destination) → seatsOccupied--
 *   - Driver marks trip complete → seatsOccupied--
 *   - Driver resets (goes offline/online) → seatsOccupied = 0
 */

import { DriverLocation, Ticket, User } from '../models.js';

let io = null;

export const initializeSeatTracking = (socketIo) => {
  io = socketIo;
  console.log('💺 Seat Tracking Service initialized');
};

/**
 * Increment seats when passenger boards
 */
export const onPassengerBoard = async (driverId, passengerCount = 1) => {
  try {
    const result = await DriverLocation.findOneAndUpdate(
      { driverId },
      { $inc: { seatsOccupied: passengerCount } },
      { new: true }
    );
    
    if (result) {
      await broadcastSeatUpdate(result);
    }
    
    return result;
  } catch (error) {
    console.error('Seat board error:', error);
    return null;
  }
};

/**
 * Decrement seats when passenger alights
 */
export const onPassengerAlight = async (driverId, passengerCount = 1) => {
  try {
    const result = await DriverLocation.findOneAndUpdate(
      { driverId, seatsOccupied: { $gte: passengerCount } },
      { $inc: { seatsOccupied: -passengerCount } },
      { new: true }
    );
    
    if (result) {
      await broadcastSeatUpdate(result);
    }
    
    return result;
  } catch (error) {
    console.error('Seat alight error:', error);
    return null;
  }
};

/**
 * Reset seat count (driver goes online / restarts trip)
 */
export const resetSeats = async (driverId) => {
  try {
    const user = await User.findOne({ id: driverId }).lean();
    const vehicleCapacity = user?.vehicleCapacity || 20;
    
    const result = await DriverLocation.findOneAndUpdate(
      { driverId },
      { seatsOccupied: 0, seatsTotal: vehicleCapacity, parcelsOnboard: 0 },
      { new: true }
    );
    
    if (result) {
      await broadcastSeatUpdate(result);
    }
    
    return result;
  } catch (error) {
    console.error('Seat reset error:', error);
    return null;
  }
};

/**
 * Add parcel to vehicle
 */
export const onParcelLoaded = async (driverId, count = 1) => {
  try {
    const result = await DriverLocation.findOneAndUpdate(
      { driverId },
      { $inc: { parcelsOnboard: count } },
      { new: true }
    );
    
    if (result) {
      await broadcastSeatUpdate(result);
    }
    
    return result;
  } catch (error) {
    console.error('Parcel load error:', error);
    return null;
  }
};

/**
 * Remove parcel from vehicle
 */
export const onParcelDelivered = async (driverId, count = 1) => {
  try {
    const result = await DriverLocation.findOneAndUpdate(
      { driverId, parcelsOnboard: { $gte: count } },
      { $inc: { parcelsOnboard: -count } },
      { new: true }
    );
    
    if (result) {
      await broadcastSeatUpdate(result);
    }
    
    return result;
  } catch (error) {
    console.error('Parcel deliver error:', error);
    return null;
  }
};

/**
 * Get seat info for a specific driver
 */
export const getSeatInfo = async (driverId) => {
  const loc = await DriverLocation.findOne({ driverId }).lean();
  if (!loc) return null;
  
  return {
    driverId,
    driverName: loc.driverName,
    vehicleType: loc.vehicleType,
    seatsTotal: loc.seatsTotal || 20,
    seatsOccupied: loc.seatsOccupied || 0,
    seatsAvailable: (loc.seatsTotal || 20) - (loc.seatsOccupied || 0),
    parcelsOnboard: loc.parcelsOnboard || 0,
    activeRouteId: loc.activeRouteId,
    isOnline: loc.isOnline,
    lastUpdated: loc.lastUpdated
  };
};

/**
 * Get all vehicles on a route with seat info
 */
export const getRouteVehicles = async (routeId) => {
  const vehicles = await DriverLocation.find({
    activeRouteId: routeId,
    isOnline: true
  }).lean();
  
  return vehicles.map(v => ({
    driverId: v.driverId,
    driverName: v.driverName || 'Driver',
    driverPhone: v.driverPhone,
    vehicleType: v.vehicleType || 'BUS',
    seatsTotal: v.seatsTotal || 20,
    seatsOccupied: v.seatsOccupied || 0,
    seatsAvailable: (v.seatsTotal || 20) - (v.seatsOccupied || 0),
    parcelsOnboard: v.parcelsOnboard || 0,
    location: {
      lat: v.location?.coordinates?.[1],
      lng: v.location?.coordinates?.[0]
    },
    speed: v.speed || 0,
    heading: v.heading || 0,
    nextStopName: v.nextStopName,
    nextStopIndex: v.nextStopIndex,
    lastUpdated: v.lastUpdated
  }));
};

/**
 * Broadcast seat update to all clients on the route
 */
const broadcastSeatUpdate = async (driverLoc) => {
  if (!io) return;

  const seatsAvailable = (driverLoc.seatsTotal || 20) - (driverLoc.seatsOccupied || 0);

  // Emit global vehicles_update to sync passenger/driver maps instantly
  io.emit('vehicles_update', [{
    id: driverLoc.driverId,
    lat: driverLoc.location?.coordinates?.[1],
    lng: driverLoc.location?.coordinates?.[0],
    speed: driverLoc.speed || 0,
    heading: driverLoc.heading || 0,
    capacity: driverLoc.seatsTotal || 20,
    occupancy: driverLoc.seatsOccupied || 0,
    parcelsOnboard: driverLoc.parcelsOnboard || 0
  }]);

  if (driverLoc.activeRouteId) {
    io.to(`route_${driverLoc.activeRouteId}`).emit('seat_update', {
      driverId: driverLoc.driverId,
      driverName: driverLoc.driverName,
      vehicleType: driverLoc.vehicleType,
      seatsTotal: driverLoc.seatsTotal || 20,
      seatsOccupied: driverLoc.seatsOccupied || 0,
      seatsAvailable,
      parcelsOnboard: driverLoc.parcelsOnboard || 0,
      location: {
        lat: driverLoc.location?.coordinates?.[1],
        lng: driverLoc.location?.coordinates?.[0]
      },
      lastUpdated: Date.now()
    });
  }
  
  // Notify driver about updated seat count
  io.to(`driver_${driverLoc.driverId}`).emit('my_seat_update', {
    seatsOccupied: driverLoc.seatsOccupied || 0,
    seatsTotal: driverLoc.seatsTotal || 20,
    seatsAvailable,
    parcelsOnboard: driverLoc.parcelsOnboard || 0
  });
  
  // If seats are very low, warn
  if (seatsAvailable <= 3 && seatsAvailable > 0) {
    io.to(`driver_${driverLoc.driverId}`).emit('low_seats_warning', {
      seatsAvailable,
      message: `⚠️ Only ${seatsAvailable} seats left!`
    });
  }
};

export default {
  initializeSeatTracking,
  onPassengerBoard,
  onPassengerAlight,
  resetSeats,
  onParcelLoaded,
  onParcelDelivered,
  getSeatInfo,
  getRouteVehicles
};
