$ErrorActionPreference = "Stop"

Write-Host "IntelliWatch setup started..." -ForegroundColor Cyan

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "$Name was not found." -ForegroundColor Red
    Write-Host $InstallHint -ForegroundColor Yellow
    exit 1
  }
}

function Get-NpmCommand {
  $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($npmCmd) {
    return $npmCmd.Source
  }
  return "npm"
}

Require-Command "python" "Install Python 3.11+ from https://www.python.org/downloads/ and enable Add Python to PATH."
Require-Command "node" "Install Node.js LTS from https://nodejs.org/ and reopen your terminal."
Require-Command "npm" "npm is installed with Node.js. Reinstall Node.js LTS if this is missing."
$NpmCommand = Get-NpmCommand

if (-not (Test-Path ".venv")) {
  Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
  python -m venv .venv
}

Write-Host "Installing Python monitoring dependencies..." -ForegroundColor Cyan
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r monitoring-engine\requirements.txt

Write-Host "Installing Electron dependencies..." -ForegroundColor Cyan
& $NpmCommand install

Write-Host "Installing React UI dependencies..." -ForegroundColor Cyan
& $NpmCommand --prefix desktop\react-ui install

Write-Host "Configuring environment variables..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created root .env from example." -ForegroundColor Gray
}
if (-not (Test-Path "desktop\react-ui\.env")) {
  Copy-Item "desktop\react-ui\.env.example" "desktop\react-ui\.env"
  Write-Host "Created React UI .env from example." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Launch IntelliWatch with: npm run launch" -ForegroundColor Green

Write-Host ""
Write-Host "Verifying IntelliWatch components..." -ForegroundColor Cyan

# Self-check the key install outputs without changing the setup flow above.
$verificationChecks = @(
  @{ Name = "Python virtual environment"; Path = ".venv" },
  @{ Name = "Electron packages"; Path = "node_modules" },
  @{ Name = "React packages"; Path = "desktop\react-ui\node_modules" }
)

$allComponentsInstalled = $true
foreach ($check in $verificationChecks) {
  if (Test-Path $check.Path) {
    Write-Host "OK - $($check.Name)" -ForegroundColor Green
  } else {
    Write-Host "FAILED - $($check.Name)" -ForegroundColor Red
    $allComponentsInstalled = $false
  }
}

if ($allComponentsInstalled) {
  Write-Host "All components installed successfully." -ForegroundColor Green
} else {
  Write-Host "Setup incomplete. Please re-run install.bat." -ForegroundColor Red
}
