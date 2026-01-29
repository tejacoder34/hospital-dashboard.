@echo off
echo Installing Backend Dependencies...
echo.
set PATH=%PATH%;C:\Program Files\nodejs
cd server
npm install
echo.
echo Done! Now run start-backend.bat to start the backend server.
pause
