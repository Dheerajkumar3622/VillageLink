/**
 * Push Notification Service for UMG
 * 
 * Real-time notifications for:
 * - Approaching buses/vehicles
 * - Trip updates
 * - Safety alerts
 * - Subscription reminders
 */

// Check for notification permission
let notificationPermission: NotificationPermission = 'default';

if (typeof window !== 'undefined' && 'Notification' in window) {
    notificationPermission = Notification.permission;
}

// --- TYPES ---

export interface PushNotification {
    id: string;
    type: 'BUS_ARRIVING' | 'TRIP_UPDATE' | 'SAFETY_ALERT' | 'SUBSCRIPTION' | 'PROMO';
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, any>;
    timestamp: number;
    read: boolean;
}

export interface BusArrivalNotification {
    busId: string;
    routeNumber: string;
    stopName: string;
    eta: number; // seconds
    occupancy: number; // percentage
    direction: string;
}

// --- NOTIFICATION STORAGE ---

const NOTIFICATIONS_KEY = 'umg_notifications';
let notifications: PushNotification[] = [];
let subscribers: ((notifications: PushNotification[]) => void)[] = [];

// Load from localStorage
if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    if (saved) {
        notifications = JSON.parse(saved);
    }
}

function saveNotifications(): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(-50)));
    }
    subscribers.forEach(cb => cb(notifications));
}

// --- PERMISSION MANAGEMENT ---

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        return permission === 'granted';
    }

    return false;
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
    return notificationPermission === 'granted';
}

// --- NOTIFICATION SENDING ---

/**
 * Send a system notification
 */
export function sendNotification(
    type: PushNotification['type'],
    title: string,
    body: string,
    data?: Record<string, any>,
    showSystemNotification: boolean = true
): PushNotification {
    const notification: PushNotification = {
        id: `notif_${Date.now()}`,
        type,
        title,
        body,
        data,
        timestamp: Date.now(),
        read: false
    };

    notifications.unshift(notification);
    saveNotifications();

    // Show system notification if permission granted
    if (showSystemNotification && notificationPermission === 'granted') {
        showSystemNotif(notification);
    }

    return notification;
}

/**
 * Show browser/system notification
 */
function showSystemNotif(notification: PushNotification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    const icon = getNotificationIcon(notification.type);

    const systemNotif = new Notification(notification.title, {
        body: notification.body,
        icon,
        badge: '/icon-192.png',
        tag: notification.id,
        data: notification.data,
        requireInteraction: notification.type === 'SAFETY_ALERT',
        silent: notification.type !== 'SAFETY_ALERT'
    });

    systemNotif.onclick = () => {
        window.focus();
        markAsRead(notification.id);
        // Handle notification click based on type
        handleNotificationClick(notification);
    };
}

/**
 * Get icon based on notification type
 */
function getNotificationIcon(type: PushNotification['type']): string {
    switch (type) {
        case 'BUS_ARRIVING':
            return '/icons/bus.png';
        case 'TRIP_UPDATE':
            return '/icons/navigation.png';
        case 'SAFETY_ALERT':
            return '/icons/alert.png';
        case 'SUBSCRIPTION':
            return '/icons/crown.png';
        case 'PROMO':
            return '/icons/gift.png';
        default:
            return '/icon-192.png';
    }
}

/**
 * Handle notification click navigation
 */
function handleNotificationClick(notification: PushNotification): void {
    const data = notification.data;
    if (!data) return;

    // Navigation would be handled by app router
    console.log('Notification clicked:', notification.type, data);
}

// --- BUS ARRIVAL NOTIFICATIONS ---

// Active subscriptions for bus arrivals
const busSubscriptions: Map<string, {
    stopId: string;
    routes: string[];
    notifyAtMinutes: number[];
}> = new Map();

/**
 * Subscribe to bus arrival notifications for a stop
 */
export function subscribeToBusArrivals(
    userId: string,
    stopId: string,
    routes: string[],
    notifyAtMinutes: number[] = [5, 2]
): void {
    busSubscriptions.set(userId, {
        stopId,
        routes,
        notifyAtMinutes
    });
}

/**
 * Unsubscribe from bus arrival notifications
 */
export function unsubscribeFromBusArrivals(userId: string): void {
    busSubscriptions.delete(userId);
}

/**
 * Process bus location update and send notifications if needed
 */
export function processBusLocationUpdate(bus: {
    id: string;
    routeNumber: string;
    currentLocation: { lat: number; lng: number };
    nextStop: { id: string; name: string; eta: number };
    occupancy: number;
    direction: string;
}): void {
    busSubscriptions.forEach((subscription, userId) => {
        // Check if this bus matches subscription
        if (!subscription.routes.includes(bus.routeNumber)) return;
        if (subscription.stopId !== bus.nextStop.id) return;

        const etaMinutes = Math.ceil(bus.nextStop.eta / 60);

        // Check if we should notify at this ETA
        if (subscription.notifyAtMinutes.includes(etaMinutes)) {
            sendBusArrivalNotification({
                busId: bus.id,
                routeNumber: bus.routeNumber,
                stopName: bus.nextStop.name,
                eta: bus.nextStop.eta,
                occupancy: bus.occupancy,
                direction: bus.direction
            });
        }
    });
}

