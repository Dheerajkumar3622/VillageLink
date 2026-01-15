
import { ROHTAS_NETWORK, STOP_COORDINATES } from './constants';

// ========================================
// HAVERSINE DISTANCE CALCULATION
// ========================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
const calculateHaversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ========================================
// MIN HEAP PRIORITY QUEUE FOR A*
// ========================================

interface AStarNode {
  key: string;        // Node identifier (lowercase key)
  gScore: number;     // Actual distance from start
  fScore: number;     // g + h (estimated total cost)
  path: string[];     // Path taken to reach this node
}

class MinHeap {
  private heap: AStarNode[] = [];

  push(node: AStarNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].fScore <= this.heap[index].fScore) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].fScore < this.heap[smallest].fScore) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].fScore < this.heap[smallest].fScore) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

// ========================================
// A* SEARCH ALGORITHM
// ========================================

/**
 * Resolve input (name or key) to network key
 */
const resolveKey = (input: string): string => {
  const normalized = input.toLowerCase();
  if (ROHTAS_NETWORK[normalized]) return normalized;
  const found = Object.keys(ROHTAS_NETWORK).find(k =>
    ROHTAS_NETWORK[k].name.toLowerCase() === normalized
  );
  return found || normalized;
};

/**
 * Get coordinates for a node by its key or name
 */
const getCoordinates = (keyOrName: string): { lat: number; lng: number } | null => {
  // Try by name first (STOP_COORDINATES uses display names)
  const name = ROHTAS_NETWORK[keyOrName]?.name || keyOrName;
  if (STOP_COORDINATES[name]) return STOP_COORDINATES[name];

  // Try direct key lookup
  if (STOP_COORDINATES[keyOrName]) return STOP_COORDINATES[keyOrName];

  return null;
};

/**
 * A* Search Algorithm - finds distance-optimal path using Haversine heuristic
 * 
 * @param startKey - Starting node key or name
 * @param endKey - Destination node key or name
 * @returns Object with path (display names) and total distance in km, or null if no path found
 */
export const findShortestPathAStar = (
  startKey: string,
  endKey: string
): { path: string[]; distance: number } | null => {
  const sKey = resolveKey(startKey);
  const eKey = resolveKey(endKey);

  // Same node - return immediately
  if (sKey === eKey) {
    return {
      path: [ROHTAS_NETWORK[sKey]?.name || sKey],
      distance: 0
    };
  }

  // Validate nodes exist
  if (!ROHTAS_NETWORK[sKey] || !ROHTAS_NETWORK[eKey]) {
    console.warn(`A*: Node not found - start: ${sKey}, end: ${eKey}`);
    return null;
  }

  // Get destination coordinates for heuristic
  const endCoords = getCoordinates(eKey);
  if (!endCoords) {
    console.warn(`A*: No coordinates for destination ${eKey}, falling back to BFS`);
    const bfsResult = findShortestPath(startKey, endKey);
    return bfsResult ? { path: bfsResult, distance: calculatePathDistance(bfsResult) } : null;
  }

  // Initialize A*
  const openSet = new MinHeap();
  const gScores = new Map<string, number>(); // Best known distance to each node
  const visited = new Set<string>();

  // Start node
  const startCoords = getCoordinates(sKey);
  const initialH = startCoords ? calculateHaversine(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng) : 0;

  openSet.push({
    key: sKey,
    gScore: 0,
    fScore: initialH,
    path: [sKey]
  });
  gScores.set(sKey, 0);

  while (!openSet.isEmpty()) {
    const current = openSet.pop()!;

    // Skip if already visited with better score
    if (visited.has(current.key)) continue;
    visited.add(current.key);

    // Goal reached!
    if (current.key === eKey) {
      const pathNames = current.path.map(k => ROHTAS_NETWORK[k]?.name || k);
      return {
        path: pathNames,
        distance: Math.round(current.gScore * 100) / 100 // Round to 2 decimals
      };
    }

    // Explore neighbors
    const neighbors = ROHTAS_NETWORK[current.key]?.connections || [];
    const currentCoords = getCoordinates(current.key);

    for (const neighborKey of neighbors) {
      if (visited.has(neighborKey)) continue;

      const neighborCoords = getCoordinates(neighborKey);

      // Calculate edge weight (distance to neighbor)
      let edgeDistance = 5; // Default fallback (5 km)
      if (currentCoords && neighborCoords) {
        edgeDistance = calculateHaversine(
          currentCoords.lat, currentCoords.lng,
          neighborCoords.lat, neighborCoords.lng
        );
      }

      const tentativeG = current.gScore + edgeDistance;

      // Check if this is a better path
      const previousG = gScores.get(neighborKey) ?? Infinity;
      if (tentativeG < previousG) {
        gScores.set(neighborKey, tentativeG);

        // Calculate heuristic (straight-line distance to goal)
        let h = 0;
        if (neighborCoords) {
          h = calculateHaversine(neighborCoords.lat, neighborCoords.lng, endCoords.lat, endCoords.lng);
        }

        openSet.push({
          key: neighborKey,
          gScore: tentativeG,
          fScore: tentativeG + h,
          path: [...current.path, neighborKey]
        });
      }
    }
  }

  // No path found
  console.warn(`A*: No path found from ${sKey} to ${eKey}`);
  return null;
};

