@echo off
echo ==========================================
echo 🚀 Starting ADMIN APK Build Process
echo ==========================================

echo [1/4] Building React App...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build Failed!
    pause
    exit /b %errorlevel%
)

echo [2/4] Switching Entry Point to Admin...
cd frontend\dist
copy /Y admin.html index.html >nul
cd ..\..

echo [3/4] Syncing Capacitor to Android...
cd frontend
set APP_VARIANT=admin
set VL_APP_ID=com.villagelink.admin
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Sync Failed!
    cd ..
    set APP_VARIANT=
set VL_APP_ID=
    pause
    exit /b %errorlevel%
)

echo [4/4] Opening Android Studio...
call npx cap open android
cd ..
set APP_VARIANT=
set VL_APP_ID=

echo ==========================================
echo ✅ Admin Process Complete! Android Studio will open for APK Generation.
echo ==========================================
pause
