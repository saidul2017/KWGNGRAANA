"""View untuk peran 'student' (mahasiswa).

Menu:
- Beranda (welcome + stats)
- Latihan & Kuis (gabung — beda hanya di kind)
- Chatbot PKn
- Riwayat Nilai
- Profil

Live Kahoot mode TIDAK diimplementasi di versi Streamlit ini (lihat README).
"""

from __future__ import annotations

import json
import time

import streamlit as st

from ..ai import chatbot_reply, grade_essay
from ..auth import change_password, current_user, logout
from ..db import all_, get_, run_, transaction
from ..scoring import kahoot_score


# ---------- Helper ----------
def _get_attempted_ids(user_id: int) -> set[int]:
    """Quiz IDs yang sudah completed oleh user (untuk filter UI)."""
    rows = all_(
        "SELECT DISTINCT quiz_id FROM attempts WHERE user_id = ? AND status='completed'",
        [user_id],
    )
    return {r["quiz_id"] for r in rows}


def _format_kind(kind: str) -> str:
    return {"practice": "🎯 Latihan", "quiz": "🏆 Kuis", "uas": "📜 UAS"}.get(kind, kind)


# ---------- Quiz Player ----------
def _start_attempt(user: dict, quiz_id: int) -> int:
    """Buat attempt baru ATAU pakai yang in_progress. Return attempt_id."""
    existing = get_(
        "SELECT id FROM attempts WHERE quiz_id = ? AND user_id = ? AND status='in_progress' LIMIT 1",
        [quiz_id, user["id"]],
    )
    if existing:
        return existing["id"]

    quiz = get_("SELECT id FROM quizzes WHERE id = ?", [quiz_id])
    if not quiz:
        st.error("Kuis tidak ditemukan")
        st.stop()

    questions = all_(
        "SELECT q.id FROM questions q JOIN quiz_questions qq ON qq.question_id = q.id "
        "WHERE qq.quiz_id = ? ORDER BY qq.position",
        [quiz_id],
    )
    res = run_(
        "INSERT INTO attempts (quiz_id, user_id, group_id, total_questions, status) "
        "VALUES (?, ?, ?, ?, 'in_progress')",
        [quiz_id, user["id"], user.get("group_id"), len(questions)],
    )
    return res["lastrowid"]


def _load_questions_for_quiz(quiz_id: int) -> list[dict]:
    rows = all_(
        """SELECT q.id, q.topic, q.text, q.type, q.options_json, q.correct_index,
                  q.explanation, q.source_ref, q.time_limit, q.max_points,
                  q.essay_key_points, q.essay_min_words
           FROM questions q
           JOIN quiz_questions qq ON qq.question_id = q.id
           WHERE qq.quiz_id = ?
           ORDER BY qq.position""",
        [quiz_id],
    )
    out = []
    for r in rows:
        try:
            options = json.loads(r["options_json"]) if r["options_json"] else []
        except json.JSONDecodeError:
            options = []
        try:
            kp = json.loads(r["essay_key_points"]) if r["essay_key_points"] else []
        except json.JSONDecodeError:
            kp = []
        out.append({**r, "options": options, "essay_key_points": kp})
    return out


