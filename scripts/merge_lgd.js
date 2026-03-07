/**
 * Geocode extracted DB places + merge into locations_lgd.json
 * Uses OpenStreetMap Nominatim (free, no API key needed)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LGD_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'locations_lgd.json');
const GEO_PATH = path.join(__dirname, '..', 'extracted_geo_render.json');

// Nominatim rate limit: 1 request per second
async function geocode(placeName, district, state) {
    const query = `${placeName}, ${district || ''}, ${state || 'Bihar'}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'VillageLink-GeoExtractor/1.0' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error(`  ⚠️ Geocode failed for "${placeName}":`, e.message);
    }
    return null;
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('    VillageLink Geo Merge Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Read extracted DB data
    let geoPlaces = [];
    if (fs.existsSync(GEO_PATH)) {
        const raw = JSON.parse(fs.readFileSync(GEO_PATH, 'utf-8'));
        geoPlaces = raw.data || [];
        console.log(`\n📦 Loaded ${geoPlaces.length} places from DB extraction`);
        console.log(`   Stats: ${JSON.stringify(raw.stats)}`);
    } else {
        console.log('\n⚠️  No extracted_geo_render.json found. Using empty set.');
    }

    // 2. Read LGD data
    const lgdRaw = JSON.parse(fs.readFileSync(LGD_PATH, 'utf-8'));
    console.log(`\n📖 Loaded ${lgdRaw.length} entries from locations_lgd.json`);

    // Count entries that already have coords
    const alreadyHaveCoords = lgdRaw.filter(e => e[4] && e[5] && e[4] !== 0 && e[5] !== 0).length;
    console.log(`   Already have coordinates: ${alreadyHaveCoords}`);
    
    // 3. Build geo lookup map from DB extraction
    const geoMap = new Map();
    for (const place of geoPlaces) {
        // Format: [Name, Type, District, State, Lat, Lng, Sources]
        const key = String(place[0]).toLowerCase().trim();
        geoMap.set(key, {
            lat: place[4],
            lng: place[5],
            district: place[2],
            state: place[3],
            type: place[1]
        });
    }

    // 4. Geocode DB places that have no coordinates
    console.log('\n🌍 Geocoding extracted places without coordinates...');
    let geocodedCount = 0;
    for (const place of geoPlaces) {
        if (!place[4] || !place[5]) {
            const coords = await geocode(place[0], place[2], place[3]);
            if (coords) {
                const key = String(place[0]).toLowerCase().trim();
                geoMap.set(key, {
                    ...geoMap.get(key),
                    lat: coords.lat,
                    lng: coords.lng
                });
                console.log(`  ✅ ${place[0]} → ${coords.lat}, ${coords.lng}`);
                geocodedCount++;
            } else {
                console.log(`  ❌ ${place[0]} → not found`);
            }
            // Nominatim rate limit
            await new Promise(r => setTimeout(r, 1100));
        }
    }
    console.log(`   Geocoded ${geocodedCount}/${geoPlaces.filter(p => !p[4]).length} places`);

    // 5. Merge into LGD
    console.log('\n🔀 Merging into locations_lgd.json...');
    let mergedCount = 0;
    let newEntries = 0;

    for (const entry of lgdRaw) {
        // LGD format: [Name, Type, District, State, Lat, Lng]
        if (entry[4] && entry[5] && entry[4] !== 0 && entry[5] !== 0) continue; // already has coords
        
        const key = String(entry[0]).toLowerCase().trim();
        if (geoMap.has(key)) {
            const geo = geoMap.get(key);
            if (geo.lat && geo.lng) {
                entry[4] = Math.round(geo.lat * 1000000) / 1000000;
                entry[5] = Math.round(geo.lng * 1000000) / 1000000;
                mergedCount++;
            }
        }
    }

    // Add new places from DB that weren't in LGD
    const lgdNames = new Set(lgdRaw.map(e => String(e[0]).toLowerCase().trim()));
    for (const [key, geo] of geoMap) {
        if (!lgdNames.has(key) && geo.lat && geo.lng) {
            lgdRaw.push([
                geoPlaces.find(p => String(p[0]).toLowerCase().trim() === key)?.[0] || key,
                geo.type || 'Village',
                geo.district || '',
                geo.state || 'Bihar',
                Math.round(geo.lat * 1000000) / 1000000,
                Math.round(geo.lng * 1000000) / 1000000
            ]);
            newEntries++;
        }
    }

    // 6. Save
    fs.writeFileSync(LGD_PATH, JSON.stringify(lgdRaw));
    
    console.log(`\n━━━━━━━━━━ RESULTS ━━━━━━━━━━`);
    console.log(`  Updated existing entries: ${mergedCount}`);
    console.log(`  New entries added: ${newEntries}`);
    console.log(`  Total entries now: ${lgdRaw.length}`);
    console.log(`  Entries with coords: ${lgdRaw.filter(e => e[4] && e[5]).length}`);
    console.log(`  Saved to: ${LGD_PATH}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
