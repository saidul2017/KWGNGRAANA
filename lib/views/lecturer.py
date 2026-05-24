"""View untuk peran 'lecturer' (dosen).

Menu:
- Ringkasan (stats)
- Bank Soal (CRUD)
- Kuis & UAS (CRUD + assign soal + status open/close)
- Kelompok (CRUD + assign mahasiswa)
- Mahasiswa (list + reset password)
- Nilai Kelas (tabel + ekspor Excel)
- Tinjau Esai (override skor AI dengan catatan dosen)
- Profil
"""

from __future__ import annotations

import io
import json
import sqlite3
from datetime import datetime
import pandas as pd
import streamlit as st

from ..auth import change_password, hash_password, logout
from ..db import all_, db_path, get_, run_, transaction
from ..excel import (
    build_template,
    import_questions_from_xlsx,
)


# ---------- Ringkasan ----------
def page_summary() -> None:
    st.title("📊 Ringkasan")

    counts = {
        "students": (get_("SELECT COUNT(*) AS c FROM users WHERE role='student'") or {}).get("c", 0),
        "lecturers": (get_("SELECT COUNT(*) AS c FROM users WHERE role='lecturer'") or {}).get("c", 0),
        "questions": (get_("SELECT COUNT(*) AS c FROM questions") or {}).get("c", 0),
        "quizzes": (get_("SELECT COUNT(*) AS c FROM quizzes") or {}).get("c", 0),
        "groups": (get_("SELECT COUNT(*) AS c FROM groups") or {}).get("c", 0),
        "attempts": (
            get_("SELECT COUNT(*) AS c FROM attempts WHERE status='completed'") or {}
        ).get("c", 0),
    }

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("🎓 Mahasiswa", counts["students"])
    c2.metric("📝 Bank Soal", counts["questions"])
    c3.metric("🏆 Kuis & UAS", counts["quizzes"])
    c4.metric("✅ Pengerjaan", counts["attempts"])

    st.divider()
    st.subheader("Kuis terbaru")
    rows = all_(
        "SELECT id, title, kind, status, created_at FROM quizzes "
        "ORDER BY created_at DESC LIMIT 5"
    )
    if rows:
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada kuis. Buat di menu **Kuis & UAS**.")


