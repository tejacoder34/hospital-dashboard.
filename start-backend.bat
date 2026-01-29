@echo off
echo Starting HealthVault Backend Server...
echo.
set PATH=%PATH%;C:\Program Files\nodejs
cd server
node index.js
