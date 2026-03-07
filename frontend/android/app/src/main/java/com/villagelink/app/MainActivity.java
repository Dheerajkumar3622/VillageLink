package com.villagelink.app;

import android.os.Bundle;
import android.content.SharedPreferences;
import android.content.Context;
import java.io.File;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // [OTA INJECTION]: Read OTA state AFTER Bridge boots, then redirect WebView
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("CapacitorStorage",
                Context.MODE_PRIVATE);
        String bundlePath = prefs.getString("ota_bundle_path", null);

        if (bundlePath != null && !bundlePath.isEmpty()) {
            // Handle file:// URIs properly
            String actualPath = bundlePath.replace("file://", "");
            File indexFile = new File(actualPath, "index.html");
            if (indexFile.exists()) {
                // Use Capacitor 8 Bridge API to switch serving path
                getBridge().setServerBasePath(actualPath);
            } else {
                // Fallback to safety if corrupted
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("ota_bundle_path", "");
                editor.apply();
            }
        }
    }
}