# ---------- Bank Soal ----------
def _question_form(initial: dict | None = None) -> dict | None:
    """Tampilkan form soal. Return dict jika user submit, None jika belum."""
    is_edit = initial is not None and initial.get("id")
    initial = initial or {}

    qtype = st.radio(
        "Tipe soal",
        ["mcq", "essay"],
        index=0 if (initial.get("type") or "mcq") == "mcq" else 1,
        horizontal=True,
        format_func=lambda x: "MCQ (Pilihan Ganda)" if x == "mcq" else "Esai (Auto-grading AI)",
        key="qform_type",
    )

    with st.form("qform", clear_on_submit=False):
        c1, c2 = st.columns([1, 1])
        with c1:
            topic = st.text_input("Topik", value=initial.get("topic", ""), placeholder="mis. Pancasila")
        with c2:
            difficulty = st.selectbox(
                "Tingkat",
                ["easy", "medium", "hard"],
                index=["easy", "medium", "hard"].index(initial.get("difficulty", "medium")),
            )
        text = st.text_area(
            "Pertanyaan", value=initial.get("text", ""), height=100, placeholder="Tuliskan pertanyaan..."
        )

        c3, c4 = st.columns(2)
        with c3:
            time_limit = st.number_input(
                "Limit waktu (detik)",
                min_value=5, max_value=600,
                value=int(initial.get("time_limit", 20 if qtype == "mcq" else 600)),
            )
        with c4:
            max_points = st.number_input(
                "Maks poin", min_value=100, max_value=10000, step=100,
                value=int(initial.get("max_points", 1000)),
            )

        options: list[str] = []
        correct_index = 0
        essay_key_points: list[str] = []
        essay_min_words = 30

        if qtype == "mcq":
            existing_opts = initial.get("options") or ["", "", "", ""]
            while len(existing_opts) < 4:
                existing_opts.append("")
            for i in range(4):
                opt = st.text_input(
                    f"Opsi {chr(65 + i)}",
                    value=existing_opts[i] if i < len(existing_opts) else "",
                    key=f"opt_{i}",
                )
                options.append(opt)
            correct_letter = st.selectbox(
                "Jawaban benar",
                ["A", "B", "C", "D"],
                index=int(initial.get("correct_index", 0)),
            )
            correct_index = "ABCD".index(correct_letter)
        else:
            kp_default = initial.get("essay_key_points") or [""]
            kp_text = st.text_area(
                "Poin-poin kunci jawaban (1 baris = 1 poin)",
                value="\n".join(kp_default),
                height=120,
                placeholder="mis.\nMenyebutkan Pasal 27 ayat 3 UUD 1945\nMengaitkan dengan profesi guru\nMencantumkan minimal 1 contoh",
            )
            essay_key_points = [line.strip() for line in kp_text.split("\n") if line.strip()]
            essay_min_words = st.number_input(
                "Minimal jumlah kata jawaban", min_value=10, max_value=500,
                value=int(initial.get("essay_min_words") or 30),
            )

        explanation = st.text_area(
            "Penjelasan (ditampilkan setelah dijawab)",
            value=initial.get("explanation") or "",
            height=80,
        )
        source_ref = st.text_input(
            "Rujukan (opsional)",
            value=initial.get("source_ref") or "",
            placeholder="mis. Pasal 27 ayat (3) UUD 1945",
        )

        submit = st.form_submit_button(
            "💾 Simpan Perubahan" if is_edit else "+ Tambah Soal",
            type="primary",
        )

    if submit:
        if not topic or not text:
            st.error("Topik dan pertanyaan wajib diisi.")
            return None
        if qtype == "mcq":
            if sum(1 for o in options if o.strip()) < 2:
                st.error("MCQ butuh minimal 2 opsi yang terisi.")
                return None
            if not options[correct_index].strip():
                st.error("Opsi yang ditandai benar masih kosong.")
                return None
        else:
            if len(essay_key_points) < 1:
                st.error("Esai butuh minimal 1 poin kunci.")
                return None
        return {
            "topic": topic.strip(),
            "text": text.strip(),
            "type": qtype,
            "options_json": json.dumps([o.strip() for o in options]) if qtype == "mcq" else "[]",
            "correct_index": correct_index if qtype == "mcq" else 0,
            "explanation": explanation.strip() or None,
            "source_ref": source_ref.strip() or None,
            "difficulty": difficulty,
            "time_limit": int(time_limit),
            "max_points": int(max_points),
            "essay_key_points": json.dumps(essay_key_points) if qtype == "essay" else None,
            "essay_min_words": int(essay_min_words) if qtype == "essay" else None,
        }
    return None


def _question_import_view(user: dict) -> None:
    """Halaman import soal dari Excel."""
    st.subheader("📥 Import Soal dari Excel")
    if st.button("← Kembali ke daftar"):
        st.session_state.pop("edit_q_id")
        st.rerun()

    st.markdown("**1. Unduh template dulu:**")
    st.download_button(
        "📄 Unduh Template Excel",
        build_template(),
        file_name="KWGN-Template-Soal.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    st.markdown(
        "**2. Isi template** (sheet `Soal`), lalu upload di bawah. "
        "Soal yang sudah ada (sama topik + teks) akan otomatis di-skip."
    )
    uploaded = st.file_uploader(
        "Upload file .xlsx",
        type=["xlsx"],
        key="import_q_file",
    )
    if uploaded and st.button("🚀 Proses Import", type="primary"):
        with st.spinner("Mengimpor soal..."):
            result = import_questions_from_xlsx(uploaded.getvalue(), user["id"])
        if result["inserted"] > 0:
            st.success(f"✅ {result['inserted']} soal berhasil ditambahkan.")
        if result["skipped"] > 0:
            st.info(f"⏭️ {result['skipped']} soal di-skip (sudah ada di database).")
        if result["errors"]:
            st.error("Masalah ditemukan:")
            for e in result["errors"][:10]:
                st.write(f"- {e}")
        if result["inserted"] > 0:
            st.session_state.pop("edit_q_id")
            st.rerun()


