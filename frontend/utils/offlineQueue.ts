/**
 * VillageLink Offline Action Sync Queue
 * Manages eventual consistency offline sync for rural operations
 */

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  body: any;
  headers?: Record<string, string>;
  timestamp: number;
}

const STORAGE_KEY = 'villagelink_offline_queue';

/**
 * Enqueue an API action to be synced eventually
 */
export const enqueueAction = (url: string, method: string, body: any, headers?: Record<string, string>): void => {
  try {
    const queue = getQueue();
    const newAction: OfflineAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    console.log(`📥 Enqueued offline action: ${method} ${url}`);
  } catch (e) {
    console.error('❌ Failed to enqueue offline action:', e);
  }
};

/**
 * Retrieve the current offline action queue
 */
export const getQueue = (): OfflineAction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('❌ Failed to read offline queue:', e);
    return [];
  }
};

/**
 * Process and synchronize all pending actions in the offline queue
 */
export const processOfflineQueue = async (onActionSuccess?: (action: OfflineAction) => void): Promise<boolean> => {
  const queue = getQueue();
  if (queue.length === 0) return true;

  console.log(`🔄 Processing offline queue (${queue.length} actions)...`);
  const remaining: OfflineAction[] = [];
  let allSuccess = true;

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      if (response.ok) {
        console.log(`✅ Eventual Consistency Sync Successful: ${action.method} ${action.url}`);
        if (onActionSuccess) onActionSuccess(action);
      } else {
        console.warn(`⚠️ Sync failed for ${action.method} ${action.url}. Status: ${response.status}`);
        remaining.push(action);
        allSuccess = false;
      }
    } catch (err) {
      console.error(`❌ Connection failed syncing ${action.method} ${action.url}:`, err);
      remaining.push(action);
      allSuccess = false;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return allSuccess;
};

/**
 * Check if the browser/device is online
 */
export const checkOnlineStatus = (): boolean => {
  return navigator.onLine;
};
