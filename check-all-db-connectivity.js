/**
 * VillageLink Database Connectivity Test
 * Tests all database connections across the application
 * Run: node check-all-db-connectivity.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     VillageLink Database Connectivity Test Suite               ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const results = {
    mongodb: { status: 'PENDING', details: null, collections: [] },
    externalApis: { razorpay: 'PENDING', email: 'PENDING', sms: 'PENDING' }
};

// ==================== 1. MONGODB (Main Database) ====================

async function testMongoDB() {
    console.log('🔵 Testing MongoDB Atlas Connection...');

    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
        });

        console.log('   ✅ MongoDB Connected!');
        console.log(`   📦 Database: ${mongoose.connection.name}`);
        console.log(`   🔗 Host: ${mongoose.connection.host}`);

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log(`   📁 Collections (${collections.length}): ${collectionNames.slice(0, 10).join(', ')}${collections.length > 10 ? '...' : ''}`);

        // Sample document counts for key collections
        console.log('\n   📊 Document Counts:');
        const keyCollections = ['users', 'tickets', 'shops', 'transactions', 'passes', 'locations', 'products', 'activitylogs'];

        const counts = {};
        for (const colName of keyCollections) {
            try {
                const count = await mongoose.connection.db.collection(colName).countDocuments();
                counts[colName] = count;
                console.log(`      - ${colName}: ${count} documents`);
            } catch (e) {
                console.log(`      - ${colName}: (not found)`);
            }
        }

        results.mongodb = {
            status: '✅ CONNECTED',
            details: {
                database: mongoose.connection.name,
                host: mongoose.connection.host,
                readyState: mongoose.connection.readyState
            },
            collections: collectionNames,
            counts
        };

        return true;
    } catch (error) {
        console.log(`   ❌ MongoDB Connection Failed: ${error.message}`);
        results.mongodb = {
            status: '❌ FAILED',
            details: error.message
        };
        return false;
    }
}

// ==================== 2. TEST CRUD OPERATIONS ====================

async function testCRUDOperations() {
    console.log('\n🔵 Testing CRUD Operations...');

    if (mongoose.connection.readyState !== 1) {
        console.log('   ⚠️  Skipped (MongoDB not connected)');
        return false;
    }

    try {
        const testCollection = mongoose.connection.db.collection('_connectivity_test');

        // Create
        const testDoc = {
            testId: `test-${Date.now()}`,
            timestamp: new Date(),
            type: 'connectivity-check'
        };
        const insertResult = await testCollection.insertOne(testDoc);
        console.log(`   ✅ CREATE: Document inserted (ID: ${insertResult.insertedId})`);

        // Read
        const readResult = await testCollection.findOne({ testId: testDoc.testId });
        console.log(`   ✅ READ: Document retrieved (testId: ${readResult.testId})`);

        // Update
        await testCollection.updateOne(
            { testId: testDoc.testId },
            { $set: { verified: true } }
        );
        console.log('   ✅ UPDATE: Document updated');

        // Delete
        await testCollection.deleteOne({ testId: testDoc.testId });
        console.log('   ✅ DELETE: Document deleted');

        // Cleanup test collection
        await testCollection.drop().catch(() => { });

        return true;
    } catch (error) {
        console.log(`   ❌ CRUD Test Failed: ${error.message}`);
        return false;
    }
}

// ==================== 3. CHECK EXTERNAL API CONFIGS ====================

function checkExternalAPIs() {
    console.log('\n🔵 Checking External API Configurations...');

    // Razorpay
    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_SECRET;
    if (razorpayKey && razorpaySecret) {
        console.log(`   ✅ Razorpay: Configured (Key: ${razorpayKey.substring(0, 12)}...)`);
        results.externalApis.razorpay = '✅ CONFIGURED';
    } else {
        console.log('   ⚠️  Razorpay: Not configured (payments will fail)');
        results.externalApis.razorpay = '⚠️ NOT CONFIGURED';
    }

    // Email
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (emailUser && emailPass && emailPass !== 'your_app_specific_password') {
        console.log(`   ✅ Email: Configured (${emailUser})`);
        results.externalApis.email = '✅ CONFIGURED';
    } else {
        console.log('   ⚠️  Email: Not fully configured (will use simulation mode)');
        results.externalApis.email = '⚠️ SIMULATION MODE';
    }

    // MSG91 (SMS)
    const msg91Key = process.env.MSG91_AUTH_KEY;
    if (msg91Key) {
        console.log('   ✅ SMS (MSG91): Configured');
        results.externalApis.sms = '✅ CONFIGURED';
    } else {
        console.log('   ⚠️  SMS (MSG91): Not configured (will use simulation mode)');
        results.externalApis.sms = '⚠️ SIMULATION MODE';
    }
}

// ==================== 4. MICROSERVICES STATUS ====================

function checkMicroservicesStatus() {
    console.log('\n🔵 Microservices Database Configuration Status...');

    console.log('   ℹ️  The following databases are used by Docker microservices:');
    console.log('   ');
    console.log('   ┌─────────────────────┬───────────────┬────────────────────────────┐');
    console.log('   │ Microservice        │ Database      │ Status                     │');
    console.log('   ├─────────────────────┼───────────────┼────────────────────────────┤');
    console.log('   │ auth-service        │ PostgreSQL    │ Docker: port 5432          │');
    console.log('   │ payment-service     │ PostgreSQL    │ Docker: port 5432          │');
    console.log('   │ notification-service│ Redis         │ Docker: port 6379          │');
    console.log('   │ ml-service          │ Redis         │ Docker: port 6379          │');
    console.log('   │ legacy-server       │ MongoDB       │ Cloud: MongoDB Atlas       │');
    console.log('   │ (analytics)         │ MySQL         │ Docker: port 3306          │');
    console.log('   └─────────────────────┴───────────────┴────────────────────────────┘');
    console.log('   ');
    console.log('   💡 To run microservices: docker-compose up -d');
}

// ==================== 5. TEST SAMPLE DATA ACCESS ====================

async function testDataAccess() {
    console.log('\n🔵 Testing Sample Data Access...');

    if (mongoose.connection.readyState !== 1) {
        console.log('   ⚠️  Skipped (MongoDB not connected)');
        return;
    }

    try {
        // Test Users collection
        const sampleUser = await mongoose.connection.db.collection('users').findOne({});
        if (sampleUser) {
            console.log(`   ✅ Users: Sample user found (${sampleUser.name || sampleUser.email || sampleUser.id})`);
        } else {
            console.log('   ⚠️  Users: No users in database');
        }

        // Test Locations collection
        const locationCount = await mongoose.connection.db.collection('locations').countDocuments();
        console.log(`   ✅ Locations: ${locationCount} locations loaded`);

        // Test Shops collection
        const sampleShop = await mongoose.connection.db.collection('shops').findOne({});
        if (sampleShop) {
            console.log(`   ✅ Shops: Sample shop found (${sampleShop.name})`);
        } else {
            console.log('   ⚠️  Shops: No shops in database');
        }

        // Test Recent Tickets
        const recentTickets = await mongoose.connection.db.collection('tickets')
            .find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();
        if (recentTickets.length > 0) {
            console.log(`   ✅ Tickets: Most recent ticket ID: ${recentTickets[0].id}`);
        } else {
            console.log('   ⚠️  Tickets: No tickets in database');
        }

    } catch (error) {
        console.log(`   ❌ Data access error: ${error.message}`);
    }
}

// ==================== MAIN EXECUTION ====================

async function runAllTests() {
    const startTime = Date.now();

    // Run tests
    const mongoConnected = await testMongoDB();
    await testCRUDOperations();
    await testDataAccess();
    checkExternalAPIs();
    checkMicroservicesStatus();

    // Print Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    CONNECTIVITY SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('Database Connections:');
    console.log(`  MongoDB Atlas:    ${results.mongodb.status}`);
    console.log(`  PostgreSQL:       ⚠️ Docker Only (not tested locally)`);
    console.log(`  MySQL:            ⚠️ Docker Only (not tested locally)`);
    console.log(`  Redis:            ⚠️ Docker Only (not tested locally)`);

    console.log('\nExternal APIs:');
    console.log(`  Razorpay:         ${results.externalApis.razorpay}`);
    console.log(`  Email (Gmail):    ${results.externalApis.email}`);
    console.log(`  SMS (MSG91):      ${results.externalApis.sms}`);

    console.log(`\n⏱️  Tests completed in ${duration}s`);

    // Overall status
    if (mongoConnected) {
        console.log('\n✅ OVERALL: Core database (MongoDB) is connected and operational!');
        console.log('   The main application should work correctly.');
        console.log('   Microservices require Docker Compose to be running.');
    } else {
        console.log('\n❌ OVERALL: Core database connection failed!');
        console.log('   Please check your MONGO_URI in .env file.');
    }

    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
    }

    process.exit(mongoConnected ? 0 : 1);
}

runAllTests().catch(err => {
    console.error('\n❌ Test suite error:', err.message);
    process.exit(1);
});