def page_questions(user: dict) -> None:
    st.title("📝 Bank Soal")
    edit_id = st.session_state.get("edit_q_id")

    if edit_id == "import":
        _question_import_view(user)
        return

    if edit_id == "new":
        st.subheader("+ Soal Baru")
        if st.button("← Kembali ke daftar"):
            st.session_state.pop("edit_q_id")
            st.rerun()
        data = _question_form()
        if data:
            run_(
                """INSERT INTO questions
                    (topic, text, type, options_json, correct_index, explanation,
                     source_ref, difficulty, time_limit, max_points,
                     essay_key_points, essay_min_words, created_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data["topic"], data["text"], data["type"], data["options_json"],
                    data["correct_index"], data["explanation"], data["source_ref"],
                    data["difficulty"], data["time_limit"], data["max_points"],
                    data["essay_key_points"], data["essay_min_words"], user["id"],
                ),
            )
            st.success("Soal berhasil ditambahkan.")
            st.session_state.pop("edit_q_id")
            st.rerun()
        return

    if isinstance(edit_id, int):
        row = get_("SELECT * FROM questions WHERE id = ?", [edit_id])
        if not row:
            st.error("Soal tidak ditemukan.")
            st.session_state.pop("edit_q_id")
            return
        try:
            opts = json.loads(row["options_json"]) if row["options_json"] else []
            kp = json.loads(row["essay_key_points"]) if row["essay_key_points"] else []
        except json.JSONDecodeError:
            opts, kp = [], []
        st.subheader(f"✏️ Edit Soal #{row['id']}")
        if st.button("← Kembali ke daftar"):
            st.session_state.pop("edit_q_id")
            st.rerun()
        data = _question_form({**row, "options": opts, "essay_key_points": kp, "id": row["id"]})
        if data:
            run_(
                """UPDATE questions SET
                    topic=?, text=?, type=?, options_json=?, correct_index=?,
                    explanation=?, source_ref=?, difficulty=?, time_limit=?,
                    max_points=?, essay_key_points=?, essay_min_words=?
                   WHERE id=?""",
                (
                    data["topic"], data["text"], data["type"], data["options_json"],
                    data["correct_index"], data["explanation"], data["source_ref"],
                    data["difficulty"], data["time_limit"], data["max_points"],
                    data["essay_key_points"], data["essay_min_words"], edit_id,
                ),
            )
            st.success("Perubahan tersimpan.")
            st.session_state.pop("edit_q_id")
            st.rerun()
        return

    # Daftar soal
    bc1, bc2 = st.columns(2)
    with bc1:
        if st.button("+ Tambah Soal Baru", type="primary", use_container_width=True):
            st.session_state["edit_q_id"] = "new"
            st.rerun()
    with bc2:
        if st.button("📥 Import dari Excel", use_container_width=True):
            st.session_state["edit_q_id"] = "import"
            st.rerun()

    c1, c2 = st.columns(2)
    with c1:
        topic_filter = st.text_input("🔍 Filter topik", placeholder="kosongkan = semua")
    with c2:
        type_filter = st.selectbox("Tipe", ["semua", "mcq", "essay"])

    query = "SELECT id, topic, type, text, difficulty, time_limit, max_points FROM questions WHERE 1=1"
    params: list = []
    if topic_filter:
        query += " AND LOWER(topic) LIKE ?"
        params.append(f"%{topic_filter.lower()}%")
    if type_filter != "semua":
        query += " AND type = ?"
        params.append(type_filter)
    query += " ORDER BY created_at DESC"
    rows = all_(query, params)

    st.caption(f"Total: **{len(rows)}** soal")
    if not rows:
        st.info("Belum ada soal. Klik **+ Tambah Soal Baru** untuk mulai.")
        return

    for r in rows:
        with st.container(border=True):
            c1, c2, c3 = st.columns([4, 1, 1])
            with c1:
                badge = "📝" if r["type"] == "mcq" else "✍️"
                st.markdown(f"{badge} **{r['topic']}** · {r['difficulty']}")
                st.write(r["text"][:150] + ("..." if len(r["text"]) > 150 else ""))
            with c2:
                if st.button("Edit", key=f"edit_{r['id']}"):
                    st.session_state["edit_q_id"] = r["id"]
                    st.rerun()
            with c3:
                if st.button("🗑️ Hapus", key=f"del_{r['id']}"):
                    try:
                        run_("DELETE FROM questions WHERE id = ?", [r["id"]])
                        st.success("Soal dihapus.")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error(
                            "Soal masih dipakai di kuis. Hapus dari kuis dulu sebelum menghapus soal."
                        )


# ---------- Kuis & UAS ----------
def page_quizzes(user: dict) -> None:
    st.title("🏆 Kuis & UAS")
    active = st.session_state.get("active_quiz_edit")

    if active == "new":
        st.subheader("+ Kuis / UAS Baru")
        if st.button("← Kembali"):
            st.session_state.pop("active_quiz_edit")
            st.rerun()
        with st.form("new_quiz"):
            title = st.text_input("Judul", placeholder="mis. Kuis Bab 1 - Pancasila")
            description = st.text_area("Deskripsi (opsional)", height=80)
            kind = st.selectbox(
                "Jenis", ["practice", "quiz", "uas"],
                format_func=lambda x: {
                    "practice": "🎯 Latihan (boleh diulang, tidak masuk nilai)",
                    "quiz": "🏆 Kuis (1× pengerjaan, masuk nilai)",
                    "uas": "📜 UAS (1× pengerjaan, masuk nilai)",
                }[x],
            )
            shuffle = st.checkbox("Acak urutan soal per mahasiswa", value=True)
            submit = st.form_submit_button("Buat Kuis", type="primary")
        if submit:
            if not title.strip():
                st.error("Judul wajib diisi.")
            else:
                res = run_(
                    "INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by) "
                    "VALUES (?, ?, ?, 'individual', 'draft', ?, ?)",
                    (title.strip(), description.strip() or None, kind, 1 if shuffle else 0, user["id"]),
                )
                st.success(f"Kuis '{title}' berhasil dibuat (draft). Tambahkan soal dulu.")
                st.session_state["active_quiz_edit"] = res["lastrowid"]
                st.rerun()
        return

    if isinstance(active, int):
        _quiz_detail(active, user)
        return

    # Daftar kuis
    if st.button("+ Buat Kuis Baru", type="primary"):
        st.session_state["active_quiz_edit"] = "new"
        st.rerun()
    rows = all_(
        "SELECT q.id, q.title, q.kind, q.status, q.created_at, "
        "(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS qcount, "
        "(SELECT COUNT(*) FROM attempts a WHERE a.quiz_id = q.id AND a.status='completed') AS acount "
        "FROM quizzes q ORDER BY q.created_at DESC"
    )
    if not rows:
        st.info("Belum ada kuis. Klik **+ Buat Kuis Baru**.")
        return
    for r in rows:
        with st.container(border=True):
            c1, c2, c3 = st.columns([3, 1, 1])
            with c1:
                kind_label = {"practice": "🎯", "quiz": "🏆", "uas": "📜"}.get(r["kind"], r["kind"])
                st.markdown(f"### {kind_label} {r['title']}")
                st.caption(
                    f"{r['qcount']} soal · {r['acount']} pengerjaan selesai · "
                    f"status: **{r['status']}**"
                )
            with c2:
                if st.button("Atur", key=f"edit_q_{r['id']}"):
                    st.session_state["active_quiz_edit"] = r["id"]
                    st.rerun()
            with c3:
                if st.button("🗑️", key=f"del_q_{r['id']}"):
                    try:
                        run_("DELETE FROM quizzes WHERE id = ?", [r["id"]])
                        st.success("Kuis dihapus.")
                        st.rerun()
                    except sqlite3.IntegrityError as e:
                        st.error(f"Tidak bisa dihapus: {e}")


def _quiz_detail(quiz_id: int, user: dict) -> None:
    quiz = get_("SELECT * FROM quizzes WHERE id = ?", [quiz_id])
    if not quiz:
        st.error("Kuis tidak ditemukan.")
        st.session_state.pop("active_quiz_edit")
        return

    if st.button("← Kembali ke daftar"):
        st.session_state.pop("active_quiz_edit")
        st.rerun()

    st.subheader(f"Atur: {quiz['title']}")
    st.caption(f"Jenis: {quiz['kind']} · status saat ini: **{quiz['status']}**")

    # Kontrol status
    cs1, cs2, cs3 = st.columns(3)
    with cs1:
        if quiz["status"] != "open" and st.button("🔓 Buka", use_container_width=True):
            run_("UPDATE quizzes SET status='open' WHERE id=?", [quiz_id])
            st.success("Kuis dibuka — mahasiswa bisa mulai mengerjakan.")
            st.rerun()
    with cs2:
        if quiz["status"] != "closed" and st.button("🔒 Tutup", use_container_width=True):
            run_("UPDATE quizzes SET status='closed' WHERE id=?", [quiz_id])
            st.success("Kuis ditutup.")
            st.rerun()
    with cs3:
        if quiz["status"] != "draft" and st.button("📝 Kembali ke Draft", use_container_width=True):
            run_("UPDATE quizzes SET status='draft' WHERE id=?", [quiz_id])
            st.rerun()

    st.divider()
    st.markdown("### Soal-soal di kuis ini")
    assigned = all_(
        "SELECT q.id, q.topic, q.type, q.text, qq.position FROM quiz_questions qq "
        "JOIN questions q ON q.id = qq.question_id WHERE qq.quiz_id = ? ORDER BY qq.position",
        [quiz_id],
    )
    if assigned:
        for a in assigned:
            with st.container(border=True):
                c1, c2 = st.columns([5, 1])
                with c1:
                    st.write(
                        f"**{a['position']}.** {'📝' if a['type'] == 'mcq' else '✍️'} "
                        f"_{a['topic']}_ — {a['text'][:100]}{'...' if len(a['text']) > 100 else ''}"
                    )
                with c2:
                    if st.button("Lepas", key=f"unassign_{a['id']}"):
                        run_(
                            "DELETE FROM quiz_questions WHERE quiz_id=? AND question_id=?",
                            [quiz_id, a["id"]],
                        )
                        st.rerun()
    else:
        st.info("Belum ada soal di kuis ini.")

    st.divider()
    st.markdown("### Tambah soal dari bank soal")
    assigned_ids = {a["id"] for a in assigned}
    available = all_(
        "SELECT id, topic, type, text FROM questions ORDER BY topic, created_at DESC"
    )
    available = [a for a in available if a["id"] not in assigned_ids]
    if not available:
        st.info("Semua soal di bank sudah ditambahkan ke kuis ini.")
    else:
        chosen = st.multiselect(
            f"Pilih soal untuk ditambah ({len(available)} tersedia)",
            options=[a["id"] for a in available],
            format_func=lambda i: next(
                f"#{a['id']} · {'📝' if a['type'] == 'mcq' else '✍️'} {a['topic']} — "
                f"{a['text'][:60]}{'...' if len(a['text']) > 60 else ''}"
                for a in available if a["id"] == i
            ),
        )
        if chosen and st.button("➕ Tambahkan ke kuis", type="primary"):
            with transaction() as tx:
                start = (assigned[-1]["position"] if assigned else 0) + 1
                for offset, qid in enumerate(chosen):
                    tx.execute(
                        "INSERT INTO quiz_questions (quiz_id, question_id, position) "
                        "VALUES (?, ?, ?)",
                        (quiz_id, qid, start + offset),
                    )
            st.success(f"{len(chosen)} soal ditambahkan.")
            st.rerun()


# ---------- Kelompok ----------
def page_groups() -> None:
    st.title("👥 Kelompok")
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Daftar Kelompok")
        with st.form("new_group", clear_on_submit=True):
            name = st.text_input("Nama kelompok baru", placeholder="mis. Kelompok 1 - Pancasila")
            if st.form_submit_button("+ Tambah", type="primary"):
                if name.strip():
                    try:
                        run_("INSERT INTO groups (name) VALUES (?)", [name.strip()])
                        st.success(f"Kelompok '{name}' dibuat.")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("Nama kelompok sudah ada.")
        groups = all_(
            "SELECT g.id, g.name, "
            "(SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role='student') AS member_count "
            "FROM groups g ORDER BY g.name"
        )
        if not groups:
            st.info("Belum ada kelompok.")
        else:
            for g in groups:
                with st.container(border=True):
                    cc1, cc2 = st.columns([3, 1])
                    cc1.write(f"**{g['name']}** · {g['member_count']} anggota")
                    if cc2.button("🗑️", key=f"delg_{g['id']}"):
                        run_("DELETE FROM groups WHERE id=?", [g["id"]])
                        st.rerun()
    with c2:
        st.subheader("Penugasan Mahasiswa")
        groups = all_("SELECT id, name FROM groups ORDER BY name")
        students = all_(
            "SELECT id, nim, name, group_id FROM users WHERE role='student' ORDER BY nim"
        )
        if not students:
            st.info("Belum ada mahasiswa.")
            return
        group_options = {None: "— Tanpa kelompok —"}
        group_options.update({g["id"]: g["name"] for g in groups})
        for s in students:
            cs1, cs2 = st.columns([2, 2])
            cs1.write(f"`{s['nim']}` {s['name']}")
            keys = list(group_options.keys())
            cur_idx = keys.index(s["group_id"]) if s["group_id"] in keys else 0
            new_gid = cs2.selectbox(
                "grp", keys, index=cur_idx,
                format_func=lambda k: group_options[k],
                key=f"grp_{s['id']}", label_visibility="collapsed",
            )
            if new_gid != s["group_id"]:
                run_(
                    "UPDATE users SET group_id=? WHERE id=? AND role='student'",
                    [new_gid, s["id"]],
                )
                st.rerun()


# ---------- Mahasiswa ----------
def page_students(user: dict) -> None:
    st.title("🎓 Mahasiswa")

    with st.expander("➕ Tambah mahasiswa baru"):
        with st.form("new_student", clear_on_submit=True):
            c1, c2 = st.columns(2)
            with c1:
                nim = st.text_input("NIM*")
            with c2:
                name = st.text_input("Nama*")
            init_pw = st.text_input(
                "Password awal (kosong = sama dengan NIM)",
                placeholder="Default: NIM",
            )
            if st.form_submit_button("+ Tambah", type="primary"):
                if not nim.strip() or not name.strip():
                    st.error("NIM dan Nama wajib diisi.")
                else:
                    pw = init_pw.strip() or nim.strip()
                    try:
                        run_(
                            "INSERT INTO users (role, nim, name, password_hash) "
                            "VALUES ('student', ?, ?, ?)",
                            [nim.strip(), name.strip(), hash_password(pw)],
                        )
                        st.success(f"Mahasiswa '{name}' (NIM {nim}) ditambahkan.")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("NIM sudah dipakai.")

    st.divider()
    rows = all_(
        "SELECT u.id, u.nim, u.name, u.created_at, g.name AS group_name "
        "FROM users u LEFT JOIN groups g ON g.id = u.group_id "
        "WHERE u.role='student' ORDER BY u.nim"
    )
    st.caption(f"Total: **{len(rows)}** mahasiswa")
    for r in rows:
        with st.container(border=True):
            c1, c2 = st.columns([4, 1])
            c1.write(
                f"`{r['nim']}` **{r['name']}** · {r['group_name'] or '— tanpa kelompok —'}"
            )
            if c2.button("🔁 Reset PW", key=f"rstpw_{r['id']}"):
                # Reset ke NIM
                run_(
                    "UPDATE users SET password_hash=? WHERE id=?",
                    [hash_password(r["nim"]), r["id"]],
                )
                st.success(f"Password mahasiswa `{r['nim']}` di-reset ke NIM.")


# ---------- Nilai Kelas + Export ----------
def page_results() -> None:
    st.title("📈 Nilai Kelas")

    quizzes = all_("SELECT id, title FROM quizzes ORDER BY title")
    quiz_filter = st.selectbox(
        "Filter kuis",
        [None] + [q["id"] for q in quizzes],
        format_func=lambda i: "Semua kuis" if i is None else next(
            q["title"] for q in quizzes if q["id"] == i
        ),
    )

    where = "WHERE a.status='completed'"
    params: list = []
    if quiz_filter:
        where += " AND a.quiz_id = ?"
        params.append(quiz_filter)

    rows = all_(
        f"""SELECT a.finished_at, u.nim, u.name, g.name AS group_name,
                  q.title AS quiz_title, q.kind AS quiz_kind,
                  a.total_score, a.total_correct, a.total_questions,
                  CASE WHEN a.total_questions > 0
                       THEN ROUND(a.total_correct * 100.0 / a.total_questions, 1)
                       ELSE 0 END AS pct
           FROM attempts a JOIN users u ON u.id = a.user_id
           JOIN quizzes q ON q.id = a.quiz_id
           LEFT JOIN groups g ON g.id = u.group_id
           {where}
           ORDER BY a.finished_at DESC""",
        params,
    )
    if not rows:
        st.info("Belum ada nilai untuk filter ini.")
        return

    df = pd.DataFrame(rows)
    st.dataframe(df, use_container_width=True, hide_index=True)

    # Export Excel
    if st.button("📥 Ekspor ke Excel"):
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Detail", index=False)
            class_df = pd.DataFrame(all_(
                """SELECT u.nim, u.name, g.name AS group_name,
                          (SELECT COUNT(*) FROM attempts a WHERE a.user_id=u.id AND a.status='completed') AS pengerjaan,
                          COALESCE((SELECT SUM(total_score) FROM attempts a WHERE a.user_id=u.id AND a.status='completed'), 0) AS total_skor
                   FROM users u LEFT JOIN groups g ON g.id=u.group_id
                   WHERE u.role='student' ORDER BY u.nim"""
            ))
            class_df.to_excel(writer, sheet_name="Ringkasan Kelas", index=False)
        ts = datetime.now().strftime("%Y-%m-%d")
        st.download_button(
            "⬇️ Download .xlsx",
            buf.getvalue(),
            file_name=f"KWGN-Nilai-{ts}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )


# ---------- Tinjau Esai ----------
def page_essay_review(user: dict) -> None:
    st.title("✍️ Tinjau Esai")
    st.caption(
        "AI sudah menilai otomatis — Anda bisa override skor jika perlu. "
        "Skor asli AI tetap disimpan sebagai `original_score`."
    )

    rows = all_(
        """SELECT ans.id, ans.essay_text, ans.score_awarded, ans.original_score,
                  ans.lecturer_note, ans.reviewed_at, ans.ai_feedback,
                  qn.text AS question_text, qn.essay_key_points, qn.max_points,
                  u.nim, u.name AS student_name, qz.title AS quiz_title
           FROM answers ans
           JOIN attempts a ON a.id = ans.attempt_id
           JOIN questions qn ON qn.id = ans.question_id AND qn.type='essay'
           JOIN users u ON u.id = a.user_id
           JOIN quizzes qz ON qz.id = a.quiz_id
           WHERE a.status='completed'
           ORDER BY ans.id DESC"""
    )
    if not rows:
        st.info("Belum ada jawaban esai.")
        return

    for r in rows:
        with st.container(border=True):
            st.markdown(f"**{r['student_name']}** (`{r['nim']}`) · _{r['quiz_title']}_")
            st.markdown(f"**Pertanyaan:** {r['question_text']}")
            st.text_area(
                "Jawaban mahasiswa", value=r["essay_text"] or "(kosong)",
                height=120, disabled=True, key=f"ans_{r['id']}",
            )
            try:
                fb = json.loads(r["ai_feedback"]) if r["ai_feedback"] else {}
                if fb.get("feedback"):
                    st.info(f"**Feedback AI:** {fb['feedback']}")
                if fb.get("matched_points"):
                    st.success("**Poin terpenuhi:** " + "; ".join(fb["matched_points"]))
                if fb.get("missing_points"):
                    st.warning("**Poin kurang:** " + "; ".join(fb["missing_points"]))
            except (json.JSONDecodeError, TypeError):
                pass

            cols = st.columns([1, 1, 2, 1])
            cols[0].metric("Maks", r["max_points"])
            cols[1].metric(
                "Skor saat ini",
                r["score_awarded"],
                delta=("AI awal: " + str(r["original_score"])) if r["original_score"] is not None else None,
            )
            new_score = cols[2].number_input(
                "Override skor",
                min_value=0,
                max_value=int(r["max_points"]),
                value=int(r["score_awarded"]),
                key=f"ovr_{r['id']}",
            )
            if cols[3].button("Simpan override", key=f"save_{r['id']}"):
                if new_score != r["score_awarded"]:
                    note = st.session_state.get(f"note_{r['id']}", "")
                    original = r["original_score"] if r["original_score"] is not None else r["score_awarded"]
                    run_(
                        """UPDATE answers SET
                            score_awarded = ?,
                            original_score = COALESCE(original_score, ?),
                            lecturer_note = ?,
                            reviewed_at = datetime('now')
                           WHERE id = ?""",
                        [new_score, original, note or None, r["id"]],
                    )
                    # Update aggregate di attempts
                    run_(
                        """UPDATE attempts SET total_score = (
                              SELECT COALESCE(SUM(score_awarded), 0)
                              FROM answers WHERE attempt_id = (
                                  SELECT attempt_id FROM answers WHERE id = ?
                              )
                           ) WHERE id = (
                              SELECT attempt_id FROM answers WHERE id = ?
                           )""",
                        [r["id"], r["id"]],
                    )
                    st.success("Skor diperbarui.")
                    st.rerun()
                else:
                    st.info("Skor tidak berubah.")
            st.text_input(
                "Catatan (opsional)",
                value=r["lecturer_note"] or "",
                key=f"note_{r['id']}",
                placeholder="Catatan untuk mahasiswa, mis. 'jawaban kurang elaborasi tentang...'",
            )


def _backup_restore_section() -> None:
    """Bagian backup/restore DB di halaman Profil dosen."""
    st.subheader("💾 Backup & Restore Database")
    st.caption(
        "Streamlit Cloud filesystem bisa reset sewaktu-waktu. "
        "Unduh backup DB secara berkala supaya data tidak hilang."
    )
    p = db_path()
    import os
    if os.path.exists(p):
        with open(p, "rb") as f:
            st.download_button(
                "⬇️ Unduh Backup DB (.db)",
                f.read(),
                file_name=f"kwgn-backup-{datetime.now().strftime('%Y%m%d')}.db",
                mime="application/octet-stream",
            )
    else:
        st.warning("File DB tidak ditemukan.")

    st.markdown("**Restore:** upload file `.db` hasil backup sebelumnya.")
    restore_file = st.file_uploader("Upload .db", type=["db"], key="restore_db")
    if restore_file and st.button("🔄 Restore (timpa data saat ini!)", type="primary"):
        with open(p, "wb") as f:
            f.write(restore_file.getvalue())
        st.success("Database di-restore. Silakan refresh halaman (F5).")
        st.cache_resource.clear()


# ---------- Profil ----------
def page_profile(user: dict) -> None:
    st.title("👤 Profil Saya")
    st.write(f"**Nama:** {user['name']}")
    st.write(f"**Email:** {user.get('email', '—')}")
    st.divider()
    st.subheader("🔐 Ganti Password")
    with st.form("change_password_lec"):
        old = st.text_input("Password lama", type="password")
        new1 = st.text_input("Password baru (min 8 karakter)", type="password")
        new2 = st.text_input("Ulangi password baru", type="password")
        submit = st.form_submit_button("Ubah Password", type="primary")
    if submit:
        if new1 != new2:
            st.error("Konfirmasi password baru tidak cocok.")
        else:
            ok, msg = change_password(user["id"], old, new1)
            (st.success if ok else st.error)(msg)

    st.divider()
    _backup_restore_section()
def render(user: dict) -> None:
    with st.sidebar:
        st.markdown(f"### 👨‍🏫 {user['name']}")
        st.caption(user.get("email", ""))
        page = st.radio(
            "Menu",
            [
                "📊 Ringkasan",
                "📝 Bank Soal",
                "🏆 Kuis & UAS",
                "👥 Kelompok",
                "🎓 Mahasiswa",
                "📈 Nilai Kelas",
                "✍️ Tinjau Esai",
                "👤 Profil",
            ],
            label_visibility="collapsed",
        )
        st.divider()
        if st.button("🚪 Keluar", use_container_width=True):
            logout()
            st.rerun()

    if page == "📊 Ringkasan":
        page_summary()
    elif page == "📝 Bank Soal":
        page_questions(user)
    elif page == "🏆 Kuis & UAS":
        page_quizzes(user)
    elif page == "👥 Kelompok":
        page_groups()
    elif page == "🎓 Mahasiswa":
        page_students(user)
    elif page == "📈 Nilai Kelas":
        page_results()
    elif page == "✍️ Tinjau Esai":
        page_essay_review(user)
    elif page == "👤 Profil":
        page_profile(user)
