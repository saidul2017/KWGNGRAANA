"""Daftar Kuis & UAS aktif (sekali pengerjaan)."""
import streamlit as st

from lib import auth, db

user = auth.require_role("student")

st.title("🏆 Kuis & UAS")
st.caption("Hanya kuis berstatus **aktif** yang dapat dikerjakan. Tiap kuis hanya boleh dikerjakan satu kali.")

rows = db.query_all(
    """SELECT q.id, q.title, q.description, q.kind, q.mode, q.status,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS qcount,
              a.id AS attempt_id, a.status AS attempt_status,
              a.total_score, a.total_correct, a.total_questions
       FROM quizzes q
       LEFT JOIN attempts a ON a.quiz_id=q.id AND a.user_id=?
       WHERE q.kind IN ('quiz','uas')
       ORDER BY q.created_at DESC""",
    (user["id"],),
)

if not rows:
    st.info("Belum ada kuis/UAS dari dosen.")
else:
    for r in rows:
        with st.container(border=True):
            badge = "🎓 UAS" if r["kind"] == "uas" else "🏆 KUIS"
            mode_lbl = "👥 Kelompok" if r["mode"] == "group" else "🧑 Individu"
            st.markdown(f"### {badge} — {r['title']}")
            if r["description"]:
                st.caption(r["description"])
            cs = st.columns(3)
            cs[0].caption(f"📝 {r['qcount']} soal")
            cs[1].caption(mode_lbl)
            status_lbl = {"open": "🟢 Aktif", "draft": "⚪ Belum dibuka", "closed": "🔴 Ditutup"}.get(r["status"], r["status"])
            cs[2].caption(status_lbl)

            finished = r["attempt_status"] == "completed"
            in_progress = r["attempt_status"] == "in_progress"
            can_play = r["status"] == "open" and not finished

            if finished:
                pct = round(r["total_correct"] * 100 / r["total_questions"]) if r["total_questions"] else 0
                st.success(f"✅ Sudah dikerjakan — Skor **{r['total_score']}** ({r['total_correct']}/{r['total_questions']} = {pct}%)")
            elif in_progress:
                st.warning("⏳ Sedang dalam pengerjaan")
            elif r["status"] != "open":
                st.info("⏸️ Belum dibuka oleh dosen")

            if can_play:
                if st.button("▶️ Mulai" if not in_progress else "⏭️ Lanjutkan",
                             key=f"start_q_{r['id']}", type="primary"):
                    st.session_state["play_quiz_id"] = r["id"]
                    for k in ("play_state", "play_questions", "play_index",
                              "play_attempt_id", "play_started_at", "play_done"):
                        st.session_state.pop(k, None)
                    st.switch_page("views/student/play.py")
