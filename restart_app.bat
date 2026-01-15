 
@echo off
echo Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Install Failed.
    pause
    exit /b %errorlevel%
)

echo.
echo 🛠️ Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build Failed.
    pause
    exit /b %errorlevel%
)

echo.
echo 🚀 Starting VillageLink Server...
npm start
