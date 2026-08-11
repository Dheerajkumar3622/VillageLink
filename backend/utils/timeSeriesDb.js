/**
 * Time Series Database Emulator (TimescaleDB Hypertables Model)
 * Optimizes storage for chronological data logs.
 * Groups data points dynamically into discrete time buckets (downsampling).
 */

const seriesStore = new Map();

/**
 * Inserts a timestamped metric data point
 */
export const insertMetric = (metricName, value, timestamp = Date.now()) => {
    if (!seriesStore.has(metricName)) {
        seriesStore.set(metricName, []);
    }
    
    const dataPoints = seriesStore.get(metricName);
    dataPoints.push({ value, timestamp });
    
    // Maintain chronological sort ordering
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Queries downsampled aggregate metrics over bucketed time intervals
 */
export const queryTimeBuckets = (metricName, bucketSizeMs) => {
    const dataPoints = seriesStore.get(metricName) || [];
    const bucketsMap = new Map();

    dataPoints.forEach(pt => {
        // Group timestamps into bucket divisions
        const bucketStart = Math.floor(pt.timestamp / bucketSizeMs) * bucketSizeMs;
        
        let bucketStats = bucketsMap.get(bucketStart);
        if (!bucketStats) {
            bucketStats = {
                bucketStart,
                sum: 0,
                count: 0,
                min: Infinity,
                max: -Infinity
            };
            bucketsMap.set(bucketStart, bucketStats);
        }

        bucketStats.sum += pt.value;
        bucketStats.count += 1;
        bucketStats.min = Math.min(bucketStats.min, pt.value);
        bucketStats.max = Math.max(bucketStats.max, pt.value);
    });

    // Compute final downsampled averages and format output
    const results = Array.from(bucketsMap.values()).map(b => ({
        bucketStart: b.bucketStart,
        average: b.sum / b.count,
        count: b.count,
        min: b.min,
        max: b.max
    }));

    // Sort buckets chronologically
    return results.sort((a, b) => a.bucketStart - b.bucketStart);
};
