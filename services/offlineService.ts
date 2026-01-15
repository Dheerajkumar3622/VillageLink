
import { OfflineAction } from '../types';
import { saveTicket, bookRental, bookParcel } from './transportService';

const QUEUE_KEY = 'villagelink_offline_queue';

export const isOnline = (): boolean => navigator.onLine;

export const queueAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
  const queue = getQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `OFF-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
    timestamp: Date.now()
  };
  queue.push(newAction);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log("📴 Action Queued Offline:", newAction.type);
};

export const getQueue = (): OfflineAction[] => {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const syncOfflineActions = async (): Promise<number> => {
  if (!isOnline()) return 0;
  
  const queue = getQueue();
  if (queue.length === 0) return 0;

  console.log(`🔄 Syncing ${queue.length} offline actions...`);
  let syncedCount = 0;

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'BOOK_TICKET':
          saveTicket({ ...action.payload, isOfflineSync: true });
          syncedCount++;
          break;
        case 'BOOK_RENTAL':
          await bookRental(action.payload);
          syncedCount++;
          break;
        case 'SEND_PARCEL':
          await bookParcel(action.payload);
          syncedCount++;
          break;
      }
    } catch (e) {
      console.error("Failed to sync action:", action, e);
    }
  }

  clearQueue();
  return syncedCount;
};

// Setup Listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineActions);
}
