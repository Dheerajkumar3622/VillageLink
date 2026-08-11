import { insertVector, queryVector, cosineSimilarity } from './vectorDb.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Vector Database Cosine Similarity Suite          ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVectorTests = () => {
    console.log('🔵 Phase 1: Indexing high-dimensional crop embeddings...');

    // Vector features layout: [Sweetness, OrganicRating, Freshness, IndustrialScale]
    insertVector('crop_bananas_01', [0.9, 0.8, 0.9, 0.2], { name: 'Fresh Organic Sweet Bananas' });
    insertVector('crop_potatoes_02', [0.1, 0.3, 0.4, 0.9], { name: 'Conventional Bulk Potatoes' });
    insertVector('crop_melons_03', [0.95, 0.7, 0.85, 0.3], { name: 'Premium Honey Dew Melons' });
    insertVector('crop_onions_04', [0.2, 0.4, 0.5, 0.85], { name: 'Standard Wholesale Onions' });

    console.log('   ✅ Embeddings indexed.');

    // Query: Farmer search vector representing "Fresh Sweet Organic fruit profile"
    const queryVec = [0.93, 0.75, 0.88, 0.25];
    console.log(`\n🔵 Phase 2: Querying closest matching items (Top-2) for query vector: [${queryVec.join(', ')}]`);
    
    const results = queryVector(queryVec, 2);

    console.log('\n📊 Cosine Similarity Matches:');
    results.forEach((match, i) => {
        console.log(`   [Rank ${i + 1}]: ID: ${match.id} | Score: ${match.similarity.toFixed(5)} | Name: "${match.metadata.name}"`);
    });

    // Assertions: crop_bananas_01 and crop_melons_03 must rank highest
    const rank1Ok = results[0].id === 'crop_bananas_01' || results[0].id === 'crop_melons_03';
    const rank2Ok = results[1].id === 'crop_bananas_01' || results[1].id === 'crop_melons_03';
    const scoreOk = results[0].similarity > 0.95 && results[1].similarity > 0.95;

    if (rank1Ok && rank2Ok && scoreOk) {
        console.log('\n   ✅ PASS: Vector Database retrieved and sorted semantic matches accurately.');
    } else {
        console.error('\n   ❌ FAIL: Vector similarity sorting mismatch.');
        process.exit(1);
    }

    console.log('\n🎉 SUCCESS: Vector Database similarity indexing and searches verified!');
};

runVectorTests();
