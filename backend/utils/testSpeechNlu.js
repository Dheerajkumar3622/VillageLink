import { OfflineNluEngine } from './offlineSpeechNlu.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Offline Speech NLU Intent Parsing Validation     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    const engine = new OfflineNluEngine();

    console.log('🔵 Test 1: Parsing complex English/Bhojpuri parcel dispatch instruction...');

    // Bhojpuri style se preposition for origin location
    const spokenText1 = "Please send 50 bags of basmati se dumraon to patna mandi";
    const result1 = engine.parseSpeech(spokenText1);

    console.log(`   🗣️ Spoken: "${spokenText1}"`);
    console.log(`   📍 Intent: "${result1.intent}" (Confidence: ${(result1.confidence * 100).toFixed(0)}%)`);
    console.log(`   📍 Slots:`, result1.slots);

    const test1Ok = result1.intent === 'BOOK_PARCEL' && 
                    result1.slots.crop === 'basmati' &&
                    result1.slots.qty === 50 &&
                    result1.slots.origin === 'dumraon' &&
                    result1.slots.destination === 'patna';

    if (test1Ok) {
        console.log('   ✅ PASS: Intent and entities (origin, destination, quantity) successfully extracted.');
    } else {
        console.error('   ❌ FAIL: Booking intent parsing mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Parsing Hindi price advisory query...');

    const spokenText2 = "chana ka mandi daam kya chal raha hai Buxar mein";
    const result2 = engine.parseSpeech(spokenText2);

    console.log(`   🗣️ Spoken: "${spokenText2}"`);
    console.log(`   📍 Intent: "${result2.intent}" (Confidence: ${(result2.confidence * 100).toFixed(0)}%)`);
    console.log(`   📍 Slots:`, result2.slots);

    const test2Ok = result2.intent === 'CHECK_CROP_PRICE' && 
                    result2.slots.crop === 'chana' &&
                    result2.slots.origin === 'buxar';

    if (test2Ok) {
        console.log('   ✅ PASS: Price query intent and crop type successfully mapped.');
        console.log('\n🎉 SUCCESS: All Offline Speech NLU checks passed!');
    } else {
        console.error('   ❌ FAIL: Price query mapping mismatch.');
        process.exit(1);
    }
};

runVerification();
