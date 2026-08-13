
import { Ticket, TicketStatus, PaymentMethod, BusState, User, Pass, RentalBooking, ParcelBooking } from '@villagelink/shared';
import { io } from 'socket.io-client';
import { getAuthToken, getCurrentUser } from './authService';
import { API_BASE_URL } from '../config';
import { toRoom, RealtimePayload } from './realtimeContract';

const STORAGE_KEY = 'villagelink_tickets_cache';
const PASSES_KEY = 'villagelink_passes_cache';

// --- CONFIGURATION ---
const SERVER_URL = API_BASE_URL;

let socket: any = null;
let localTickets: Ticket[] = [];
let localPasses: Pass[] = [];
let activeBuses: BusState[] = [];
const emitQueue = new Map<string, number>();

// Helper: persist tickets to localStorage for offline/refresh survival
const persistTicketsToStorage = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localTickets));
    } catch (e) { /* localStorage full or unavailable */ }
};

// Helper: hydrate tickets from localStorage on first access
const hydrateTicketsFromStorage = () => {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached) as Ticket[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                localTickets = parsed;
            }
        }
    } catch (e) { /* corrupted cache, ignore */ }
};

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

    // FIX: Force websocket to bypass Render's polling handshake 400 Errors
    // 'websocket' skips the HTTP polling phase which requires sticky sessions
    socket = io(SERVER_URL, {
        transports: ['websocket'],
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
        const currentUser = getCurrentUser();
        if (currentUser?.id) {
            socket.emit('join_user_room', currentUser.id);
            if (currentUser.role && currentUser.role !== 'PASSENGER') {
                socket.emit('join_provider_room', currentUser.id);
            }
        }
    });

    attachListeners();
    attachGlobalSocketHandlers();
};

let listeners: { onTickets: Function, onBuses: Function } | null = null;

