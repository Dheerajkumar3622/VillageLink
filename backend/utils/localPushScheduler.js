/**
 * Local Push Notification Scheduler Simulator
 * Manages client-side alarms, alerts, and timed reminders.
 * Operates offline using local timers and epoch queue triggers.
 */

let pendingNotifications = [];

/**
 * Schedules a local push reminder
 */
export const scheduleLocalNotification = (id, title, body, triggerTimeEpoch) => {
    // Prevent duplicate schedulers
    pendingNotifications = pendingNotifications.filter(n => n.id !== id);

    pendingNotifications.push({
        id,
        title,
        body,
        triggerTimeEpoch
    });

    return { id, title, triggerTimeEpoch, status: 'SCHEDULED' };
};

/**
 * Cancels a scheduled local push reminder
 */
export const cancelLocalNotification = (id) => {
    const originalCount = pendingNotifications.length;
    pendingNotifications = pendingNotifications.filter(n => n.id !== id);
    return pendingNotifications.length < originalCount;
};

/**
 * Checks and triggers alarms that are due
 */
export const checkAndTriggerAlarms = (currentTimeEpoch) => {
    const triggered = pendingNotifications.filter(n => n.triggerTimeEpoch <= currentTimeEpoch);
    
    // Retain only future alarms
    pendingNotifications = pendingNotifications.filter(n => n.triggerTimeEpoch > currentTimeEpoch);

    return triggered;
};

/**
 * Retrieves list of currently active scheduled alarms
 */
export const getActiveAlarms = () => {
    return [...pendingNotifications];
};

/**
 * Resets the scheduler queue
 */
export const clearAllAlarms = () => {
    pendingNotifications = [];
};
