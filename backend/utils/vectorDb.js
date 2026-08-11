/**
 * Vector Database Emulator
 * Stores high-dimensional vector embeddings with metadata.
 * Performs K-Nearest Neighbors (KNN) search using Cosine Similarity.
 */

// Simulated memory database for vectors
const vectorStore = [];

/**
 * Calculates cosine similarity between two numeric vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
    if (vecA.length !== vecB.length) {
        throw new Error('Vector dimension mismatch.');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Inserts an embedding vector with linked metadata
 */
export const insertVector = (id, vector, metadata = {}) => {
    vectorStore.push({ id, vector, metadata });
    console.log(`📡 Vector DB: Indexed embedding for [${id}] (Dimension: ${vector.length})`);
};

/**
 * Queries the vector store to find top-K nearest neighbors
 */
export const queryVector = (queryVec, topK = 3) => {
    const scores = vectorStore.map(item => {
        const similarity = cosineSimilarity(queryVec, item.vector);
        return {
            id: item.id,
            similarity,
            metadata: item.metadata
        };
    });

    // Sort descending by similarity score
    scores.sort((a, b) => b.similarity - a.similarity);

    return scores.slice(0, topK);
};
