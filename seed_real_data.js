import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { JobOpportunity, PilgrimagePackage } from './backend/models/extraModels.js';
import { MarketPrice, ProduceListing, DairyFarmer } from './backend/models/gramMandiModels.js';
import { NewsItem } from './backend/models.js';

import dns from 'dns';

dotenv.config();

// Try to bypass local DNS issues
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log("Set DNS to Google Public DNS");
} catch (e) {
    console.log("Could not set custom DNS", e);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

console.log("SEEDING REAL DATA...");
console.log("Connecting to DB...");

mongoose.connect(MONGO_URI).then(async () => {
    console.log("CONNECTED.");

    // 1. SEED JOBS
    const jobCount = await JobOpportunity.countDocuments();
    if (jobCount === 0) {
        console.log("Seeding Jobs...");
        await JobOpportunity.insertMany([
            { id: 'J1', title: 'Farm Labour', location: 'Chenari', wage: '₹300/day', contact: '9876543210', type: 'DAILY', description: 'Urgent need for paddy harvesting.', skillsRequired: ['Harvesting'] },
            { id: 'J2', title: 'Construction Worker', location: 'Sasaram', wage: '₹400/day', contact: '8765432109', type: 'DAILY', description: 'Helper needed for masonry work.' },
            { id: 'J3', title: 'Driver (Tempo)', location: 'Bikramganj', wage: '₹12000/month', contact: '7654321098', type: 'CONTRACT', description: 'Experience with 3-wheeler required.' }
        ]);
        console.log("Jobs seeded.");
    } else {
        console.log(`Jobs already exist (${jobCount}).`);
    }

    // 2. SEED TRAVEL PACKAGES
    const pkgCount = await PilgrimagePackage.countDocuments();
    if (pkgCount === 0) {
        console.log("Seeding Travel Packages...");
        await PilgrimagePackage.insertMany([
            { id: 'P1', name: 'Gaya Darshan', locations: ['Vishnupad', 'Bodh Gaya'], price: 1500, duration: '1 Day', image: '🙏', description: 'Full day spiritual tour including Pind Daan assistance.', includes: ['Travel', 'Guide'] },
            { id: 'P2', name: 'Varanasi Yatra', locations: ['Kashi Vishwanath', 'Ganga Aarti'], price: 3500, duration: '2 Days', image: '🕉️', description: 'Overnight trip to Kashi with boat ride.', includes: ['Travel', 'Stay', 'Boat Ride'] }
        ]);
        console.log("Packages seeded.");
    } else {
        console.log(`Packages already exist (${pkgCount}).`);
    }


    // 3. SEED MARKET PRICES
    const priceCount = await MarketPrice.countDocuments();
    if (priceCount === 0) {
        console.log("Seeding Market Prices...");
        await MarketPrice.insertMany([
            { id: 'MP1', crop: 'Rice (Paddy)', price: 2200, minPrice: 2100, maxPrice: 2300, modalPrice: 2200, trend: 'UP', satelliteInsight: 'Good yield expected', date: new Date(), state: 'Bihar', market: 'Sasaram' },
            { id: 'MP2', crop: 'Wheat', price: 2100, minPrice: 2050, maxPrice: 2150, modalPrice: 2100, trend: 'STABLE', predictedPrice: 2150, date: new Date(), state: 'Bihar', market: 'Sasaram' },
            { id: 'MP3', crop: 'Potato', price: 1200, minPrice: 1100, maxPrice: 1300, modalPrice: 1200, trend: 'DOWN', satelliteInsight: 'Surplus in Bihar', date: new Date(), state: 'Bihar', market: 'Mohania' },
            { id: 'MP4', crop: 'Onion', price: 1800, minPrice: 1600, maxPrice: 2000, modalPrice: 1800, trend: 'UP', predictedPrice: 2000, date: new Date(), state: 'Bihar', market: 'Sasaram' },
            { id: 'MP5', crop: 'Tomato', price: 2500, minPrice: 2200, maxPrice: 2800, modalPrice: 2500, trend: 'UP', date: new Date(), state: 'Bihar', market: 'Kudra' }
        ]);
        console.log("Market Prices seeded.");
    } else {
        console.log(`Market Prices already exist (${priceCount}).`);
    }

    // 4. SEED PRODUCE LISTINGS
    const listingCount = await ProduceListing.countDocuments();
    if (listingCount === 0) {
        console.log("Seeding Produce Listings...");
        await ProduceListing.insertMany([
            { id: 'pl1', farmerId: 'f1', farmerName: 'Ramesh Kumar', category: 'VEGETABLE', crop: 'Onion', variety: 'Red', grade: 'A', quantity: 500, unit: 'KG', pricePerUnit: 25, harvestDate: new Date(), location: { village: 'Kotha', district: 'Rohtas' }, organic: false, status: 'ACTIVE' },
            { id: 'pl2', farmerId: 'f2', farmerName: 'Suresh Yadav', category: 'VEGETABLE', crop: 'Tomato', variety: 'Desi', grade: 'B', quantity: 200, unit: 'KG', pricePerUnit: 35, harvestDate: new Date(), location: { village: 'Dehri', district: 'Rohtas' }, organic: true, status: 'ACTIVE' },
            { id: 'pl3', farmerId: 'f3', farmerName: 'Mohan Singh', category: 'GRAIN', crop: 'Wheat', variety: 'Lokwan', grade: 'A', quantity: 50, unit: 'QUINTAL', pricePerUnit: 2200, harvestDate: new Date(), location: { village: 'Sasaram', district: 'Rohtas' }, organic: false, status: 'ACTIVE' },
            { id: 'pl4', farmerId: 'f4', farmerName: 'Geeta Devi', category: 'DAIRY', crop: 'Fresh Milk', variety: 'Cow', grade: 'A', quantity: 50, unit: 'LITER', pricePerUnit: 50, harvestDate: new Date(), location: { village: 'Nasriganj', district: 'Rohtas' }, organic: true, status: 'ACTIVE' }
        ]);
        console.log("Produce Listings seeded.");
    } else {
        console.log(`Produce Listings already exist (${listingCount}).`);
    }

    // 5. SEED DAIRY FARMER PROFILE (Mock for f4)
    const dairyCount = await DairyFarmer.countDocuments();
    if (dairyCount === 0) {
        console.log("Seeding Dairy Farmer Profile...");
        await DairyFarmer.create({
            id: 'DF-001',
            userId: 'u_dairy_1', // Mock User ID
            name: 'Geeta Devi',
            phone: '9988776655',
            cattle: { cows: 4, buffaloes: 2 },
            location: { village: 'Nasriganj', district: 'Rohtas' },
            totalMilkSupplied: 4500,
            totalEarnings: 225000,
            status: 'VERIFIED'
        });
        console.log("Dairy Farmer Profile seeded.");
    } else {
        console.log(`Dairy Farmer Profile already exists (${dairyCount}).`);
    }

    // 6. SEED NEWS ITEMS
    const newsCount = await NewsItem.countDocuments();
    if (newsCount === 0) {
        console.log("Seeding News Items...");
        await NewsItem.insertMany([
            { id: 'N1', title: 'Rohtas Mandi Price Update', summary: 'Wheat prices hit ₹2200 per quintal. High demand expected in next 2 weeks.', location: 'Sasaram', timestamp: Date.now() },
            { id: 'N2', title: 'Solar Pump Subsidy Announced', summary: 'Bihar govt announces 80% subsidy for small farmers on solar pump installations.', location: 'Patna', timestamp: Date.now() - 86400000 },
            { id: 'N3', title: 'Organic Farming Workshop', summary: 'Krishi Vigyan Kendra hosting a 3-day workshop on organic pesticide preparation.', location: 'Bikramganj', timestamp: Date.now() - 172800000 }
        ]);
        console.log("News Items seeded.");
    } else {
        console.log(`News Items already exist (${newsCount}).`);
    }

    console.log("Seeding Complete. Exiting...");
    process.exit(0);

}).catch(e => {
    console.error("SEEDING ERROR:", e);
    process.exit(1);
});
