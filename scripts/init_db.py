"""Inisialisasi skema database (idempoten).
Jalankan: python scripts/init_db.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# Tambahkan parent ke path agar bisa import lib
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib import db  # noqa: E402
from lib.schema import SCHEMA_SQL  # noqa: E402


def ensure_column(table: str, column: str, ddl_type: str) -> None:
    cols = db.query_all(f"PRAGMA table_info({table})")
    if any(c["name"] == column for c in cols):
        return
    db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")
    print(f"[init-db] +ALTER {table} ADD {column} {ddl_type}")


def main() -> None:
    conn = db.get_connection()
    statements = [s.strip() for s in SCHEMA_SQL.split(";") if s.strip()]
    for stmt in statements:
        conn.execute(stmt)
    print(f"[init-db] Skema dieksekusi ({len(statements)} statement).")

    # Migrasi backward-compatible
    ensure_column("answers", "essay_text", "TEXT")
    ensure_column("answers", "ai_feedback", "TEXT")
    ensure_column("answers", "original_score", "INTEGER")
    ensure_column("answers", "lecturer_note", "TEXT")
    ensure_column("answers", "reviewed_at", "TEXT")
    ensure_column("questions", "essay_key_points", "TEXT")
    ensure_column("questions", "essay_min_words", "INTEGER")

    print("[init-db] Selesai.")


if __name__ == "__main__":
    main()
