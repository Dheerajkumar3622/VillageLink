package com.villagelink.app;

import android.os.Bundle;
import android.content.SharedPreferences;
import android.content.Context;
import java.io.File;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String customBasePath = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // [CRITICAL INJECTION POINT]: Read OTA state before Bridge boots
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("CapacitorStorage",
                Context.MODE_PRIVATE);
        String bundlePath = prefs.getString("ota_bundle_path", null);

        if (bundlePath != null && !bundlePath.isEmpty()) {
            // Handle file:// URIs properly
            String actualPath = bundlePath.replace("file://", "");
            File indexFile = new File(actualPath, "index.html");
            if (indexFile.exists()) {
                // Override the WebView path to load our custom OTA bundle!
                customBasePath = actualPath;
            } else {
                // Fallback to safety if corrupted
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("ota_bundle_path", "");
                editor.apply();
            }
        }

        // Let Capacitor initialize NOW (Bridge uses getServerBasePath)
        super.onCreate(savedInstanceState);
    }

    @Override
    public String getServerBasePath() {
        if (customBasePath != null) {
            return customBasePath;
        }
        return super.getServerBasePath();
    }
}
