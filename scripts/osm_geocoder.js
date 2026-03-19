const axios = require('axios');
const fs = require('fs');

// LGD Data se mili village list sample.
// Yahan tum apna LGD ka bada JSON file read kar sakte ho using fs.readFileSync()
const lgdData = [
  { village: "Rampur", district: "Kanpur Nagar", state: "Uttar Pradesh" },
  { village: "Kalyanpur", district: "Kanpur Nagar", state: "Uttar Pradesh" },
  { village: "Sarai", district: "Patna", state: "Bihar" }
];

// Nominatim API max 1 request per second allow karta hai (Free use ke liye)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCoordinates() {
  const resultData = [];
  
  console.log('Starting OSM Geocoding for', lgdData.length, 'locations...');

  for (const item of lgdData) {
    // Hum query banayenge "Village, District, State, India" taki accurate result mile
    const query = `${item.village}, ${item.district}, ${item.state}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
      // User-Agent dena compulsory hai OSM Nominatim ke rules ke hisaab se
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'VillageLinkApp/1.0 (Contact: admin@villagelink.in)' 
        }
      });

      if (response.data && response.data.length > 0) {
        const place = response.data[0];
        
        // Data format exactly MongoDB 2dsphere index ke liye banaya gaya hai
        resultData.push({
          name: item.village,
          district: item.district,
          state: item.state,
          type: "Village",
          location: {
            type: "Point",
            coordinates: [parseFloat(place.lon), parseFloat(place.lat)] // Format: [Longitude, Latitude]
          },
          osm_data: {
            osm_id: place.osm_id,
            display_name: place.display_name
          }
        });
        console.log(`✅ Mil Gaya: ${item.village} -> [Lng: ${place.lon}, Lat: ${place.lat}]`);
      } else {
        console.log(`❌ Nahi Mila: ${item.village}`);
        // Agar nahi mila toh location null rakho, taaki baad me manually fix kar sako
        resultData.push({
          name: item.village,
          district: item.district,
          state: item.state,
          type: "Village",
          location: null
        });
      }
    } catch (error) {
      console.error(`⚠️ Error aaya ${item.village} par:`, error.message);
    }

    // MANDATORY SLEEP: OSM free API block na kare isliye 1.5 seconds wait
    await sleep(1500); 
  }

  // MongoDB me directly import (mongoimport) karne ke liye JSON save kar rahe hain
  const outputPath = './mongodb_villages_data.json';
  fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
  console.log(`\n🎉 Data extract ho gaya! File yahan save hui: ${outputPath}`);
}

fetchCoordinates();
