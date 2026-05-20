"""Mengerjakan kuis — Kahoot-style timer + scoring + esai AI grading."""
from __future__ import annotations

import json
import time

import streamlit as st
from streamlit_autorefresh import st_autorefresh

from lib import auth, db
from lib.essay_grading import grade_essay
from lib.scoring import calculate_score, shuffle_with_seed

user = auth.require_role("student")

quiz_id = st.session_state.get("play_quiz_id")
if not quiz_id:
    st.warning("Pilih kuis dulu dari **Latihan Mandiri** atau **Kuis & UAS**.")
    st.page_link("views/student/practice.py", label="→ Latihan Mandiri", icon="🎯")
    st.page_link("views/student/quizzes.py", label="→ Kuis & UAS", icon="🏆")
    st.stop()

quiz = db.query_one("SELECT * FROM quizzes WHERE id=?", (quiz_id,))
if not quiz:
    st.error("Kuis tidak ditemukan.")
    st.stop()

# Validasi status
if quiz["kind"] != "practice" and quiz["status"] != "open":
    st.error(f"Kuis '{quiz['title']}' belum/tidak aktif.")
    st.stop()

# Cek attempt selesai (hanya untuk kuis/UAS)
if quiz["kind"] != "practice":
    done = db.query_one(
        "SELECT id FROM attempts WHERE quiz_id=? AND user_id=? AND status='completed'",
        (quiz_id, user["id"]),
    )
    if done:
        st.warning("Anda sudah menyelesaikan kuis ini. Tidak bisa mengulang.")
        st.page_link("views/student/results.py", label="→ Lihat Riwayat Nilai", icon="📊")
        st.stop()


# ================================================================
# Inisialisasi attempt + load questions ke session_state (sekali)
# ================================================================
def _init_attempt() -> None:
    qrows = db.query_all(
        """SELECT q.* FROM questions q
           JOIN quiz_questions qq ON qq.question_id = q.id
           WHERE qq.quiz_id = ? ORDER BY qq.position""",
        (quiz_id,),
    )
    if not qrows:
        st.error("Kuis ini belum berisi soal.")
        st.stop()

    questions = [dict(q) for q in qrows]
    if quiz["shuffle"]:
        seed = (user["id"] * 1009 + quiz_id * 31) & 0x7FFFFFFF
        questions = shuffle_with_seed(questions, seed=seed)

    # Cari attempt in_progress, atau buat baru
    a = db.query_one(
        "SELECT id FROM attempts WHERE quiz_id=? AND user_id=? AND status='in_progress'",
        (quiz_id, user["id"]),
    )
    if a:
        attempt_id = a["id"]
    else:
        db.execute(
            """INSERT INTO attempts (quiz_id, user_id, group_id, total_questions, status)
               VALUES (?, ?, ?, ?, 'in_progress')""",
            (quiz_id, user["id"], user["group_id"], len(questions)),
        )
        attempt_id = db.last_insert_id()

    # Cek soal yang sudah dijawab (resume support)
    done_qids = {r["question_id"] for r in db.query_all(
        "SELECT question_id FROM answers WHERE attempt_id=?", (attempt_id,)
    )}
    # Skip ke soal pertama yang belum dijawab
    idx = 0
    for i, q in enumerate(questions):
        if q["id"] not in done_qids:
            idx = i
            break
    else:
        idx = len(questions)  # Semua sudah dijawab

    st.session_state["play_attempt_id"] = attempt_id
    st.session_state["play_questions"] = questions
    st.session_state["play_index"] = idx
    st.session_state["play_state"] = "question"  # question | feedback | done
    st.session_state["play_started_at"] = time.time()
    st.session_state["play_total_score"] = 0
    st.session_state["play_total_correct"] = 0
    st.session_state["play_last_result"] = None


if "play_attempt_id" not in st.session_state:
    _init_attempt()

questions: list[dict] = st.session_state["play_questions"]
idx: int = st.session_state["play_index"]
attempt_id: int = st.session_state["play_attempt_id"]
state: str = st.session_state["play_state"]


# ================================================================
# Header progress
# ================================================================
st.title(quiz["title"])
n = len(questions)
if idx >= n:
    st.session_state["play_state"] = "done"
    state = "done"

if state != "done":
    progress = (idx + (1 if state == "feedback" else 0)) / n
    st.progress(progress, text=f"Soal {min(idx + 1, n)} dari {n} · "
                               f"Skor: {st.session_state['play_total_score']}")

