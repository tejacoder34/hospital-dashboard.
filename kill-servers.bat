@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe
echo.
echo All servers stopped. Now you can run start-backend.bat and start.bat again.
pause
