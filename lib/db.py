"""Wrapper SQLite dengan helper query parameterized & inisialisasi skema.

Semua akses DB di seluruh app HARUS lewat helper di sini supaya:
- foreign keys aktif
- timeout SQLite konsisten (Streamlit punya banyak rerun)
- error message ramah
"""

from __future__ import annotations

import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterable, Sequence

from .schema import SCHEMA_SQL


def _resolve_db_path() -> str:
    """Tentukan path DB berdasarkan env var atau default ./data/kwgn.db."""
    raw = os.environ.get("DATABASE_PATH") or "./data/kwgn.db"
    p = Path(raw).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    return str(p)


_PATH = _resolve_db_path()
# Lock untuk operasi tulis: SQLite di mode WAL bisa concurrent baca, tapi tulis
# tetap serial. Streamlit rerun bisa banyak, lock ini sederhana & cukup.
_WRITE_LOCK = threading.RLock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(
        _PATH,
        timeout=15.0,            # tunggu lock max 15 detik sebelum lempar
        isolation_level=None,    # autocommit; transaksi via BEGIN/COMMIT eksplisit
        check_same_thread=False,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


@contextmanager
def cursor():
    """Context manager untuk satu cursor; commit otomatis di exit."""
    conn = _connect()
    try:
        cur = conn.cursor()
        yield cur
    finally:
        conn.close()


def init_schema() -> None:
    """Eksekusi seluruh SCHEMA_SQL. Idempoten karena CREATE ... IF NOT EXISTS."""
    statements = [s.strip() for s in SCHEMA_SQL.split(";") if s.strip()]
    with _WRITE_LOCK:
        conn = _connect()
        try:
            for stmt in statements:
                conn.execute(stmt)
        finally:
            conn.close()


def all_(sql: str, params: Sequence[Any] = ()) -> list[dict]:
    """Jalankan SELECT, kembalikan list of dict."""
    with cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def get_(sql: str, params: Sequence[Any] = ()) -> dict | None:
    """Jalankan SELECT, kembalikan satu baris (dict) atau None."""
    with cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def run_(sql: str, params: Sequence[Any] = ()) -> dict:
    """Jalankan INSERT/UPDATE/DELETE. Kembalikan {lastrowid, rowcount}.

    Mengambil lock tulis untuk hindari `database is locked` saat banyak rerun.
    """
    with _WRITE_LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute(sql, params)
            return {"lastrowid": cur.lastrowid or 0, "rowcount": cur.rowcount}
        finally:
            conn.close()


def run_many(sql: str, seq_params: Iterable[Sequence[Any]]) -> int:
    """Bulk insert/update via executemany."""
    with _WRITE_LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.executemany(sql, list(seq_params))
            return cur.rowcount
        finally:
            conn.close()


@contextmanager
def transaction():
    """Eksekusi banyak statement dalam satu transaksi atomic.

    Pemakaian:
        with transaction() as tx:
            tx.execute("INSERT ...", (...))
            tx.execute("UPDATE ...", (...))
        # auto-commit kalau tidak ada exception, rollback kalau ada
    """
    with _WRITE_LOCK:
        conn = _connect()
        try:
            conn.execute("BEGIN")
            try:
                yield conn
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise
        finally:
            conn.close()


def db_path() -> str:
    """Path DB aktif (untuk debug)."""
    return _PATH
