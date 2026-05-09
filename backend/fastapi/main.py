import json
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


DB_PATH = Path(__file__).resolve().parents[1] / "database" / "intelliwatch.sqlite"
app = FastAPI(title="IntelliWatch Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_api_token(request: Request, call_next):
    # Keep local development open unless a static API token is explicitly configured.
    token = os.getenv("INTELLIWATCH_API_TOKEN")
    if token and request.headers.get("X-API-Token") != token:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
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
    connection.commit()
    return connection


@app.get("/health")
def health():
    return {"status": "ok", "database": DB_PATH.exists()}


@app.get("/metrics/latest")
def latest_metric():
    with connect() as db:
        row = db.execute(
            "SELECT payload FROM metric_events ORDER BY id DESC LIMIT 1"
        ).fetchone()
    return json.loads(row[0]) if row else {"message": "No metrics recorded yet."}


@app.get("/metrics/history")
def metric_history(limit: int = 120):
    safe_limit = min(max(limit, 1), 1000)
    with connect() as db:
        rows = db.execute(
            "SELECT payload FROM metric_events ORDER BY id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return [json.loads(row[0]) for row in reversed(rows)]
