
import { CapacitorConfig } from '@capacitor/cli';

const variant = (process.env.APP_VARIANT || 'user').toLowerCase();

const appMetaByVariant: Record<string, { appId: string; appName: string }> = {
  user: {
    appId: 'com.villagelink.user',
    appName: 'VillageLink User',
  },
  provider: {
    appId: 'com.villagelink.provider',
    appName: 'VillageLink Provider',
  },
  admin: {
    appId: 'com.villagelink.admin',
    appName: 'VillageLink Admin',
  },
};

const selectedMeta = appMetaByVariant[variant] || appMetaByVariant.user;

const config: CapacitorConfig = {
  appId: selectedMeta.appId,
  appName: selectedMeta.appName,
  webDir: 'dist',
  server: {
    // PRODUCTION MODE - using Render URL:
    // url: 'https://villagelink-jh20.onrender.com', // Commented out to bundle locally
    // LOCAL DEV MODE (uncomment for emulator testing):
    // url: 'http://10.0.2.2:3001', // 10.0.2.2 is localhost from Android emulator
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
