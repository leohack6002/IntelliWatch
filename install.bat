@echo off
setlocal
cd /d "%~dp0"

set "MISSING=0"

REM Verify required setup tools before running the PowerShell installer.
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found.
  echo Download Git from: https://git-scm.com/download/win
  set "MISSING=1"
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Download Node.js LTS from: https://nodejs.org/
  set "MISSING=1"
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.
  echo npm is included with Node.js LTS: https://nodejs.org/
  set "MISSING=1"
)

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found.
  echo Download Python 3.11+ from: https://www.python.org/downloads/windows/
  set "MISSING=1"
) else (
  python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
  if errorlevel 1 (
    echo Python 3.11 or newer is required.
    echo Download Python 3.11+ from: https://www.python.org/downloads/windows/
    set "MISSING=1"
  )
)

if "%MISSING%"=="1" (
  echo.
  echo Please install the missing tools, reopen this terminal, and run install.bat again.
  pause
  exit /b 1
)

REM Run the existing Windows setup script without changing its internal flow.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Please review the messages above.
  pause
  exit /b 1
)

echo.
echo Setup complete! Run launch.bat to start IntelliWatch.
pause
