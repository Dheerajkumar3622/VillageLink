import { ElasticsearchCluster } from './elasticsearchCluster.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Elasticsearch Cluster Full-Text Verification    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const cluster = new ElasticsearchCluster();

    const testIndex = 'mandi_directory';
    const mockMandiList = [
        { id: 'm-101', name: 'Patna Wheat Mandi', crop: 'Wheat', region: 'Bihar' },
        { id: 'm-102', name: 'Chapra Potato Center', crop: 'Potato', region: 'Bhojpuri Belt' },
        { id: 'm-103', name: 'Hapur Wheat Storage', crop: 'Wheat', region: 'Uttar Pradesh' }
    ];

    console.log('🔵 Test 1: Ingesting dataset into search indices via bulk upload...');
    
    const bulkResult = cluster.bulk(testIndex, mockMandiList);
    console.log(`   📍 Bulk Ingest Time: ${bulkResult.tookMs}ms | Items added: ${bulkResult.itemsCount}`);

    if (!bulkResult.errors && bulkResult.itemsCount === 3) {
        console.log('   ✅ PASS: Bulk ingestion successfully completed without errors.');
    } else {
        console.error('   ❌ FAIL: Bulk upload indexing failed.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Querying index using full-text search term ("Wheat")...');

    const searchRes1 = cluster.search(testIndex, 'Wheat');
    console.log(`   📍 Query Execution Time: ${searchRes1.took}ms`);
    console.log(`   📍 Total Matches: ${searchRes1.hits.total} | Max Score: ${searchRes1.hits.max_score}`);

    searchRes1.hits.hits.forEach((hit, idx) => {
        console.log(`      [Result ${idx + 1}] ID: ${hit._id} | Score: ${hit._score} | Name: "${hit._source.name}"`);
    });

    if (searchRes1.hits.total === 2 && searchRes1.hits.hits[0]._source.crop === 'Wheat') {
        console.log('   ✅ PASS: Full-text matching successfully filtered wheat mandi nodes.');
    } else {
        console.error('   ❌ FAIL: Full-text search returned incorrect matches count.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Validating index score boosts for exact name matching ("Patna")...');

    const searchRes2 = cluster.search(testIndex, 'Patna');
    console.log(`   📍 Total Matches: ${searchRes2.hits.total}`);
    
    const topHit = searchRes2.hits.hits[0];
    console.log(`      [Top Hit] ID: ${topHit?._id} | Score: ${topHit?._score} | Name: "${topHit?._source.name}"`);

    // Patna matches description (10) + title boost (15) = 25
    if (searchRes2.hits.total === 1 && topHit._score === 25) {
        console.log('   ✅ PASS: Exact field match score boost verified successfully.');
        console.log('\n🎉 SUCCESS: All Elasticsearch Cluster checks passed!');
    } else {
        console.error('   ❌ FAIL: Match score computation or relevance sort failed.');
        process.exit(1);
    }
};

runVerification();
