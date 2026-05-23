@echo off
set APK_OUT_DIR=d:\Antigravity\Village_latest v1.0\apk-out
if not exist "%APK_OUT_DIR%" mkdir "%APK_OUT_DIR%"

cd /d "d:\Antigravity\Village_latest v1.0\frontend"

echo ========== 1. BUILDING USER APK ==========
if not exist "dist\index_original.html" copy "dist\index.html" "dist\index_original.html" >nul
copy /y "dist\user.html" "dist\index.html" >nul

set APP_VARIANT=user
call npx cap sync android
cd android
call .\gradlew assembleDebug
copy /y "app\build\outputs\apk\debug\app-debug.apk" "%APK_OUT_DIR%\VillageLink-User.apk"
cd ..

echo ========== 2. BUILDING PROVIDER APK ==========
copy /y "dist\provider.html" "dist\index.html" >nul

set APP_VARIANT=provider
call npx cap sync android
cd android
call .\gradlew assembleDebug
copy /y "app\build\outputs\apk\debug\app-debug.apk" "%APK_OUT_DIR%\VillageLink-Provider.apk"
cd ..

echo ========== 3. BUILDING ADMIN APK ==========
copy /y "dist\admin.html" "dist\index.html" >nul

set APP_VARIANT=admin
call npx cap sync android
cd android
call .\gradlew assembleDebug
copy /y "app\build\outputs\apk\debug\app-debug.apk" "%APK_OUT_DIR%\VillageLink-Admin.apk"
cd ..

echo ========== CLEANUP & RESTORE REPO STATE ==========
copy /y "dist\index_original.html" "dist\index.html" >nul
set APP_VARIANT=user
call npx cap sync android

echo ========== ALL DONE! APKs stored in: %APK_OUT_DIR% ==========