def _save_answer(
    attempt_id: int,
    question: dict,
    selected_index: int | None,
    essay_text: str | None,
    response_ms: int,
) -> dict:
    """Simpan jawaban + hitung skor. Return result dict untuk feedback UI."""
    user = current_user()
    if not user:
        return {"isCorrect": False, "scoreAwarded": 0}

    # Anti-duplikat: cek jika sudah ada answer untuk (attempt, question)
    existing = get_(
        "SELECT id FROM answers WHERE attempt_id = ? AND question_id = ? LIMIT 1",
        [attempt_id, question["id"]],
    )
    if existing:
        return {
            "isCorrect": False,
            "scoreAwarded": 0,
            "error": "Jawaban untuk soal ini sudah pernah disimpan.",
        }

    if question["type"] == "essay":
        result = grade_essay(
            question["text"],
            essay_text or "",
            question["essay_key_points"] or [],
            min_words=question.get("essay_min_words") or 30,
        )
        score_pct = result.get("score_pct", 0)
        max_pts = question["max_points"]
        score = int(round(max_pts * score_pct / 100))
        is_correct = score_pct >= 70  # untuk total_correct counter

        with transaction() as tx:
            tx.execute(
                """INSERT INTO answers
                    (attempt_id, question_id, selected_index, essay_text,
                     ai_feedback, is_correct, response_ms, score_awarded)
                   VALUES (?, ?, NULL, ?, ?, ?, ?, ?)""",
                (
                    attempt_id,
                    question["id"],
                    essay_text,
                    json.dumps(result),
                    1 if is_correct else 0,
                    response_ms,
                    score,
                ),
            )
            tx.execute(
                "UPDATE attempts SET total_score = total_score + ?, "
                "total_correct = total_correct + ? WHERE id = ?",
                (score, 1 if is_correct else 0, attempt_id),
            )
        return {
            "type": "essay",
            "scoreAwarded": score,
            "scorePct": score_pct,
            "isCorrect": is_correct,
            "feedback": result.get("feedback"),
            "matchedPoints": result.get("matched_points", []),
            "missingPoints": result.get("missing_points", []),
            "explanation": question.get("explanation"),
            "sourceRef": question.get("source_ref"),
        }

    # MCQ
    correct_index = question["correct_index"]
    is_correct = selected_index is not None and selected_index == correct_index
    score = (
        kahoot_score(
            question["max_points"],
            response_ms,
            question["time_limit"],
            is_correct,
        )
        if is_correct
        else 0
    )
    with transaction() as tx:
        tx.execute(
            """INSERT INTO answers
                (attempt_id, question_id, selected_index, is_correct,
                 response_ms, score_awarded)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                attempt_id,
                question["id"],
                selected_index,
                1 if is_correct else 0,
                response_ms,
                score,
            ),
        )
        tx.execute(
            "UPDATE attempts SET total_score = total_score + ?, "
            "total_correct = total_correct + ? WHERE id = ?",
            (score, 1 if is_correct else 0, attempt_id),
        )
    return {
        "type": "mcq",
        "scoreAwarded": score,
        "isCorrect": is_correct,
        "correctIndex": correct_index,
        "selectedIndex": selected_index,
        "explanation": question.get("explanation"),
        "sourceRef": question.get("source_ref"),
    }


def _finish_attempt(attempt_id: int) -> None:
    run_(
        "UPDATE attempts SET status='completed', finished_at=datetime('now') "
        "WHERE id = ? AND status='in_progress'",
        [attempt_id],
    )


def _render_quiz_player(quiz: dict) -> None:
    """Komponen pemain kuis — pakai session_state untuk simpan progress."""
    user = current_user()
    if not user:
        return

    state_key = f"play_{quiz['id']}"
    if state_key not in st.session_state:
        attempt_id = _start_attempt(user, quiz["id"])
        questions = _load_questions_for_quiz(quiz["id"])
        st.session_state[state_key] = {
            "attempt_id": attempt_id,
            "questions": questions,
            "index": 0,
            "phase": "playing",
            "started_at": time.time(),
            "total_score": 0,
            "total_correct": 0,
            "last_result": None,
        }

    state = st.session_state[state_key]
    questions = state["questions"]
    if not questions:
        st.warning("Kuis ini belum berisi soal. Hubungi dosen Anda.")
        return

    idx = state["index"]
    total = len(questions)

    # Header
    col1, col2, col3 = st.columns([3, 1, 1])
    with col1:
        st.markdown(f"**{quiz['title']}**")
    with col2:
        st.metric("Soal", f"{idx + 1}/{total}")
    with col3:
        st.metric("Skor", state["total_score"])

    st.progress((idx + (1 if state["phase"] == "feedback" else 0)) / total)

    # ----- Phase: done -----
    if state["phase"] == "done":
        max_pts = sum(q["max_points"] for q in questions)
        pct = round(100 * state["total_score"] / max_pts) if max_pts else 0
        st.markdown("### 🎉 Selesai!")
        c1, c2, c3 = st.columns(3)
        c1.metric("Skor Total", state["total_score"])
        c2.metric("Benar", f"{state['total_correct']}/{total}")
        c3.metric("Persen", f"{pct}%")
        if quiz["kind"] == "practice":
            st.info("Latihan mandiri — skor di atas hanya umpan balik, tidak masuk ke nilai akhir.")
        if st.button("Kembali ke daftar kuis", type="primary"):
            del st.session_state[state_key]
            st.session_state.pop("active_quiz_id", None)
            st.rerun()
        return

    q = questions[idx]
    is_essay = q["type"] == "essay"

    # ----- Soal -----
    st.caption(f"📚 {q['topic']}" + (" · ✍️ Esai (auto-grading)" if is_essay else ""))
    st.subheader(q["text"])
    st.caption(f"⏱️ Limit: {q['time_limit']} detik · 💎 Maks: {q['max_points']} poin")

    # ----- Phase: playing -----
    if state["phase"] == "playing":
        if is_essay:
            min_words = q.get("essay_min_words") or 30
            essay_key = f"{state_key}_essay_{idx}"
            answer = st.text_area(
                "Jawaban Anda",
                key=essay_key,
                height=200,
                placeholder="Tuliskan jawaban Anda. Sebutkan rujukan resmi (UUD/UU) bila relevan.",
            )
            wc = len([w for w in answer.split() if w])
            st.caption(f"{wc} kata · minimal {min_words} kata")
            if st.button(
                "Kirim Jawaban →",
                type="primary",
                disabled=wc < min_words,
                key=f"submit_essay_{idx}",
            ):
                with st.spinner("Menilai jawaban Anda..."):
                    response_ms = int((time.time() - state["started_at"]) * 1000)
                    result = _save_answer(
                        state["attempt_id"], q, None, answer, response_ms
                    )
                state["last_result"] = result
                state["phase"] = "feedback"
                if result.get("isCorrect"):
                    state["total_correct"] += 1
                state["total_score"] += result.get("scoreAwarded", 0)
                st.rerun()
        else:
            opts = q["options"]
            for i, opt in enumerate(opts):
                if st.button(
                    f"{chr(65 + i)}.  {opt}",
                    key=f"opt_{idx}_{i}",
                    use_container_width=True,
                ):
                    response_ms = int((time.time() - state["started_at"]) * 1000)
                    result = _save_answer(state["attempt_id"], q, i, None, response_ms)
                    state["last_result"] = result
                    state["phase"] = "feedback"
                    if result.get("isCorrect"):
                        state["total_correct"] += 1
                    state["total_score"] += result.get("scoreAwarded", 0)
                    st.rerun()
        return

    # ----- Phase: feedback -----
    result = state["last_result"] or {}
    if result.get("type") == "essay":
        pct = result.get("scorePct", 0)
        emoji = "✅" if pct >= 70 else ("🟡" if pct >= 40 else "🔴")
        st.markdown(
            f"### {emoji} Skor: **{pct}%** · +{result.get('scoreAwarded', 0)} poin"
        )
        if result.get("feedback"):
            st.info(f"**Feedback AI:** {result['feedback']}")
        matched = result.get("matchedPoints") or []
        missing = result.get("missingPoints") or []
        if matched:
            st.success("**✓ Poin yang sudah Anda sentuh:**\n" + "\n".join(f"- {p}" for p in matched))
        if missing:
            st.warning("**○ Poin yang masih kurang:**\n" + "\n".join(f"- {p}" for p in missing))
    else:
        if result.get("isCorrect"):
            st.success(f"✅ Benar! +{result.get('scoreAwarded', 0)} poin")
        else:
            ci = result.get("correctIndex")
            correct_text = q["options"][ci] if ci is not None and 0 <= ci < len(q["options"]) else "—"
            st.error(f"❌ Belum tepat. Jawaban benar: **{chr(65 + ci)}. {correct_text}**")
    if result.get("explanation"):
        st.markdown(f"**Penjelasan:** {result['explanation']}")
    if result.get("sourceRef"):
        st.caption(f"📖 {result['sourceRef']}")

    # Tombol lanjut
    is_last = idx >= total - 1
    if st.button(
        "🏁 Lihat Hasil Akhir" if is_last else "Lanjut →",
        type="primary",
        use_container_width=True,
    ):
        if is_last:
            try:
                _finish_attempt(state["attempt_id"])
            except Exception as e:  # noqa: BLE001
                st.error(f"Gagal menyimpan hasil ke server: {e}. Coba refresh halaman.")
                return
            state["phase"] = "done"
        else:
            state["index"] = idx + 1
            state["phase"] = "playing"
            state["started_at"] = time.time()
            state["last_result"] = None
        st.rerun()


# ---------- Halaman Quiz List ----------
def page_practice_and_quiz(user: dict, kind_filter: list[str], title: str) -> None:
    """Halaman list kuis. kind_filter: ['practice'] atau ['quiz', 'uas']."""
    active = st.session_state.get("active_quiz_id")
    if active:
        quiz = get_("SELECT * FROM quizzes WHERE id = ?", [active])
        if not quiz:
            st.session_state.pop("active_quiz_id", None)
            st.rerun()
        if st.button("← Kembali ke daftar"):
            # Catatan: progress tetap tersimpan di DB sebagai 'in_progress';
            # mahasiswa bisa lanjutkan saat membuka kuis ini lagi.
            st.session_state.pop("active_quiz_id", None)
            st.rerun()
        _render_quiz_player(quiz)
        return

    st.title(title)
    placeholders = ",".join("?" * len(kind_filter))
    quizzes = all_(
        f"SELECT q.id, q.title, q.description, q.kind, q.status, q.starts_at, q.ends_at, "
        f"  (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS qcount "
        f"FROM quizzes q WHERE q.kind IN ({placeholders}) ORDER BY q.created_at DESC",
        kind_filter,
    )
    if not quizzes:
        st.info("Belum ada kuis tersedia di kategori ini.")
        return

    attempted = _get_attempted_ids(user["id"])
    for q in quizzes:
        with st.container(border=True):
            c1, c2 = st.columns([3, 1])
            with c1:
                st.markdown(f"### {_format_kind(q['kind'])} · {q['title']}")
                if q.get("description"):
                    st.caption(q["description"])
                st.caption(f"📝 {q['qcount']} soal · status: {q['status']}")
            with c2:
                done = q["id"] in attempted
                allowed = q["kind"] == "practice" or q["status"] == "open"
                if done and q["kind"] != "practice":
                    st.success("✅ Selesai")
                elif not allowed:
                    st.warning("Belum dibuka")
                elif q["qcount"] == 0:
                    st.warning("Kosong")
                else:
                    if st.button(
                        "▶ Mulai" if q["kind"] == "practice" else "Mulai (1×)",
                        key=f"start_{q['id']}",
                        type="primary",
                    ):
                        st.session_state["active_quiz_id"] = q["id"]
                        st.rerun()


# ---------- Chatbot ----------
def page_chatbot(user: dict) -> None:
    st.title("💬 Chatbot PKn")
    st.caption(
        "Tanya konsep PKn — Pancasila, UUD 1945, HAM, demokrasi, dll. "
        "Jawaban berasal dari AI Gemini (jika API key di-set) atau knowledge base offline."
    )

    # Load history dari DB (last 30 messages)
    msgs = all_(
        "SELECT role, content, source FROM chat_messages WHERE user_id = ? "
        "ORDER BY created_at DESC LIMIT 30",
        [user["id"]],
    )
    msgs = list(reversed(msgs))
    for m in msgs:
        avatar = "🧑‍🎓" if m["role"] == "user" else "🤖"
        with st.chat_message(m["role"], avatar=avatar):
            st.markdown(m["content"])
            if m.get("source") and m["role"] == "assistant":
                st.caption(f"_Source: {m['source']}_")

    prompt = st.chat_input("Tulis pertanyaan tentang PKn...")
    if prompt:
        run_(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)",
            [user["id"], prompt],
        )
        with st.chat_message("user", avatar="🧑‍🎓"):
            st.markdown(prompt)
        with st.chat_message("assistant", avatar="🤖"):
            with st.spinner("Mencari jawaban..."):
                reply, source = chatbot_reply(prompt)
            st.markdown(reply)
            st.caption(f"_Source: {source}_")
        run_(
            "INSERT INTO chat_messages (user_id, role, content, source) "
            "VALUES (?, 'assistant', ?, ?)",
            [user["id"], reply, source],
        )


# ---------- Riwayat Nilai ----------
def page_results(user: dict) -> None:
    st.title("📊 Riwayat Nilai Saya")
    rows = all_(
        """SELECT a.id, a.total_score, a.total_correct, a.total_questions,
                  a.status, a.started_at, a.finished_at,
                  q.title AS quiz_title, q.kind AS quiz_kind
           FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
           WHERE a.user_id = ?
           ORDER BY a.started_at DESC""",
        [user["id"]],
    )
    if not rows:
        st.info("Belum ada riwayat. Mulai dari halaman Latihan atau Kuis.")
        return
    for r in rows:
        with st.container(border=True):
            c1, c2 = st.columns([3, 1])
            with c1:
                st.markdown(f"**{r['quiz_title']}**")
                st.caption(
                    f"{_format_kind(r['quiz_kind'])} · "
                    f"{r['finished_at'] or 'Dimulai ' + r['started_at']} · "
                    f"{'Selesai' if r['status'] == 'completed' else '⏳ Belum selesai'}"
                )
            with c2:
                pct = (
                    round(100 * r["total_correct"] / r["total_questions"])
                    if r["total_questions"]
                    else 0
                )
                st.metric(
                    "Skor", r["total_score"],
                    delta=f"{r['total_correct']}/{r['total_questions']} ({pct}%)",
                )


# ---------- Profil ----------
def page_profile(user: dict) -> None:
    st.title("👤 Profil Saya")
    st.write(f"**Nama:** {user['name']}")
    if user.get("nim"):
        st.write(f"**NIM:** `{user['nim']}`")
    if user.get("email"):
        st.write(f"**Email:** {user['email']}")
    if user.get("group_id"):
        g = get_("SELECT name FROM groups WHERE id = ?", [user["group_id"]])
        if g:
            st.write(f"**Kelompok:** {g['name']}")

    st.divider()
    st.subheader("🔐 Ganti Password")
    with st.form("change_password"):
        old = st.text_input("Password lama", type="password")
        new1 = st.text_input("Password baru", type="password")
        new2 = st.text_input("Ulangi password baru", type="password")
        submit = st.form_submit_button("Ubah Password", type="primary")
    if submit:
        if new1 != new2:
            st.error("Konfirmasi password baru tidak cocok.")
        else:
            ok, msg = change_password(user["id"], old, new1)
            (st.success if ok else st.error)(msg)


# ---------- Render utama ----------
def render(user: dict) -> None:
    with st.sidebar:
        st.markdown(f"### 🎓 {user['name']}")
        st.caption(f"NIM: `{user.get('nim', '—')}`")
        page = st.radio(
            "Menu",
            [
                "🏠 Beranda",
                "🎯 Latihan Mandiri",
                "🏆 Kuis & UAS",
                "💬 Chatbot PKn",
                "📊 Nilai Saya",
                "👤 Profil",
            ],
            label_visibility="collapsed",
        )
        st.divider()
        if st.button("🚪 Keluar", use_container_width=True):
            logout()
            st.rerun()

    if page == "🏠 Beranda":
        st.title("Selamat datang, " + user["name"].split()[0] + " 👋")
        st.write(
            "Selamat datang di KWGN Learning Hub. Pilih menu di sebelah kiri untuk "
            "memulai belajar."
        )
        # Quick stats
        my = get_(
            "SELECT COUNT(*) AS done, COALESCE(SUM(total_score), 0) AS total_score "
            "FROM attempts WHERE user_id = ? AND status='completed'",
            [user["id"]],
        ) or {"done": 0, "total_score": 0}
        c1, c2, c3 = st.columns(3)
        c1.metric("Pengerjaan Selesai", my["done"])
        c2.metric("Total Poin", my["total_score"])
        practice_count = get_(
            "SELECT COUNT(*) AS c FROM quizzes WHERE kind='practice'"
        ) or {"c": 0}
        c3.metric("Latihan Tersedia", practice_count["c"])
        st.info(
            "💡 **Tips:** Mulai dari **Latihan Mandiri** dulu — tidak masuk nilai, "
            "bisa diulang. Setelah siap, kerjakan **Kuis & UAS**."
        )
    elif page == "🎯 Latihan Mandiri":
        page_practice_and_quiz(user, ["practice"], "🎯 Latihan Mandiri")
    elif page == "🏆 Kuis & UAS":
        page_practice_and_quiz(user, ["quiz", "uas"], "🏆 Kuis & UAS")
    elif page == "💬 Chatbot PKn":
        page_chatbot(user)
    elif page == "📊 Nilai Saya":
        page_results(user)
    elif page == "👤 Profil":
        page_profile(user)
