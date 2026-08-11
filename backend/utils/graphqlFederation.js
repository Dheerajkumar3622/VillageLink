/**
 * GraphQL Federation Gateway Simulator
 * Composes schemas from isolated downstream microservices (subgraphs).
 * Compiles unified graph responses to satisfy complex client queries in one call.
 */

// --- SUBGRAPHS ---

const produceSubgraph = {
    'prod-101': { id: 'prod-101', title: 'Mustard Seeds', basePrice: 5800 },
    'prod-102': { id: 'prod-102', title: 'Yellow Maize', basePrice: 2100 }
};

const bidsSubgraph = {
    'prod-101': [
        { bidId: 'b-1', amount: 5850, bidder: 'trader_patna' },
        { bidId: 'b-2', amount: 5900, bidder: 'trader_delhi' }
    ],
    'prod-102': [
        { bidId: 'b-3', amount: 2150, bidder: 'trader_patna' }
    ]
};

/**
 * Resolves a federated query by querying the respective subgraphs and merging records
 * @param {Object} queryRequest Compiled graph request document
 */
export const executeFederatedQuery = async (queryRequest) => {
    const { query, variables } = queryRequest;
    
    if (query === 'GetProduceDetails') {
        const { id } = variables;
        
        // 1. Query the Produce Subgraph
        const produce = produceSubgraph[id];
        if (!produce) {
            return { errors: [{ message: `Produce item ${id} not found in Produce Subgraph` }] };
        }

        // 2. Query the Bids Subgraph (Federated Entity extension)
        const bids = bidsSubgraph[id] || [];

        // 3. Compose subgraphs into a unified composed graph response
        return {
            data: {
                produce: {
                    ...produce,
                    bids
                }
            }
        };
    }

    return { errors: [{ message: 'Unknown GraphQL operation' }] };
};
