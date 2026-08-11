export class DatabaseAutoIndexer {
    constructor() {
        this.slowQueryLogs = [];
        this.appliedIndexes = new Set();
        this.scanThresholdMs = 50;
    }

    logQuery(collection, filterField, durationMs, scanTypeOverride = null) {
        const indexKey = `${collection}:${filterField}`;
        const scanType = scanTypeOverride || (this.appliedIndexes.has(indexKey) ? 'IXSCAN' : 'COLLSCAN');

        this.slowQueryLogs.push({
            collection,
            filterField,
            durationMs,
            scanType,
            timestamp: Date.now()
        });
    }

    analyze() {
        const counts = {};
        const recommendations = [];

        this.slowQueryLogs.forEach(log => {
            if (log.scanType === 'COLLSCAN') {
                const key = `${log.collection}:${log.filterField}`;
                if (!counts[key]) {
                    counts[key] = { count: 0, totalMs: 0, collection: log.collection, field: log.filterField };
                }
                counts[key].count++;
                counts[key].totalMs += log.durationMs;
            }
        });

        for (const [key, stat] of Object.entries(counts)) {
            const avgDuration = stat.totalMs / stat.count;
            if (stat.count >= 3 || avgDuration > this.scanThresholdMs) {
                recommendations.push({
                    collection: stat.collection,
                    field: stat.field,
                    frequency: stat.count,
                    avgLatencyMs: avgDuration,
                    recommendation: `CREATE INDEX idx_${stat.collection}_${stat.field} ON ${stat.collection}(${stat.field})`
                });
            }
        }

        return recommendations;
    }

    applyRecommendations(recs) {
        let appliedCount = 0;
        recs.forEach(rec => {
            const indexKey = `${rec.collection}:${rec.field}`;
            if (!this.appliedIndexes.has(indexKey)) {
                this.appliedIndexes.add(indexKey);
                console.log(`   [Auto Indexer] Execution: Applied index "idx_${rec.collection}_${rec.field}" in database.`);
                appliedCount++;
            }
        });
        return appliedCount;
    }
}
