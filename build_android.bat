@echo off
echo ==========================================
echo 🚀 Starting Relay APK Build Process
echo ==========================================

echo [1/3] Building React App...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build Failed!
    pause
    exit /b %errorlevel%
)

echo [2/3] Syncing Capacitor to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Sync Failed!
    pause
    exit /b %errorlevel%
)

echo [3/3] Opening Android Studio...
call npx cap open android

echo ==========================================
echo ✅ Process Complete! Android Studio should open shortly.
echo ==========================================
pause
