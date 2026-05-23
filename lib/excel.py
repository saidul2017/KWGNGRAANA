"""Helper Excel: import bank soal massal + template + bulk add mahasiswa.

Format yang diharapkan untuk import soal:
    Kolom WAJIB:
        type        : 'mcq' atau 'essay'
        topic       : topik pendek (mis. 'Pancasila')
        text        : pertanyaan

    Untuk MCQ, kolom WAJIB tambahan:
        optionA, optionB             : minimal 2 opsi
        correct                      : 'A' / 'B' / 'C' / ... menunjuk opsi yang benar

    Untuk MCQ, kolom OPSIONAL:
        optionC, optionD, optionE, optionF (max 6 opsi)

    Untuk essay, kolom WAJIB tambahan:
        keyPoints    : poin kunci dipisah '|' (mis. 'Pasal 27 UUD|menyebut UU')
        minWords     : minimal jumlah kata jawaban

    Kolom OPSIONAL untuk semua tipe:
        explanation, sourceRef, difficulty (easy/medium/hard),
        timeLimit (detik), maxPoints
"""

from __future__ import annotations

import io
import json
from typing import Iterable

import pandas as pd

from .db import all_, run_, transaction

REQUIRED = ["type", "topic", "text"]
MAX_OPTIONS = 6


def build_template() -> bytes:
    """Bangun file template Excel kosong dengan satu contoh MCQ + satu contoh essay."""
    df = pd.DataFrame(
        [
            {
                "type": "mcq",
                "topic": "Pancasila",
                "text": "Sila ke-3 Pancasila berbunyi...",
                "optionA": "Ketuhanan Yang Maha Esa",
                "optionB": "Persatuan Indonesia",
                "optionC": "Kemanusiaan yang Adil dan Beradab",
                "optionD": "Keadilan Sosial bagi Seluruh Rakyat Indonesia",
                "optionE": "",
                "optionF": "",
                "correct": "B",
                "keyPoints": "",
                "minWords": "",
                "explanation": "Sila ke-3 Pancasila adalah 'Persatuan Indonesia'.",
                "sourceRef": "Pembukaan UUD 1945 alinea ke-4",
                "difficulty": "easy",
                "timeLimit": 20,
                "maxPoints": 1000,
            },
            {
                "type": "essay",
                "topic": "Bela Negara",
                "text": "Jelaskan minimal 3 bentuk bela negara non-militer yang relevan untuk profesi guru.",
                "optionA": "",
                "optionB": "",
                "optionC": "",
                "optionD": "",
                "optionE": "",
                "optionF": "",
                "correct": "",
                "keyPoints": "Pasal 27 ayat 3 UUD 1945|Pendidikan sebagai bela negara|Profesionalisme guru",
                "minWords": 80,
                "explanation": "Jawaban ideal mengaitkan landasan hukum dengan profesi guru.",
                "sourceRef": "Pasal 27 ayat (3) UUD 1945; UU 23/2019",
                "difficulty": "hard",
                "timeLimit": 600,
                "maxPoints": 1500,
            },
        ]
    )
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Soal", index=False)
        # Tab dokumentasi singkat
        doc = pd.DataFrame({
            "Kolom": [
                "type", "topic", "text",
                "optionA-F", "correct",
                "keyPoints", "minWords",
                "explanation", "sourceRef", "difficulty", "timeLimit", "maxPoints",
            ],
            "Wajib?": [
                "WAJIB", "WAJIB", "WAJIB",
                "WAJIB untuk MCQ (min 2)", "WAJIB untuk MCQ (huruf A-F)",
                "WAJIB untuk essay (pisah dengan |)", "WAJIB untuk essay (angka)",
                "opsional", "opsional", "opsional (default medium)",
                "opsional (default 20 detik MCQ / 600 essay)",
                "opsional (default 1000 MCQ / 1500 essay)",
            ],
            "Contoh": [
                "mcq atau essay", "Pancasila", "Sila ke-3 Pancasila...",
                "Ketuhanan Yang Maha Esa", "B",
                "Pasal 27 UUD|UU 23/2019", "80",
                "Sila ke-3 adalah Persatuan...", "UUD 1945 Pasal 27", "easy/medium/hard",
                "20", "1000",
            ],
        })
        doc.to_excel(writer, sheet_name="Petunjuk", index=False)
    return buf.getvalue()


