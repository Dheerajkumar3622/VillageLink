// locationSearchWorker.ts
// Web Worker for handling 600,000+ locations offline search

let globalVillageCache: any[] = [];
let globalLgdCache: any[] = [];
let globalStationCache: any[] = [];
let isReady = false;

// Basic scoring for search
// Fast fuzzy matching with O(N) stepping for typos (max 2 errors)
function fastFuzzyMatch(word: string, query: string): number {
    if (word === query) return 100;
    if (word.startsWith(query)) return 80;
    if (word.includes(query)) return 60;
    
    // Only attempt fuzzy if length is somewhat close and query is >= 4 chars
    if (query.length >= 4 && Math.abs(word.length - query.length) <= 2) {
        let errors = 0;
        let i = 0, j = 0;
        while (i < word.length && j < query.length) {
            if (word[i] !== query[j]) {
                errors++;
                if (errors > 2) return 0;
                
                if (i + 1 < word.length && word[i + 1] === query[j]) {
                    i++; // Deletion in query
                } else if (j + 1 < query.length && word[i] === query[j + 1]) {
                    j++; // Insertion in query
                } else {
                    i++; j++; // Substitution
                }
            } else {
                i++; j++;
            }
        }
        errors += (word.length - i) + (query.length - j);
        if (errors <= 2) return 40; // Typo match
    }
    return 0;
}

// Precision scoring using AND logic across different field priorities
function calculateScore(vName: string, vBlock: string, vDist: string, vPin: string, tokens: string[]): number {
    // Array of searchable parts with weights
    const parts = [
        { text: vName ? vName.toLowerCase() : '', weight: 10 },
        { text: vBlock ? vBlock.toLowerCase() : '', weight: 5 },
        { text: vDist ? vDist.toLowerCase() : '', weight: 3 },
        { text: vPin ? vPin.toLowerCase() : '', weight: 8 } 
    ];

    let totalScore = 0;
    let matchedTokensCount = 0;

    for (const token of tokens) {
        let bestTokenScore = 0;
        
        for (const part of parts) {
            if (!part.text) continue;
            
            // Check exact part match
            if (part.text === token) {
                bestTokenScore = Math.max(bestTokenScore, 100 * part.weight);
                continue;
            }
            
            // Tokens might match individual words within a part (e.g. "rasulpur khurd")
            const words = part.text.split(/[^a-z0-9]/).filter(Boolean);
            for (const word of words) {
                const matchScore = fastFuzzyMatch(word, token);
                if (matchScore > 0) {
                    bestTokenScore = Math.max(bestTokenScore, matchScore * part.weight);
                }
            }
            
            // Fallback: If it's a substring of the whole part
            if (bestTokenScore === 0) {
                if (part.text.startsWith(token)) bestTokenScore = Math.max(bestTokenScore, 40 * part.weight);
                else if (part.text.includes(token)) bestTokenScore = Math.max(bestTokenScore, 10 * part.weight);
            }
        }
        
        if (bestTokenScore > 0) {
            matchedTokensCount++;
            totalScore += bestTokenScore;
        }
    }

    // AND Logic Implementation:
    if (tokens.length > 0) {
        if (matchedTokensCount === tokens.length) {
            // All tokens matched! Massive boost to isolate the exactly matched combined locations
            totalScore *= 10;
        } else if (matchedTokensCount > 0) {
            // Penalize partial matches heavily so they fall behind exact matches
            totalScore = totalScore / (tokens.length - matchedTokensCount + 1);
        } else {
            totalScore = 0;
        }
    }
    
    return totalScore;
}

