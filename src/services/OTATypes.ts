export const OTA_CDN_URL = 'http://10.30.45.75:8080'; // Change to actual production CDN/Bucket
export const OTA_DIRS = {
  STAGING: 'ota_staging',
  TMP: 'ota_tmp',
  BUNDLES: 'ota_bundles',
};
export const OTA_PREFS = {
  CURRENT_VERSION: 'ota_current_version',
  BUNDLE_PATH: 'ota_bundle_path',
};
export const MAX_BUNDLE_SIZE = 15 * 1024 * 1024; // 15MB limit
