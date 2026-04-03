export const ROOM_PREFIX = {
    USER: 'user_',
    PROVIDER: 'provider_',
    ORDER: 'order_',
    ROUTE: 'route_',
    TRACKING: 'tracking_'
};

export const RT_EVENT = {
    ORDER_CREATED: 'order_created',
    ORDER_ASSIGNED: 'order_assigned',
    ORDER_ACCEPTED: 'order_accepted',
    ORDER_STATUS_CHANGED: 'order_status_changed',
    PROVIDER_LOCATION_UPDATED: 'provider_location_updated',
    ORDER_COMPLETED: 'order_completed',
    ORDER_CANCELLED: 'order_cancelled'
};

export const toRoom = {
    user: (userId) => `${ROOM_PREFIX.USER}${userId}`,
    provider: (providerId) => `${ROOM_PREFIX.PROVIDER}${providerId}`,
    order: (orderId) => `${ROOM_PREFIX.ORDER}${orderId}`,
    route: (routeId) => `${ROOM_PREFIX.ROUTE}${routeId}`,
    tracking: (driverId) => `${ROOM_PREFIX.TRACKING}${driverId}`
};

export const normalizeRealtimePayload = (event, payload = {}) => ({
    version: 'v1',
    event,
    timestamp: Date.now(),
    ...payload
});
