
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagelink.app',
  appName: 'VillageLink',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
