/**
 * Elasticsearch Cluster Simulator
 * Simulates document indexing, bulk ingestion, and relevance-scored full-text query matching.
 */

export class ElasticsearchCluster {
    constructor() {
        this.indices = new Map();
        this.searchLatencyMs = 6; // Simulated average search time: 6ms
    }

    /**
     * Indexes a single document under an index indexName
     */
    index(indexName, id, doc) {
        if (!this.indices.has(indexName)) {
            this.indices.set(indexName, new Map());
        }
        this.indices.get(indexName).set(id, doc);
        return { result: 'created', _id: id };
    }

    /**
     * Simulates batch ingestion of multiple documents
     */
    bulk(indexName, items) {
        let count = 0;
        items.forEach(item => {
            this.index(indexName, item.id, item);
            count++;
        });
        console.log(`   [Elasticsearch Cluster] Bulk index success: ${count} documents added to index "${indexName}".`);
        return { errors: false, tookMs: 15, itemsCount: count };
    }

    /**
     * Performs a text relevance match search query across indexed documents
     */
    search(indexName, queryText) {
        const indexMap = this.indices.get(indexName);
        if (!indexMap) {
            return { hits: { total: 0, hits: [] }, took: this.searchLatencyMs };
        }

        const queryTokens = queryText.toLowerCase().split(/\s+/);
        const hits = [];

        for (const [id, doc] of indexMap.entries()) {
            let score = 0;
            const docString = JSON.stringify(doc).toLowerCase();

            // Calculate similarity score based on matched query tokens
            queryTokens.forEach(token => {
                if (docString.includes(token)) {
                    score += 10;
                    
                    // Boost score if token matches title/name fields exactly
                    if (doc.name && doc.name.toLowerCase().includes(token)) {
                        score += 15;
                    }
                }
            });

            if (score > 0) {
                hits.push({
                    _id: id,
                    _score: score,
                    _source: doc
                });
            }
        }

        // Sort results by score (descending order)
        hits.sort((a, b) => b._score - a._score);

        return {
            took: this.searchLatencyMs,
            timed_out: false,
            hits: {
                total: hits.length,
                max_score: hits[0] ? hits[0]._score : 0,
                hits: hits
            }
        };
    }
}
