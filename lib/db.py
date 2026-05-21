"""
SQLite wrapper untuk Streamlit. Connection di-cache via st.cache_resource
agar dipakai bersama lintas reruns dalam 1 proses.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Sequence

import streamlit as st


def _try_secret(key: str) -> str | None:
    """Aman terhadap secrets.toml tidak ada (di CLI/scripts)."""
    try:
        return st.secrets.get(key, None) if hasattr(st, "secrets") else None
    except (FileNotFoundError, AttributeError):
        return None


def _resolve_db_path() -> str:
    raw = _try_secret("DATABASE_PATH") or os.environ.get("DATABASE_PATH") or "./data/kwgn.db"
    p = Path(raw)
    p.parent.mkdir(parents=True, exist_ok=True)
    return str(p)


@st.cache_resource(show_spinner=False)
def get_connection() -> sqlite3.Connection:
    """Singleton connection dengan row_factory dict-like."""
    conn = sqlite3.connect(
        _resolve_db_path(),
        check_same_thread=False,
        isolation_level=None,  # autocommit; transaksi manual via BEGIN
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def query_all(sql: str, params: Sequence[Any] = ()) -> list[sqlite3.Row]:
    cur = get_connection().execute(sql, params)
    return cur.fetchall()


def query_one(sql: str, params: Sequence[Any] = ()) -> sqlite3.Row | None:
    cur = get_connection().execute(sql, params)
    return cur.fetchone()


def execute(sql: str, params: Sequence[Any] = ()) -> sqlite3.Cursor:
    return get_connection().execute(sql, params)


def execute_many(sql: str, seq_of_params: Iterable[Sequence[Any]]) -> sqlite3.Cursor:
    return get_connection().executemany(sql, seq_of_params)


def last_insert_id() -> int:
    row = query_one("SELECT last_insert_rowid() AS id")
    return int(row["id"]) if row else 0
