"""Daftar latihan mandiri (boleh diulang)."""
import streamlit as st

from lib import auth, db

user = auth.require_role("student")

st.title("🎯 Latihan Mandiri")
st.caption("Berlatih sebanyak Anda mau — feedback langsung, tanpa nilai resmi.")

rows = db.query_all(
    """SELECT q.id, q.title, q.description,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS qcount
       FROM quizzes q
       WHERE q.kind='practice' AND q.status='open'
       ORDER BY q.created_at DESC"""
)

if not rows:
    st.info("Belum ada latihan tersedia. Tunggu dosen membuat latihan.")
else:
    cols = st.columns(2)
    for i, r in enumerate(rows):
        with cols[i % 2]:
            with st.container(border=True):
                st.markdown(f"### {r['title']}")
                if r["description"]:
                    st.caption(r["description"])
                st.caption(f"{r['qcount']} soal")
                if st.button("▶️ Mulai Berlatih", key=f"start_p_{r['id']}", type="primary"):
                    # Reset & redirect ke halaman play
                    st.session_state["play_quiz_id"] = r["id"]
                    for k in ("play_state", "play_questions", "play_index",
                              "play_attempt_id", "play_started_at", "play_done"):
                        st.session_state.pop(k, None)
                    st.switch_page("views/student/play.py")
