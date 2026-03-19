const axios = require('axios');
const fs = require('fs');

async function extractFromOverpass() {
  // Yeh ek Overpass QL Query hai. 
  // Isme hum bol rahe hain: "Uttar Pradesh me jitne bhi nodes pe 'place=village' ka tag hai, sabhi ko unke lat/long ke sath le aao."
  // Agar kisi aur state ka chahiye, toh "Uttar Pradesh" ki jagah "Bihar" ya district map kar sakte ho.
  const overpassQuery = `
    [out:json][timeout:300];
    area["name"="Uttar Pradesh"]["admin_level"="4"]->.searchArea;
    (
      node["place"="village"](area.searchArea);
    );
    out body;
  `;

  console.log('Fetching all villages from OSM Overpass API... (Isme thoda time lag sakta hai)');
  
  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`);
    
    const elements = response.data.elements;
    
    // MongoDB ke structure me map kar rahe hain
    const mongoFormatData = elements.map(el => ({
      name: el.tags['name:en'] || el.tags.name || "Unknown",
      local_name: el.tags.name,
      state: "Uttar Pradesh",
      type: "Village",
      location: {
        type: "Point",
        coordinates: [el.lon, el.lat] // [Longitude, Latitude] MUST be this order for MongoDB
      },
      osm_id: el.id
    }));

    const outputPath = './overpass_up_villages.json';
    fs.writeFileSync(outputPath, JSON.stringify(mongoFormatData, null, 2));
    
    console.log(`✅ Success! Total ${mongoFormatData.length} villages extracted!`);
    console.log(`Saved to ${outputPath}`);

  } catch (error) {
    console.error('Error fetching from Overpass API:', error.message);
  }
}

extractFromOverpass();
