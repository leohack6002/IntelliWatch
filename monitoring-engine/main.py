import asyncio
import json
import logging
from datetime import datetime, timezone

import websockets

from ai.anomaly_detector import AnomalyDetector
from alerts.rules import evaluate_alerts
from analyzers.health import calculate_health_score
from collectors.system import SystemCollector
from storage import MetricStore


HOST = "127.0.0.1"
PORT = 8765
INTERVAL_SECONDS = 2
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class MonitoringEngine:
    def __init__(self):
        self.collector = SystemCollector()
        self.detector = AnomalyDetector()
        self.store = MetricStore()
        self.clients = set()

    async def register(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.clients.discard(websocket)

    async def collect_loop(self):
        while True:
            metrics = self.collector.snapshot()
            processes = self.collector.processes(limit=12)
            alerts = evaluate_alerts(metrics, processes)
            ai_result = self.detector.evaluate(metrics)
            status = self.resolve_status(alerts, ai_result)
            packet = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": status,
                "health_score": calculate_health_score(metrics, alerts, ai_result),
                "metrics": metrics,
                "alerts": alerts,
                "ai": ai_result,
                "processes": processes,
            }

            self.store.insert(packet)
            await self.broadcast(packet)
            await asyncio.sleep(INTERVAL_SECONDS)

    async def broadcast(self, packet):
        if not self.clients:
            return
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


async def main():
    engine = MonitoringEngine()
    async with websockets.serve(engine.register, HOST, PORT):
        logging.info("IntelliWatch monitoring engine listening on ws://%s:%s", HOST, PORT)
        await engine.collect_loop()


if __name__ == "__main__":
    asyncio.run(main())
