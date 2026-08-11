/**
 * Wide-Column Store Emulator (Cassandra / ScyllaDB Model)
 * Simulates high-throughput sharding using partition keys and clustering keys.
 * Allows storing rows with dynamic columns and running chronological range queries.
 */

// Simulated memory storage for wide-column tables
const tables = {};

/**
 * Creates or retrieves a wide-column table schema definition
 */
export const initTable = (tableName, partitionKey, clusteringKey) => {
    tables[tableName] = {
        name: tableName,
        partitionKey,
        clusteringKey,
        data: new Map() // partitionKeyValue -> Array of rows
    };
    console.log(`💾 Wide-Column: Initialized table [${tableName}] with Partition Key: "${partitionKey}", Clustering Key: "${clusteringKey}"`);
};

/**
 * Inserts a row into a wide-column table with dynamic columns
 */
export const insertRow = (tableName, partitionVal, clusteringVal, columns = {}) => {
    const table = tables[tableName];
    if (!table) {
        throw new Error(`Table "${tableName}" not initialized.`);
    }

    let partition = table.data.get(partitionVal);
    if (!partition) {
        partition = [];
        table.data.set(partitionVal, partition);
    }

    const row = {
        [table.partitionKey]: partitionVal,
        [table.clusteringKey]: clusteringVal,
        ...columns
    };

    partition.push(row);
    
    // Sort rows within the partition by clustering key (e.g., chronological ascending)
    partition.sort((a, b) => a[table.clusteringKey] - b[table.clusteringKey]);
    
    return row;
};

/**
 * Executes a range query on a specific partition based on clustering key constraints
 */
export const queryPartition = (tableName, partitionVal, minClustering = -Infinity, maxClustering = Infinity) => {
    const table = tables[tableName];
    if (!table) {
        throw new Error(`Table "${tableName}" not initialized.`);
    }

    const partition = table.data.get(partitionVal) || [];
    
    // Filter and return matching rows
    return partition.filter(row => {
        const val = row[table.clusteringKey];
        return val >= minClustering && val <= maxClustering;
    });
};
