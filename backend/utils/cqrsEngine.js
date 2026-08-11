/**
 * CQRS Engine (Command Query Responsibility Segregation)
 * Segregates write operations (Commands) from read operations (Queries) using distinct pathways.
 * Utilizes a Projection Engine to denormalize write states into read-optimized views.
 */

// --- WRITE STORE (Command Side) ---
const writeDb = [];

// --- READ STORE (Query Side - Denormalized) ---
const readViewDriverSummaries = new Map();

/**
 * Projection Engine
 * Runs updates on the read-optimized store in response to write actions.
 */
const projectEventToReadView = (event) => {
    const { type, payload } = event;

    switch (type) {
        case 'TRIP_CREATED': {
            const { tripId, driverId, routeFrom, routeTo, distance } = payload;
            const summary = readViewDriverSummaries.get(driverId) || {
                driverId,
                totalTrips: 0,
                totalDistance: 0,
                activeTripId: null,
                lastStatus: 'IDLE'
            };
            summary.totalTrips += 1;
            summary.totalDistance += distance;
            summary.activeTripId = tripId;
            summary.lastStatus = 'ACTIVE';
            readViewDriverSummaries.set(driverId, summary);
            break;
        }
        case 'TRIP_COMPLETED': {
            const { driverId } = payload;
            const summary = readViewDriverSummaries.get(driverId);
            if (summary) {
                summary.activeTripId = null;
                summary.lastStatus = 'COMPLETED';
                readViewDriverSummaries.set(driverId, summary);
            }
            break;
        }
        default:
            console.warn(`⚠️ CQRS Projection: Unhandled event type "${type}".`);
    }
};

/**
 * Command Handler (Write Pipeline)
 * Enforces transaction business logic, appends to write DB, and triggers read projections.
 */
export const handleCommand = (command) => {
    const { name, payload } = command;
    console.log(`📥 CQRS Command: Processing command [${name}]`);

    let eventType = '';
    
    switch (name) {
        case 'CreateTripCommand':
            // Business rule validation: Driver cannot have more than 1 active trip concurrently
            const currentSummary = readViewDriverSummaries.get(payload.driverId);
            if (currentSummary && currentSummary.activeTripId) {
                throw new Error(`Command Rejected: Driver ${payload.driverId} already has an active trip allocated.`);
            }
            eventType = 'TRIP_CREATED';
            break;

        case 'CompleteTripCommand':
            eventType = 'TRIP_COMPLETED';
            break;

        default:
            throw new Error(`Unknown CQRS Command: ${name}`);
    }

    const event = { type: eventType, payload, timestamp: Date.now() };
    writeDb.push(event);
    
    // Auto-update read projections
    projectEventToReadView(event);

    return { status: 'SUCCESS', event };
};

/**
 * Query Handler (Read Pipeline)
 * Fetches data instantly from read-optimized memory structures with zero joins/computation.
 */
export const handleQuery = (query) => {
    const { name, params } = query;

    switch (name) {
        case 'GetDriverSummaryQuery':
            return readViewDriverSummaries.get(params.driverId) || null;

        default:
            throw new Error(`Unknown CQRS Query: ${name}`);
    }
};
