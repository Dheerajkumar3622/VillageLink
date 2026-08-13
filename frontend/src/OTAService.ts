import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import * as fflate from 'fflate';
import { OTA_CDN_URL, OTA_DIRS, OTA_PREFS, MAX_BUNDLE_SIZE } from './OTATypes';

export class OTAService {
  private static instance: OTAService;

  private constructor() {}

  public static getInstance(): OTAService {
    if (!OTAService.instance) {
      OTAService.instance = new OTAService();
    }
    return OTAService.instance;
  }

  public async checkForUpdate(): Promise<void> {
    if (!import.meta.env.PROD) {
      console.log('[OTA] Development mode active - OTA auto-update skipped.');
      return;
    }
    try {
      console.log('[OTA] Checking for update...');
      // Append timestamp to prevent aggressive caching
      const response = await fetch(`${OTA_CDN_URL}/version.json?t=${Date.now()}`);
      if (!response.ok) {
        console.warn('[OTA] Failed to fetch version.json');
        return;
      }

      const latestInfo = await response.json();
      const currentVersionResult = await Preferences.get({ key: OTA_PREFS.CURRENT_VERSION });
      const currentVersion = currentVersionResult.value || '0.0.0';

      if (this.isNewerVersion(currentVersion, latestInfo.version)) {
        console.log(`[OTA] New update found: ${latestInfo.version}`);
        await this.downloadAndApplyUpdate(latestInfo);
      } else {
        console.log('[OTA] Up to date.');
      }
    } catch (e) {
      console.error('[OTA] Error checking for update:', e);
    }
  }

  private isNewerVersion(current: string, latest: string): boolean {
    const v1 = current.split('.').map(Number);
    const v2 = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        // v2 is inherently newer if any primary, secondary, or patch precedes v1 without being matched prior
        if ((v2[i] || 0) > (v1[i] || 0)) return true;
        if ((v2[i] || 0) < (v1[i] || 0)) return false;
    }
    return false;
  }

  private async downloadAndApplyUpdate(updateInfo: { version: string, sha256: string, size?: number, url?: string }): Promise<void> {
    const zipUrl = updateInfo.url || `${OTA_CDN_URL}/app-bundle-${updateInfo.version}.zip`;
    const tmpZipPath = `${OTA_DIRS.TMP}/update.zip`;

    if (updateInfo.size && updateInfo.size > MAX_BUNDLE_SIZE) {
        console.error(`[OTA] Bundle size ${updateInfo.size} exceeds max ${MAX_BUNDLE_SIZE}`);
        return;
    }

    try {
      // 1. Ensure temp dir exists
      await Filesystem.mkdir({ path: OTA_DIRS.TMP, directory: Directory.Data, recursive: true }).catch(() => {});

      // 2. Download zip via raw fetch to get Blob (Capacitor downloadFile stream is harder to pipe to fflate natively)
      console.log(`[OTA] Downloading ${zipUrl}...`);
      const res = await fetch(zipUrl);
      const arrayBuffer = await res.arrayBuffer();
      const zipData = new Uint8Array(arrayBuffer);

      console.log(`[OTA] Downloaded ${zipData.length} bytes.`);

      // 3. Extract to staging
      const stagingDir = `${OTA_DIRS.STAGING}/v${updateInfo.version}`;
      await Filesystem.mkdir({ path: stagingDir, directory: Directory.Data, recursive: true }).catch(() => {});
      
      console.log(`[OTA] Unzipping to staging...`);
      const unzipped = fflate.unzipSync(zipData);
      
      for (const [relativePath, fileData] of Object.entries(unzipped)) {
        // Skip directories and empty paths
        if (fileData.length === 0 || relativePath.endsWith('/')) {
            await Filesystem.mkdir({ path: `${stagingDir}/${relativePath}`, directory: Directory.Data, recursive: true }).catch(() => {});
            continue;
        }
        
        // Convert Uint8Array to Base64 for Capacitor Writing
        let binaryStr = '';
        for (let i = 0; i < fileData.length; i++) {
            binaryStr += String.fromCharCode(fileData[i]);
        }
        const b64 = window.btoa(binaryStr);

        await Filesystem.writeFile({
          path: `${stagingDir}/${relativePath}`,
          data: b64,
          directory: Directory.Data,
          recursive: true
        });
      }

      console.log(`[OTA] Unzip complete! Applying...`);

      // 4. Atomic Replace
      const finalBundlePath = `${OTA_DIRS.BUNDLES}/v${updateInfo.version}`;
      await Filesystem.mkdir({ path: OTA_DIRS.BUNDLES, directory: Directory.Data, recursive: true }).catch(() => {});
      
      // Delete existing bundle with same version if any, then rename staging to bundle
      await Filesystem.rmdir({ path: finalBundlePath, directory: Directory.Data, recursive: true }).catch(() => {});
      await Filesystem.rename({
          from: stagingDir,
          to: finalBundlePath,
          directory: Directory.Data
      });

      // Fetch the actual absolute URI from filesystem 
      const stat = await Filesystem.stat({ path: finalBundlePath, directory: Directory.Data });
      let nativePath = stat.uri;
      
      // Store in Preferences (Must match Java EXACTLY: 'CapacitorStorage' is default)
      await Preferences.set({ key: OTA_PREFS.BUNDLE_PATH, value: nativePath });
      await Preferences.set({ key: OTA_PREFS.CURRENT_VERSION, value: updateInfo.version });

      console.log(`[OTA] Successfully applied v${updateInfo.version} to ${nativePath}`);

      // 5. Cleanup OLD folders (Mistake #4 specific fix)
      await this.cleanupOldBundles(updateInfo.version);

      // Prompt UI reload via custom event 
      window.dispatchEvent(new CustomEvent('ota_update_ready', { detail: { version: updateInfo.version } }));

    } catch (e) {
      console.error('[OTA] Update failed:', e);
      // Clean staging on failure
      await Filesystem.rmdir({ path: OTA_DIRS.STAGING, directory: Directory.Data, recursive: true }).catch(() => {});
    }
  }

  private async cleanupOldBundles(currentActiveVersion: string) {
      console.log(`[OTA] Cleaning up old bundles (Retaining v${currentActiveVersion})...`);
      try {
          const res = await Filesystem.readdir({ path: OTA_DIRS.BUNDLES, directory: Directory.Data });
          for (const fileItem of res.files) {
              const folderName = typeof fileItem === 'string' ? fileItem : fileItem.name;
              if (folderName.startsWith('v') && folderName !== `v${currentActiveVersion}`) {
                  console.log(`[OTA] Deleting old bundle: ${folderName}`);
                  await Filesystem.rmdir({
                      path: `${OTA_DIRS.BUNDLES}/${folderName}`,
                      directory: Directory.Data,
                      recursive: true
                  }).catch(e => console.warn('[OTA] Delete error:', e));
              }
          }
      } catch (e) {
          console.warn(`[OTA] Warning: Could not cleanup bundles:`, e);
      }
  }
}
