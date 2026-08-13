import { Filesystem, Directory } from '@capacitor/filesystem';

export async function bootstrapOTA() {
  try {
    // Attempt to clear temp directory on cold start
    const tmpContents = await Filesystem.readdir({
      path: 'ota_tmp',
      directory: Directory.Data
    }).catch(() => null);

    if (tmpContents) {
      await Filesystem.rmdir({
        path: 'ota_tmp',
        directory: Directory.Data,
        recursive: true
      });
      console.log('[OTA Bootstrap] Cleared ota_tmp on boot');
    }

    const stageContents = await Filesystem.readdir({
      path: 'ota_staging',
      directory: Directory.Data
    }).catch(() => null);

    if (stageContents) {
      await Filesystem.rmdir({
        path: 'ota_staging',
        directory: Directory.Data,
        recursive: true
      });
      console.log('[OTA Bootstrap] Cleared orphaned ota_staging on boot');
    }

    if (!import.meta.env.PROD) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: 'ota_current_version' });
        await Preferences.remove({ key: 'ota_bundle_path' });
        console.log('[OTA Bootstrap] Cleared OTA dev bundle overrides');
      } catch (err) {}
    }
  } catch (e) {
    console.warn('[OTA Bootstrap] Non-critical error during cleanup:', e);
  }
}
