/**
 * Feature Store Coordinator (Online KV Cache & Offline Data Sync)
 * Delivers low-latency feature serving to real-time ML inference runtimes.
 * Automatically synchronizes changes to the offline historical data lake.
 */

export class FeatureStore {
    constructor() {
        this.onlineStore = new Map(); // entityId -> Map(featureName -> value)
        this.offlineStore = new Map(); // entityId -> Array of historical logs
    }

    /**
     * Updates a feature value in the online key-value cache
     * Automatically triggers an async synchronization log to the offline storage
     */
    setOnlineFeature(entityId, featureName, value) {
        let entityFeatures = this.onlineStore.get(entityId);
        if (!entityFeatures) {
            entityFeatures = new Map();
            this.onlineStore.set(entityId, entityFeatures);
        }

        entityFeatures.set(featureName, value);

        // Asynchronously commit to offline database logs
        setImmediate(() => {
            this.syncToOfflineStore(entityId, featureName, value);
        });
    }

    /**
     * Retrieves pre-computed feature values from the low-latency online cache
     */
    getOnlineFeatures(entityId, featureNames = []) {
        const entityFeatures = this.onlineStore.get(entityId);
        const results = {};

        if (!entityFeatures) {
            featureNames.forEach(name => { results[name] = null; });
            return results;
        }

        featureNames.forEach(name => {
            results[name] = entityFeatures.has(name) ? entityFeatures.get(name) : null;
        });

        return results;
    }

    /**
     * Appends feature changes to the offline database lake for training models
     */
    syncToOfflineStore(entityId, featureName, value) {
        let logsList = this.offlineStore.get(entityId);
        if (!logsList) {
            logsList = [];
            this.offlineStore.set(entityId, logsList);
        }

        logsList.push({
            featureName,
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Returns offline database logs size
     */
    getOfflineLogsCount(entityId) {
        const logs = this.offlineStore.get(entityId);
        return logs ? logs.length : 0;
    }
}
