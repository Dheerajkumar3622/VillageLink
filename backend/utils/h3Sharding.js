/**
 * Geohash Sharding Engine (H3 Hexagonal Model Emulator)
 * Partitions geographic coordinates into hexagonal grid cell indexes.
 * Groups records spatially to optimize driver dispatching and nearby search queries.
 */

/**
 * Maps lat/lng to a simulated H3 Hexagonal index string
 * Uses a grid projection scale based on resolution.
 */
export const latLngToH3 = (lat, lng, resolution = 9) => {
    // Project coordinates onto resolution scale
    const scale = resolution * 10;
    const x = Math.floor(lat * scale);
    const y = Math.floor(lng * scale);

    // Format like a standard 64-bit hexadecimal H3 index string
    return `8${resolution}2685623${Math.abs(x).toString(16)}f${Math.abs(y).toString(16)}`;
};

/**
 * Resolves the target hexagon and its 6 adjacent neighbors (k-ring of radius 1)
 */
export const getKRing = (h3Index) => {
    // Parse structural markers from simulated H3 index
    const resolution = parseInt(h3Index.substring(1, 2), 10);
    const scale = resolution * 10;
    
    // Extract x and y coordinates
    const hexPart = h3Index.substring(9);
    const parts = hexPart.split('f');
    const x = parseInt(parts[0], 16);
    const y = parseInt(parts[1], 16);

    // Hexagonal grid offsets (6 directions)
    const offsets = [
        [0, 0],   // Center
        [1, 0],   // East
        [-1, 0],  // West
        [0, 1],   // North
        [0, -1],  // South
        [1, 1],   // North-East
        [-1, -1]  // South-West
    ];

    return offsets.map(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return `8${resolution}2685623${nx.toString(16)}f${ny.toString(16)}`;
    });
};

/**
 * Filters list of items (e.g. drivers) within spatial shard cells
 */
export const searchSpatialShard = (items, centerLat, centerLng, resolution = 9) => {
    const centerIndex = latLngToH3(centerLat, centerLng, resolution);
    const searchRing = new Set(getKRing(centerIndex));

    return items.filter(item => {
        const itemIndex = latLngToH3(item.lat, item.lng, resolution);
        return searchRing.has(itemIndex);
    });
};
