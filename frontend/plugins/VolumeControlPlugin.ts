import { registerPlugin } from '@capacitor/core';

export interface VolumeControlPlugin {
  /**
   * Overrides the current device media volume to 100% and stores the previous value.
   */
  maximize(): Promise<{ success: boolean; previousVolume?: number }>;
  
  /**
   * Restores the device media volume back to the previously stored value.
   */
  restore(): Promise<{ success: boolean; message?: string }>;
}

const VolumeControl = registerPlugin<VolumeControlPlugin>('VolumeControl');

export default VolumeControl;
