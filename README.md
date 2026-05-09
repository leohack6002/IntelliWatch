# IntelliWatch

IntelliWatch is an AI-powered desktop monitoring application for Windows. It runs as a lightweight Electron app, streams live system telemetry from a Python monitoring engine, and displays a compact futuristic overlay at the bottom-right of the screen. Clicking the overlay opens a full dashboard with charts, alerts, active processes, AI insights, and system health scoring.

## Highlights

- Compact always-on-top desktop overlay
- Full React dashboard with live graphs
- CPU, RAM, GPU, disk, network, battery, process, and temperature monitoring
- WebSocket updates every 2 seconds
- Intelligent warning and critical alerts
- AI anomaly detection with Isolation Forest
- SQLite performance history
- System tray support
- Windows auto-launch support in packaged builds
- Optional FastAPI backend for metric history APIs

## Tech Stack

- Electron
- React
- Tailwind CSS
- Recharts
- Python
- FastAPI
- WebSockets
- SQLite
- psutil, GPUtil, pandas, numpy, scikit-learn

## Requirements

- Windows 10 or Windows 11
- Node.js 20 LTS or newer
- Python 3.11 or newer
- Git

## Download and Install (For Normal Users)

- Go to GitHub Releases.
- Download `IntelliWatch-Setup-vX.X.X.exe`.
- Double-click the installer to install IntelliWatch.
- The app auto-starts on the next Windows login.

## Developer Setup (For Contributors)

1. Install Git, Node.js LTS, and Python 3.11+.
2. Clone the repo.
3. Double-click `start.bat`.
4. The overlay appears after about 30 seconds.

## System Requirements

- Windows 10 or Windows 11
- Node.js LTS
- Python 3.11+

## Quick Start

```powershell
git clone <repository-url>
cd intelliwatch
```

Then double-click:

```text
start.bat
```

`start.bat` is a unified launcher. It automatically runs the installation if it's the first time you've opened the app, and then launches the monitoring engine and dashboard.

The launch command starts:

- Python monitoring engine at `ws://127.0.0.1:8765`
- React UI at `http://127.0.0.1:5173`
- Electron desktop shell

The overlay appears after the configured startup delay (default is 30 seconds). This allows the system to stabilize before telemetry starts. You can adjust this in the `.env` file via `INTELLIWATCH_STARTUP_DELAY_MS`.

During the delay, the tray tooltip shows startup progress messages.

## Developer Commands

```powershell
npm run setup
npm run launch   # Starts engine, UI, and Electron concurrently
npm run dev      # Same as launch, useful for development
npm run check:python
npm run build
npm run backend
```

## Optional Backend API

Start the FastAPI backend:

```powershell
npm run backend
```

Available endpoints:

```text
GET http://127.0.0.1:8787/health
GET http://127.0.0.1:8787/metrics/latest
GET http://127.0.0.1:8787/metrics/history
```

## Configuration

Copy `.env.example` if you want local overrides:

```powershell
Copy-Item .env.example .env
Copy-Item desktop/react-ui/.env.example desktop/react-ui/.env
```

Common settings:

```text
INTELLIWATCH_STARTUP_DELAY_MS=30000
INTELLIWATCH_API_TOKEN=
VITE_INTELLIWATCH_WS_URL=ws://127.0.0.1:8765
```

If `INTELLIWATCH_API_TOKEN` is set, FastAPI requests must include `X-API-Token` with the same value. If it is unset, backend auth is skipped for local development.

## Build Installer

Run setup first:

```text
install.bat
```

Then build the installer:

```powershell
npm run build
```

Installer output is written to:

```text
installer/dist/
```

## Known Limitations

- GPU monitoring may be unavailable on unsupported systems.
- Auto-start works only with the packaged installer, not dev mode.

## Troubleshooting

- `node` not recognized: reinstall Node.js LTS.
- `python` not recognized: reinstall Python with Add to PATH.
- Overlay delay: wait 30 seconds, this is normal.
- GPU shows unavailable: hardware not supported, other features still work.

## Project Structure

```text
IntelliWatch/
|-- desktop/
|   |-- electron/
|   |-- react-ui/
|   `-- websocket/
|-- monitoring-engine/
|   |-- collectors/
|   |-- analyzers/
|   |-- alerts/
|   `-- ai/
|-- backend/
|   |-- fastapi/
|   |-- database/
|   `-- services/
|-- assets/
|-- docs/
|-- installer/
|-- scripts/
`-- .github/
```

## Documentation

- [Simple Setup Steps](SETUP_STEPS.md)
- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product Spec](docs/PRODUCT_SPEC.md)
- [WebSocket Protocol](desktop/websocket/protocol.md)

## Current Status

This is a functional startup-ready scaffold. Development mode is ready for contributors. Production packaging is prepared through Electron Builder, but a future release should bundle the Python runtime or document Python as an installer prerequisite.

## License

MIT
