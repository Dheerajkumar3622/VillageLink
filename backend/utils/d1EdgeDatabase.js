/**
 * Cloudflare D1 Edge SQLite Database Driver Simulator
 * Simulates SQL schema creation, parameter binding, and lightweight edge queries.
 */

export class D1EdgeDatabase {
    constructor() {
        this.tables = new Map();
        this.edgeLatencyMs = 4; // Simulated Edge execution: 4ms
        this.originLatencyMs = 150; // Simulated Origin MongoDB connection: 150ms
    }

    /**
     * Executes raw DDL setup queries on D1 edge replica
     */
    exec(sql) {
        const createTableRegex = /CREATE TABLE (\w+) \((.+)\)/i;
        const match = sql.match(createTableRegex);
        
        if (match) {
            const tableName = match[1].toLowerCase();
            this.tables.set(tableName, []);
            console.log(`   [D1 Database] Table "${tableName}" initialized at edge replica nodes.`);
            return { success: true };
        }
        throw new Error('[D1 Database] Invalid DDL command.');
    }

    /**
     * Prepares an SQL query statement with bindings
     */
    prepare(sql) {
        const self = this;
        let boundParams = [];

        return {
            bind(...params) {
                boundParams = params;
                return this;
            },

            run() {
                const insertRegex = /INSERT INTO (\w+).*VALUES\s*\((.+)\)/i;
                const match = sql.match(insertRegex);

                if (match) {
                    const tableName = match[1].toLowerCase();
                    const tableRows = self.tables.get(tableName);
                    
                    if (!tableRows) {
                        throw new Error(`[D1 Database] Table "${tableName}" does not exist.`);
                    }

                    // Create mock row using bound parameters
                    const row = {};
                    boundParams.forEach((val, idx) => {
                        row[`col_${idx}`] = val;
                    });
                    
                    tableRows.push(row);
                    return { success: true, changes: 1 };
                }
                throw new Error('[D1 Database] Simulated SQL insert execution failed.');
            },

            all() {
                const selectRegex = /SELECT \* FROM (\w+)/i;
                const match = sql.match(selectRegex);

                if (match) {
                    const tableName = match[1].toLowerCase();
                    const tableRows = self.tables.get(tableName) || [];
                    
                    // Return rows mapped back to readable structures
                    return {
                        results: tableRows,
                        durationMs: self.edgeLatencyMs
                    };
                }
                return { results: [], durationMs: self.edgeLatencyMs };
            },

            first() {
                const resultsObj = this.all();
                return resultsObj.results[0] || null;
            }
        };
    }
}