// ========================================
// BFS (LEGACY/FALLBACK)
// ========================================

/**
 * Breadth-First Search - finds shortest path by hop count (unweighted)
 * Used as fallback when coordinates are unavailable
 */
export const findShortestPath = (startKey: string, endKey: string): string[] | null => {
  const start = startKey.toLowerCase();
  const end = endKey.toLowerCase();

  const sKey = resolveKey(start);
  const eKey = resolveKey(end);

  if (sKey === eKey) return [ROHTAS_NETWORK[sKey]?.name || sKey];
  if (!ROHTAS_NETWORK[sKey] || !ROHTAS_NETWORK[eKey]) return null;

  const queue: string[][] = [[sKey]];
  const visited = new Set<string>([sKey]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;

    const nodeKey = path[path.length - 1];

    if (nodeKey === eKey) {
      return path.map(k => ROHTAS_NETWORK[k].name);
    }

    const neighbors = ROHTAS_NETWORK[nodeKey]?.connections || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }

  return null;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate total path distance using Haversine
 */
export const calculatePathDistance = (pathNames: string[]): number => {
  let totalDist = 0;
  for (let i = 0; i < pathNames.length - 1; i++) {
    const from = STOP_COORDINATES[pathNames[i]];
    const to = STOP_COORDINATES[pathNames[i + 1]];
    if (from && to) {
      totalDist += calculateHaversine(from.lat, from.lng, to.lat, to.lng);
    }
  }
  return Math.round(totalDist * 100) / 100;
};

/**
 * Get demand level for a stop (deterministic based on name hash)
 */
export const getDemandLevel = (stopName: string): 'LOW' | 'MED' | 'HIGH' => {
  const hash = stopName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const val = hash % 10;

  // Hubs generally have higher demand
  const key = Object.keys(ROHTAS_NETWORK).find(k => ROHTAS_NETWORK[k].name === stopName);
  if (key && ROHTAS_NETWORK[key].type === 'Hub') {
    return val > 3 ? 'HIGH' : 'MED';
  }

  if (val > 7) return 'HIGH';
  if (val > 5) return 'MED';
  return 'LOW';
};

// ========================================
// SMART ROUTE FUNCTION (AUTO-SELECT ALGORITHM)
// ========================================

/**
 * Smart routing - uses A* when coordinates available, falls back to BFS
 * This is the recommended function to use for route allocation
 */
export const findOptimalRoute = (
  startKey: string,
  endKey: string
): { path: string[]; distance: number; algorithm: 'A*' | 'BFS' } | null => {
  // Try A* first (distance-optimal)
  const aStarResult = findShortestPathAStar(startKey, endKey);
  if (aStarResult) {
    return { ...aStarResult, algorithm: 'A*' };
  }

  // Fallback to BFS
  const bfsResult = findShortestPath(startKey, endKey);
  if (bfsResult) {
    return {
      path: bfsResult,
      distance: calculatePathDistance(bfsResult),
      algorithm: 'BFS'
    };
  }

  return null;
};