def _parse_row(row: dict, idx: int) -> dict:
    """Parse satu baris Excel ke dict siap-INSERT. Raise ValueError kalau invalid."""
    def s(key: str) -> str:
        v = row.get(key, "")
        if pd.isna(v):
            return ""
        return str(v).strip()

    def i(key: str, default: int) -> int:
        v = row.get(key, default)
        if pd.isna(v) or v == "":
            return default
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    qtype = s("type").lower()
    if qtype not in ("mcq", "essay"):
        raise ValueError(f"baris {idx}: kolom 'type' harus 'mcq' atau 'essay' (dapat: '{qtype}')")
    topic = s("topic")
    text = s("text")
    if not topic or not text:
        raise ValueError(f"baris {idx}: 'topic' dan 'text' wajib diisi")

    difficulty = s("difficulty").lower() or "medium"
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    if qtype == "mcq":
        options: list[str] = []
        for letter in "ABCDEF"[:MAX_OPTIONS]:
            opt = s(f"option{letter}")
            if opt:
                options.append(opt)
        if len(options) < 2:
            raise ValueError(f"baris {idx}: MCQ butuh minimal 2 opsi (optionA, optionB, ...)")
        correct = s("correct").upper()
        if not correct or correct not in "ABCDEF"[: len(options)]:
            raise ValueError(
                f"baris {idx}: kolom 'correct' wajib diisi A-{chr(64 + len(options))}"
            )
        correct_index = "ABCDEF".index(correct)
        if correct_index >= len(options):
            raise ValueError(
                f"baris {idx}: 'correct' menunjuk ke {correct} tapi opsi {correct} kosong"
            )
        return {
            "type": "mcq",
            "topic": topic,
            "text": text,
            "options_json": json.dumps(options),
            "correct_index": correct_index,
            "explanation": s("explanation") or None,
            "source_ref": s("sourceRef") or None,
            "difficulty": difficulty,
            "time_limit": i("timeLimit", 20),
            "max_points": i("maxPoints", 1000),
            "essay_key_points": None,
            "essay_min_words": None,
        }

    # essay
    kp_raw = s("keyPoints")
    if not kp_raw:
        raise ValueError(f"baris {idx}: essay butuh 'keyPoints' (poin dipisah '|')")
    key_points = [p.strip() for p in kp_raw.split("|") if p.strip()]
    if not key_points:
        raise ValueError(f"baris {idx}: 'keyPoints' kosong setelah parsing")
    min_words = i("minWords", 30)
    if min_words < 10:
        min_words = 10
    return {
        "type": "essay",
        "topic": topic,
        "text": text,
        "options_json": "[]",
        "correct_index": 0,
        "explanation": s("explanation") or None,
        "source_ref": s("sourceRef") or None,
        "difficulty": difficulty,
        "time_limit": i("timeLimit", 600),
        "max_points": i("maxPoints", 1500),
        "essay_key_points": json.dumps(key_points),
        "essay_min_words": min_words,
    }


