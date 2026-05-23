$ErrorActionPreference = "Stop"
$apkOutDir = "d:\Antigravity\Village_latest v1.0\apk-out"
if (!(Test-Path $apkOutDir)) { New-Item -ItemType Directory -Force -Path $apkOutDir }

Set-Location "d:\Antigravity\Village_latest v1.0\frontend"

function Set-AndroidConfig {
    param(
        [string]$NewAppId,
        [string]$NewAppName,
        [string]$OldAppId,
        [string]$OldAppName
    )
    Write-Host "Updating Gradle config to $NewAppId ($NewAppName)"
    $gradlePath = "android\app\build.gradle"
    $gradleContent = Get-Content $gradlePath
    $gradleContent -replace "applicationId `"$OldAppId`"", "applicationId `"$NewAppId`"" | Set-Content $gradlePath

    $stringsPath = "android\app\src\main\res\values\strings.xml"
    $stringsContent = Get-Content $stringsPath
    $stringsContent -replace ">$OldAppName<", ">$NewAppName<" -replace ">$OldAppId<", ">$NewAppId<" | Set-Content $stringsPath
}

# The baseline AppId in the files is com.villagelink.app, let's just make sure we track what is currently inside.
# If they ran fix_both_apps, it might have been left at com.villagelink.app.
# We will use Regex replacements smartly.

function Replace-AndroidMetadata {
    param([string]$AppId, [string]$AppName)
    $gradlePath = "android\app\build.gradle"
    (Get-Content $gradlePath) -replace 'applicationId ".*?"', "applicationId `"$AppId`"" | Set-Content $gradlePath

    $stringsPath = "android\app\src\main\res\values\strings.xml"
    (Get-Content $stringsPath) -replace '<string name="app_name">.*?</string>', "<string name=`"app_name`">$AppName</string>" | Set-Content $stringsPath
}

if (!(Test-Path "dist\index_original.html")) {
    Copy-Item "dist\index.html" "dist\index_original.html" -Force
}

Write-Host "========== 1. BUILDING USER APK =========="
$env:APP_VARIANT = "user"
$env:VL_APP_ID = "com.villagelink.user"
Copy-Item "dist\user.html" "dist\index.html" -Force

Replace-AndroidMetadata -AppId "com.villagelink.user" -AppName "VillageLink"
npx cap sync android
Set-Location "android"
.\gradlew clean assembleDebug
Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$apkOutDir\VillageLink-User.apk" -Force
Set-Location ".."

Write-Host "========== 2. BUILDING PROVIDER APK =========="
$env:APP_VARIANT = "provider"
$env:VL_APP_ID = "com.villagelink.provider"
Copy-Item "dist\provider.html" "dist\index.html" -Force

Replace-AndroidMetadata -AppId "com.villagelink.provider" -AppName "VL Provider"
npx cap sync android
Set-Location "android"
.\gradlew clean assembleDebug
Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$apkOutDir\VillageLink-Provider.apk" -Force
Set-Location ".."

Write-Host "========== 3. BUILDING ADMIN APK =========="
$env:APP_VARIANT = "admin"
$env:VL_APP_ID = "com.villagelink.admin"
Copy-Item "dist\admin.html" "dist\index.html" -Force

Replace-AndroidMetadata -AppId "com.villagelink.admin" -AppName "VL Admin"
npx cap sync android
Set-Location "android"
.\gradlew clean assembleDebug
Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$apkOutDir\VillageLink-Admin.apk" -Force
Set-Location ".."

Write-Host "========== CLEANUP & RESTORE REPO STATE =========="
Copy-Item "dist\index_original.html" "dist\index.html" -ErrorAction SilentlyContinue
Replace-AndroidMetadata -AppId "com.villagelink.user" -AppName "VillageLink"
$env:APP_VARIANT = "user"
$env:VL_APP_ID = "com.villagelink.user"
npx cap sync android

Write-Host "========== ALL DONE! APKs stored in: $apkOutDir =========="

