
import { Ticket, TicketStatus, PaymentMethod, BusState, User, RentalBooking, ParcelBooking } from '../types';
import { io } from 'socket.io-client';
import { getAuthToken } from './authService';

const STORAGE_KEY = 'villagelink_tickets_cache'; // Renamed cache to avoid conflict

// --- CONFIGURATION ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\./);
const SERVER_URL = isLocal 
  ? `http://${window.location.hostname}:3001` 
  : window.location.origin;

let socket: any = null;
let localTickets: Ticket[] = [];
let activeBuses: BusState[] = [];

// --- INITIALIZATION ---
export const initSocketConnection = () => {
  const token = getAuthToken();
  if (!token) return;

  if (socket) {
    // If socket exists but token changed, reconnect
    if (socket.auth && (socket.auth as any).token !== token) {
      socket.disconnect();
    } else if (socket.connected) {
      return; // Already connected
    }
  }

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
  } as any);

  socket.on('connect_error', (err: any) => {
    console.error("Socket Auth Error:", err.message);
    if (err.message.includes("Authentication")) {
      // Force logout if session is invalid (e.g. logged in elsewhere)
      window.dispatchEvent(new Event('auth_error')); 
    }
  });

  // Re-attach listeners if they were cleared
  attachListeners();
};

let listeners: { onTickets: Function, onBuses: Function } | null = null;

const attachListeners = () => {
  if (!socket || !listeners) return;

  socket.off('sync_state');
  socket.off('tickets_updated');
  socket.off('vehicles_update');

  socket.on('sync_state', (data: { tickets: Ticket[], activeBuses: BusState[] }) => {
    // Merge live tickets with cache if needed, for now trust server
    // Note: This only syncs ACTIVE tickets. History is fetched via API.
    localTickets = data.tickets || [];
    activeBuses = data.activeBuses || [];
    if (listeners) {
      listeners.onTickets(localTickets);
      listeners.onBuses(activeBuses);
    }
  });

  socket.on('tickets_updated', (tickets: Ticket[]) => {
    localTickets = tickets;
    listeners?.onTickets();
  });

  socket.on('vehicles_update', (buses: BusState[]) => {
    activeBuses = buses;
    listeners?.onBuses(activeBuses);
  });
};

export const subscribeToUpdates = (
  onTickets: (t?: Ticket[]) => void, 
  onBuses: (buses: BusState[]) => void
) => {
  listeners = { onTickets, onBuses };
  if (!socket) initSocketConnection();
  attachListeners();
};

// --- API METHODS ---

export const getStoredTickets = (): Ticket[] => {
  return localTickets;
};

export const getActiveBuses = (): BusState[] => {
  return activeBuses;
};

// Passenger Logic
export const saveTicket = (ticket: Ticket): Ticket[] => {
  localTickets = [ticket, ...localTickets];
  if (socket) socket.emit('book_ticket', ticket);
  return localTickets;
};

// Driver Logic
export const registerDriverOnNetwork = (user: User) => {
  if (socket && user.role === 'DRIVER') {
    socket.emit('driver_connect', user);
  }
};

export const disconnectDriver = (userId: string) => {
  if (socket) {
    socket.emit('driver_disconnect', userId);
  }
};

export const broadcastBusLocation = (state: Partial<BusState> & { driverId: string }) => {
  if (socket) {
    socket.emit('driver_location_update', state);
  }
};

export const updateTicketStatus = (ticketId: string, method: PaymentMethod, newStatus: TicketStatus, driverId?: string): Ticket[] => {
  if (socket) {
    socket.emit('update_ticket', { ticketId, status: newStatus, paymentMethod: method, driverId });
  }
  return localTickets;
};

export const generateTicketId = (): string => {
  return `TK-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const bookRental = async (rental: RentalBooking): Promise<boolean> => {
  // Mock implementation for offline service compatibility
  return true;
};

export const bookParcel = async (parcel: ParcelBooking): Promise<boolean> => {
  // Mock implementation for offline service compatibility
  return true;
};
