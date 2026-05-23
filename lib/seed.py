"""Seed data demo: 1 dosen + sample mahasiswa + bank soal awal + 1 latihan.

Idempoten: kalau email/NIM sudah ada, skip — supaya restart Streamlit Cloud
tidak duplikat.
"""

from __future__ import annotations

import json
import os

from .auth import hash_password
from .db import all_, get_, run_

DEMO_LECTURER_EMAIL = "dosen@kampus.ac.id"
DEMO_LECTURER_NAME = "Dosen Demo PKn"

# Sample mahasiswa (NIM-name pairs). Pertimbangkan jumlah kecil untuk demo
# Streamlit — bisa ditambah lewat UI.
DEMO_STUDENTS: list[tuple[str, str]] = [
    ("2401001", "Aisyah Nur Hidayah"),
    ("2401002", "Budi Santoso"),
    ("2401003", "Cahya Wulandari"),
    ("2401004", "Dimas Pratama"),
    ("2401005", "Eka Puspita Sari"),
    ("2401006", "Fajar Kurniawan"),
    ("2401007", "Gita Permata"),
    ("2401008", "Hadi Wijaya"),
    ("2401009", "Indah Lestari"),
    ("2401010", "Joko Susanto"),
    ("2401011", "Kartika Dewi"),
    ("2401012", "Lukman Hakim"),
]

DEMO_QUESTIONS: list[dict] = [
    {
        "topic": "Pancasila",
        "text": "Sila ke-3 Pancasila berbunyi...",
        "options": [
            "Ketuhanan Yang Maha Esa",
            "Persatuan Indonesia",
            "Kemanusiaan yang Adil dan Beradab",
            "Keadilan Sosial bagi Seluruh Rakyat Indonesia",
        ],
        "correct_index": 1,
        "explanation": "Sila ke-3 Pancasila adalah 'Persatuan Indonesia'.",
        "source_ref": "Pembukaan UUD 1945 alinea ke-4",
        "difficulty": "easy",
    },
    {
        "topic": "UUD 1945",
        "text": "UUD 1945 ditetapkan oleh PPKI pada tanggal...",
        "options": ["17 Agustus 1945", "18 Agustus 1945", "1 Juni 1945", "29 Mei 1945"],
        "correct_index": 1,
        "explanation": "UUD 1945 ditetapkan pada 18 Agustus 1945, sehari setelah Proklamasi.",
        "source_ref": "Sejarah PPKI",
        "difficulty": "easy",
    },
    {
        "topic": "HAM",
        "text": "Pasal-pasal HAM dalam UUD 1945 (hasil amandemen) terdapat di pasal...",
        "options": [
            "Pasal 27 saja",
            "Pasal 28A sampai 28J",
            "Pasal 30 dan 31",
            "Pasal 33 dan 34",
        ],
        "correct_index": 1,
        "explanation": "Pasca amandemen, HAM dijabarkan secara lengkap di Pasal 28A hingga 28J.",
        "source_ref": "UUD 1945 Pasal 28A-28J",
        "difficulty": "medium",
    },
    {
        "topic": "Bela Negara",
        "text": "Pasal UUD 1945 yang mengatur hak dan kewajiban bela negara adalah...",
        "options": [
            "Pasal 27 ayat (3)",
            "Pasal 28D ayat (1)",
            "Pasal 31 ayat (1)",
            "Pasal 33 ayat (1)",
        ],
        "correct_index": 0,
        "explanation": (
            "'Setiap warga negara berhak dan wajib ikut serta dalam upaya pembelaan negara.'"
        ),
        "source_ref": "Pasal 27 ayat (3) UUD 1945",
        "difficulty": "medium",
    },
    {
        "topic": "Demokrasi",
        "text": "Sistem demokrasi yang dianut Indonesia disebut...",
        "options": [
            "Demokrasi Liberal",
            "Demokrasi Parlementer",
            "Demokrasi Pancasila",
            "Demokrasi Terpimpin",
        ],
        "correct_index": 2,
        "explanation": (
            "Demokrasi Pancasila bersumber pada nilai-nilai Pancasila, terutama sila ke-4."
        ),
        "source_ref": "Pancasila Sila ke-4",
        "difficulty": "easy",
    },
    {
        "topic": "Kewarganegaraan",
        "text": "Asas yang dipakai dalam UU Kewarganegaraan Indonesia adalah...",
        "options": [
            "Hanya ius soli",
            "Hanya ius sanguinis",
            "Ius sanguinis dan ius soli terbatas",
            "Asas teritorial saja",
        ],
        "correct_index": 2,
        "explanation": (
            "UU 12/2006 memakai ius sanguinis sebagai asas utama dengan ius soli terbatas "
            "untuk kasus tertentu."
        ),
        "source_ref": "UU Nomor 12 Tahun 2006",
        "difficulty": "medium",
    },
    {
        "topic": "Wawasan Nusantara",
        "text": "Wawasan Nusantara mulai diakui internasional setelah...",
        "options": [
            "Sumpah Pemuda 1928",
            "Deklarasi Djuanda 1957 dan UNCLOS 1982",
            "Konferensi Asia-Afrika 1955",
            "Reformasi 1998",
        ],
        "correct_index": 1,
        "explanation": (
            "Deklarasi Djuanda 13 Desember 1957 menjadi dasar; pengakuan internasional "
            "tertuang dalam UNCLOS 1982."
        ),
        "source_ref": "Deklarasi Djuanda 1957 & UNCLOS 1982",
        "difficulty": "hard",
    },
    {
        "topic": "Lembaga Negara",
        "text": "Setelah amandemen UUD 1945, status MPR adalah...",
        "options": [
            "Lembaga tertinggi negara",
            "Sederajat dengan lembaga tinggi negara lain",
            "Lembaga eksekutif",
            "Lembaga yudikatif",
        ],
        "correct_index": 1,
        "explanation": (
            "Pasca amandemen, MPR tidak lagi 'tertinggi' melainkan sederajat dengan DPR, "
            "DPD, Presiden, MA, MK, dan BPK."
        ),
        "source_ref": "UUD 1945 hasil amandemen",
        "difficulty": "medium",
    },
    {
        "topic": "Bhinneka Tunggal Ika",
        "text": "Semboyan Bhinneka Tunggal Ika berasal dari kitab...",
        "options": [
            "Negarakertagama",
            "Sutasoma karya Mpu Tantular",
            "Pararaton",
            "Babad Tanah Jawi",
        ],
        "correct_index": 1,
        "explanation": "Semboyan ini diambil dari kitab Sutasoma karya Mpu Tantular abad XIV.",
        "source_ref": "Pasal 36A UUD 1945",
        "difficulty": "easy",
    },
    {
        "topic": "Pancasila",
        "text": "Pancasila ditetapkan sebagai dasar negara pada tanggal...",
        "options": ["1 Juni 1945", "17 Agustus 1945", "18 Agustus 1945", "22 Juni 1945"],
        "correct_index": 2,
        "explanation": (
            "Pancasila ditetapkan oleh PPKI tanggal 18 Agustus 1945 bersamaan dengan "
            "pengesahan UUD 1945."
        ),
        "source_ref": "Sidang PPKI 18 Agustus 1945",
        "difficulty": "easy",
    },
]