# ================================================================
# DONE — selesai
# ================================================================
if state == "done":
    # Mark attempt completed
    db.execute(
        "UPDATE attempts SET status='completed', finished_at=datetime('now') WHERE id=? AND status='in_progress'",
        (attempt_id,),
    )
    a = db.query_one(
        "SELECT total_score, total_correct, total_questions FROM attempts WHERE id=?", (attempt_id,)
    )
    pct = round(a["total_correct"] * 100 / a["total_questions"]) if a["total_questions"] else 0
    st.balloons()
    st.success("🎉 Selesai!")
    c1, c2, c3 = st.columns(3)
    c1.metric("🏅 Skor", a["total_score"])
    c2.metric("✅ Benar", f"{a['total_correct']}/{a['total_questions']}")
    c3.metric("📊 Persen", f"{pct}%")

    cc1, cc2 = st.columns(2)
    if cc1.button("📊 Lihat Riwayat Nilai", type="primary"):
        st.switch_page("views/student/results.py")
    if cc2.button("🏠 Kembali ke Beranda"):
        for k in ("play_quiz_id", "play_state", "play_questions", "play_index",
                  "play_attempt_id", "play_started_at", "play_total_score",
                  "play_total_correct", "play_last_result"):
            st.session_state.pop(k, None)
        st.switch_page("views/student/home.py")
    st.stop()


# ================================================================
# Render soal saat ini
# ================================================================
q = questions[idx]
is_essay = q["type"] == "essay"
time_limit = q["time_limit"]

with st.container(border=True):
    head = st.columns([3, 1])
    head[0].caption(f"📚 {q['topic']}{' · ✍️ Esai (auto-grading AI)' if is_essay else ''}")
    if q["source_ref"]:
        head[1].caption(f"📖 {q['source_ref']}")
    st.markdown(f"### {q['text']}")

# ================================================================
# QUESTION state
# ================================================================
if state == "question":
    started = st.session_state["play_started_at"]
    elapsed = time.time() - started
    remaining = max(0.0, time_limit - elapsed)

    # Auto refresh setiap 1 detik untuk update timer (non-blocking)
    if remaining > 0:
        st_autorefresh(interval=1000, key=f"timer_{idx}", limit=int(time_limit) + 5)

    # Timer bar
    pct_time = remaining / time_limit if time_limit > 0 else 0
    bar_color = "🟢" if pct_time > 0.5 else "🟡" if pct_time > 0.2 else "🔴"
    st.progress(pct_time, text=f"{bar_color} Sisa waktu: **{remaining:.1f}s** dari {time_limit}s")

    if remaining <= 0:
        # Timeout — auto submit
        if is_essay:
            st.session_state["_pending_submit"] = ("essay", st.session_state.get("_essay_buf", ""))
        else:
            st.session_state["_pending_submit"] = ("mcq", -1)
        st.rerun()

    if is_essay:
        kp = json.loads(q.get("essay_key_points") or "[]")
        with st.expander("💡 Petunjuk: Apa yang sebaiknya dijawab?", expanded=False):
            for i, p in enumerate(kp):
                st.markdown(f"{i + 1}. {p}")
        essay_text = st.text_area(
            "Tuliskan jawaban Anda di sini",
            value=st.session_state.get("_essay_buf", ""),
            height=200,
            key=f"essay_input_{idx}",
            placeholder="Sertakan rujukan resmi (UUD/UU) bila relevan.",
        )
        st.session_state["_essay_buf"] = essay_text
        wc = len([w for w in essay_text.split() if w.strip()])
        min_words = q.get("essay_min_words") or 0
        st.caption(f"{wc} kata" + (f" · minimal {min_words} kata" if min_words else ""))

        col_btn = st.columns([3, 1])
        if col_btn[1].button("📤 Kirim Jawaban", type="primary", disabled=(min_words and wc < min_words)):
            st.session_state["_pending_submit"] = ("essay", essay_text)
            st.rerun()

    else:
        # MCQ — 4 tombol Kahoot-style
        opts = json.loads(q["options_json"] or "[]")
        rows_to_render = (len(opts) + 1) // 2  # 2 per row
        colors = ["🔴", "🔵", "🟡", "🟢", "🟣", "🟠"]
        for r in range(rows_to_render):
            cols = st.columns(2)
            for c in range(2):
                i = r * 2 + c
                if i >= len(opts):
                    break
                if cols[c].button(
                    f"{colors[i]} **{chr(65 + i)}. {opts[i]}**",
                    key=f"opt_{idx}_{i}",
                    use_container_width=True,
                ):
                    st.session_state["_pending_submit"] = ("mcq", i)
                    st.rerun()

