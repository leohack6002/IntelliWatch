import sqlite3
from pathlib import Path


def prune_metric_history(db_path: Path, keep_rows: int = 25000):
    with sqlite3.connect(db_path) as db:
        db.execute(
            """
            DELETE FROM metric_events
            WHERE id NOT IN (
                SELECT id FROM metric_events ORDER BY id DESC LIMIT ?
            )
            """,
            (keep_rows,),
        )
        db.commit()
