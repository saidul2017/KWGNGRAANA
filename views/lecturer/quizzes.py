"""Manajemen Kuis & UAS — list, create, edit, set status."""
import streamlit as st

from lib import auth, db

user = auth.require_role("lecturer")

st.title("🏆 Kuis & UAS")

tab_list, tab_form = st.tabs(["📋 Daftar", "➕ Buat / Ubah"])

# ============================================================================
# Tab 1: Daftar kuis
# ============================================================================
with tab_list:
    rows = db.query_all(
        """SELECT q.*,
                  (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS qcount
           FROM quizzes q ORDER BY q.created_at DESC"""
    )
    if not rows:
        st.info("Belum ada kuis. Buat di tab **Buat / Ubah**.")
    else:
        for q in rows:
            with st.expander(
                f"{'🎯' if q['kind'] == 'practice' else '🏆' if q['kind'] == 'quiz' else '🎓'} "
                f"**{q['title']}** · {q['kind'].upper()} · status: `{q['status']}` · {q['qcount']} soal",
                expanded=False,
            ):
                if q["description"]:
                    st.caption(q["description"])

                # Status buttons
                s1, s2, s3, s4, s5 = st.columns(5)
                if s1.button("📝 Edit", key=f"e_{q['id']}"):
                    st.session_state["editing_quiz"] = q["id"]
                    st.rerun()
                if q["status"] != "open":
                    if s2.button("✅ Buka", key=f"o_{q['id']}"):
                        db.execute("UPDATE quizzes SET status='open' WHERE id=?", (q["id"],))
                        st.rerun()
                if q["status"] != "closed":
                    if s3.button("🔒 Tutup", key=f"c_{q['id']}"):
                        db.execute("UPDATE quizzes SET status='closed' WHERE id=?", (q["id"],))
                        st.rerun()
                if q["status"] != "draft":
                    if s4.button("📂 Draft", key=f"d_{q['id']}"):
                        db.execute("UPDATE quizzes SET status='draft' WHERE id=?", (q["id"],))
                        st.rerun()
                if s5.button("🗑️ Hapus", key=f"x_{q['id']}"):
                    db.execute("DELETE FROM quizzes WHERE id=?", (q["id"],))
                    st.rerun()

                # Daftar soal di kuis
                qrows = db.query_all(
                    """SELECT q.id, q.topic, q.text, q.type
                       FROM questions q
                       JOIN quiz_questions qq ON qq.question_id = q.id
                       WHERE qq.quiz_id = ? ORDER BY qq.position""",
                    (q["id"],),
                )
                if qrows:
                    st.markdown("**Soal:**")
                    for i, qq in enumerate(qrows):
                        icon = "✍️" if qq["type"] == "essay" else "📝"
                        st.markdown(f"{i + 1}. {icon} *[{qq['topic']}]* {qq['text'][:100]}")

# ============================================================================
# Tab 2: Buat / Ubah
# ============================================================================
with tab_form:
    edit_qid = st.session_state.get("editing_quiz")
    edit_q = db.query_one("SELECT * FROM quizzes WHERE id=?", (edit_qid,)) if edit_qid else None
    edit_qids = []
    if edit_q:
        edit_qids = [r["question_id"] for r in db.query_all(
            "SELECT question_id FROM quiz_questions WHERE quiz_id=? ORDER BY position", (edit_q["id"],)
        )]
        st.info(f"✏️ Mengubah kuis #{edit_q['id']}. Klik **Batal Edit** untuk buat baru.")
        if st.button("Batal Edit", key="cancel_edit_q"):
            st.session_state.pop("editing_quiz", None)
            st.rerun()

    all_q = db.query_all("SELECT id, topic, text, type FROM questions ORDER BY topic, id")
    q_choices = {q["id"]: f"{'✍️' if q['type'] == 'essay' else '📝'} [{q['topic']}] {q['text'][:60]}" for q in all_q}

    with st.form("quiz_form"):
        title = st.text_input("Judul Kuis", value=edit_q["title"] if edit_q else "",
                              placeholder="Mis. Kuis Pancasila & UUD 1945")
        description = st.text_area("Deskripsi", value=edit_q["description"] or "" if edit_q else "")

        c1, c2, c3 = st.columns(3)
        kind = c1.selectbox(
            "Jenis",
            options=["practice", "quiz", "uas"],
            format_func=lambda x: {"practice": "🎯 Latihan Mandiri", "quiz": "🏆 Kuis", "uas": "🎓 UAS"}[x],
            index=["practice", "quiz", "uas"].index(edit_q["kind"]) if edit_q else 0,
        )
        mode = c2.selectbox(
            "Mode",
            options=["individual", "group"],
            format_func=lambda x: "🧑 Individu" if x == "individual" else "👥 Kelompok",
            index=["individual", "group"].index(edit_q["mode"]) if edit_q else 0,
        )
        shuffle = c3.checkbox("🔀 Acak soal (anti-curang)", value=bool(edit_q["shuffle"]) if edit_q else True)

        st.markdown("**Pilih soal yang dimasukkan ke kuis ini:**")
        selected = st.multiselect(
            "Soal",
            options=list(q_choices.keys()),
            default=edit_qids,
            format_func=lambda x: q_choices[x],
            label_visibility="collapsed",
        )

        if st.form_submit_button("💾 Simpan", type="primary"):
            if len(title.strip()) < 3:
                st.error("Judul minimal 3 karakter.")
            elif not selected:
                st.error("Pilih minimal 1 soal.")
            else:
                if edit_q:
                    db.execute(
                        """UPDATE quizzes SET title=?, description=?, kind=?, mode=?, shuffle=?
                           WHERE id=?""",
                        (title, description, kind, mode, 1 if shuffle else 0, edit_q["id"]),
                    )
                    db.execute("DELETE FROM quiz_questions WHERE quiz_id=?", (edit_q["id"],))
                    qid = edit_q["id"]
                else:
                    db.execute(
                        """INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by)
                           VALUES (?, ?, ?, ?, 'draft', ?, ?)""",
                        (title, description, kind, mode, 1 if shuffle else 0, user["id"]),
                    )
                    qid = db.last_insert_id()
                for i, sid in enumerate(selected):
                    db.execute(
                        "INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)",
                        (qid, sid, i),
                    )
                st.success(f"✅ Kuis tersimpan (id={qid}). Buka di tab **Daftar** untuk aktifkan status.")
                st.session_state.pop("editing_quiz", None)
                st.rerun()