DEMO_ESSAY_QUESTIONS: list[dict] = [
    {
        "topic": "Bela Negara",
        "text": (
            "Jelaskan mengapa bela negara penting bagi mahasiswa, dan sebutkan minimal "
            "tiga bentuk bela negara yang relevan dengan profesi calon guru SD/MI."
        ),
        "essay_key_points": [
            "Bela negara sebagai hak dan kewajiban (Pasal 27 ayat 3 UUD 1945)",
            "Pendidikan sebagai bentuk bela negara non-militer",
            "Menanamkan nilai Pancasila & wawasan kebangsaan kepada siswa",
            "Profesionalisme & integritas guru sebagai bentuk pengabdian",
        ],
        "essay_min_words": 80,
        "explanation": (
            "Jawaban yang baik menyebutkan landasan hukum (Pasal 27 ayat 3) dan "
            "menghubungkan bela negara dengan profesi guru."
        ),
        "source_ref": "Pasal 27 ayat (3) UUD 1945; UU 23/2019",
        "difficulty": "hard",
        "max_points": 1500,
    },
]


def _get_default_lecturer_password() -> str:
    """Ambil dari st.secrets / env. Wajib diisi sebelum seed jalan."""
    try:
        import streamlit as st  # noqa: PLC0415

        try:
            pw = st.secrets.get("DEFAULT_LECTURER_PASSWORD", "")
        except Exception:
            pw = ""
    except ImportError:
        pw = ""
    if not pw:
        pw = os.environ.get("DEFAULT_LECTURER_PASSWORD", "")
    return pw


