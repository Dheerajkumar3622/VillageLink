import { executeFederatedQuery } from './graphqlFederation.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               GraphQL Federation Schema Composition Check      ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    console.log('🔵 Test 1: Querying federated gateway composed product schema graph...');

    const request = {
        query: 'GetProduceDetails',
        variables: { id: 'prod-101' }
    };

    const response = await executeFederatedQuery(request);
    console.log('   📍 Gateway Composed Response:', JSON.stringify(response, null, 2));

    const data = response.data;
    const queryOk = data &&
                    data.produce &&
                    data.produce.id === 'prod-101' &&
                    data.produce.title === 'Mustard Seeds' &&
                    data.produce.basePrice === 5800 &&
                    Array.isArray(data.produce.bids) &&
                    data.produce.bids.length === 2 &&
                    data.produce.bids[0].bidder === 'trader_patna' &&
                    data.produce.bids[1].bidder === 'trader_delhi';

    if (queryOk) {
        console.log('   ✅ PASS: Federated entity compose and schema resolution succeeded.');
    } else {
        console.error('   ❌ FAIL: Composed schema graph mapping error.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Checking query errors for missing entity references...');

    const errorRequest = {
        query: 'GetProduceDetails',
        variables: { id: 'prod-nonexistent' }
    };

    const errorResponse = await executeFederatedQuery(errorRequest);
    console.log('   📍 Gateway Error Response:', JSON.stringify(errorResponse, null, 2));

    const errorOk = errorResponse.errors &&
                    errorResponse.errors.length > 0 &&
                    errorResponse.errors[0].message.includes('not found');

    if (errorOk) {
        console.log('   ✅ PASS: Unknown references yield proper schema query errors.');
        console.log('\n🎉 SUCCESS: All GraphQL Federation composition checks passed!');
    } else {
        console.error('   ❌ FAIL: Error handling checks failed.');
        process.exit(1);
    }
};

runVerification();
