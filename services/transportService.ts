
import { Ticket, TicketStatus, PaymentMethod, BusState, User, Pass, RentalBooking, ParcelBooking } from '../types';
import { io } from 'socket.io-client';
import { getAuthToken, getCurrentUser } from './authService';
import { API_BASE_URL } from '../config';

const STORAGE_KEY = 'villagelink_tickets_cache';
const PASSES_KEY = 'villagelink_passes_cache';

// --- CONFIGURATION ---
const SERVER_URL = API_BASE_URL;

let socket: any = null;
let localTickets: Ticket[] = [];
let localPasses: Pass[] = [];
let activeBuses: BusState[] = [];

// --- HELPER ---
const getHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token || ''
    };
};

// --- INITIALIZATION ---
export const initSocketConnection = () => {
    const token = getAuthToken();
    if (!token) return;

    if (socket) {
        if (socket.connected) return;
        // If authenticated user changed, disconnect and reconnect
        if (socket.auth && (socket.auth as any).token !== token) {
            socket.disconnect();
        }
    }

    // FIX: Use polling first for stability on Render/Cloud hosting
    // 'websocket' first often fails due to firewalls or initial handshake issues
    socket = io(SERVER_URL, {
        transports: ['polling', 'websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    } as any);

    socket.on('connect_error', (err: any) => {
        // Suppress minor connection errors in console
        if (err.message !== "websocket error" && err.message !== "xhr poll error") {
            console.warn("Socket Connect Error (Retrying...):", err.message);
        }

        if (err.message.includes("Authentication")) {
            window.dispatchEvent(new Event('auth_error'));
        }
    });

    socket.on('connect', () => {
        // console.log("Socket Connected via " + socket.io.engine.transport.name);
    });

    attachListeners();
};

let listeners: { onTickets: Function, onBuses: Function } | null = null;

const attachListeners = () => {
    if (!socket || !listeners) return;

    socket.off('sync_state');
    socket.off('tickets_updated');
    socket.off('vehicles_update');

    socket.on('sync_state', (data: { tickets: Ticket[], activeBuses: BusState[] }) => {
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

// --- SMART PROFIT LOGIC (Phase 7) ---

/**
 * Calculates waiting passenger counts for a given path
 */
export const getPathDemand = (path: string[]): Record<string, number> => {
    const demand: Record<string, number> = {};
    path.forEach(stop => {
        // Find pending tickets starting at this stop
        const waitingCount = localTickets
            .filter(t => t.status === TicketStatus.PENDING && t.from.toLowerCase() === stop.toLowerCase())
            .reduce((acc, t) => acc + t.passengerCount, 0);
        demand[stop] = waitingCount;
    });
    return demand;
};

/**
 * Finds other active vehicles ahead on the same route
 */
export const getAheadVehicles = (path: string[], currentStopIdx: number, driverId: string): BusState[] => {
    return activeBuses.filter(bus => {
        if (bus.driverId === driverId) return false; // Not me

        // Find if this bus is on the same path
        const isSameRoute = bus.activePath &&
            bus.activePath.length > 0 &&
            bus.activePath[0] === path[0] &&
            bus.activePath[bus.activePath.length - 1] === path[path.length - 1];

        if (!isSameRoute) return false;

        // Check if the bus is ahead
        return (bus.currentStopIndex || 0) > currentStopIdx;
    });
};

// Passenger Logic - Tickets
export const saveTicket = async (ticket: Ticket): Promise<Ticket> => {
    const currentUser = getCurrentUser();

    // Optimistic UI Update: Show immediately in local list
    if (!ticket.recipientPhone && (!ticket.userId || (currentUser && ticket.userId === currentUser.id))) {
        localTickets = [ticket, ...localTickets];
    }

    try {
        // CRITICAL FIX: Persist to DB via API call
        const res = await fetch(`${SERVER_URL}/api/tickets/book`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(ticket)
        });

        if (!res.ok) {
            console.warn("Ticket persistence failed, retrying via socket fallback");
            // Fallback: If API fails, try socket
            if (socket && socket.connected) {
                socket.emit('book_ticket', ticket);
            }
        } else {
            // If API success, also emit to update dashboards
            if (socket && socket.connected) {
                socket.emit('book_ticket', ticket);
            }
        }
    } catch (e) {
        console.error("Network Error saving ticket:", e);
        // Still emit to socket as a Hail Mary if online
        if (socket && socket.connected) {
            socket.emit('book_ticket', ticket);
        }
    }
    return ticket;
};

// Passenger Logic - Passes (v10.0)
export const savePass = async (pass: Pass & { recipientPhone?: string }): Promise<Pass> => {
    if (!pass.recipientPhone) {
        localPasses = [pass, ...localPasses];
    }

    try {
        await fetch(`${SERVER_URL}/api/passes/buy`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(pass)
        });
    } catch (e) {
        console.warn("Offline: Pass saved locally only");
    }
    return pass;
};

export const getMyPasses = async (userId: string): Promise<Pass[]> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/passes/list?userId=${userId}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        if (Array.isArray(data)) {
            localPasses = data;
            return data;
        }
        return localPasses.filter(p => p.userId === userId);
    } catch (e) {
        return localPasses.filter(p => p.userId === userId);
    }
};

export const verifyPass = async (passId: string): Promise<{ success: boolean; message: string; pass?: Pass }> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/passes/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passId })
        });
        const data = await res.json();

        if (data.error) {
            return { success: false, message: data.error };
        }
        return { success: true, message: "Verification Successful", pass: data.pass };
    } catch (e) {
        return { success: false, message: "Network Error" };
    }
}

// Driver Financials Logic
export const driverCollectTicket = async (ticketId: string, driverId: string): Promise<any> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/driver/scan-ticket`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ticketId, driverId })
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: "Network failed during collection" };
    }
}

export const driverWithdraw = async (userId: string, amount: number): Promise<any> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/driver/withdraw`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, amount })
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: "Withdrawal failed" };
    }
}

// Rental Logic (v11.0)
export const bookRental = async (rental: RentalBooking): Promise<boolean> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/rentals/book`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(rental)
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

export const getRentalRequests = async (): Promise<RentalBooking[]> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/rentals/requests`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        return [];
    }
}

export const respondToRental = async (rentalId: string, driverId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<boolean> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/rentals/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rentalId, driverId, status })
        });
        return res.ok;
    } catch (e) { return false; }
}

// Logistics Logic (v11.1)
export const bookParcel = async (parcel: ParcelBooking): Promise<boolean> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/logistics/book`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(parcel)
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

export const getAllParcels = async (): Promise<ParcelBooking[]> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/logistics/all`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { return []; }
}

export const updateParcelStatus = async (parcelId: string, status: string, location: string, driverId: string, description: string): Promise<boolean> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/logistics/update-status`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ parcelId, status, location, driverId, description })
        });
        return res.ok;
    } catch (e) { return false; }
}

export const toggleDriverCharter = async (userId: string, isAvailable: boolean) => {
    try {
        await fetch(`${SERVER_URL}/api/driver/toggle-charter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, isAvailable })
        });
    } catch (e) { }
}

// --- NEW SAFETY & CROWDSOURCE FEATURES ---

export const suggestLocation = async (payload: { name: string, lat: number, lng: number }) => {
    try {
        const res = await fetch(`${SERVER_URL}/api/locations/suggest`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) { return { success: false }; }
}


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

export const generatePassId = (): string => {
    return `PASS-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const generateRentalId = (): string => {
    return `R-${Math.floor(10000 + Math.random() * 90000)}`;
};

export const generateParcelId = (): string => {
    return `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
};
