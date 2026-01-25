@echo off
title SmartUML Launcher
echo ==========================================
echo      STARTING SMART-UML (CLIENT)
echo ==========================================
echo.
echo Checking for dependencies...
if not exist "node_modules" (
    echo Node Modules not found. Installing...
    call npm install
)

echo.
echo Starting Application...
echo.
echo (Browser will open automatically)
echo.

:: Agar Vite use kar rahay ho to port 5173 hogi, agar create-react-app to 3000
start http://localhost:5173

call npm run dev
pause