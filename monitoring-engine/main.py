import asyncio
import gc
import json
import logging
import os
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import websockets

from ai.anomaly_detector import AnomalyDetector
from alerts.rules import evaluate_alerts
from analyzers.health import calculate_health_score
from collectors.system import SystemCollector
from storage import MetricStore


HOST = "127.0.0.1"
PORT = 8765
INTERVAL_SECONDS = 5
COLLECTOR_THROTTLE_SECONDS = 0.1
AI_ANALYSIS_INTERVAL_CYCLES = 10
BROADCAST_INTERVAL_SECONDS = 3
GC_INTERVAL_CYCLES = 50
MEMORY_READING_LIMIT = 100
SETTINGS_PATH = Path(os.getenv("INTELLIWATCH_CONFIG_PATH", Path.home() / ".intelliwatch" / "settings.json"))
DEFAULT_SETTINGS = {
    "startupDelay": 30,
    "monitoringInterval": INTERVAL_SECONDS,
    "thresholds": {"cpu": 90, "ram": 85, "temperature": 80},
    "monitors": {"cpu": True, "ram": True, "network": True, "disk": True, "gpu": True},
    "theme": "dark",
}
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class MonitoringEngine:
    def __init__(self):
        self.collector = SystemCollector()
        self.detector = AnomalyDetector()
        self.store = MetricStore()
        self.clients = set()
        self.collection_cycle = 0
        self.latest_ai_result = {"anomaly": False, "score": 0.0, "insights": ["AI analysis warming up."]}
        self.last_broadcast_at = 0.0
        self.recent_readings = deque(maxlen=MEMORY_READING_LIMIT)
        self.alert_counts = {"cpu": 0, "ram": 0, "temperature": 0}
        self.last_cleanup_day = None
        self.shutdown_requested = asyncio.Event()
        self.settings = self.load_settings()

    async def register(self, websocket):
        self.clients.add(websocket)
        try:
            async for message in websocket:
                if message == "shutdown":
                    self.shutdown_requested.set()
                    await websocket.close()
                    break
        finally:
            self.clients.discard(websocket)

    async def collect_loop(self):
        while not self.shutdown_requested.is_set():
            self.settings = self.load_settings()
            self.collection_cycle += 1
            metrics = self.collector.snapshot()
            self.apply_monitor_settings(metrics)
            time.sleep(COLLECTOR_THROTTLE_SECONDS)
            processes = self.collector.processes(limit=12)
            time.sleep(COLLECTOR_THROTTLE_SECONDS)
            self.update_alert_counts(metrics)
            alerts = evaluate_alerts(
                metrics,
                processes,
                persistent_counts=self.alert_counts,
                thresholds=self.settings.get("thresholds"),
            )
            time.sleep(COLLECTOR_THROTTLE_SECONDS)
            if self.collection_cycle % AI_ANALYSIS_INTERVAL_CYCLES == 0:
                self.latest_ai_result = self.detector.evaluate(metrics)
            ai_result = self.latest_ai_result
            status = self.resolve_status(alerts, ai_result)
            packet = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": status,
                "health_score": calculate_health_score(metrics, alerts, ai_result),
                "metrics": metrics,
                "alerts": alerts,
                "ai": ai_result,
                "processes": processes,
                "storage": self.store.usage(),
            }

            self.store.insert(packet)
            self.recent_readings.append(packet)
            self.run_periodic_maintenance()
            await self.broadcast(packet)
            del packet, processes, alerts
            await asyncio.sleep(self.monitoring_interval())

        self.store.close()

    async def broadcast(self, packet):
        if not self.clients:
            return
        now = time.monotonic()
        if now - self.last_broadcast_at < BROADCAST_INTERVAL_SECONDS:
            return
        self.last_broadcast_at = now
        message = json.dumps(packet)
        disconnected = []
        for client in self.clients:
            try:
                await client.send(message)
            except websockets.ConnectionClosed:
                disconnected.append(client)
        for client in disconnected:
            self.clients.discard(client)

    @staticmethod
    def resolve_status(alerts, ai_result):
        levels = {alert["level"] for alert in alerts}
        if "critical" in levels:
            return "critical"
        if "warning" in levels or ai_result.get("anomaly"):
            return "warning"
        return "normal"

    def load_settings(self):
        if not SETTINGS_PATH.exists():
            return DEFAULT_SETTINGS
        try:
            with SETTINGS_PATH.open("r", encoding="utf-8") as file:
                saved = json.load(file)
            return {
                **DEFAULT_SETTINGS,
                **saved,
                "thresholds": {**DEFAULT_SETTINGS["thresholds"], **saved.get("thresholds", {})},
                "monitors": {**DEFAULT_SETTINGS["monitors"], **saved.get("monitors", {})},
            }
        except Exception as error:
            logging.error("Failed to load settings from %s: %s", SETTINGS_PATH, error)
            return DEFAULT_SETTINGS

    def monitoring_interval(self):
        interval = int(self.settings.get("monitoringInterval", INTERVAL_SECONDS))
        return interval if interval in {2, 5, 10} else INTERVAL_SECONDS

    def apply_monitor_settings(self, metrics):
        monitors = self.settings.get("monitors", {})
        if not monitors.get("cpu", True):
            metrics["cpu_percent"] = 0
        if not monitors.get("ram", True):
            metrics["ram_percent"] = 0
        if not monitors.get("network", True):
            metrics["network_down_bps"] = 0
            metrics["network_up_bps"] = 0
        if not monitors.get("disk", True):
            metrics["disk_percent"] = 0
        if not monitors.get("gpu", True):
            metrics["gpu_percent"] = 0

    def update_alert_counts(self, metrics):
        thresholds = self.settings.get("thresholds", DEFAULT_SETTINGS["thresholds"])
        checks = {
            "cpu": metrics["cpu_percent"] > thresholds["cpu"],
            "ram": metrics["ram_percent"] > thresholds["ram"],
            "temperature": metrics["temperature_c"] and metrics["temperature_c"] > thresholds["temperature"],
        }
        for key, active in checks.items():
            self.alert_counts[key] = self.alert_counts[key] + 1 if active else 0

    def run_periodic_maintenance(self):
        today = datetime.now(timezone.utc).date()
        if self.last_cleanup_day != today:
            self.store.cleanup()
            self.last_cleanup_day = today
        else:
            self.store.enforce_size_limit()
        if self.collection_cycle % GC_INTERVAL_CYCLES == 0:
            gc.collect()


async def main():
    engine = MonitoringEngine()
    async with websockets.serve(engine.register, HOST, PORT):
        logging.info("IntelliWatch monitoring engine listening on ws://%s:%s", HOST, PORT)
        await engine.collect_loop()


if __name__ == "__main__":
    asyncio.run(main())