/** Socket events that must work even before `subscribeToUpdates` (e.g. passenger acoustic ACK). */
const attachGlobalSocketHandlers = () => {
    if (!socket) return;
    socket.off('acoustic_verification_ack');
    socket.on('acoustic_verification_ack', (data: unknown) => {
        window.dispatchEvent(new CustomEvent('acoustic_verification_ack', { detail: data }));
    });

    socket.off('tickets_updated');
    socket.on('tickets_updated', (tickets: Ticket[]) => {
        const incoming = Array.isArray(tickets) ? tickets : [];
        if (incoming.length === 0) return;

        const byId = new Map<string, Ticket>();
        for (const t of localTickets) {
            if (t?.id) byId.set(String(t.id), t);
        }
        for (const t of incoming) {
            if (!t?.id) continue;
            const id = String(t.id);
            byId.set(id, { ...(byId.get(id) || ({} as any)), ...t });
        }
        localTickets = Array.from(byId.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        persistTicketsToStorage();
        window.dispatchEvent(new Event('tickets_changed'));
        listeners?.onTickets(localTickets);
    });
};

const attachListeners = () => {
    if (!socket || !listeners) return;

    socket.off('sync_state');
    socket.off('vehicles_update');

    socket.on('sync_state', (data: { tickets: Ticket[], activeBuses: BusState[] }) => {
        localTickets = data.tickets || [];
        activeBuses = data.activeBuses || [];
        if (listeners) {
            listeners.onTickets(localTickets);
            listeners.onBuses(activeBuses);
        }
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
    attachGlobalSocketHandlers();
    attachListeners();
};

export const onDistrictVehiclesUpdate = (cb: (buses: BusState[]) => void) => {
    if (!socket) initSocketConnection();
    const handler = (buses: BusState[]) => {
        activeBuses = buses;
        cb(buses);
    };
    socket?.on('vehicles_update', handler);
    
    const localHandler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (Array.isArray(detail)) {
            activeBuses = detail;
            cb(detail);
        }
    };
    window.addEventListener('mock-vehicles-update', localHandler);

    return () => {
        socket?.off('vehicles_update', handler);
        window.removeEventListener('mock-vehicles-update', localHandler);
    };
};

export const joinOrderRoom = (orderId: string) => {
    if (!socket) initSocketConnection();
    socket?.emit('join_order_room', orderId);
};

export const replayOrderEvents = (orderId: string, sinceTimestamp: number) => {
    if (!socket) initSocketConnection();
    socket?.emit('replay_events_since', { room: toRoom.order(orderId), sinceTimestamp });
};

export const onRealtimeEvent = (event: string, cb: (payload: RealtimePayload) => void) => {
    if (!socket) initSocketConnection();
    socket?.off(event);
    socket?.on(event, cb);
};

export const updateOrderStatusRealtime = (payload: { orderId: string; status: string; userId?: string; providerId?: string; meta?: any }) => {
    if (!socket) initSocketConnection();
    socket?.emit('order_status_update', payload);
};

/** After driver decodes ultrasonic payload — server validates ticket and notifies passenger. */
export const emitUltrasonicVerifyRequest = (payload: string, driverId: string) => {
    if (!driverId || !payload) return;
    if (!socket) initSocketConnection();
    socket?.emit('ultrasonic_verify_request', { payload, driverId });
};

export const emitThrottled = (eventName: string, payload: Record<string, any>, throttleMs = 400) => {
    const key = `${eventName}_${payload.driverId || payload.providerId || 'global'}`;
    const now = Date.now();
    const lastAt = emitQueue.get(key) || 0;
    if (now - lastAt < throttleMs) return;
    emitQueue.set(key, now);
    socket?.emit(eventName, payload);
};

// --- API METHODS ---

export const getStoredTickets = (): Ticket[] => {
    // If in-memory is empty, try to hydrate from localStorage
    if (localTickets.length === 0) {
        hydrateTicketsFromStorage();
    }
    return localTickets;
};

export const syncTicketsFromServer = async (userId: string): Promise<Ticket[]> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/ticket/my-tickets?limit=50`, {
            headers: getHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            const serverTickets = [...(data.active || []), ...(data.past || [])];
            
            const localMap = new Map<string, Ticket>();
            getStoredTickets().forEach(t => localMap.set(t.id, t));
            
            serverTickets.forEach((st: any) => {
                localMap.set(st.id, st);
            });
            
            localTickets = Array.from(localMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            persistTicketsToStorage();
            window.dispatchEvent(new Event('tickets_changed'));
            return localTickets;
        }
    } catch (e) {
        console.error("Failed to sync tickets from server:", e);
    }
    return getStoredTickets();
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
            .filter(t => t.status === TicketStatus.PENDING && !t.driverId && t.from.toLowerCase() === stop.toLowerCase())
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
        persistTicketsToStorage();
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

// Passenger Logic - Cancel Ticket
export const cancelTicket = async (ticketId: string): Promise<{ success: boolean; message: string; refundAmount?: number }> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/ticket/cancel`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ticketId })
        });

        let body: Record<string, unknown> = {};
        try {
            body = (await res.json()) as Record<string, unknown>;
        } catch {
            /* non-JSON */
        }

        if (res.ok) {
            localTickets = localTickets.map(t => t.id === ticketId ? { ...t, status: 'CANCELLED' as TicketStatus } : t);
            persistTicketsToStorage();
            window.dispatchEvent(new Event('tickets_changed'));
            if (socket && socket.connected) {
                socket.emit('update_ticket', { ticketId, status: 'CANCELLED' });
            }
            const refundAmount = typeof body.refundAmount === 'number' ? body.refundAmount : undefined;
            return {
                success: true,
                message: (typeof body.message === 'string' && body.message) || 'Ticket cancelled successfully',
                refundAmount
            };
        }

        const err =
            (typeof body.error === 'string' && body.error) ||
            (typeof body.message === 'string' && body.message) ||
            `Cancel failed (${res.status})`;
        return { success: false, message: err };
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network error';
        return { success: false, message: msg };
    }
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
        const res = await fetch(`${SERVER_URL}/api/passes/list?userId=${userId}`, {
            headers: getHeaders()
        });
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
        const res = await fetch(`${SERVER_URL}/api/rentals/requests`, {
            headers: getHeaders()
        });
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
        const res = await fetch(`${SERVER_URL}/api/logistics/all`, {
            headers: getHeaders()
        });
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
        const loc = (state as any).currentLocation || (state as any).location;
        const stateAny = state as any;
        emitThrottled('driver_location_update', state, 500);
        emitThrottled('driver_location_stream', {
            driverId: state.driverId,
            lat: loc?.lat,
            lng: loc?.lng,
            speed: stateAny.speed || 0,
            heading: stateAny.heading || 0,
            timestamp: Date.now(),
            isStationary: !stateAny.speed || stateAny.speed < 2
        }, 400);
    }
};

