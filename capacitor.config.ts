
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagelink.app',
  appName: 'VillageLink',
  webDir: 'dist',
  server: {
    // Use the production Render URL so APK always uses latest code
    url: 'https://villagelink-jh20.onrender.com',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
