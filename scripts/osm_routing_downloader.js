const axios = require('axios');
const fs = require('fs');

// Bounding box for the area you want to download routing data for
// Format: south,west,north,east (min_lat, min_lon, max_lat, max_lon)
// Example Bounding Box for a village/area (Change this to your actual area)
const BBOX = "25.3000,82.9000,25.3500,82.9500"; // Varanasi example bbox

// Overpass API Query to get all navigable roads (highways) and their nodes
const query = `
  [out:json][timeout:25];
  (
    way["highway"]["highway"!="motorway"]["highway"!="trunk"](${BBOX});
  );
  out body;
  >;
  out skel qt;
`;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Haversine formula to calculate the distance between two lat/lon points in meters
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

async function downloadAndBuildGraph() {
  console.log('Downloading OSM Data for BBOX:', BBOX);
  
  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const elements = response.data.elements;
    console.log(`Downloaded ${elements.length} elements from OpenStreetMap.`);

    const nodes = {}; // To store node coordinates: { node_id: { lat, lon } }
    const graph = {}; // The Adjacency List for routing: { node_id: { neighbor_id: distance_in_meters } }

    // 1. First Pass: Save all Node coordinates
    for (const el of elements) {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lon: el.lon };
        // Initialize graph entry for this node
        graph[el.id] = {};
      }
    }

    // 2. Second Pass: Process Ways (Roads) to build edges in the graph
    let waysCount = 0;
    for (const el of elements) {
      if (el.type === 'way' && el.nodes) {
        waysCount++;
        const wayNodes = el.nodes;
        const isOneWay = el.tags && el.tags.oneway === 'yes';

        // Iterate through the nodes in the way to connect them
        for (let i = 0; i < wayNodes.length - 1; i++) {
          const nodeA = wayNodes[i];
          const nodeB = wayNodes[i + 1];

          if (nodes[nodeA] && nodes[nodeB]) {
            const dist = calculateDistance(
              nodes[nodeA].lat, nodes[nodeA].lon,
              nodes[nodeB].lat, nodes[nodeB].lon
            );

            // Add edge from NodeA to NodeB
            graph[nodeA][nodeB] = parseFloat(dist.toFixed(2));

            // If it's not a one-way street, add edge from NodeB to NodeA
            if (!isOneWay) {
              graph[nodeB][nodeA] = parseFloat(dist.toFixed(2));
            }
          }
        }
      }
    }

    console.log(`Processed ${waysCount} paths/roads.`);

    // 3. Save the Graph and Nodes to a JSON file
    const routingData = {
      nodes: nodes,
      graph: graph
    };

    const outputPath = './offline_routing_graph.json';
    fs.writeFileSync(outputPath, JSON.stringify(routingData));
    
    console.log(`✅ Routing Graph successfully saved to ${outputPath}`);
    console.log('Ab is JSON file ko app/frontend mein load karke A* ya Dijkstra algorith se route nikal sakte ho bina API dependency ke!');

  } catch (error) {
    console.error('Error fetching data from Overpass API:', error.message);
  }
}

downloadAndBuildGraph();
