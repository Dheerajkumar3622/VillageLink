import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const villageDataDir = path.join(__dirname, 'villageData');
const outputDir = path.join(__dirname, 'public', 'data');
const outputFile = path.join(outputDir, 'villages.json');

// create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Ensure villageData exists
if (!fs.existsSync(villageDataDir)) {
    console.error(`Folder ${villageDataDir} not found`);
    process.exit(1);
}

// Optimize JSON by picking only what we need and compressing keys
// Array of arrays is the most memory efficient for static JSON drops
// Format: [villageName, pincode, districtName, stateCode, blockName, lat, lng]
// Using empty strings mapping for index
const compressedData = [];
// Keep track of unique village codes to avoid duplicates
const seenCodes = new Set();
let rowsProcessed = 0;

async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
          rowsProcessed++;
          
          // Row format: stateCode,stateNameEnglish,districtCode,districtNameEnglish,subdistrictCode,subdistrictNameEnglish,villageCode,villageNameEnglish,pincode
          
          const code = row.villageCode;
          if (code && !seenCodes.has(code)) {
             seenCodes.add(code);
             
             // Extract minimum needed info for search and display
             // We can use 2 letters for state code to save space or just keep the state name
             // No Coordinates in this dataset, but we will have the village name, district, and state
             
             // 0: villageName, 1: pincode, 2: district, 3: state, 4: block
             compressedData.push([
                 row.villageNameEnglish || '',
                 row.pincode || '',
                 row.districtNameEnglish || '',
                 row.stateNameEnglish || '',
                 row.subdistrictNameEnglish || '',
                 null, // lat placeholder
                 null  // lng placeholder
             ]);
          }
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

async function startConversion() {
  try {
    const files = fs.readdirSync(villageDataDir).filter(f => f.endsWith('.csv'));
    console.log(`Found ${files.length} CSV files to process.`);
    
    for (const file of files) {
      const filePath = path.join(villageDataDir, file);
      console.log(`Processing ${file}...`);
      await processCSV(filePath);
    }
    
    console.log(`\nFinished processing!`);
    console.log(`Total rows scanned: ${rowsProcessed}`);
    console.log(`Unique villages found: ${compressedData.length}`);
    
    console.log('Writing to JSON file...');
    
    // Write out the compressed JSON
    fs.writeFileSync(outputFile, JSON.stringify(compressedData));
    
    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\nSuccess! Data written to: ${outputFile}`);
    console.log(`File Size: ${sizeMB} MB`);
    
    process.exit(0);
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
}

startConversion();
