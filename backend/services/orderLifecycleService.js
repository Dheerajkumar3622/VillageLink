/**
 * Order Lifecycle Service — State Machine for Orders
 * 
 * Manages the lifecycle of different order types:
 * - Food orders (Vendor → Driver → Customer)
 * - Crop procurement (Vendor → Kisan → Driver → Vendor)
 * - Parcel delivery (Sender → Driver → Receiver)
 * 
 * Each state transition triggers Firebase push notification.
 */

import { FoodOrder, ProcurementOrder, Parcel, User } from '../models.js';
import { sendPushNotification } from './firebaseNotificationService.js';

// Valid state transitions
const FOOD_ORDER_TRANSITIONS = {
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['DRIVER_ASSIGNED'],
  DRIVER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: []
};

const PROCUREMENT_TRANSITIONS = {
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: []
};

const PARCEL_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: []
};

/**
 * Transition a food order to a new status
 */
export const transitionFoodOrder = async (orderId, newStatus, actorId) => {
  const order = await FoodOrder.findOne({ id: orderId });
  if (!order) throw new Error('Order not found');

  const validNext = FOOD_ORDER_TRANSITIONS[order.status] || [];
  if (!validNext.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  order.status = newStatus;
  order.updatedAt = Date.now();

  if (newStatus === 'ACCEPTED') order.acceptedAt = Date.now();
  if (newStatus === 'PICKED_UP') order.pickedUpAt = Date.now();
  if (newStatus === 'DELIVERED') order.deliveredAt = Date.now();

  await order.save();

  // Send notifications
  await notifyOrderTransition('FOOD', order, newStatus);

  return order;
};

/**
 * Transition a procurement order
 */
export const transitionProcurementOrder = async (orderId, newStatus, actorId) => {
  const order = await ProcurementOrder.findOne({ id: orderId });
  if (!order) throw new Error('Order not found');

  const validNext = PROCUREMENT_TRANSITIONS[order.status] || [];
  if (!validNext.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  order.status = newStatus;
  order.updatedAt = Date.now();

  if (newStatus === 'ACCEPTED') order.acceptedAt = Date.now();
  if (newStatus === 'PICKED_UP') order.pickedUpAt = Date.now();
  if (newStatus === 'DELIVERED') order.deliveredAt = Date.now();

  await order.save();
  await notifyOrderTransition('PROCUREMENT', order, newStatus);

  return order;
};

/**
 * Transition a parcel
 */
export const transitionParcel = async (parcelId, newStatus, actorId) => {
  const parcel = await Parcel.findOne({ id: parcelId });
  if (!parcel) throw new Error('Parcel not found');

  const validNext = PARCEL_TRANSITIONS[parcel.status] || [];
  if (!validNext.includes(newStatus)) {
    throw new Error(`Cannot transition from ${parcel.status} to ${newStatus}`);
  }

  parcel.status = newStatus;
  if (newStatus === 'DELIVERED') parcel.deliveredAt = Date.now();

  await parcel.save();
  await notifyOrderTransition('PARCEL', parcel, newStatus);

  return parcel;
};

/**
 * Send notifications on order state change
 */
const notifyOrderTransition = async (type, order, newStatus) => {
  try {
    const messages = {
      FOOD: {
        ACCEPTED: { to: order.userId, title: '✅ Order Accepted!', body: 'Restaurant ne aapka order accept kar liya' },
        PREPARING: { to: order.userId, title: '👨‍🍳 Preparing...', body: 'Aapka khana ban raha hai' },
        READY: { to: order.userId, title: '📦 Ready!', body: 'Khana ready hai, driver assign ho raha hai' },
        PICKED_UP: { to: order.userId, title: '🚗 On the way!', body: 'Driver ne khana pick up kar liya' },
        DELIVERED: { to: order.userId, title: '🎉 Delivered!', body: 'Enjoy your meal!' }
      },
      PROCUREMENT: {
        ACCEPTED: { to: order.vendorId, title: '✅ Order Accepted', body: `${order.kisanName} ne order accept kiya` },
        DRIVER_ASSIGNED: { to: order.kisanId, title: '🚗 Driver Assigned', body: `${order.assignedDriverName} pickup ke liye aa raha hai` },
        PICKED_UP: { to: order.vendorId, title: '📦 Picked Up', body: 'Driver ne maal pick up kar liya' },
        DELIVERED: { to: order.vendorId, title: '🎉 Delivered!', body: 'Maal aapki shop pe deliver ho gaya' }
      },
      PARCEL: {
        ACCEPTED: { to: order.senderId, title: '✅ Parcel Accepted', body: 'Driver ne aapka parcel accept kiya' },
        PICKED_UP: { to: order.senderId, title: '📦 Picked Up', body: 'Parcel pick up ho gaya' },
        DELIVERED: { to: order.receiverId || order.senderId, title: '🎉 Delivered!', body: 'Parcel deliver ho gaya' }
      }
    };

    const msg = messages[type]?.[newStatus];
    if (msg) {
      await sendPushNotification(msg.to, msg.title, msg.body, {
        type: type === 'FOOD' ? 'ORDER' : type === 'PARCEL' ? 'DELIVERY' : 'KISAN',
        orderId: order.id,
        status: newStatus
      });
    }
  } catch (error) {
    console.error('Order notification error:', error.message);
  }
};

export default {
  transitionFoodOrder,
  transitionProcurementOrder,
  transitionParcel
};
