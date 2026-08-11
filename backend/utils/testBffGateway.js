import { compileKisanBffData, compileProviderBffData } from './bffGateway.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               BFF (Backend for Frontend) Gateway Validation    ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    // 1. Mock heavy database documents with audit fields
    const mockRawProduce = [
        {
            _id: 'prod-grain-0912',
            itemName: 'Premium Basmati Rice',
            currentPrice: 3200,
            weightUnit: 'quintal',
            villageMarketName: 'Buxar Mandi',
            quantityAvailable: 45,
            latitude: 25.56,
            longitude: 83.98,
            __v: 3,
            isDeleted: false,
            lastModifiedBy: 'admin-user-09',
            auditLog: ['created_2026-05-01', 'price_updated_2026-06-01']
        }
    ];

    const mockRawBids = [
        { id: 'bid-1', produceId: 'prod-grain-0912', username: 'farmer_dev', bidAmount: 3250, createdEpoch: 1770000000 },
        { id: 'bid-2', produceId: 'prod-grain-0912', username: 'patna_trader', bidAmount: 3300, createdEpoch: 1770010000 }
    ];

    console.log('🔵 Test 1: Compiling lightweight Kisan (Farmer) mobile view contracts...');
    
    const kisanPayload = compileKisanBffData(mockRawProduce);
    console.log('   📍 Pruned Kisan Payload:', JSON.stringify(kisanPayload, null, 2));

    const item = kisanPayload[0];
    const kisanOk = item.id === 'prod-grain-0912' &&
                    item.title === 'Premium Basmati Rice' &&
                    item.price === 3200 &&
                    item.unit === 'quintal' &&
                    item.marketName === 'Buxar Mandi' &&
                    item.availableQty === 45 &&
                    item.__v === undefined &&
                    item.lastModifiedBy === undefined &&
                    item.latitude === undefined;

    if (kisanOk) {
        console.log('   ✅ PASS: Kisan view contract has zero metadata leaks.');
    } else {
        console.error('   ❌ FAIL: Kisan payload compilation schema mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Compiling aggregate Provider telemetry data graphs...');

    const providerPayload = compileProviderBffData(mockRawProduce, mockRawBids);
    console.log('   📍 Joined Provider Payload:', JSON.stringify(providerPayload, null, 2));

    const pItem = providerPayload[0];
    const providerOk = pItem.deliveryId === 'prod-grain-0912' &&
                       pItem.location.lat === 25.56 &&
                       pItem.location.lng === 83.98 &&
                       pItem.bidsCount === 2 &&
                       pItem.highestBid === 3300 &&
                       pItem.bids[0].bidderName === 'farmer_dev' &&
                       pItem.bids[1].bidderName === 'patna_trader';

    if (providerOk) {
        console.log('   ✅ PASS: Provider aggregate joining succeeded.');
        console.log('\n🎉 SUCCESS: All BFF Gateway compilers checks passed!');
    } else {
        console.error('   ❌ FAIL: Provider payload compilation joining mismatch.');
        process.exit(1);
    }
};

runVerification();
