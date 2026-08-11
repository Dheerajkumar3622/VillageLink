/**
 * Optimistic UI & Automatic Rollback Coordinator
 * Updates user interface state instantly to simulate latency-free response,
 * and rolls back state to a backup snapshot if network sync requests fail.
 */

// Simulated client-side application state
const clientState = {
    cropPrice: 100,
    bookedSeats: 5
};

/**
 * Reads local client state
 */
export const getOptimisticState = (key) => {
    return clientState[key];
};

/**
 * Direct state modifier (used for baseline setup)
 */
export const setOptimisticState = (key, value) => {
    clientState[key] = value;
};

/**
 * Applies an optimistic update, and triggers the asynchronous server sync task.
 * Automatically rolls back clientState[key] if the promise fails.
 */
export const applyOptimisticUpdate = async (key, tempValue, syncTaskPromise) => {
    const oldValue = clientState[key];

    // Optimistically apply update instantly
    clientState[key] = tempValue;
    console.log(`⚡ Optimistic UI: Updated state key [${key}] to (${tempValue}) instantly (Optimistic assumption).`);

    try {
        // Execute the server sync promise
        await syncTaskPromise;
        console.log(`⚡ Optimistic UI: Server sync succeeded for Key=[${key}]. State committed.`);
        return { success: true, value: tempValue, rolledBack: false };
    } catch (err) {
        // Fail-safe automatic rollback
        clientState[key] = oldValue;
        console.log(`⚠️  Optimistic UI: Server sync failed for Key=[${key}]! Automatically rolled back to (${oldValue}).`);
        return { success: false, value: oldValue, rolledBack: true, error: err.message };
    }
};
