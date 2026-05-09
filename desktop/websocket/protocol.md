# IntelliWatch WebSocket Protocol

The monitoring engine publishes one JSON packet every two seconds on `ws://127.0.0.1:8765`.

```json
{
  "timestamp": "2026-05-08T10:00:00Z",
  "status": "normal",
  "health_score": 92,
  "metrics": {
    "cpu_percent": 34,
    "ram_percent": 58,
    "gpu_percent": 41,
    "temperature_c": 61,
    "network_down_bps": 12582912,
    "network_up_bps": 262144,
    "disk_percent": 46,
    "battery_percent": 88
  },
  "alerts": [],
  "ai": {
    "anomaly": false,
    "confidence": 0.91,
    "insights": ["System load is within normal range."]
  },
  "processes": []
}
```