# ================================================================
# Process pending submit
# ================================================================
if state == "question" and "_pending_submit" in st.session_state:
    kind, payload = st.session_state.pop("_pending_submit")
    response_ms = int((time.time() - st.session_state["play_started_at"]) * 1000)

    if kind == "essay":
        with st.spinner("🤖 Menilai jawaban dengan AI..."):
            kp = json.loads(q.get("essay_key_points") or "[]")
            grading = grade_essay(
                question_text=q["text"],
                question_topic=q["topic"],
                source_ref=q["source_ref"],
                key_points=kp,
                student_answer=str(payload),
                max_points=q["max_points"],
            )
        is_correct = 1 if grading["score_pct"] >= 70 else 0
        ai_feedback_json = json.dumps({
            "feedback": grading["feedback"],
            "matchedPoints": grading["matched_points"],
            "missingPoints": grading["missing_points"],
            "scorePct": grading["score_pct"],
            "needsReview": grading["needs_review"],
        })
        db.execute(
            """INSERT INTO answers (attempt_id, question_id, selected_index, essay_text,
               ai_feedback, is_correct, response_ms, score_awarded)
               VALUES (?, ?, NULL, ?, ?, ?, ?, ?)""",
            (attempt_id, q["id"], str(payload), ai_feedback_json, is_correct,
             response_ms, grading["score_awarded"]),
        )
        db.execute(
            "UPDATE attempts SET total_score=total_score+?, total_correct=total_correct+? WHERE id=?",
            (grading["score_awarded"], is_correct, attempt_id),
        )
        st.session_state["play_total_score"] += grading["score_awarded"]
        st.session_state["play_total_correct"] += is_correct
        st.session_state["play_last_result"] = {
            "kind": "essay",
            "score_pct": grading["score_pct"],
            "score_awarded": grading["score_awarded"],
            "max_points": q["max_points"],
            "feedback": grading["feedback"],
            "matched": grading["matched_points"],
            "missing": grading["missing_points"],
            "explanation": q["explanation"],
            "source_ref": q["source_ref"],
        }
        st.session_state.pop("_essay_buf", None)
    else:
        selected_idx = int(payload)
        is_correct = (selected_idx == q["correct_index"])
        score = calculate_score(
            is_correct=is_correct,
            response_ms=response_ms,
            time_limit_sec=time_limit,
            max_points=q["max_points"],
        )
        db.execute(
            """INSERT INTO answers (attempt_id, question_id, selected_index, is_correct, response_ms, score_awarded)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (attempt_id, q["id"], selected_idx, 1 if is_correct else 0, response_ms, score),
        )
        db.execute(
            "UPDATE attempts SET total_score=total_score+?, total_correct=total_correct+? WHERE id=?",
            (score, 1 if is_correct else 0, attempt_id),
        )
        st.session_state["play_total_score"] += score
        st.session_state["play_total_correct"] += 1 if is_correct else 0
        st.session_state["play_last_result"] = {
            "kind": "mcq",
            "is_correct": is_correct,
            "selected_idx": selected_idx,
            "correct_idx": q["correct_index"],
            "score_awarded": score,
            "options": json.loads(q["options_json"] or "[]"),
            "explanation": q["explanation"],
            "source_ref": q["source_ref"],
        }

    st.session_state["play_state"] = "feedback"
    st.rerun()

# ================================================================
# FEEDBACK state — tampilkan hasil + tombol next
# ================================================================
if state == "feedback":
    res = st.session_state.get("play_last_result") or {}
    if res.get("kind") == "essay":
        pct = res["score_pct"]
        if pct >= 70:
            st.success(f"✅ **{pct}%** · +{res['score_awarded']} poin")
        elif pct >= 40:
            st.warning(f"🟡 **{pct}%** · +{res['score_awarded']} poin (Cukup)")
        else:
            st.error(f"🔴 **{pct}%** · +{res['score_awarded']} poin (Perlu diperbaiki)")
        if res.get("feedback"):
            st.info(f"🤖 **Feedback AI:** {res['feedback']}")
        if res.get("matched"):
            st.markdown("**✓ Poin yang sudah Anda sentuh:**")
            for p in res["matched"]:
                st.markdown(f"- {p}")
        if res.get("missing"):
            st.markdown("**○ Poin yang masih kurang:**")
            for p in res["missing"]:
                st.markdown(f"- {p}")
    else:
        if res.get("is_correct"):
            st.success(f"✅ **Benar!** +{res['score_awarded']} poin")
        elif res.get("selected_idx") == -1:
            st.error("⏰ Waktu habis — 0 poin")
        else:
            opts = res.get("options", [])
            correct_label = f"{chr(65 + res['correct_idx'])}. {opts[res['correct_idx']]}" if res.get("correct_idx") is not None and opts else "—"
            st.error(f"❌ Belum tepat — 0 poin · Jawaban benar: **{correct_label}**")

    if res.get("explanation"):
        st.markdown(f"💡 **Penjelasan:** {res['explanation']}")
    if res.get("source_ref"):
        st.caption(f"📖 {res['source_ref']}")

    is_last = idx >= n - 1
    if st.button(("🏁 Lihat Hasil Akhir" if is_last else "Lanjut →"), type="primary"):
        st.session_state["play_index"] = idx + 1
        st.session_state["play_state"] = "question" if not is_last else "done"
        st.session_state["play_started_at"] = time.time()
        st.session_state["play_last_result"] = None
        st.rerun()