/** Register polyline + stop names on server for segment matching (call after route is computed). */
export const registerDriverTripTrajectory = (payload: {
    driverId: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    pathDetails: { name?: string; lat: number; lng: number }[];
    stopNames: string[];
    driverName?: string;
    vehicleType?: string;
    startName?: string;
    endName?: string;
    distanceKm?: number;
    durationMin?: number;
}) => {
    initSocketConnection();
    if (socket) {
        socket.emit('driver_go_online', payload.driverId);
        socket.emit('driver_start_trip', payload);
    }
};

export const endDriverTripTrajectory = (driverId: string) => {
    initSocketConnection();
    socket?.emit('driver_end_trip', { driverId });
};

/** Find vehicles whose current route includes this stop segment in order (within maxEtaMinutes). */
export const findVehiclesForStopSegment = (
    fromStop: string,
    toStop: string,
    maxEtaMinutes = 30
): Promise<{ vehicles?: any[]; count?: number; searchedAt?: number; timeout?: boolean }> => {
    initSocketConnection();
    return new Promise((resolve) => {
        const handler = (data: any) => {
            socket?.off('segment_vehicles', handler);
            resolve(data || { vehicles: [], count: 0 });
        };
        const run = () => {
            socket?.once('segment_vehicles', handler);
            socket?.emit('find_segment_by_stops', { fromStop: fromStop.trim(), toStop: toStop.trim(), maxEtaMinutes });
        };
        if (socket?.connected) run();
        else socket?.once('connect', run);
        setTimeout(() => {
            socket?.off('segment_vehicles', handler);
            resolve({ vehicles: [], count: 0, timeout: true });
        }, 12000);
    });
};

export const subscribeToDriverLive = (driverId: string) => {
    initSocketConnection();
    socket?.emit('subscribe_driver', driverId);
};

export const unsubscribeFromDriverLive = (driverId: string) => {
    socket?.emit('unsubscribe_driver', driverId);
};

export const onDriverLocationBroadcast = (handler: (data: {
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    timestamp?: number;
}) => void) => {
    initSocketConnection();
    socket?.on('driver_location_broadcast', handler);
    return () => socket?.off('driver_location_broadcast', handler);
};

/** REST v1 — same contract as AI agents (human + agent). */
export const findUpcomingVehiclesRest = async (fromStop: string, toStop: string, maxEtaMinutes = 30) => {
    const res = await fetch(`${SERVER_URL}/api/v1/transport/find-upcoming-vehicles`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fromStop, toStop, maxEtaMinutes })
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return json;
};

export const bookSegmentRide = async (params: {
    fromStop: string;
    toStop: string;
    driverId?: string;
    passengerCount?: number;
    totalPrice?: number;
    paymentMethod?: string;
    idempotencyKey?: string;
}) => {
    const headers: Record<string, string> = { ...getHeaders() };
    if (params.idempotencyKey) headers['x-idempotency-key'] = params.idempotencyKey;
    const { idempotencyKey, ...body } = params;
    const res = await fetch(`${SERVER_URL}/api/v1/transport/book-segment-ride`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || json.error || 'Book segment failed');
    if (json.success && json.data) return json.data;
    return json;
};

