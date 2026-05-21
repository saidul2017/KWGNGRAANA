"""Beranda mahasiswa."""
import streamlit as st
import pandas as pd

from lib import auth, db

user = auth.require_role("student")

st.title(f"🏠 Halo, {user['name'].split()[0]} 👋")
st.caption(f"NIM `{user['nim']}` · Selamat belajar Pancasila & Kewarganegaraan!")

# Stats
n_pract = db.query_one("SELECT COUNT(*) AS c FROM quizzes WHERE kind='practice' AND status='open'")["c"]
n_quiz = db.query_one("SELECT COUNT(*) AS c FROM quizzes WHERE kind IN ('quiz','uas') AND status='open'")["c"]
total = db.query_one("SELECT COALESCE(SUM(total_score),0) AS s FROM attempts WHERE user_id=? AND status='completed'", (user["id"],))["s"]
done = db.query_one("SELECT COUNT(*) AS c FROM attempts WHERE user_id=? AND status='completed'", (user["id"],))["c"]

c1, c2, c3, c4 = st.columns(4)
c1.metric("🎯 Latihan Tersedia", n_pract)
c2.metric("🏆 Kuis/UAS Aktif", n_quiz)
c3.metric("✅ Sudah Dikerjakan", done)
c4.metric("🏅 Total Poin", total)

st.markdown("---")
left, right = st.columns(2)
with left:
    st.subheader("🕘 Riwayat Terbaru")
    rows = db.query_all(
        """SELECT a.id, q.title, q.kind, a.total_score, a.total_correct, a.total_questions, a.finished_at
           FROM attempts a JOIN quizzes q ON q.id=a.quiz_id
           WHERE a.user_id=? AND a.status='completed'
           ORDER BY a.finished_at DESC LIMIT 5""",
        (user["id"],),
    )
    if not rows:
        st.info("Belum ada pengerjaan. Coba **Latihan Mandiri** untuk mulai.")
    else:
        df = pd.DataFrame([{
            "Kuis": r["title"], "Jenis": r["kind"].upper(),
            "Benar": f"{r['total_correct']}/{r['total_questions']}",
            "Skor": r["total_score"],
        } for r in rows])
        st.dataframe(df, hide_index=True, use_container_width=True)

with right:
    st.subheader("💡 Mulai Cepat")
    st.markdown(
        "🎯 **Latihan Mandiri** — boleh diulang berapa pun, untuk persiapan UAS\n\n"
        "🏆 **Kuis & UAS** — sekali pengerjaan, dinilai otomatis\n\n"
        "💬 **Chatbot PKn** — tanya konsep dengan rujukan resmi\n\n"
        "📊 **Nilai Saya** — lihat semua riwayat pengerjaan\n\n"
        "👤 **Profil** — ubah password (penting setelah login pertama!)"
    )
