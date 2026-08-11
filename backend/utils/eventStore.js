/**
 * Event Sourcing Engine & Event Store
 * Stores immutable sequences of state change events.
 * Replays events chronologically to reconstruct aggregate entity states at any point in time.
 */

// Append-only event log database
const eventLogStore = [];

/**
 * Appends a new event to the store
 */
export const appendEvent = (aggregateId, eventType, data = {}) => {
    const event = {
        aggregateId,
        eventType,
        data,
        timestamp: Date.now(),
        sequenceId: eventLogStore.length + 1
    };
    eventLogStore.push(event);
    console.log(`📝 Event Store: Logged "${eventType}" for Aggregate ID: ${aggregateId}`);
    return event;
};

/**
 * Replays event logs for an aggregate ID to reconstruct its state.
 * Supports time-travel query filtering by specifying an optional upToTimestamp constraint.
 */
export const reconstructState = (aggregateId, upToTimestamp = Infinity) => {
    // Fetch and sort events chronologically
    const events = eventLogStore
        .filter(event => event.aggregateId === aggregateId && event.timestamp <= upToTimestamp)
        .sort((a, b) => a.sequenceId - b.sequenceId);

    if (events.length === 0) return null;

    // Initial state blueprint
    let state = {
        id: aggregateId,
        status: 'INITIALIZED',
        history: [],
        version: 0
    };

    // Replay/Reduce loop
    events.forEach(event => {
        state.version = event.sequenceId;
        state.history.push({ event: event.eventType, timestamp: event.timestamp });

        switch (event.eventType) {
            case 'ORDER_CREATED':
                state.status = 'PENDING';
                state.farmerId = event.data.farmerId;
                state.crop = event.data.crop;
                state.quantity = event.data.quantity;
                state.price = event.data.price;
                break;
            case 'PRICE_SURGED':
                state.price = event.data.newPrice;
                state.surgeReason = event.data.reason;
                break;
            case 'DRIVER_ASSIGNED':
                state.status = 'ASSIGNED';
                state.driverId = event.data.driverId;
                state.vehicleNumber = event.data.vehicleNumber;
                break;
            case 'CROP_PICKED_UP':
                state.status = 'IN_TRANSIT';
                break;
            case 'ORDER_DELIVERED':
                state.status = 'DELIVERED';
                state.deliveredAt = event.timestamp;
                break;
            default:
                console.warn(`⚠️ Event Store: Unhandled event type "${event.eventType}" during replay.`);
        }
    });

    return state;
};
