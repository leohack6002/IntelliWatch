# IntelliWatch Architecture

## Runtime Model

IntelliWatch has three cooperating runtime surfaces:

1. Electron owns desktop behavior: tray, auto-launch, overlay window, dashboard window, always-on-top mode, and app lifecycle.
2. React renders the compact floating widget and full dashboard. Both subscribe directly to the local monitoring WebSocket.
3. Python collects metrics, evaluates alerts, runs anomaly detection, stores history in SQLite, and publishes packets every two seconds.

This keeps the overlay lightweight. The UI only renders the newest packet and a short rolling chart buffer, while historical data is written by the engine.

## Startup Flow

1. Windows starts Electron through login item registration.
2. Electron creates the tray and hidden dashboard immediately.
3. Electron waits 30 seconds for system stabilization while the tray tooltip cycles through startup status messages.
4. The compact overlay appears at the bottom-right with a fade-in animation.
5. The Python engine streams metrics through `ws://127.0.0.1:8765`.

When Electron exits, it also terminates the packaged Python monitoring engine process so background Python processes are not left running.

## Alerting

Rule-based alerts cover deterministic conditions:

- CPU above 90% warning, 95% critical
- RAM above 85% warning, 90% critical
- Temperature above 80C warning, 90C critical
- Disk usage above 90% warning, 95% critical
- Low unplugged laptop battery

The AI anomaly detector complements these rules by learning local baseline behavior with Isolation Forest.

## Future Scaling

- Replace direct UI-to-engine WebSocket with an Electron-hosted broker if multiple engines or remote devices are added.
- Move SQLite retention into a scheduled service.
- Add signed update delivery with Electron Builder publishing.
- Add cloud sync through a separate account service instead of embedding credentials in the desktop app.
- Add device enrollment and metrics namespacing for multi-device monitoring.
