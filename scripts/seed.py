"""Seed dosen + 43 mahasiswa + 10 soal contoh + latihan demo.
Idempoten — aman dijalankan berulang kali.

Jalankan: python scripts/seed.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from lib import db  # noqa: E402
from lib.auth import hash_password  # noqa: E402
from lib.seed_questions import SEED_QUESTIONS  # noqa: E402
from lib.students_data import STUDENTS  # noqa: E402

LECTURER_EMAIL = os.environ.get("DEFAULT_LECTURER_EMAIL", "dosen@kwgn.id")
LECTURER_NAME = os.environ.get("DEFAULT_LECTURER_NAME", "Dosen Kewarganegaraan")
LECTURER_PASSWORD = os.environ.get("DEFAULT_LECTURER_PASSWORD", "kwgn2026")


def upsert_lecturer() -> int:
    row = db.query_one(
        "SELECT id FROM users WHERE email=? AND role='lecturer'",
        (LECTURER_EMAIL,),
    )
    if row:
        print(f"[seed] Dosen sudah ada: {LECTURER_EMAIL} (id={row['id']})")
        return row["id"]
    db.execute(
        "INSERT INTO users (role, email, name, password_hash) VALUES ('lecturer', ?, ?, ?)",
        (LECTURER_EMAIL, LECTURER_NAME, hash_password(LECTURER_PASSWORD)),
    )
    new_id = db.last_insert_id()
    print(f"[seed] Dosen dibuat: {LECTURER_EMAIL} (id={new_id})  password awal: {LECTURER_PASSWORD}")
    return new_id


def upsert_students() -> None:
    created = skipped = 0
    for nim, name in STUDENTS:
        existing = db.query_one("SELECT id FROM users WHERE nim=?", (nim,))
        if existing:
            skipped += 1
            continue
        db.execute(
            "INSERT INTO users (role, nim, name, password_hash) VALUES ('student', ?, ?, ?)",
            (nim, name, hash_password(nim)),  # password awal = NIM
        )
        created += 1
    print(f"[seed] Mahasiswa: {created} baru, {skipped} sudah ada (target: {len(STUDENTS)}).")


def upsert_questions(lecturer_id: int) -> None:
    created = skipped = 0
    for q in SEED_QUESTIONS:
        existing = db.query_one(
            "SELECT id FROM questions WHERE topic=? AND text=?",
            (q["topic"], q["text"]),
        )
        if existing:
            skipped += 1
            continue
        db.execute(
            """INSERT INTO questions
                 (topic, text, type, options_json, correct_index, explanation,
                  source_ref, difficulty, time_limit, max_points, created_by)
               VALUES (?, ?, 'mcq', ?, ?, ?, ?, ?, ?, 1000, ?)""",
            (
                q["topic"],
                q["text"],
                json.dumps(q["options"]),
                q["correct_index"],
                q["explanation"],
                q["source_ref"],
                q["difficulty"],
                q.get("time_limit", 20),
                lecturer_id,
            ),
        )
        created += 1
    print(f"[seed] Soal: {created} baru, {skipped} sudah ada.")


def upsert_demo_quiz(lecturer_id: int) -> None:
    title = "Latihan Mandiri: Pengantar PKn"
    existing = db.query_one("SELECT id FROM quizzes WHERE title=?", (title,))
    if existing:
        print(f"[seed] Latihan demo sudah ada (id={existing['id']}).")
        return
    db.execute(
        """INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by)
           VALUES (?, ?, 'practice', 'individual', 'open', 1, ?)""",
        (
            title,
            "Latihan pemanasan PKn. Boleh diulang sebanyak yang Anda mau.",
            lecturer_id,
        ),
    )
    quiz_id = db.last_insert_id()
    qrows = db.query_all("SELECT id FROM questions ORDER BY id ASC")
    for i, q in enumerate(qrows):
        db.execute(
            "INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)",
            (quiz_id, q["id"], i),
        )
    print(f"[seed] Latihan demo dibuat (id={quiz_id}, {len(qrows)} soal, status=OPEN).")


def main() -> None:
    # Pastikan tabel sudah ada
    db.query_one("SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1")
    lecturer_id = upsert_lecturer()
    upsert_students()
    upsert_questions(lecturer_id)
    upsert_demo_quiz(lecturer_id)
    print("[seed] Selesai.")


if __name__ == "__main__":
    main()
