import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';

// Schema for text-based Village Data
const villageDataSchema = new mongoose.Schema({
  stateCode: String,
  stateNameEnglish: String,
  districtCode: String,
  districtNameEnglish: String,
  subdistrictCode: String,
  subdistrictNameEnglish: String,
  villageCode: { type: String, unique: true },
  villageNameEnglish: String,
  pincode: String
}, {
  collection: 'villages_data'
});

// Adding text index for search
villageDataSchema.index({ 
  villageNameEnglish: 'text', 
  districtNameEnglish: 'text', 
  stateNameEnglish: 'text' 
});

const VillageData = mongoose.model('VillageData', villageDataSchema);

const villageDataDir = path.join(__dirname, 'villageData');

async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          if (results.length === 0) {
            return resolve(0);
          }
          
          // Use ordered: false to continue if there are duplicate villageCodes
          await VillageData.insertMany(results, { ordered: false }).catch(err => {
            // Ignore duplicate key errors (code E11000)
            if (err.code !== 11000) {
              console.log(`Failed to insert some records in ${path.basename(filePath)}`);
            }
          });
          resolve(results.length);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function startUpload() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB!');
    
    // Create text index
    console.log('Ensuring indexes...');
    await VillageData.syncIndexes();

    const files = fs.readdirSync(villageDataDir).filter(f => f.endsWith('.csv'));
    console.log(`Found ${files.length} CSV files to process.`);
    
    let totalProcessed = 0;
    
    for (const file of files) {
      const filePath = path.join(villageDataDir, file);
      console.log(`Processing ${file}...`);
      try {
        const count = await processCSV(filePath);
        totalProcessed += count;
        console.log(`Successfully processed ${count} records from ${file}.`);
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
      }
    }
    
    console.log(`--- Finished processing all files! Total records attempted: ${totalProcessed} ---`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

startUpload();
