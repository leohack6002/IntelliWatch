import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

CONFIG_PATH_VALUE = os.getenv("INTELLIWATCH_CONFIG_PATH")
DATA_DIR_VALUE = os.getenv("INTELLIWATCH_DATA_DIR")
DATA_DIR = Path(DATA_DIR_VALUE) if DATA_DIR_VALUE else (Path(CONFIG_PATH_VALUE).parent if CONFIG_PATH_VALUE else None)
DB_PATH = DATA_DIR / "intelliwatch.sqlite" if DATA_DIR else Path(__file__).resolve().parents[1] / "backend" / "database" / "intelliwatch.sqlite"
MAX_DATABASE_BYTES = 50 * 1024 * 1024
RETENTION_DAYS = 7


class SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bool):
            return int(obj)
        return super().default(obj)


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
            (
                packet["timestamp"],
                packet["status"],
                packet["health_score"],
                json.dumps(packet, cls=SafeEncoder),
            ),
        )
        self.connection.commit()

    def cleanup(self):
        cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
        self.connection.execute("DELETE FROM metric_events WHERE timestamp < ?", (cutoff,))
        self.connection.commit()
        self.enforce_size_limit()

    def enforce_size_limit(self, max_bytes=MAX_DATABASE_BYTES):
        self.connection.commit()
        while self.path.exists() and self.path.stat().st_size > max_bytes:
            rows = self.connection.execute("SELECT COUNT(*) FROM metric_events").fetchone()[0]
            if rows <= 1:
                break
            delete_count = max(1, rows // 10)
            self.connection.execute(
                """
                DELETE FROM metric_events
                WHERE id IN (
                    SELECT id FROM metric_events ORDER BY id ASC LIMIT ?
                )
                """,
                (delete_count,),
            )
            self.connection.commit()
            self.connection.execute("VACUUM")

    def usage(self):
        size = self.path.stat().st_size if self.path.exists() else 0
        return {
            "bytes": size,
            "max_bytes": MAX_DATABASE_BYTES,
            "percent": round((size / MAX_DATABASE_BYTES) * 100, 1),
            "path": os.fspath(self.path),
        }

    def close(self):
        self.connection.close()
