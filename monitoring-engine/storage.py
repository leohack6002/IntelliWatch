import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "backend" / "database" / "intelliwatch.sqlite"


class MetricStore:
    def __init__(self, path=DB_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path)
        self.connection.execute(
            """
            CREATE TABLE IF NOT EXISTS metric_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL,
                health_score INTEGER NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        self.connection.commit()

    def insert(self, packet):
        self.connection.execute(
            "INSERT INTO metric_events(timestamp, status, health_score, payload) VALUES (?, ?, ?, ?)",
            (packet["timestamp"], packet["status"], packet["health_score"], json.dumps(packet)),
        )
        self.connection.commit()
