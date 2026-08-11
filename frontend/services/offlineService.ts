
import { OfflineAction } from '@villagelink/shared';
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
  const failedActions: OfflineAction[] = [];

  for (const action of queue) {
    try {
      let success = true;
      switch (action.type) {
        case 'BOOK_TICKET':
          await saveTicket({ ...action.payload, isOfflineSync: true });
          break;
        case 'BOOK_RENTAL':
          await bookRental(action.payload);
          break;
        case 'SEND_PARCEL':
          await bookParcel(action.payload);
          break;
        default:
          success = false;
          break;
      }
      if (success) {
        syncedCount++;
      } else {
        failedActions.push(action);
      }
    } catch (e) {
      console.error("Failed to sync action:", action, e);
      failedActions.push(action);
    }
  }

  if (failedActions.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedActions));
    console.log(`⚠️ Sync partial: ${syncedCount} actions synced successfully. ${failedActions.length} actions retained in queue.`);
  } else {
    clearQueue();
    console.log(`✅ Sync complete: All ${syncedCount} actions synced successfully.`);
  }

  return syncedCount;
};

// Setup Listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineActions);
}
