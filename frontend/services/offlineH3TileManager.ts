/**
 * VillageLink Offline H3 Spatial Tile Manager
 * 
 * Manages zero-latency offline caching of 4,75,014 OpenStreetMap Village Nodes in IndexedDB.
 * Allows full spatial corridor snapping and location searches even when mobile data drops in rural dark zones.
 */

import { LocationData } from '@villagelink/shared';

const DB_NAME = 'VillageLink_Spatial_DB';
const DB_VERSION = 1;
const STORE_NODES = 'junction_nodes';
const STORE_TILES = 'h3_tiles';

export interface ISpatialNode {
  nodeId: string;
  name: string;
  localNameHindi: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  h3_r7: string;
  h3_r9: string;
}

export class OfflineH3TileManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NODES)) {
          const nodeStore = db.createObjectStore(STORE_NODES, { keyPath: 'nodeId' });
          nodeStore.createIndex('h3_r7', 'h3_r7', { unique: false });
          nodeStore.createIndex('district', 'district', { unique: false });
          nodeStore.createIndex('name', 'name', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_TILES)) {
          db.createObjectStore(STORE_TILES, { keyPath: 'tileId' });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result as IDBDatabase);
      };

      request.onerror = (event: any) => {
        console.warn('[OfflineH3TileManager] IndexedDB init failed:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Save a batch of OSM Village Nodes into local IndexedDB
   */
  public async cacheNodeBatch(nodes: ISpatialNode[]): Promise<void> {
    if (!this.dbPromise || nodes.length === 0) return;
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);

      for (const n of nodes) {
        store.put(n);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[OfflineH3TileManager] Batch cache write error:', e);
    }
  }

  /**
   * Query local offline nodes by H3 Cell IDs
   */
  public async getNodesByH3Cells(h3Cells: string[]): Promise<ISpatialNode[]> {
    if (!this.dbPromise || h3Cells.length === 0) return [];
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const index = store.index('h3_r7');

      const resultsMap = new Map<string, ISpatialNode>();

      for (const cell of h3Cells) {
        const req = index.getAll(cell);
        const cellNodes: ISpatialNode[] = await new Promise((resolve) => {
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        cellNodes.forEach(n => resultsMap.set(n.nodeId, n));
      }

      return Array.from(resultsMap.values());
    } catch (e) {
      console.warn('[OfflineH3TileManager] Offline H3 query error:', e);
      return [];
    }
  }

  /**
   * Offline Spatial Corridor Snapping fallback for dark zones
   */
  public async snapOfflineCorridorPoints(polylinePoints: Array<{ lat: number; lng: number }>, bufferKm = 0.8): Promise<ISpatialNode[]> {
    if (!polylinePoints || polylinePoints.length < 2) return [];

    // Extract coarse bounding box
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const pt of polylinePoints) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }

    const pad = bufferKm / 111.0;
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;

    try {
      const db = await this.dbPromise;
      if (!db) return [];

      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const req = store.getAll();

      const allCached: ISpatialNode[] = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      // Filter in-memory by Bounding Box
      const candidates = allCached.filter(n =>
        n.lat >= minLat && n.lat <= maxLat && n.lng >= minLng && n.lng <= maxLng
      );

      return candidates;
    } catch (e) {
      return [];
    }
  }
}

export const offlineH3TileManager = new OfflineH3TileManager();
