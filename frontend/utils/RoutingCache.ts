// @ts-ignore
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

// The directory where we will store the offline routing graphs
const OFFLINE_ROUTING_DIR = (FileSystem?.documentDirectory || '') + 'routing_data/';

/**
 * Ensures the routing data directory exists.
 */
const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_ROUTING_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OFFLINE_ROUTING_DIR, { intermediates: true });
        console.log('[RoutingCache] Created routing_data directory.');
    }
};

/**
 * Downloads a routing graph for a specific area from the backend and saves it locally.
 * @param areaId - Identifier for the area (e.g., 'village_name' or 'block_id')
 * @param backendUrl - The URL paths where the routing_data is hosted (e.g., 'https://your-backend.com/routing_data/areaId_routing_graph.json')
 */
export const downloadRoutingGraph = async (areaId: string, backendUrl: string): Promise<string> => {
    await ensureDirExists();
    
    const localFilePath = OFFLINE_ROUTING_DIR + `${areaId}_routing_graph.json`;

    try {
        console.log(`[RoutingCache] Downloading routing graph for ${areaId} from ${backendUrl}...`);
        
        const downloadResumable = FileSystem.createDownloadResumable(
            backendUrl,
             localFilePath,
             {},
             (downloadProgress: any) => {
                 const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                 console.log(`[RoutingCache] Download progress: ${(progress * 100).toFixed(2)}%`);
             }
         );
 
         const result = await downloadResumable.downloadAsync();
         
         if (result) {
            console.log(`✅ [RoutingCache] Successfully downloaded ${areaId} routing data to ${result.uri}`);
            return result.uri;
         } else {
             throw new Error('Download failed');
         }

    } catch (error) {
        console.error(`❌ [RoutingCache] Failed to download routing graph for ${areaId}:`, error);
        throw error;
    }
};

/**
 * Checks if routing data for a specific area is available offline.
 */
export const isRoutingDataAvailable = async (areaId: string): Promise<boolean> => {
    const localFilePath = OFFLINE_ROUTING_DIR + `${areaId}_routing_graph.json`;
    const fileInfo = await FileSystem.getInfoAsync(localFilePath);
    return fileInfo.exists;
};

/**
 * Loads the routing graph data from the local file system.
 */
export const loadLocalRoutingGraph = async (areaId: string): Promise<any> => {
    const localFilePath = OFFLINE_ROUTING_DIR + `${areaId}_routing_graph.json`;
    
    try {
        const fileInfo = await FileSystem.getInfoAsync(localFilePath);
        
        if (!fileInfo.exists) {
            throw new Error(`Routing data for ${areaId} is not available offline.`);
        }

        const fileContent = await FileSystem.readAsStringAsync(localFilePath);
        const jsonData = JSON.parse(fileContent);
        console.log(`✅ [RoutingCache] Successfully loaded local routing data for ${areaId}`);
        return jsonData;
    } catch (error) {
        console.error(`❌ [RoutingCache] Failed to load local routing graph for ${areaId}:`, error);
        throw error;
    }
};

/**
 * Clears all cached routing graphs to free up space.
 */
export const clearRoutingCache = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(OFFLINE_ROUTING_DIR);
        if (dirInfo.exists) {
            await FileSystem.deleteAsync(OFFLINE_ROUTING_DIR, { idempotent: true });
            console.log('[RoutingCache] Cleared all offline routing data.');
        }
    } catch (error) {
         console.error('[RoutingCache] Failed to clear routing data:', error);
    }
}
