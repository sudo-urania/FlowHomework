"""Small SQLite data layer for local development."""
import sqlite3
from contextlib import contextmanager
from config import DATABASE_PATH

@contextmanager
def connect():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            term_id TEXT NOT NULL DEFAULT 'default',
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS availability_blocks (
            id TEXT PRIMARY KEY,
            term_id TEXT NOT NULL,
            name TEXT NOT NULL,
            weekdays TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            type TEXT NOT NULL
        )""")
