import { saveTicket, bookRental, bookParcel } from "./services/transportService";
const QUEUE_KEY = "villagelink_offline_queue";
const isOnline = () => navigator.onLine;
const queueAction = (action) => {
  const queue = getQueue();
  const newAction = {
    ...action,
    id: `OFF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now()
  };
  queue.push(newAction);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log("\u{1F4F4} Action Queued Offline:", newAction.type);
};
const getQueue = () => {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};
const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};
const syncOfflineActions = async () => {
  if (!isOnline()) return 0;
  const queue = getQueue();
  if (queue.length === 0) return 0;
  console.log(`\u{1F504} Syncing ${queue.length} offline actions...`);
  let syncedCount = 0;
  for (const action of queue) {
    try {
      switch (action.type) {
        case "BOOK_TICKET":
          saveTicket({ ...action.payload, isOfflineSync: true });
          syncedCount++;
          break;
        case "BOOK_RENTAL":
          await bookRental(action.payload);
          syncedCount++;
          break;
        case "SEND_PARCEL":
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
if (typeof window !== "undefined") {
  window.addEventListener("online", syncOfflineActions);
}
export {
  clearQueue,
  getQueue,
  isOnline,
  queueAction,
  syncOfflineActions
};
