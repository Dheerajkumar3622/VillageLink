import { ROHTAS_NETWORK, STOP_COORDINATES } from "@villagelink/shared";
const calculateHaversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return void 0;
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }
  isEmpty() {
    return this.heap.length === 0;
  }
  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].fScore <= this.heap[index].fScore) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }
  bubbleDown(index) {
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
const resolveKey = (input) => {
  const normalized = input.toLowerCase();
  if (ROHTAS_NETWORK[normalized]) return normalized;
  const found = Object.keys(ROHTAS_NETWORK).find(
    (k) => ROHTAS_NETWORK[k].name.toLowerCase() === normalized
  );
  return found || normalized;
};
const getCoordinates = (keyOrName) => {
  const name = ROHTAS_NETWORK[keyOrName]?.name || keyOrName;
  if (STOP_COORDINATES[name]) return STOP_COORDINATES[name];
  if (STOP_COORDINATES[keyOrName]) return STOP_COORDINATES[keyOrName];
  return null;
};
const findShortestPathAStar = (startKey, endKey) => {
  const sKey = resolveKey(startKey);
  const eKey = resolveKey(endKey);
  if (sKey === eKey) {
    return {
      path: [ROHTAS_NETWORK[sKey]?.name || sKey],
      distance: 0
    };
  }
  if (!ROHTAS_NETWORK[sKey] || !ROHTAS_NETWORK[eKey]) {
    console.warn(`A*: Node not found - start: ${sKey}, end: ${eKey}`);
    return null;
  }
  const endCoords = getCoordinates(eKey);
  if (!endCoords) {
    console.warn(`A*: No coordinates for destination ${eKey}, falling back to BFS`);
    const bfsResult = findShortestPath(startKey, endKey);
    return bfsResult ? { path: bfsResult, distance: calculatePathDistance(bfsResult) } : null;
  }
  const openSet = new MinHeap();
  const gScores = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
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
    const current = openSet.pop();
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    if (current.key === eKey) {
      const pathNames = current.path.map((k) => ROHTAS_NETWORK[k]?.name || k);
      return {
        path: pathNames,
        distance: Math.round(current.gScore * 100) / 100
        // Round to 2 decimals
      };
    }
    const neighbors = ROHTAS_NETWORK[current.key]?.connections || [];
    const currentCoords = getCoordinates(current.key);
    for (const neighborKey of neighbors) {
      if (visited.has(neighborKey)) continue;
      const neighborCoords = getCoordinates(neighborKey);
      let edgeDistance = 5;
      if (currentCoords && neighborCoords) {
        edgeDistance = calculateHaversine(
          currentCoords.lat,
          currentCoords.lng,
          neighborCoords.lat,
          neighborCoords.lng
        );
      }
      const tentativeG = current.gScore + edgeDistance;
      const previousG = gScores.get(neighborKey) ?? Infinity;
      if (tentativeG < previousG) {
        gScores.set(neighborKey, tentativeG);
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
  console.warn(`A*: No path found from ${sKey} to ${eKey}`);
  return null;
};
const findShortestPath = (startKey, endKey) => {
  const start = startKey.toLowerCase();
  const end = endKey.toLowerCase();
  const sKey = resolveKey(start);
  const eKey = resolveKey(end);
  if (sKey === eKey) return [ROHTAS_NETWORK[sKey]?.name || sKey];
  if (!ROHTAS_NETWORK[sKey] || !ROHTAS_NETWORK[eKey]) return null;
  const queue = [[sKey]];
  const visited = /* @__PURE__ */ new Set([sKey]);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    const nodeKey = path[path.length - 1];
    if (nodeKey === eKey) {
      return path.map((k) => ROHTAS_NETWORK[k].name);
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
const calculatePathDistance = (pathNames) => {
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
const getDemandLevel = (stopName) => {
  const hash = stopName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const val = hash % 10;
  const key = Object.keys(ROHTAS_NETWORK).find((k) => ROHTAS_NETWORK[k].name === stopName);
  if (key && ROHTAS_NETWORK[key].type === "Hub") {
    return val > 3 ? "HIGH" : "MED";
  }
  if (val > 7) return "HIGH";
  if (val > 5) return "MED";
  return "LOW";
};
const findOptimalRoute = (startKey, endKey) => {
  const aStarResult = findShortestPathAStar(startKey, endKey);
  if (aStarResult) {
    return { ...aStarResult, algorithm: "A*" };
  }
  const bfsResult = findShortestPath(startKey, endKey);
  if (bfsResult) {
    return {
      path: bfsResult,
      distance: calculatePathDistance(bfsResult),
      algorithm: "BFS"
    };
  }
  return null;
};
export {
  calculatePathDistance,
  findOptimalRoute,
  findShortestPath,
  findShortestPathAStar,
  getDemandLevel
};
