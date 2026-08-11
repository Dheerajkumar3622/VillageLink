import { RagEngine } from './ragEngine.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               RAG Document Retrieval & Prompt Generation Check ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const rag = new RagEngine();

    console.log('🔵 Test 1: Querying agricultural crop guidelines (Basmati Rice Sowing)...');

    const query1 = "when should I sow basmati rice and check moisture metrics?";
    const result1 = rag.generateAnswer(query1);

    console.log(`   ❓ Query: "${query1}"`);
    console.log(`   📍 Retrieved Doc Context: "${result1.contextTitle}"`);
    console.log(`   📍 Generated Answer: "${result1.answer}"`);

    const test1Ok = result1.contextTitle === 'Basmati Sowing & Moisture Standards' &&
                    result1.answer.includes('June/July') &&
                    result1.answer.includes('14%');

    if (test1Ok) {
        console.log('   ✅ PASS: Accurate agricultural context retrieved and synthesized.');
    } else {
        console.error('   ❌ FAIL: Sowing context retrieval or answer mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Querying transactional policies (Razorpay failed refunds)...');

    const query2 = "how many days does failed wallet transfer refund take via razorpay?";
    const result2 = rag.generateAnswer(query2);

    console.log(`   ❓ Query: "${query2}"`);
    console.log(`   📍 Retrieved Doc Context: "${result2.contextTitle}"`);
    console.log(`   📍 Generated Answer: "${result2.answer}"`);

    const test2Ok = result2.contextTitle === 'Razorpay Wallet Refund Policy' &&
                    result2.answer.includes('3-5 business days') &&
                    result2.answer.includes('Razorpay');

    if (test2Ok) {
        console.log('   ✅ PASS: Accurate transactional policy context retrieved and synthesized.');
        console.log('\n🎉 SUCCESS: All RAG checks passed!');
    } else {
        console.error('   ❌ FAIL: Wallet refunds context retrieval or answer mismatch.');
        process.exit(1);
    }
};

runVerification();
