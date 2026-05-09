# Setup Guide

This guide is for people cloning IntelliWatch from GitHub.

## 1. Install Prerequisites

Install these first:

- Git: https://git-scm.com/
- Node.js LTS: https://nodejs.org/
- Python 3.11+: https://www.python.org/downloads/

During Python installation, enable:

```text
Add Python to PATH
```

After installing, reopen PowerShell and verify:

```powershell
git --version
node --version
npm --version
python --version
```

## 2. Clone the Repository

```powershell
git clone <repository-url>
cd intelliwatch
```

## 3. Run Setup

Recommended:

```text
Double-click install.bat
```

The batch installer checks for Git, Node.js, npm, and Python 3.11+. If a tool is missing, it prints the download URL for that tool.

Command-line alternative:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

The setup script:

- Creates `.venv`
- Installs Python dependencies
- Installs root Electron dependencies
- Installs React UI dependencies
- Verifies `.venv`, root `node_modules`, and React `node_modules`

## 4. Launch the App

Recommended:

```text
Double-click launch.bat
```

Command-line alternative:

```powershell
npm run launch
```

The overlay appears after the startup delay. By default this is 30 seconds. During the wait, the tray tooltip shows startup progress messages.

## 5. Run Checks

```powershell
npm run check:python
npm run build:ui
```

## 6. Build Installer

```powershell
npm run build
```

Installer files are created in:

```text
installer/dist/
```

## Troubleshooting

### node is not recognized

Install Node.js LTS and reopen your terminal.

### python is not recognized

Install Python 3.11+ and enable `Add Python to PATH`.

### Overlay does not appear immediately

This is expected. IntelliWatch waits before showing the overlay so the system can stabilize after startup.

### GPU monitoring is unavailable

`GPUtil` depends on GPU driver support. IntelliWatch shows "GPU monitoring not supported on this system" when GPU telemetry is unavailable. CPU, RAM, disk, network, battery, and processes still work.

### Backend API returns 401 Unauthorized

If `INTELLIWATCH_API_TOKEN` is configured, send the same value in the `X-API-Token` request header. Leave the environment variable unset for the default local development workflow.
