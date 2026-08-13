@echo off
title VillageLink Firewall Fixer
cls
echo ====================================================================
echo 🛡️ VILLAGELINK WINDOWS FIREWALL RULE CONFIGURATION
echo ====================================================================
echo.
echo Allowing inbound traffic on Ports 3000 and 3001 for Wi-Fi live hosting...
echo.

netsh advfirewall firewall delete rule name="VillageLink Host Port 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="VillageLink Host Port 3001" >nul 2>&1

netsh advfirewall firewall add rule name="VillageLink Host Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="VillageLink Host Port 3001" dir=in action=allow protocol=TCP localport=3001 profile=any

echo.
echo ====================================================================
echo ✅ FIREWALL RULES ADDED SUCCESSFULLY!
echo You can now connect from any mobile/device on the same Wi-Fi network.
echo ====================================================================
echo.
pause
