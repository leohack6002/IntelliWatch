# Product Spec

## Compact Overlay

The overlay is intentionally small, draggable, always on top, and non-disruptive. It shows:

- CPU usage
- RAM usage
- GPU usage
- Temperature
- Network download speed
- Current system status

Double-clicking or clicking the widget opens the full dashboard.

## Dashboard

The full dashboard includes:

- Live performance graph
- CPU, RAM, GPU, thermal, disk, and battery cards
- AI anomaly state and recommendations
- Intelligent alerts panel
- Top active processes
- Health score

## AI Roadmap

The initial model uses Isolation Forest over recent local telemetry. Future versions can add:

- Per-device seasonal baselines
- App-specific behavior models
- Overheating prediction windows
- Memory leak slope detection
- Suspicious process reputation checks
- Cross-device health comparisons
