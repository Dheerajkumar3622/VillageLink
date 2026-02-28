import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lgdDataDir = path.join(__dirname, 'lgdDATA');
const outputDir = path.join(__dirname, 'public', 'data');
const outputFile = path.join(outputDir, 'locations_lgd.json');

// Ensure directories exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(lgdDataDir)) {
    console.error(`Folder ${lgdDataDir} not found`);
    process.exit(1);
}

const compressedData = [];
// Keep track of added entities so we don't have exact duplicates
const seenEntities = new Set();
let totalRowsProcessed = 0;

/**
 * Super fast manual XML regex scanner.
 * Since Excel XMLs have <Row><Cell><Data>...</Data></Cell></Row>
 * We can extract the text data from each row.
 */
async function processXMLFile(filePath, type, mappingLogic) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let currentRowData = [];
        let inRow = false;
        
        // Regex to match <Data ss:Type="String">Value</Data> or Number
        const dataRegex = /<Data[^>]*>(.*?)<\/Data>/g;

        rl.on('line', (line) => {
            if (line.includes('<Row')) {
                inRow = true;
                currentRowData = [];
            }
            
            if (inRow) {
                let match;
                while ((match = dataRegex.exec(line)) !== null) {
                    // match[1] contains the inner text
                    currentRowData.push(match[1].trim());
                }
            }

            if (line.includes('</Row>')) {
                inRow = false;
                if (currentRowData.length > 0) {
                   // Apply specific mapping logic for this file type
                   const result = mappingLogic(currentRowData);
                   if (result) {
                       const key = `${result.name}-${result.type}-${result.district}`;
                       if (!seenEntities.has(key)) {
                           seenEntities.add(key);
                           // Format: [Name, Pincode/Type, District, State/TypeColorBadge]
                           // We will use pincode slot for Type like "Block", "District"
                           compressedData.push([
                               result.name,
                               `[${result.type}]`,
                               result.district,
                               result.state || 'Bihar' // Defaulting state to Bihar for this dataset
                           ]);
                           totalRowsProcessed++;
                       }
                   }
                }
            }
        });

        rl.on('close', () => resolve());
        rl.on('error', reject);
    });
}

// ======================= MAPPINGS ===========================
// The files have different column structures. We need to skip header rows.

const blockMapping = (cols) => {
    // blockofspecificState
    // S.No[0], DistCode[1], DistName[2], BlockCode[3], Version[4], BlockName(En)[5], BlockName(Lo)[6]
    // Filter out headers
    if (cols.length >= 6 && cols[5] !== 'Development Block Name' && cols[5] !== '(In English)') {
        if (!isNaN(parseFloat(cols[0]))) { // Ensure it's a data row
            return {
                name: cols[5],
                type: 'Block',
                district: cols[2]
            };
        }
    }
    return null;
};

const districtMapping = (cols) => {
    // districtofSpecificState
    // S.No[0], DistCode[1], DistVersion[2], DistName(En)[3], DistName(Lo)[4]
    // Filter headers
    if (cols.length >= 4 && cols[3] !== 'District Name' && cols[3] !== '(In English)') {
        if (!isNaN(parseFloat(cols[0]))) { 
            return {
                name: cols[3],
                type: 'District',
                district: cols[3] // District itself
            };
        }
    }
    return null;
};

const subDistrictMapping = (cols) => {
    // subDistrictofSpecificState
    // S.No[0], DistCode[1], DistName[2], SubDistCode[3], Version[4], SubDistName(En)[5], (Lo)[6]
    if (cols.length >= 6 && cols[5] !== 'Sub-District Name' && cols[5] !== '(In English)') {
        if (!isNaN(parseFloat(cols[0]))) {
            return {
                name: cols[5],
                type: 'Sub-District',
                district: cols[2]
            };
        }
    }
    return null;
};

const urbanMapping = (cols) => {
    // ulbSpecificState (Urban Local Bodies - Municipalities/Towns)
    // S.No[0], DistName[1], UlbType[2], UlbCode[3], UlbName(En)[4], UlbName(Lo)[5]
    if (cols.length >= 5 && cols[4] !== 'Local Body Name' && cols[4] !== '(In English)') {
        if (!isNaN(parseFloat(cols[0]))) {
            return {
                name: cols[4],
                type: cols[2] || 'Municipality',
                district: cols[1]
            };
        }
    }
    return null;
};

const panchayatMapping = (cols) => {
    // priLbSpecificState (Panchayats)
    // S.No[0], TypeCode[1], TypeName[2], Code[3], Version[4], Name(En)[5], Name(Lo)[6], ParentCode[7]
    if (cols.length >= 6 && cols[5] !== 'Localbody Name' && cols[5] !== '(In English)' && cols[5] !== 'Local Body Name') {
        if (!isNaN(parseFloat(cols[0]))) {
            return {
                name: cols[5],
                type: cols[2] || 'Panchayat', // e.g., Gram Panchayat, Zilla Parishad
                district: 'Bihar' // No direct district text, using State as fallback
            };
        }
    }
    return null;
};

// ==========================================================

async function startConversion() {
  try {
    const files = fs.readdirSync(lgdDataDir).filter(f => f.endsWith('.xls') || f.endsWith('.xml') || f.endsWith('.csv'));
    console.log(`Found ${files.length} LGD files to process.`);
    
    for (const file of files) {
      const filePath = path.join(lgdDataDir, file);
      console.log(`Processing LGD File: ${file}...`);
      
      const lower = file.toLowerCase();
      if (lower.includes('blockofspecific')) {
          await processXMLFile(filePath, 'Block', blockMapping);
      } else if (lower.includes('districtofspecific')) {
          await processXMLFile(filePath, 'District', districtMapping);
      } else if (lower.includes('subdistrictofspecific')) {
          await processXMLFile(filePath, 'Sub-District', subDistrictMapping);
      } else if (lower.includes('ulbspecific')) {
          await processXMLFile(filePath, 'Urban Local Body', urbanMapping);
      } else if (lower.includes('prilbspecific')) {
          await processXMLFile(filePath, 'Panchayat', panchayatMapping);
      } else {
          console.log(`Skipping ${file} - no explicit mapper yet to avoid junk data.`);
      }
    }
    
    console.log(`\nFinished processing LGD data!`);
    console.log(`Unique LGD location entities found: ${compressedData.length}`);
    
    console.log('Writing to JSON file...');
    
    // Write out the compressed JSON
    fs.writeFileSync(outputFile, JSON.stringify(compressedData));
    
    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\nSuccess! LGD Data written to: ${outputFile}`);
    console.log(`LGD File Size: ${sizeMB} MB`);
    
    process.exit(0);
  } catch (error) {
    console.error('LGD Conversion failed:', error);
    process.exit(1);
  }
}

startConversion();
