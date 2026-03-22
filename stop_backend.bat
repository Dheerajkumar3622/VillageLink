@echo off
echo Stopping VillageLink Backend...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Backend stopped successfully.
pause
