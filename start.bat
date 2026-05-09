@echo off
setlocal
cd /d "%~dp0"

echo Checking IntelliWatch installation...

set "READY=1"

if not exist ".venv" set "READY=0"
if not exist "node_modules" set "READY=0"
if not exist "desktop\react-ui\node_modules" set "READY=0"

if "%READY%"=="0" (
    echo.
    echo Application is not set up. Starting installation...
    echo.
    call install.bat
    if errorlevel 1 (
        echo.
        echo Installation failed. Please check the errors above.
        pause
        exit /b 1
    )
)

echo.
echo Application ready. Launching IntelliWatch...
echo.
call launch.bat
