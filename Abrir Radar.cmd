@echo off
cd /d "%~dp0"
start "Radar Venezuela" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3014/"
