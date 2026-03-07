import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input JSON from user's downloads folder. The file path is hardcoded as requested.
const inputFile = 'c:\\Users\\User\\Downloads\\indian-railway-stations-2026-02-23.json';
const outputDir = path.join(__dirname, 'public', 'data');
const outputFile = path.join(outputDir, 'locations_stations.json');

// Ensure directories exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function startConversion() {
  try {
    if (!fs.existsSync(inputFile)) {
      console.warn(`Input file not found at: ${inputFile}. Please ensure the file exists. Skipping conversion.`);
      return;
    }
    
    console.log('Reading raw stations JSON...');
    const rawData = fs.readFileSync(inputFile, 'utf8');
    const stations = JSON.parse(rawData);
    
    console.log(`Found ${stations.length} raw stations. Formatting...`);
    
    // The user requested to prepare the format for future Lat/Lng.
    // Our Master Array schema: [Name, Type/Pincode, Primary Identifier/District, Region/State, Latitude, Longitude]
    
    const formattedData = stations.map(station => {
      const code = station[0] || '';
      const name = station[1] || '';
      
      // Formatting into the Master Tuple:
      return [
          name,             // [0] Name
          '[STATION]',      // [1] Type
          code,             // [2] Primary Identifier (Station Code)
          'India',          // [3] State/Region
          null,             // [4] Latitude Placeholder
          null              // [5] Longitude Placeholder
      ];
    });

    console.log('Writing to optimized JSON file...');
    fs.writeFileSync(outputFile, JSON.stringify(formattedData));
    
    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\nSuccess! Stations Data written to: ${outputFile}`);
    console.log(`Stations File Size: ${sizeMB} MB`);
    
  } catch (error) {
    console.error('Stations Conversion failed:', error);
    process.exit(1);
  }
}

startConversion();
