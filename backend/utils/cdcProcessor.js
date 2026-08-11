/**
 * Change Data Capture (CDC) Processor
 * Listens to database write transactions (mutations) and replicates updates
 * to downstream read caches or search index replicas in real-time.
 */

// Simulated downstream search index/cache database replica
export const downstreamSearchCache = new Map();

// Log of captured CDC events
const cdcEventLog = [];

/**
 * Captures write mutations and updates downstream replicas.
 * Simulates a MongoDB change stream listener.
 */
export const captureMutation = (operationType, collection, docId, dataDelta = {}) => {
    const event = {
        collection,
        docId,
        operationType, // 'INSERT', 'UPDATE', 'DELETE'
        dataDelta,
        timestamp: Date.now(),
        eventId: `cdc_evt_${Math.random().toString(36).substring(2, 9)}`
    };

    cdcEventLog.push(event);
    console.log(`🔌 CDC Stream: Captured [${operationType}] on [${collection}] (ID: ${docId})`);

    // Synchronize mutation downstream
    switch (operationType) {
        case 'INSERT':
            downstreamSearchCache.set(docId, { ...dataDelta, _id: docId });
            break;
            
        case 'UPDATE':
            const current = downstreamSearchCache.get(docId) || {};
            downstreamSearchCache.set(docId, { ...current, ...dataDelta });
            break;
            
        case 'DELETE':
            downstreamSearchCache.delete(docId);
            break;

        default:
            console.warn(`⚠️ CDC Stream: Unknown operation type "${operationType}".`);
    }

    return event;
};

/**
 * Returns the historical log of captured CDC events
 */
export const getCdcEventLog = () => {
    return cdcEventLog;
};