def import_questions_from_xlsx(file_bytes: bytes, user_id: int) -> dict:
    """Import soal dari file .xlsx. Idempoten: skip soal yang (topic, text) sudah ada.

    Return: {'inserted': N, 'skipped': N, 'errors': [list pesan]}
    """
    try:
        df = pd.read_excel(io.BytesIO(file_bytes), sheet_name="Soal")
    except Exception:
        # Coba sheet pertama kalau sheet 'Soal' tidak ada
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
        except Exception as e:
            return {"inserted": 0, "skipped": 0, "errors": [f"Gagal baca file: {e}"]}

    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        return {
            "inserted": 0,
            "skipped": 0,
            "errors": [f"Kolom wajib hilang: {', '.join(missing)}"],
        }
    if len(df) == 0:
        return {"inserted": 0, "skipped": 0, "errors": ["File tidak punya baris data"]}
    if len(df) > 500:
        return {"inserted": 0, "skipped": 0, "errors": ["Maksimum 500 baris per import"]}

    # Cache existing (topic, text) untuk cek duplikat
    existing = all_("SELECT topic, text FROM questions")
    existing_keys = {(r["topic"], r["text"]) for r in existing}

    parsed: list[dict] = []
    errors: list[str] = []
    skipped = 0
    for idx, raw in df.iterrows():
        row_num = int(idx) + 2  # baris 1 = header
        try:
            data = _parse_row(raw.to_dict(), row_num)
        except ValueError as e:
            errors.append(str(e))
            continue
        if (data["topic"], data["text"]) in existing_keys:
            skipped += 1
            continue
        parsed.append(data)
        existing_keys.add((data["topic"], data["text"]))  # cegah duplikat dalam file yg sama

    if not parsed:
        return {"inserted": 0, "skipped": skipped, "errors": errors}

    # Insert dalam satu transaksi
    inserted = 0
    try:
        with transaction() as tx:
            for d in parsed:
                tx.execute(
                    """INSERT INTO questions
                        (topic, text, type, options_json, correct_index, explanation,
                         source_ref, difficulty, time_limit, max_points,
                         essay_key_points, essay_min_words, created_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        d["topic"], d["text"], d["type"], d["options_json"],
                        d["correct_index"], d["explanation"], d["source_ref"],
                        d["difficulty"], d["time_limit"], d["max_points"],
                        d["essay_key_points"], d["essay_min_words"], user_id,
                    ),
                )
                inserted += 1
    except Exception as e:  # noqa: BLE001
        errors.append(f"Transaksi gagal di tengah: {e} — tidak ada soal yang masuk")
        return {"inserted": 0, "skipped": skipped, "errors": errors}

    return {"inserted": inserted, "skipped": skipped, "errors": errors}


def build_students_template() -> bytes:
    """Template Excel untuk bulk-import mahasiswa."""
    df = pd.DataFrame(
        [
            {"nim": "2401001", "name": "Aisyah Nur Hidayah", "password": ""},
            {"nim": "2401002", "name": "Budi Santoso", "password": "passKuat123"},
        ]
    )
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Mahasiswa", index=False)
        doc = pd.DataFrame({
            "Kolom": ["nim", "name", "password"],
            "Wajib?": ["WAJIB unik", "WAJIB", "opsional (default = NIM)"],
            "Contoh": ["2401001", "Aisyah Nur Hidayah", "passKuat123"],
        })
        doc.to_excel(writer, sheet_name="Petunjuk", index=False)
    return buf.getvalue()


def import_students_from_xlsx(file_bytes: bytes) -> dict:
    """Import mahasiswa dari .xlsx. Skip NIM yang sudah ada."""
    from .auth import hash_password  # lazy import — hindari siklus

    try:
        df = pd.read_excel(io.BytesIO(file_bytes), sheet_name="Mahasiswa")
    except Exception:
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
        except Exception as e:
            return {"inserted": 0, "skipped": 0, "errors": [f"Gagal baca file: {e}"]}

    if "nim" not in df.columns or "name" not in df.columns:
        return {"inserted": 0, "skipped": 0, "errors": ["Kolom 'nim' dan 'name' wajib ada"]}
    if len(df) > 500:
        return {"inserted": 0, "skipped": 0, "errors": ["Maksimum 500 baris per import"]}

    existing = all_("SELECT nim FROM users WHERE role='student' AND nim IS NOT NULL")
    existing_nims = {r["nim"] for r in existing}

    inserted = 0
    skipped = 0
    errors: list[str] = []

    for idx, raw in df.iterrows():
        row_num = int(idx) + 2
        nim = str(raw.get("nim") or "").strip()
        name = str(raw.get("name") or "").strip()
        if not nim or not name:
            errors.append(f"baris {row_num}: 'nim' dan 'name' wajib")
            continue
        if nim in existing_nims:
            skipped += 1
            continue
        pw_raw = raw.get("password", "")
        if pd.isna(pw_raw) or str(pw_raw).strip() == "":
            pw = nim
        else:
            pw = str(pw_raw).strip()
        try:
            run_(
                "INSERT INTO users (role, nim, name, password_hash) VALUES ('student', ?, ?, ?)",
                [nim, name, hash_password(pw)],
            )
            inserted += 1
            existing_nims.add(nim)
        except Exception as e:  # noqa: BLE001
            errors.append(f"baris {row_num}: gagal insert ({e})")

    return {"inserted": inserted, "skipped": skipped, "errors": errors}


def list_topics() -> Iterable[str]:
    """Util untuk filter dropdown — daftar topik unik di bank soal."""
    rows = all_("SELECT DISTINCT topic FROM questions ORDER BY topic")
    return [r["topic"] for r in rows]
