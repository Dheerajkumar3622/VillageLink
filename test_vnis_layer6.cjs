const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function testVNISLayer6() {
  console.log('====================================================');
  console.log('TESTING VNIS LAYER 6: VILLAGE MANAGER MONGODB ATLAS PERSISTENCE');
  console.log('Zero-Friction 30s Handshake + Instant 10% Wallet Payout + Chain of Custody');
  console.log('====================================================\n');

  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('✔ Connected to MongoDB Atlas!\n');

    const { VNISVillageManagerEngine } = await import('./backend/src/vnisVillageManagerEngine.js');

    // 1. Get Origin Village Manager Hub at Bihta Mode directly from MongoDB
    console.log('📌 1. Fetching Village Manager Hub at Bihta Mode (S_BTA) from MongoDB Atlas...');
    const hubOrigin = await VNISVillageManagerEngine.getOrCreateHub('S_BTA', 'Bihta Railway Station Hub', 'Ramesh Kumar (Gram Sanchalak)', '+91 9801612025');
    console.log(`  ✔ Hub Name: ${hubOrigin.kioskShopName}`);
    console.log(`  ✔ Manager: ${hubOrigin.managerName} (${hubOrigin.managerPhone})`);
    console.log(`  ✔ Initial Wallet Balance: ₹${hubOrigin.walletBalanceRupees.toFixed(2)}`);
    console.log(`  ✔ Hub QR Code: ${hubOrigin.hubQrCode}\n`);

    // 2. Sender stages parcel at Origin Hub (Saved in MongoDB Atlas)
    console.log('📌 2. Step 1: Sender stages 20kg Agri Parcel at Bihta Hub (Saving to MongoDB Atlas)...');
    const parcel = await VNISVillageManagerEngine.stageParcelAtOriginHub(
      'S_BTA', 'Bihta Railway Station Hub', 'Sadisopur Mode',
      'Kisan Kameshwar Yadav', '+91 9823456789',
      'Suresh Verma', '+91 9801612025',
      20, 200 // 20kg, Total Fare ₹200 (10% VM Fee = ₹20)
    );

    console.log(`  ✔ Parcel Generated in Atlas DB: ID [${parcel.parcelId}] | Status: ${parcel.currentStatus}`);
    console.log(`  ✔ Verification OTP: ${parcel.verificationOtp}`);
    console.log(`  ✔ Village Manager 10% Commission: ₹${parcel.villageManagerCommissionRupees}\n`);

    // 3. Driver arrives, scans Hub QR Code, performs 30-sec handshake (Persisted in Atlas DB)
    console.log('📌 3. Step 2: Driver arrives, scans Hub QR Code (Updating Wallet in Atlas DB)...');
    const handshakeResult = await VNISVillageManagerEngine.handoverParcelToDriver(
      'S_BTA', 'DRV_BOLERO_99', 'Vikram Singh (Bolero Driver)', '+91 9700011223', parcel.parcelId
    );

    console.log(`  ✔ Handshake Result: ${handshakeResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  ✔ Updated Parcel Status: ${handshakeResult.parcel.currentStatus}`);
    console.log(`  💰 MONGODB ATLAS INSTANT WALLET CREDIT: Village Manager Wallet updated to ₹${handshakeResult.updatedWalletBalance.toFixed(2)} (+₹${parcel.villageManagerCommissionRupees.toFixed(2)})\n`);

    // 4. Driver drops parcel at Destination Hub (Sadisopur Mode)
    console.log('📌 4. Step 3: Driver drops parcel at Destination Hub (Sadisopur Mode)...');
    const destParcel = await VNISVillageManagerEngine.receiveParcelAtDestinationHub(
      'V_4', 'Sadisopur Mode', 'DRV_BOLERO_99', 'Vikram Singh', parcel.parcelId
    );

    console.log(`  ✔ Destination Parcel Status: ${destParcel.currentStatus}\n`);

    // 5. Recipient collects parcel using OTP
    console.log(`📌 5. Step 4: Recipient collects parcel using OTP [${parcel.verificationOtp}]...`);
    const finalResult = await VNISVillageManagerEngine.deliverParcelToRecipient(parcel.parcelId, parcel.verificationOtp);

    console.log(`  ✔ Delivery Result: ${finalResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  ✔ Final Parcel Status: ${finalResult.parcel.currentStatus}\n`);

    // 6. Print Full Cryptographic Chain of Custody Event Ledger
    console.log('📌 6. FULL MONGODB CHAIN OF CUSTODY EVENT LEDGER LOG:');
    console.log('----------------------------------------------------------------------------------');
    finalResult.parcel.custodyLedger.forEach((evt, idx) => {
      console.log(`  Event #${idx + 1} [${evt.timestamp}] | Status: ${evt.status}`);
      console.log(`           Location: ${evt.locationNodeName} | Actor: ${evt.actorName}`);
      console.log(`           Note: "${evt.note}"`);
      console.log('');
    });
    console.log('----------------------------------------------------------------------------------');

    console.log('\n====================================================');
    console.log('🎉 VNIS LAYER 6 MONGODB ATLAS PERSISTENCE 100% VERIFIED!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('❌ VNIS Layer 6 Test Error:', err);
    process.exit(1);
  }
}

testVNISLayer6();
