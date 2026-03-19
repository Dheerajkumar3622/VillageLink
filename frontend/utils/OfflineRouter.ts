export interface Graph {
  [nodeId: string]: {
    [neighborId: string]: number; // Represents distance in meters between nodes
  };
}

export interface Nodes {
  [nodeId: string]: {
    lat: number;
    lon: number;
  };
}

export interface VillagePOI {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
}

export interface RoutingData {
  nodes: Nodes;
  graph: Graph;
  villages?: VillagePOI[]; // Optional for backward compatibility if old JSON is loaded
}

export class OfflineRouter {
  private graph: Graph;
  private nodes: Nodes;
  private villages: VillagePOI[];

  constructor(routingData: RoutingData) {
    this.graph = routingData.graph;
    this.nodes = routingData.nodes;
    this.villages = routingData.villages || [];
  }

  // 1. User ki location aur destination ka closest OSM Node dhundhna
  public findClosestNode(lat: number, lon: number): string | null {
    let closestNode: string | null = null;
    let minDistance = Infinity;

    for (const nodeId in this.nodes) {
      const node = this.nodes[nodeId];
      const dist = this.calculateDistance(lat, lon, node.lat, node.lon);
      
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = nodeId;
      }
    }

    return closestNode;
  }

  // 2. Dijkstra Algorithm se Shortest Route nikalna
  public findShortestPath(startNode: string, endNode: string) {
    const distances: { [node: string]: number } = {};
    const previous: { [node: string]: string | null } = {};
    const unvisited = new Set<string>();

    // Initialisation
    for (const node in this.graph) {
      distances[node] = Infinity;
      previous[node] = null;
      unvisited.add(node);
    }
    
    // Agar start ya end node nahi hai
    if (!this.graph[startNode] || !this.graph[endNode]) {
       console.error("Start or End node not found in graph.");
       return null; 
    }

    distances[startNode] = 0;

    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let currentNode: string | null = null;
      let minDistance = Infinity;
      
      for (const node of unvisited) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          currentNode = node;
        }
      }

      if (currentNode === null || currentNode === endNode) {
        break; // Destination mil gaya ya aage rasata nahi hai
      }

      unvisited.delete(currentNode);

      // Check all connected neighbors
      const neighbors = this.graph[currentNode];
      for (const neighbor in neighbors) {
        if (unvisited.has(neighbor)) {
          const altDistance = distances[currentNode] + neighbors[neighbor];
          
          if (altDistance < distances[neighbor]) {
            distances[neighbor] = altDistance;
            previous[neighbor] = currentNode;
          }
        }
      }
    }

    // 3. Path Reconstruct kar rahe hain Destination se wapas Start tak
    const path: string[] = [];
    let current: string | null = endNode;
    
    if (previous[current] !== null || current === startNode) {
      while (current !== null) {
        path.unshift(current);
        current = previous[current];
      }
    }

    if (path.length === 0 || path[0] !== startNode) {
      return null; // Route nahi mila
    }

    // 4. Map par dikhane ke liye Lat/Lng Coordinates return karna
    const coordinates = path.map(nodeId => ({
      latitude: this.nodes[nodeId].lat,
      longitude: this.nodes[nodeId].lon
    }));

    // 5. Intermediate Stops (Villages) find karna jo is route ke kareeb hain
    const intermediateStopsWithIndex: { name: string, lat: number, lon: number, routeIndex: number }[] = [];
    const MAX_DISTANCE_FROM_ROUTE_METERS = 800; // 800 meters ke daayre mein aane wale gaon

    for (const village of this.villages) {
      // Check agar ye village start ya end point ke bilkul same toh nahi (Start ya destination gaon ko beech me na dikhaye)
      const distFromStart = this.calculateDistance(village.lat, village.lon, this.nodes[startNode].lat, this.nodes[startNode].lon);
      const distFromEnd = this.calculateDistance(village.lat, village.lon, this.nodes[endNode].lat, this.nodes[endNode].lon);
      
      if (distFromStart < MAX_DISTANCE_FROM_ROUTE_METERS || distFromEnd < MAX_DISTANCE_FROM_ROUTE_METERS) {
        continue;
      }

      // Find finding the absolute closest coordinate to this village on the path
      let minDistanceToRoute = Infinity;
      let closestRouteIndex = -1;

      for (let i = 0; i < coordinates.length; i++) {
        const cp = coordinates[i];
        const dist = this.calculateDistance(village.lat, village.lon, cp.latitude, cp.longitude);
        if (dist < minDistanceToRoute) {
           minDistanceToRoute = dist;
           closestRouteIndex = i; // Save map node index where village appears
        }
      }

      // Agar ye village route ke 800 meter ke daayre mein hai
      if (minDistanceToRoute <= MAX_DISTANCE_FROM_ROUTE_METERS) {
         // Also ensure duplicate named villages aren't added very near to each other
         const isDuplicateIdx = intermediateStopsWithIndex.findIndex(s => s.name === village.name);
         if (isDuplicateIdx === -1) {
             intermediateStopsWithIndex.push({
               name: village.name,
               lat: village.lat,
               lon: village.lon,
               routeIndex: closestRouteIndex
             });
         }
      }
    }

    // 6. Sort the arrays based on their appearance on the path (Start to End)
    intermediateStopsWithIndex.sort((a, b) => a.routeIndex - b.routeIndex);

    // Final cleanly mapped stops
    const intermediateStops = intermediateStopsWithIndex.map(s => ({
       name: s.name,
       lat: s.lat,
       lon: s.lon
    }));

    return {
      pathNodes: path,
      coordinates: coordinates, // Ise GoogleMaps ya MapView me Polyline me draw karna
      totalDistanceMeters: distances[endNode],
      intermediateStops: intermediateStops // Yeh route pe padne wale saare villages ke naam denge unke aane ke sequence me!
    };
  }

  // Helper: Haversine distance
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }
}
