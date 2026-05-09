$ErrorActionPreference = "Stop"

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "Virtual environment not found. Running setup first..." -ForegroundColor Yellow
  powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
}

$NpmCommand = "npm"
if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) {
  $NpmCommand = (Get-Command "npm.cmd").Source
}

Write-Host "Starting IntelliWatch in development mode..." -ForegroundColor Cyan
& $NpmCommand run dev
