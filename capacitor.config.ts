
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagelink.app',
  appName: 'VillageLink',
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
