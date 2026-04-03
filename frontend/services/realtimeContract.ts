export const RT_EVENT = {
    ORDER_CREATED: 'order_created',
    ORDER_ASSIGNED: 'order_assigned',
    ORDER_ACCEPTED: 'order_accepted',
    ORDER_STATUS_CHANGED: 'order_status_changed',
    PROVIDER_LOCATION_UPDATED: 'provider_location_updated',
    ORDER_COMPLETED: 'order_completed',
    ORDER_CANCELLED: 'order_cancelled'
} as const;

export type RealtimeEventName = typeof RT_EVENT[keyof typeof RT_EVENT];

export const toRoom = {
    user: (userId: string) => `user_${userId}`,
    provider: (providerId: string) => `provider_${providerId}`,
    order: (orderId: string) => `order_${orderId}`,
    route: (routeId: string) => `route_${routeId}`,
    tracking: (driverId: string) => `tracking_${driverId}`
};

export interface RealtimePayload<T = Record<string, any>> {
    version: 'v1';
    event: RealtimeEventName | string;
    timestamp: number;
    data?: T;
    [key: string]: any;
}