// Haversine distance formula (in km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity; // No data
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        if (isReady) {
            self.postMessage({ type: 'READY' });
            return;
        }
        
        try {
            // Load all 3 local JSON datasets completely offline in the worker thread
            const [villages, lgd, stations] = await Promise.all([
                fetch('/data/villages.json').then(r => r.json()).catch(() => []),
                fetch('/data/locations_lgd.json').then(r => r.json()).catch(() => []),
                fetch('/data/locations_stations.json').then(r => r.json()).catch(() => [])
            ]);
            
            globalVillageCache = villages;
            globalLgdCache = lgd;
            globalStationCache = stations;
            isReady = true;
            
            self.postMessage({ type: 'READY' });
        } catch (err) {
            self.postMessage({ type: 'ERROR', payload: 'Failed to load location data' });
        }
    }

    if (type === 'SEARCH') {
        if (!isReady) return;
        
        const { searchTerm, userLat, userLng } = payload;
        
        if (!searchTerm || searchTerm.length < 2) {
            self.postMessage({ type: 'RESULTS', payload: [] });
            return;
        }

        // Tokenize search term (e.g. "Rampur Araria" -> ["rampur", "araria"])
        const tokens = searchTerm.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
        if (tokens.length === 0) return;
        
        let matched: any[] = [];
        
        // 1. Search Stations (High Priority)
        for (let i = 0; i < globalStationCache.length; i++) {
            const v = globalStationCache[i];
            // Format: [Name, "[STATION]", Code, State, Lat, Lng]
            const vName = v[0] ? v[0].toLowerCase() : '';
            const vCode = v[2] ? v[2].toLowerCase() : '';
            
            let score = 0;
            // Exact code match brings it to top
            if (tokens.length === 1 && vCode === tokens[0]) {
                score = 1000;
            } else {
                score = calculateScore(vName, 'Station', v[3]||'', vCode, tokens);
            }
            
            if (score > 0) {
               matched.push({
                   name: `${v[0]} (${v[2]})`,
                   type: v[1], 
                   district: 'Railway Station',
                   state: v[3],
                   block: 'Station',
                   lat: v[4] || undefined,
                   lng: v[5] || undefined,
                   villageCode: `STN-${i}`,
                   isStation: true,
                   rawName: v[0],
                   score: score + 50 // Boost stations
               });
            }
        }
        
        // 2. Search LGD Priority Entities
        for (let i = 0; i < globalLgdCache.length; i++) {
          const v = globalLgdCache[i];
          // v = [Name, Type, District, State, Lat, Lng]
          const vName = v[0] ? v[0].toLowerCase() : '';
          const vType = v[1] ? v[1].toLowerCase() : '';
          const vDist = v[2] ? v[2].toLowerCase() : '';
          
          let score = calculateScore(vName, vType, vDist, '', tokens);
          
          if (score > 0) {
            matched.push({
               name: v[0],
               type: v[1],
               district: v[2],
               state: v[3],
               block: v[2] || 'Bihar', 
               lat: v[4] || undefined,
               lng: v[5] || undefined,
               villageCode: `LGD-${i}`,
               isLgd: true,
               rawName: v[0],
               score: score + 30 // Boost LGD
            });
          }
        }
        
        // 3. Search Villages
        for (let i = 0; i < globalVillageCache.length; i++) {
          const v = globalVillageCache[i];
          // v = [Name, Pincode, District, State, Block, Lat, Lng]
          const vName = v[0] ? v[0].toLowerCase() : '';
          const vPin = v[1] ? String(v[1]).toLowerCase() : '';
          const vDist = v[2] ? v[2].toLowerCase() : '';
          const vBlock = v[4] ? v[4].toLowerCase() : '';
          
          let score = calculateScore(vName, vBlock, vDist, vPin, tokens);
          
          if (score > 0) {
            matched.push({
               name: v[0],
               district: v[2],
               pincode: v[1],
               state: v[3],
               block: v[4] || v[2] || 'District',
               lat: v[5] || undefined,
               lng: v[6] || undefined,
               villageCode: `VILL-${i}`,
               rawName: v[0],
               score: score
            });
          }
        }

        // Apply Geo-Proximity Sorting invisibly using Gravity Score
        if (userLat && userLng) {
            matched = matched.map(m => {
                const dist = getDistance(userLat, userLng, m.lat || 0, m.lng || 0);
                if (dist < 50) { // Within 50km
                    m.score += (500 - dist); // Inverse distance gravity score
                }
                return m;
            });
        }
        
        // Sort by score
        matched.sort((a, b) => b.score - a.score);
        
        // Return top 30
        self.postMessage({ type: 'RESULTS', payload: matched.slice(0, 30) });
    }

    if (type === 'NEAREST') {
        if (!isReady) return;
        const { userLat, userLng } = payload;
        if (!userLat || !userLng) return;

        let nearest = null;
        let minDistance = Infinity;

        for (let i = 0; i < globalVillageCache.length; i++) {
            const v = globalVillageCache[i];
            const vLat = v[5] || v[4];
            const vLng = v[6] || v[5];
            if (vLat && vLng) {
                const dist = getDistance(userLat, userLng, vLat, vLng);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = {
                        name: v[0],
                        district: v[2],
                        pincode: v[1],
                        state: v[3],
                        block: v[4] || v[2] || 'District',
                        lat: vLat,
                        lng: vLng,
                        villageCode: `VILL-${i}`,
                        rawName: v[0],
                        address: `${v[0]}, ${v[2]}`
                    };
                }
            }
        }
        self.postMessage({ type: 'NEAREST_RESULT', payload: nearest });
    }

    if (type === 'ROUTE_LANDMARKS') {
        if (!isReady) {
            self.postMessage({ type: 'ROUTE_LANDMARKS_RESULT', payload: [] });
            return;
        }
        const pathDetails = payload || [];
        if (pathDetails.length === 0) {
            self.postMessage({ type: 'ROUTE_LANDMARKS_RESULT', payload: [] });
            return;
        }

        const checkPoints = [];
        if (pathDetails.length > 0) {
            checkPoints.push(pathDetails[0]);
            let acc = 0;
            for (let i = 1; i < pathDetails.length; i++) {
                const prev = pathDetails[i - 1];
                const curr = pathDetails[i];
                const d = getDistance(prev.lat, prev.lng, curr.lat, curr.lng);
                acc += d;
                if (acc >= 0.5) { // Check every 0.5 km (500 meters) to capture all nodes/junctions
                    checkPoints.push(curr);
                    acc = 0;
                }
            }
            if (checkPoints[checkPoints.length - 1] !== pathDetails[pathDetails.length - 1]) {
                checkPoints.push(pathDetails[pathDetails.length - 1]);
            }
        }

        const intermediates: string[] = [];
        let lastAdded: string | null = null;
        for (const pt of checkPoints) {
            let nearestName = null;
            let minDistance = 99999.0;

            for (let i = 0; i < globalVillageCache.length; i++) {
                const v = globalVillageCache[i];
                const vLat = v[5];
                const vLng = v[6];
                if (vLat && vLng) {
                    const dist = getDistance(pt.lat, pt.lng, vLat, vLng);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestName = v[0];
                    }
                }
            }
            if (nearestName && nearestName !== lastAdded) {
                intermediates.push(nearestName);
                lastAdded = nearestName;
            }
        }

        self.postMessage({ type: 'ROUTE_LANDMARKS_RESULT', payload: intermediates });
    }
};

export {};
