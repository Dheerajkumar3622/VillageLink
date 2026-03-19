package com.villagelink.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

@CapacitorPlugin(name = "VolumeControl")
public class VolumeControlPlugin extends Plugin {
    private int originalVolume = -1;

    @PluginMethod
    public void maximize(PluginCall call) {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                // Save original volume
                originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                
                // Override to max volume
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0);
                
                Log.d("VolumeControl", "Volume maximized. Original was: " + originalVolume);
                
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("previousVolume", originalVolume);
                call.resolve(ret);
            } else {
                call.reject("AudioManager not available");
            }
        } catch (Exception e) {
            call.reject("Error maximizing volume", e);
        }
    }

    @PluginMethod
    public void restore(PluginCall call) {
        try {
            if (originalVolume != -1) {
                AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
                if (audioManager != null) {
                    // Restore to original
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, originalVolume, 0);
                    Log.d("VolumeControl", "Volume restored to: " + originalVolume);
                    
                    originalVolume = -1; // Reset memory
                    
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } else {
                    call.reject("AudioManager not available");
                }
            } else {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("message", "No original volume saved in memory. Skipping.");
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error restoring volume", e);
        }
    }
}
