import fs from 'fs';
import archiver from 'archiver';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appVersion = process.argv[2] || '3.0.0'; // Default VillageLink version
const buildDir = path.join(__dirname, '../dist');
const otaReleaseDir = path.join(__dirname, '../ota_release');
const zipFilePath = path.join(otaReleaseDir, `app-bundle-${appVersion}.zip`);

// Ensure ota_release directory exists
if (!fs.existsSync(otaReleaseDir)) {
  fs.mkdirSync(otaReleaseDir, { recursive: true });
}

// Ensure dist directory exists
if (!fs.existsSync(buildDir)) {
    console.error(`Error: Base directory ${buildDir} does not exist. Run 'npm run build' first.`);
    process.exit(1);
}

// 1. Pack dist/ folder to app-bundle-X.X.X.zip
const output = fs.createWriteStream(zipFilePath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  const finalSize = archive.pointer();
  console.log(`[OTA Build] Bundle created: ${zipFilePath} (${finalSize} bytes)`);

  // 2. Generate SHA-256 of the created zip
  const hash = crypto.createHash('sha256');
  const fileBuffer = fs.readFileSync(zipFilePath);
  hash.update(fileBuffer);
  const sha256hex = hash.digest('hex');
  console.log(`[OTA Build] SHA-256 Hash: ${sha256hex}`);

  // 3. Write \`version.json\` with the SHA-256 and final Size.
  const versionInfo = {
      version: appVersion,
      sha256: sha256hex,
      size: finalSize,
      buildDate: new Date().toISOString()
  };

  fs.writeFileSync(
      path.join(otaReleaseDir, 'version.json'),
      JSON.stringify(versionInfo, null, 2)
  );
  
  console.log(`[OTA Build] version.json written successfully!`);
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Append files from the 'dist' directory, resolving identically in zip output
archive.directory(buildDir, false);

// Finalize
archive.finalize();
