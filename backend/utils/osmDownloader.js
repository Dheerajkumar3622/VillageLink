import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the directory exists
const ROUTING_DATA_DIR = path.join(__dirname, '..', 'public', 'routing_data');
if (!fs.existsSync(ROUTING_DATA_DIR)) {
  fs.mkdirSync(ROUTING_DATA_DIR, { recursive: true });
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Helper to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

/**
 * Downloads and builds a routing graph for a specific bounding box.
 * @param {string} areaId - A unique identifier for the area (e.g., 'varanasi', 'block_xyz')
 * @param {string} bbox - The bounding box 'south,west,north,east'
 * @returns {Promise<string>} The path to the saved JSON file
 */
export const downloadAndBuildGraph = async (areaId, bbox) => {
  const outputPath = path.join(ROUTING_DATA_DIR, `${areaId}_routing_graph.json`);
  
  // If we already have the data, don't download it again
  if (fs.existsSync(outputPath)) {
    console.log(`[OSM] Routing data for ${areaId} already exists. Returning cache.`);
    return outputPath;
  }

  console.log(`[OSM] Downloading OSM Data for Area: ${areaId}, BBOX: ${bbox}`);
  
  // Overpass API Query
  const query = `
    [out:json][timeout:25];
    (
      // 1. Fetch all navigable roads
      way["highway"]["highway"!="motorway"]["highway"!="trunk"](${bbox});
      // 2. Fetch Village and Hamlet POIs for intermediate stops
      node["place"~"village|hamlet|town"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000 // 30 seconds timeout
    });

    const elements = response.data.elements;
    
    if (!elements || elements.length === 0) {
        throw new Error("No data found for this bounding box.");
    }

    console.log(`[OSM] Downloaded ${elements.length} elements from OpenStreetMap for ${areaId}.`);

    const nodes = {}; 
    const graph = {}; 
    const villages = []; // Specifically for Intermediate Stops

    // 1. First Pass: Save all Node coordinates and identify Villages
    for (const el of elements) {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lon: el.lon };
        graph[el.id] = {};
        
        // If this node is a village/hamlet, save it to our POI list
        if (el.tags && (el.tags.place === 'village' || el.tags.place === 'hamlet' || el.tags.place === 'town')) {
          villages.push({
            id: el.id,
            name: el.tags.name || el.tags['name:en'] || 'Unknown Village',
            lat: el.lat,
            lon: el.lon,
            type: el.tags.place
          });
        }
      }
    }

    // 2. Second Pass: Process Ways (Roads) to build edges in the graph
    let waysCount = 0;
    for (const el of elements) {
      if (el.type === 'way' && el.nodes) {
        waysCount++;
        const wayNodes = el.nodes;
        const isOneWay = el.tags && el.tags.oneway === 'yes';

        for (let i = 0; i < wayNodes.length - 1; i++) {
          const nodeA = wayNodes[i];
          const nodeB = wayNodes[i + 1];

          if (nodes[nodeA] && nodes[nodeB]) {
            const dist = calculateDistance(
              nodes[nodeA].lat, nodes[nodeA].lon,
              nodes[nodeB].lat, nodes[nodeB].lon
            );

            graph[nodeA][nodeB] = parseFloat(dist.toFixed(2));

            if (!isOneWay) {
              graph[nodeB][nodeA] = parseFloat(dist.toFixed(2));
            }
          }
        }
      }
    }

    console.log(`[OSM] Processed ${waysCount} paths/roads for ${areaId}.`);

    const routingData = {
      nodes: nodes,
      graph: graph,
      villages: villages // New: Include villages for intermediate stops
    };

    fs.writeFileSync(outputPath, JSON.stringify(routingData));
    console.log(`✅ [OSM] Routing Graph successfully saved to ${outputPath}`);
    
    return outputPath;

  } catch (error) {
    console.error(`[OSM] Error fetching data for ${areaId}:`, error.message);
    throw error;
  }
};