def seed_if_empty() -> dict:
    """Lihat apakah ada users sama sekali; kalau kosong, seed default.

    Return dict info (apa yang ter-seed). Idempoten — kalau ada user, return
    {'seeded': False}.
    """
    existing = get_("SELECT COUNT(*) AS c FROM users")
    if existing and existing["c"] > 0:
        return {"seeded": False}

    pw = _get_default_lecturer_password()
    if not pw or len(pw) < 6:
        return {
            "seeded": False,
            "error": (
                "DEFAULT_LECTURER_PASSWORD belum di-set di .streamlit/secrets.toml "
                "(minimal 6 karakter). App dapat dipakai tapi belum bisa login dosen."
            ),
        }

    # 1. Seed dosen
    lecturer_hash = hash_password(pw)
    res = run_(
        "INSERT INTO users (role, email, name, password_hash) VALUES (?, ?, ?, ?)",
        ("lecturer", DEMO_LECTURER_EMAIL, DEMO_LECTURER_NAME, lecturer_hash),
    )
    lecturer_id = res["lastrowid"]

    # 2. Seed mahasiswa (password = NIM)
    student_ids: list[int] = []
    for nim, name in DEMO_STUDENTS:
        h = hash_password(nim)
        r = run_(
            "INSERT INTO users (role, nim, name, password_hash) VALUES (?, ?, ?, ?)",
            ("student", nim, name, h),
        )
        student_ids.append(r["lastrowid"])

    # 3. Seed bank soal
    question_ids: list[int] = []
    for q in DEMO_QUESTIONS:
        r = run_(
            """INSERT INTO questions
                (topic, text, type, options_json, correct_index, explanation,
                 source_ref, difficulty, time_limit, max_points, created_by)
               VALUES (?, ?, 'mcq', ?, ?, ?, ?, ?, 20, 1000, ?)""",
            (
                q["topic"],
                q["text"],
                json.dumps(q["options"]),
                q["correct_index"],
                q["explanation"],
                q["source_ref"],
                q["difficulty"],
                lecturer_id,
            ),
        )
        question_ids.append(r["lastrowid"])

    for q in DEMO_ESSAY_QUESTIONS:
        r = run_(
            """INSERT INTO questions
                (topic, text, type, options_json, correct_index, explanation,
                 source_ref, difficulty, time_limit, max_points,
                 essay_key_points, essay_min_words, created_by)
               VALUES (?, ?, 'essay', ?, 0, ?, ?, ?, 600, ?, ?, ?, ?)""",
            (
                q["topic"],
                q["text"],
                json.dumps([]),
                q["explanation"],
                q["source_ref"],
                q["difficulty"],
                q["max_points"],
                json.dumps(q["essay_key_points"]),
                q["essay_min_words"],
                lecturer_id,
            ),
        )
        question_ids.append(r["lastrowid"])

    # 4. Seed kuis latihan demo dengan 5 soal MCQ pertama
    quiz = run_(
        """INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by)
           VALUES (?, ?, 'practice', 'individual', 'open', 1, ?)""",
        (
            "Latihan Pengenalan PKn",
            "Latihan dasar Pancasila, UUD 1945, dan HAM. Bisa dikerjakan berulang.",
            lecturer_id,
        ),
    )
    quiz_id = quiz["lastrowid"]
    for pos, qid in enumerate(question_ids[:5], start=1):
        run_(
            "INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)",
            (quiz_id, qid, pos),
        )

    return {
        "seeded": True,
        "lecturer_id": lecturer_id,
        "student_count": len(student_ids),
        "question_count": len(question_ids),
        "quiz_id": quiz_id,
    }


def seed_summary() -> dict:
    """Untuk halaman 'tentang' — info berapa user/soal/kuis."""
    u = all_("SELECT role, COUNT(*) AS c FROM users GROUP BY role")
    q = get_("SELECT COUNT(*) AS c FROM questions") or {"c": 0}
    qz = get_("SELECT COUNT(*) AS c FROM quizzes") or {"c": 0}
    counts = {row["role"]: row["c"] for row in u}
    return {
        "lecturers": counts.get("lecturer", 0),
        "students": counts.get("student", 0),
        "questions": q["c"],
        "quizzes": qz["c"],
    }


# Optional CLI invocation: python -m lib.seed
if __name__ == "__main__":
    from .db import init_schema

    init_schema()
    info = seed_if_empty()
    print(info)
