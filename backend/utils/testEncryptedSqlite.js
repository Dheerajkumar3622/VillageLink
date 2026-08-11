import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { secureSaveRecord, secureReadRecord } from './encryptedSqlite.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        Local Storage SQLite Database Encryption Validation     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, './mock_sqlite.json');

const runVerification = () => {
    console.log('🔵 Test 1: Writing mock offline transaction to encrypted storage...');
    
    const mockTx = {
        transactionId: 'tx-offline-982172',
        amount: 850,
        currency: 'INR',
        merchant: 'GramMandi Seed Vendor',
        timestamp: Date.now()
    };

    const encryptedMetadata = secureSaveRecord('tx-offline-982172', mockTx);

    console.log(`   📍 Write ciphertext: ${encryptedMetadata.content.substring(0, 30)}...`);
    console.log(`   📍 Write Initialization Vector (IV): ${encryptedMetadata.iv}`);
    console.log(`   📍 Write Auth Tag: ${encryptedMetadata.authTag}`);

    if (encryptedMetadata.content && encryptedMetadata.iv && encryptedMetadata.authTag) {
        console.log('   ✅ PASS: Data encrypted successfully.');
    } else {
        console.error('   ❌ FAIL: Encryption keys/values not populated.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Checking plaintext leaks on disk...');

    if (!fs.existsSync(dbFilePath)) {
        console.error('   ❌ FAIL: mock_sqlite.json file not created on disk.');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(dbFilePath, 'utf8');
    const isPlaintextLeaked = fileContent.includes('GramMandi Seed Vendor');

    console.log(`   📍 Is payload plaintext leaked in storage file: ${isPlaintextLeaked}`);

    if (!isPlaintextLeaked) {
        console.log('   ✅ PASS: Database is securely encrypted at rest. No plaintext leaked.');
    } else {
        console.error('   ❌ FAIL: Plaintext found inside the storage file.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Reading and decrypting records from secure vault...');

    const decryptedTx = secureReadRecord('tx-offline-982172');

    console.log(`   📍 Decrypted Merchant: ${decryptedTx ? decryptedTx.merchant : 'null'} (Expected: GramMandi Seed Vendor)`);
    console.log(`   📍 Decrypted Amount: ${decryptedTx ? decryptedTx.amount : 'null'} (Expected: 850)`);

    const readOk = decryptedTx &&
                   decryptedTx.merchant === mockTx.merchant &&
                   decryptedTx.amount === mockTx.amount;

    if (readOk) {
        console.log('   ✅ PASS: Authentication and decryption succeeded.');
        console.log('\n🎉 SUCCESS: All Local Storage SQLite Database Encryption assertions passed!');
    } else {
        console.error('   ❌ FAIL: Decryption validation failed.');
        process.exit(1);
    }
};

runVerification();