export const getTransportOrderStatusRest = async (ticketId: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1/transport/order/${encodeURIComponent(ticketId)}/status`, {
        headers: getHeaders()
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return json;
};

export const getDriverRouteStateRest = async (driverId: string) => {
    const res = await fetch(`${SERVER_URL}/api/v1/transport/driver/${encodeURIComponent(driverId)}/route-state`, {
        headers: getHeaders()
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return json;
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

// --- PHASE 1.5: KINEMATIC LOCK ALGORITHM ---
/**
 * Evaluates the Kinematic Lock condition.
 * If Driver and Passenger speeds match >10kmph for a sustained duration, it locks the ticket.
 */
export const checkKinematicLock = (ticket: Ticket, driverSpeed: number, passengerSpeed: number): TicketStatus => {
    // 1. Only process PROVISIONAL tickets
    if (ticket.status !== TicketStatus.PROVISIONAL) return ticket.status;

    // 2. Both must be moving > 10 kmph
    if (driverSpeed < 10 || passengerSpeed < 10) {
        // Wait for movement, reset timer if stopped
        if (ticket.speedMatchStart) ticket.speedMatchStart = undefined; 
        return TicketStatus.PROVISIONAL;
    }

    // 3. Speeds must match within 15% tolerance
    const diff = Math.abs(driverSpeed - passengerSpeed);
    const avg = (driverSpeed + passengerSpeed) / 2;
    const isMatching = (diff / avg) <= 0.15;

    if (!isMatching) {
        // They are moving but at different speeds. Passenger might be in a different vehicle.
        // Reset the timer due to speed mismatch.
        ticket.speedMatchStart = undefined;
        return TicketStatus.PROVISIONAL;
    }

    // 4. They are matching! Start or check timer
    const now = Date.now();
    if (!ticket.speedMatchStart) {
        // First time they matched, start the clock
        ticket.speedMatchStart = now;
        return TicketStatus.PROVISIONAL;
    }

    // 5. Timer is running. Has the sustained time passed?
    // Using 15 seconds for demo/UX purposes so the user isn't stuck waiting forever testing it.
    // In actual prod, this would be 60000 (1 minute).
    const MATCH_DURATION_MS = 15000; 
    
    if (now - ticket.speedMatchStart >= MATCH_DURATION_MS) {
        // SUCCESS! Kinematic Lock Achieved.
        console.log(`[Kinematic Match] Lock Achieved for Ticket ${ticket.id}`);
        return TicketStatus.BOARDED;
    }

    return TicketStatus.PROVISIONAL;
};

/**
 * Universal Dynamic Google Polyline + OSM 4.75 Lakh Node Intersection Service
 */
export const fetchLiveCorridorNodes = async (polylinePoints: Array<{ lat: number; lng: number }>, bufferKm = 3.0) => {
    try {
        let apiUrl = `${SERVER_URL}/api/vnis/geograph/fuse-route`;
        let res = await fetch(apiUrl, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ polyline: polylinePoints, maxFeederRadiusKm: bufferKm })
        }).catch(() => null);

        // Fallback endpoint request using API_BASE_URL if Render primary endpoint returns non-200
        if (!res || !res.ok) {
            apiUrl = `${API_BASE_URL}/api/vnis/geograph/fuse-route`;
            res = await fetch(apiUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ polyline: polylinePoints, maxFeederRadiusKm: bufferKm })
            }).catch(() => null);
        }

        if (res && res.ok) {
            const json = await res.json();
            if (json.success && json.orderedVillageNodes) {
                return {
                    nodesSequence: json.orderedVillageNodes.map((n: any) => ({
                        node: {
                            nodeId: n.junctionId || n.nodeId,
                            name: n.primaryVillage || n.junctionName,
                            localNameHindi: n.primaryVillage || n.junctionName,
                            junctionName: n.junctionName,
                            district: n.district || 'Rural District'
                        },
                        cumulativeDistanceKm: n.cumulativeDistKm || n.cumulativeDistanceKm || 0,
                        feederApproachType: n.junctionType || n.feederApproachType,
                        perpendicularDistanceMeters: n.roadDistanceKm ? n.roadDistanceKm * 1000 : 200,
                        confidenceScorePct: n.primaryConfidenceScorePct || n.confidenceScorePct || 95,
                        statusTag: n.demandOverlay ? n.demandOverlay.statusTag : 'ALGORITHMICALLY_VERIFIED',
                        coLocatedVillages: (n.connectedVillages && n.connectedVillages.length > 0) 
                          ? n.connectedVillages 
                          : (n.allocatedVillages && n.allocatedVillages.length > 0) 
                          ? n.allocatedVillages 
                          : (n.coLocatedVillages && n.coLocatedVillages.length > 0) 
                          ? n.coLocatedVillages 
                          : [{ villageName: n.primaryVillage || n.junctionName, distanceFromJunctionKm: 0.2, approachType: 'ON_HIGHWAY' }]
                    })),
                    totalDistanceKm: json.corridorSummary ? json.corridorSummary.totalDistanceKm : 0
                };
            }
        }

        // Fallback snap-polyline endpoint using API_BASE_URL if fuse-route fails
        const res2 = await fetch(`${API_BASE_URL}/api/vnis/corridor/snap-polyline`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ polylinePoints, bufferKm, speedKmH: 40, minNodeSpacingMeters: 150 })
        }).catch(() => null);

        if (res2 && res2.ok) {
            const json2 = await res2.json();
            if (json2.success && json2.data) {
                return json2.data;
            }
        }
        return null;
    } catch (e) {
        console.warn('Live Corridor Node fetch error:', e);
        return null;
    }
};

/**
 * Phase 1: GPS Probe Telemetry Batch Sender
 */
export const sendTrajectoryProbeBatch = async (driverId: string, tripId: string, probePoints: Array<{ lat: number; lng: number; speed?: number; heading?: number; timestamp?: number }>) => {
    try {
        const res = await fetch(`${SERVER_URL}/api/vnis/telemetry/probe-batch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ driverId, tripId, probePoints })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
};

