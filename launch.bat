@echo off
setlocal
cd /d "%~dp0"

REM npm is required because launch.bat delegates to the existing npm launch script.
where npm >nul 2>nul
if errorlevel 1 (
  echo Please run install.bat first
  pause
  exit /b 1
)

npm run launch
pause
