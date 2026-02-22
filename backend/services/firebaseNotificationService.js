/**
 * Firebase Notification Service — FCM Push Notifications
 * 
 * Uses firebase-admin to send real push notifications via Firebase Cloud Messaging.
 * Project: villagelink-96b4c
 * 
 * For this to work in production:
 * 1. Download service account key from Firebase Console
 * 2. Set FIREBASE_SERVICE_ACCOUNT_PATH env var to path of the JSON key file
 * 3. On client side, register for FCM and send token via /api/auth/update-fcm-token
 */

import { User, Notification } from '../models.js';

// Firebase Admin SDK - lazy initialization
let firebaseAdmin = null;
let messaging = null;

const initializeFirebase = async () => {
  if (firebaseAdmin) return;
  
  try {
    const admin = await import('firebase-admin');
    firebaseAdmin = admin.default || admin;
    
    // Check if already initialized
    if (firebaseAdmin.apps.length === 0) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (serviceAccountPath) {
        const { readFileSync } = await import('fs');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
          projectId: 'villagelink-96b4c'
        });
      } else {
        // Try default credentials (works on GCP, Firebase hosting)
        firebaseAdmin.initializeApp({
          projectId: 'villagelink-96b4c'
        });
        console.log('⚠️ Firebase initialized without service account (FCM may not work)');
      }
    }
    
    messaging = firebaseAdmin.messaging();
    console.log('🔥 Firebase Admin initialized for project villagelink-96b4c');
  } catch (error) {
    console.error('Firebase init error (FCM will use fallback):', error.message);
  }
};

// Initialize on load
initializeFirebase().catch(() => {});

/**
 * Send push notification to a single user via FCM
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // 1. Save to DB always
    const notification = new Notification({
      userId,
      type: data.type || 'SYSTEM',
      title,
      body,
      data,
      sentViaFCM: false
    });
    await notification.save();
    
    // 2. Try FCM push
    const user = await User.findOne({ id: userId }).lean();
    if (!user?.fcmToken || !messaging) {
      return { saved: true, pushed: false, reason: !user?.fcmToken ? 'no_fcm_token' : 'firebase_not_init' };
    }
    
    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'villagelink_default',
          sound: 'default',
          clickAction: 'OPEN_APP'
        }
      }
    };
    
    const response = await messaging.send(message);
    await Notification.findByIdAndUpdate(notification._id, { sentViaFCM: true });
    
    console.log(`📱 FCM sent to ${userId}: ${title}`);
    return { saved: true, pushed: true, messageId: response };
    
  } catch (error) {
    // Handle invalid token
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      await User.findOneAndUpdate({ id: userId }, { fcmToken: null });
      console.log(`🗑️ Removed invalid FCM token for ${userId}`);
    }
    console.error(`FCM error for ${userId}:`, error.message);
    return { saved: true, pushed: false, error: error.message };
  }
};

/**
 * Send to multiple users at once
 */
export const sendToMultiple = async (userIds, title, body, data = {}) => {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, title, body, data))
  );
  
  return {
    total: userIds.length,
    success: results.filter(r => r.status === 'fulfilled' && r.value?.pushed).length,
    saved: results.filter(r => r.status === 'fulfilled' && r.value?.saved).length
  };
};

/**
 * Send to a topic (e.g., all drivers on a route)
 */
export const sendToTopic = async (topic, title, body, data = {}) => {
  if (!messaging) {
    console.log(`FCM topic send skipped (not initialized): ${topic}`);
    return { pushed: false };
  }
  
  try {
    const message = {
      topic,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high' }
    };
    
    const response = await messaging.send(message);
    console.log(`📣 FCM topic "${topic}": ${title}`);
    return { pushed: true, messageId: response };
  } catch (error) {
    console.error(`FCM topic error:`, error.message);
    return { pushed: false, error: error.message };
  }
};

/**
 * Subscribe user to a topic
 */
export const subscribeToTopic = async (userId, topic) => {
  if (!messaging) return false;
  
  try {
    const user = await User.findOne({ id: userId }).lean();
    if (!user?.fcmToken) return false;
    
    await messaging.subscribeToTopic([user.fcmToken], topic);
    console.log(`📌 ${userId} subscribed to topic "${topic}"`);
    return true;
  } catch (error) {
    console.error(`Topic subscribe error:`, error.message);
    return false;
  }
};

/**
 * Get user's notifications
 */
export const getUserNotifications = async (userId, limit = 50, skip = 0) => {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true }
  );
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

/**
 * Get unread count
 */
export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

// --- NOTIFICATION TEMPLATES ---

export const notifyTicketAutoVerified = async (passengerId, driverId, ticket) => {
  await sendPushNotification(passengerId, 
    '✅ Ticket Auto-Verified!',
    `Seat confirmed on ${ticket.from} → ${ticket.to}`,
    { type: 'SPEED_MATCH', ticketId: ticket.id, driverId }
  );
};

export const notifyDriverNewPassenger = async (driverId, passengerName, ticket) => {
  await sendPushNotification(driverId,
    `🎫 ${passengerName} boarded`,
    `₹${ticket.totalPrice} | ${ticket.from} → ${ticket.to} | ${ticket.paymentMethod}`,
    { type: 'DRIVER', ticketId: ticket.id, amount: ticket.totalPrice }
  );
};

export const notifyKisanOrder = async (kisanId, vendorName, order) => {
  await sendPushNotification(kisanId,
    '🌾 New Order Received!',
    `${vendorName} ne ₹${order.totalAmount} ka order diya hai`,
    { type: 'KISAN', orderId: order.id, vendorName }
  );
};

export const notifyDriverDelivery = async (driverId, order) => {
  await sendPushNotification(driverId,
    '📦 New Delivery Assignment',
    `Pickup: ${order.pickupLocation?.name} → Drop: ${order.deliveryLocation?.name}`,
    { type: 'DELIVERY', orderId: order.id }
  );
};

export const notifyLowSeats = async (routeId, driverId, seatsAvailable) => {
  // Notify waiting passengers that seats are running low
  const { Ticket } = await import('../models.js');
  const waitingTickets = await Ticket.find({
    status: { $in: ['PENDING', 'PAID'] }
  }).lean();
  
  const userIds = [...new Set(waitingTickets.map(t => t.userId))];
  
  if (userIds.length > 0 && seatsAvailable <= 3) {
    await sendToMultiple(userIds,
      `⚠️ Only ${seatsAvailable} seats left!`,
      'Jaldi booking confirm karein, seats bhar rahe hain.',
      { type: 'SYSTEM', routeId, driverId, seatsAvailable }
    );
  }
};

export default {
  sendPushNotification,
  sendToMultiple,
  sendToTopic,
  subscribeToTopic,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  notifyTicketAutoVerified,
  notifyDriverNewPassenger,
  notifyKisanOrder,
  notifyDriverDelivery,
  notifyLowSeats
};
