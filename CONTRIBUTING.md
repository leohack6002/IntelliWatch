# Contributing

Thanks for helping improve IntelliWatch.

## Local Development

```powershell
git clone <repository-url>
cd intelliwatch
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
npm run launch
```

## Pull Request Checklist

- Keep monitoring code lightweight. The engine runs every two seconds.
- Keep UI changes responsive at small overlay sizes.
- Do not commit generated files such as `.venv`, `node_modules`, `__pycache__`, SQLite databases, or installer output.
- Run `npm run check:python` before opening a PR.
- Run `npm run build` when Node.js is available.

## Architecture Notes

- Electron owns tray, startup, overlay, dashboard windows, and app lifecycle.
- React owns the overlay and dashboard UI.
- Python owns metrics collection, AI anomaly detection, alerting, and SQLite history.
- WebSockets are the real-time bridge between the engine and UI.
