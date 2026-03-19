import cron from 'node-cron';
import axios from 'axios';
import { Location } from '../models.js';

// Configuration for Overpass API
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Polling interval: Every week on Sunday at 3 AM
const CRON_SCHEDULE = '0 3 * * 0'; 

// Target areas for VillageLink (can be expanded to an array)
const POLL_TARGET = 'Bihar';

async function pollOSMData() {
    console.log(`[OSM Poller] Starting automated OpenStreetMap data ingestion for ${POLL_TARGET}...`);
    
    // Query fetches Villages, Hospitals, and Marketplace (Mandi) POIs in the target area
    const overpassQuery = `
      [out:json][timeout:300];
      area["name"="${POLL_TARGET}"]["admin_level"="4"]->.searchArea;
      (
        node["place"="village"](area.searchArea);
        node["amenity"="hospital"](area.searchArea);
        node["amenity"="marketplace"](area.searchArea);
      );
      out body;
    `;

    try {
        const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(overpassQuery)}`);
        const elements = response.data.elements || [];
        
        console.log(`[OSM Poller] Downloaded ${elements.length} granular POIs. Upserting to Database...`);

        // Use batch bulk operations for extreme DB scaling efficiency
        const operations = elements.map(el => {
            const name = el.tags['name:en'] || el.tags.name || "Unknown_POI";
            const poiType = el.tags.place ? "VILLAGE" : (el.tags.amenity === 'hospital' ? "HOSPITAL" : "MANDI");

            return {
                updateOne: {
                    filter: { code: el.id.toString() }, // Using OSM ID as unique code
                    update: {
                        $set: {
                            name: name,
                            code: el.id.toString(),
                            geometry: {
                                type: "Point",
                                coordinates: [el.lon, el.lat]
                            },
                            properties: {
                                TYPE: poiType,
                                STATE: POLL_TARGET,
                                SOURCE: "OSM_POLL"
                            }
                        }
                    },
                    upsert: true
                }
            };
        });

        if (operations.length > 0) {
            await Location.bulkWrite(operations, { ordered: false });
        }

        console.log(`[OSM Poller] Successfully upserted ${operations.length} Geospatial POIs into MongoDB Location Table.`);
    } catch (error) {
        console.error(`[OSM Poller] Error fetching or upserting data:`, error.message);
    }
}

export function startOSMPoller() {
    console.log(`[OSM Poller] Registered Cron Job. Schedule: ${CRON_SCHEDULE}`);
    cron.schedule(CRON_SCHEDULE, pollOSMData);
    
    if (process.env.RUN_OSM_POLL_ON_BOOT === 'true') {
        setTimeout(pollOSMData, 10000);
    }
}
