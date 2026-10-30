
    
  
@echo off
setlocal EnableExtensions
 title FANG Atlas Launcher

rem Always work from the folder containing this batch file.
cd /d "%~dp0"

if not exist "package.json" (
    echo ERROR: This launcher must be in your bot breakdown folder, next to package.json.
    echo Current folder: %CD%
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm was not found. Make sure Node.js is installed.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing missing project dependencies...
    call npm.cmd install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

echo Starting FANG Atlas in a new command window...
start "FANG Atlas Server" /D "%~dp0" cmd /k "npm.cmd run dev -- --host 127.0.0.1 --port 5173"

echo Waiting briefly before opening your browser...
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/"

echo The website is opening. Keep the "FANG Atlas Server" window open.
endlocal

