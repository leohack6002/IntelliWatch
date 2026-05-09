# IntelliWatch

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-blue?logo=windows)
![Python](https://img.shields.io/badge/python-3.11+-yellow?logo=python)
![Node](https://img.shields.io/badge/node-20LTS-green?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

IntelliWatch is an AI-powered desktop monitoring application for Windows. It runs as a lightweight Electron app, streams live system telemetry from a Python monitoring engine, and displays a compact futuristic overlay at the bottom-right of the screen. Clicking the overlay opens a full dashboard with charts, alerts, active processes, AI insights, and system health scoring.

## Preview

The overlay sits at the bottom-right of your screen
showing live system stats at a glance.
Click the overlay to open the full
IntelliWatch Command Center dashboard.

> (Add overlay screenshot and dashboard screenshot here)

## Highlights

- Compact always-on-top desktop overlay
- Full React dashboard with live graphs
- CPU, RAM, Disk, Battery and Uptime monitoring
- WiFi signal strength and upload/download speeds
- GPU and Temperature monitoring (hardware dependent)
- WebSocket updates every 2 seconds
- Intelligent warning and critical alerts
- AI anomaly detection with Isolation Forest
- SQLite performance history
- System tray support with live stats tooltip
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

## Quick Start

### For Normal Users
1. Go to [Releases](https://github.com/leohack6002/IntelliWatch/releases)
2. Download **IntelliWatch Setup 0.1.0.exe**
3. Double-click to install
4. App auto-starts on next Windows login
5. Overlay appears after 30 seconds
6. Click overlay to open full dashboard
7. No terminal or coding needed!

### For Developers
```powershell
git clone https://github.com/leohack6002/IntelliWatch.git
cd IntelliWatch
```
Then double-click **start.bat**

`start.bat` is a unified launcher. It automatically runs the
installation if it is the first time you have opened the app,
and then launches the monitoring engine and dashboard.

The launch command starts:

- Python monitoring engine at `ws://127.0.0.1:8765`
- React UI at `http://127.0.0.1:5173`
- Electron desktop shell

The overlay appears after the configured startup delay (default
is 30 seconds). This allows the system to stabilize before
telemetry starts. You can adjust this in the `.env` file via
`INTELLIWATCH_STARTUP_DELAY_MS`.

During the delay, the tray tooltip shows startup progress messages.

## Download and Install (For Normal Users)

- Go to [GitHub Releases](https://github.com/leohack6002/IntelliWatch/releases)
- Download **IntelliWatch Setup 0.1.0.exe**
- Double-click the installer to install IntelliWatch
- The app auto-starts on the next Windows login

## Developer Setup (For Contributors)

1. Install Git, Node.js LTS, and Python 3.11+
2. Clone the repo
3. Double-click `start.bat`
4. The overlay appears after about 30 seconds

## System Requirements

- Windows 10 or Windows 11
- Node.js LTS
- Python 3.11+

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

If `INTELLIWATCH_API_TOKEN` is set, FastAPI requests must include
`X-API-Token` with the same value. If it is unset, backend auth
is skipped for local development.

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

## Current Status

| Feature | Status |
|---|---|
| Python monitoring engine | ✅ Working |
| React dashboard | ✅ Working |
| Electron overlay | ✅ Working |
| WebSocket live updates | ✅ Working |
| AI anomaly detection | ✅ Working |
| SQLite history | ✅ Working |
| Windows installer | ✅ Working |
| Auto-start on login | ✅ Working |
| CPU monitoring | ✅ Working |
| RAM monitoring | ✅ Working |
| Disk monitoring | ✅ Working |
| Battery monitoring | ✅ Working |
| System uptime | ✅ Working |
| WiFi signal strength | ✅ Working |
| Upload/Download speeds | ✅ Working |
| GPU monitoring | ⚠️ Hardware dependent |
| Temperature monitoring | ⚠️ Hardware dependent |
| Bundled Python runtime | 🔜 Planned |
| Auto-update support | 🔜 Planned |
| Linux / macOS support | 🔜 Planned |

## Known Limitations

- GPU monitoring requires compatible hardware
- Temperature monitoring requires compatible hardware
- Auto-start works only with the packaged installer
- Development mode requires terminal to stay open

## Troubleshooting

- node not recognized: reinstall Node.js LTS
- python not recognized: reinstall Python with Add to PATH
- Overlay delay: wait 30 seconds, this is normal
- GPU shows unavailable: hardware not supported, other features still work
- Temperature shows 0C: hardware sensor not exposed, try running as administrator
- WiFi shows ETH or NET: WiFi adapter name not detected, still shows correct speed

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

## Contributing

Contributions are welcome!

- Fork the repository
- Create a feature branch: `git checkout -b feature/your-feature`
- Commit your changes: `git commit -m "Add your feature"`
- Push to the branch: `git push origin feature/your-feature`
- Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## License

MIT

---
Made with ❤️ by [Leopold Limson](https://github.com/leohack6002)