/**
 * Send bus arrival notification
 */
export function sendBusArrivalNotification(bus: BusArrivalNotification): void {
    const etaMinutes = Math.ceil(bus.eta / 60);
    const occupancyEmoji = bus.occupancy > 70 ? '🔴' : bus.occupancy > 40 ? '🟡' : '🟢';

    sendNotification(
        'BUS_ARRIVING',
        `🚌 Bus ${bus.routeNumber} Arriving`,
        `${etaMinutes} min away at ${bus.stopName} ${occupancyEmoji}`,
        {
            busId: bus.busId,
            routeNumber: bus.routeNumber,
            stopName: bus.stopName,
            eta: bus.eta,
            occupancy: bus.occupancy
        }
    );
}

// --- TRIP NOTIFICATIONS ---

/**
 * Send trip status update notification
 */
export function sendTripUpdateNotification(
    tripId: string,
    status: 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVING' | 'TRIP_STARTED' | 'ARRIVING_SOON' | 'TRIP_COMPLETED',
    details: Record<string, any>
): void {
    let title = '';
    let body = '';

    switch (status) {
        case 'DRIVER_ASSIGNED':
            title = '🚗 Driver Assigned!';
            body = `${details.driverName} is on the way. ${details.vehicleNumber}`;
            break;
        case 'DRIVER_ARRIVING':
            title = '📍 Driver Arriving';
            body = `Your ride will arrive in ${details.eta} min`;
            break;
        case 'TRIP_STARTED':
            title = '🚀 Trip Started';
            body = `Heading to ${details.destination}. ETA: ${details.eta} min`;
            break;
        case 'ARRIVING_SOON':
            title = '🎯 Arriving Soon';
            body = `You'll reach ${details.destination} in ${details.eta} min`;
            break;
        case 'TRIP_COMPLETED':
            title = '✅ Trip Completed';
            body = `Fare: ₹${details.fare}. Rate your trip!`;
            break;
    }

    sendNotification('TRIP_UPDATE', title, body, { tripId, status, ...details });
}

// --- SAFETY NOTIFICATIONS ---

/**
 * Send safety alert notification (high priority)
 */
export function sendSafetyNotification(
    type: 'SOS_RECEIVED' | 'ROUTE_DEVIATION' | 'LONG_STOP',
    details: Record<string, any>
): void {
    let title = '';
    let body = '';

    switch (type) {
        case 'SOS_RECEIVED':
            title = '🚨 SOS ALERT';
            body = `${details.userName} triggered SOS. Check their location immediately.`;
            break;
        case 'ROUTE_DEVIATION':
            title = '⚠️ Route Deviation';
            body = `Vehicle has deviated ${details.distance}km from expected route`;
            break;
        case 'LONG_STOP':
            title = '⚠️ Extended Stop Detected';
            body = `Vehicle stopped for ${details.duration} minutes at unknown location`;
            break;
    }

    sendNotification('SAFETY_ALERT', title, body, { type, ...details });
}

// --- SUBSCRIPTION NOTIFICATIONS ---

/**
 * Send subscription reminder
 */
export function sendSubscriptionReminder(
    daysRemaining: number,
    planName: string
): void {
    sendNotification(
        'SUBSCRIPTION',
        '👑 Subscription Reminder',
        `Your ${planName} expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Renew to keep earning 100% fares!`,
        { daysRemaining, planName }
    );
}

// --- NOTIFICATION MANAGEMENT ---

/**
 * Get all notifications
 */
export function getNotifications(): PushNotification[] {
    return notifications;
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
    return notifications.filter(n => !n.read).length;
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): void {
    const notif = notifications.find(n => n.id === notificationId);
    if (notif) {
        notif.read = true;
        saveNotifications();
    }
}

/**
 * Mark all as read
 */
export function markAllAsRead(): void {
    notifications.forEach(n => n.read = true);
    saveNotifications();
}

/**
 * Clear all notifications
 */
export function clearNotifications(): void {
    notifications = [];
    saveNotifications();
}

/**
 * Subscribe to notification updates
 */
export function onNotificationsChange(callback: (notifications: PushNotification[]) => void): () => void {
    subscribers.push(callback);
    return () => {
        subscribers = subscribers.filter(cb => cb !== callback);
    };
}

// --- VIBRATION & SOUND ---

/**
 * Vibrate device (for important notifications)
 */
export function vibrateDevice(pattern: number[] = [200, 100, 200]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

/**
 * Play notification sound
 */
export function playNotificationSound(type: PushNotification['type'] = 'BUS_ARRIVING'): void {
    // In production, play actual sound files
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => { });
    } catch {
        // Ignore audio errors
    }
}
