@echo off
echo ==========================================
echo 🚀 Starting Provider App APK Build (Driver, Kisan, etc.)
echo ==========================================

echo [1/4] Building React App...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build Failed!
    pause
    exit /b %errorlevel%
)

echo [2/4] Switching Entry Point to Provider...
cd frontend\dist
copy /Y provider.html index.html >nul
cd ..\..

echo [3/4] Syncing Capacitor to Android...
cd frontend
set APP_VARIANT=provider
set VL_APP_ID=com.villagelink.provider
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Sync Failed!
    cd ..
    pause
    exit /b %errorlevel%
)

echo [4/4] Opening Android Studio...
call npx cap open android
cd ..
set APP_VARIANT=
set VL_APP_ID=

echo ==========================================
echo ✅ Provider Process Complete! Android Studio will open for APK Generation.
echo ==========================================
pause