/**
 * Phase 2: DBSCAN Auto-Discovered Clusters Fetcher
 */
export const fetchAutoDiscoveredClusters = async (minSpeed = 15, eps = 35, minPts = 3) => {
    try {
        const res = await fetch(`${SERVER_URL}/api/vnis/telemetry/auto-clusters?minSpeed=${minSpeed}&eps=${eps}&minPts=${minPts}`, {
            headers: getHeaders()
        });
        const json = await res.json();
        if (json.success && json.clusters) {
            return json.clusters;
        }
        return [];
    } catch (e) {
        return [];
    }
};

/**
 * Phase 3: HMM Map Match Trajectory Snapper
 */
export const snapHMMTrajectory = async (rawTrajectoryPoints: Array<{ lat: number; lng: number }>, centerlinePolyline: Array<{ lat: number; lng: number }>) => {
    try {
        const res = await fetch(`${SERVER_URL}/api/vnis/telemetry/hmm-snap`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ rawTrajectoryPoints, centerlinePolyline })
        });
        const json = await res.json();
        if (json.success && json.data) {
            return json.data;
        }
        return rawTrajectoryPoints;
    } catch (e) {
        return rawTrajectoryPoints;
    }
};

/**
 * Feeder T-Junction & Y-Junction Village Allocation Fetcher
 */
export const fetchJunctionVillageAllocation = async (polyline: Array<{ lat: number; lng: number }>, maxFeederRadiusKm: number = 3.0) => {
    try {
        const res = await fetch(`${SERVER_URL}/api/vnis/corridor/allocate-junctions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ polyline, maxFeederRadiusKm })
        });
        const json = await res.json();
        if (json.success && json.data) {
            return json.data;
        }
        return null;
    } catch (e) {
        console.error('Junction Allocation Fetch Err:', e);
        return null;
    }
};

