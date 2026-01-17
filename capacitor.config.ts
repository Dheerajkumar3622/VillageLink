
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagelink.app',
  appName: 'VillageLink',
  webDir: 'dist',
  server: {
    // LOCAL DEV MODE - switch back to Render URL for production:
    // url: 'https://villagelink-jh20.onrender.com',
    url: 'http://10.0.2.2:3000', // 10.0.2.2 is localhost from Android emulator
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
