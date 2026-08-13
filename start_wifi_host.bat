@echo off
title VillageLink Wi-Fi Live Host
cls
echo ====================================================================
echo 🚀 VILLAGELINK SUPER APP - LOCAL WI-FI LIVE HOSTING
echo ====================================================================
echo.

echo 🔍 Detecting Active Wi-Fi / Local Network IPv4 Address...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "[System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object AddressFamily -eq 'InterNetwork' | Select-Object -First 1 -ExpandProperty IPAddressToString"`) do set LOCAL_IP=%%i

if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

echo --------------------------------------------------------------------
echo 📡 YOUR NETWORK IP: %LOCAL_IP%
echo --------------------------------------------------------------------
echo.
echo 📱 SHARE THESE URLS WITH ANY DEVICE ON THE SAME WI-FI NETWORK:
echo.
echo   🌐 MAIN HUB APP:        http://%LOCAL_IP%:3000/
echo   👤 PASSENGER/USER APP:  http://%LOCAL_IP%:3000/user
echo   🚚 DRIVER/VENDOR APP:   http://%LOCAL_IP%:3000/provider
echo   ⚙️ ADMIN PANEL:         http://%LOCAL_IP%:3000/admin
echo   🔌 BACKEND API:          http://%LOCAL_IP%:3001/api/health
echo   🗄️ DATABASE:             MongoDB Atlas Cloud (Connected & Fully Functional)
echo.
echo ====================================================================
echo ⚡ Starting Backend Server (0.0.0.0:3001) & Frontend (0.0.0.0:3000)...
echo ====================================================================
echo.

npm run dev:full

pause

