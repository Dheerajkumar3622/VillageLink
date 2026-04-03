Write-Host "Started Full Build Recovery"

# Clean up any potential gradle locks
cd "d:\Antigravity\Village_latest v1.0\frontend\android"
.\gradlew --stop

cd "d:\Antigravity\Village_latest v1.0\frontend"
Write-Host "Building React Workspace"
npm run build
Write-Host "Syncing User App"
npx cap sync android
cd android
Write-Host "Cleaning User App Build"
.\gradlew clean
Write-Host "Assembling User App Debug APK"
.\gradlew assembleDebug

Write-Host "Uninstalling broken User App via ADB"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.villagelink.app

Write-Host "Installing fresh User App via ADB"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"

# Now build Provider app
cd "d:\Antigravity\Village_latest v1.0\frontend"
Write-Host "Modifying Dist for Provider App"
cd dist
ren index.html index_user.html
ren provider.html index.html
cd ..

Write-Host "Temporarily Updating Android Strings/IDs for Provider via replace"
(Get-Content capacitor.config.ts) -replace "'com.villagelink.app'", "'com.villagelink.provider'" -replace "'VillageLink'", "'VL Provider'" | Set-Content capacitor.config.ts
(Get-Content android\app\build.gradle) -replace 'applicationId "com.villagelink.app"', 'applicationId "com.villagelink.provider"' | Set-Content android\app\build.gradle
(Get-Content android\app\src\main\res\values\strings.xml) -replace '>VillageLink<', '>VL Provider<' -replace '>com.villagelink.app<', '>com.villagelink.provider<' | Set-Content android\app\src\main\res\values\strings.xml

Write-Host "Syncing Provider App"
npx cap sync android

cd android
Write-Host "Cleaning Provider App Build"
.\gradlew clean
Write-Host "Assembling Provider App Debug APK"
.\gradlew assembleDebug

Write-Host "Uninstalling old Provider App via ADB"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.villagelink.provider

Write-Host "Installing fresh Provider App via ADB"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"

# Revert EVERYTHING
cd "d:\Antigravity\Village_latest v1.0\frontend"
Write-Host "Reverting Configuration to User App"
(Get-Content capacitor.config.ts) -replace "'com.villagelink.provider'", "'com.villagelink.app'" -replace "'VL Provider'", "'VillageLink'" | Set-Content capacitor.config.ts
(Get-Content android\app\build.gradle) -replace 'applicationId "com.villagelink.provider"', 'applicationId "com.villagelink.app"' | Set-Content android\app\build.gradle
(Get-Content android\app\src\main\res\values\strings.xml) -replace '>VL Provider<', '>VillageLink<' -replace '>com.villagelink.provider<', '>com.villagelink.app<' | Set-Content android\app\src\main\res\values\strings.xml

# Restore HTML routing
cd dist
ren index.html provider.html
ren index_user.html index.html
cd ..

Write-Host "Final Sync for User App (Restoring Original Workspace State)"
npx cap sync android

Write-Host "Complete! Launching User App."
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.villagelink.app -c android.intent.category.LAUNCHER 1

Write-Host "DONE_SUCCESS_ALL"
