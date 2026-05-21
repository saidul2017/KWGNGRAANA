"""Dashboard ringkasan dosen."""
import streamlit as st
import pandas as pd

from lib import auth, db

user = auth.require_role("lecturer")

st.title("📊 Ringkasan Kelas")
st.caption(f"Halo, {user['name']}. Berikut ringkasan kelas mata kuliah Kewarganegaraan PGMI.")

# Statistik
n_students = db.query_one("SELECT COUNT(*) AS c FROM users WHERE role='student'")["c"]
n_questions = db.query_one("SELECT COUNT(*) AS c FROM questions")["c"]
n_quizzes = db.query_one("SELECT COUNT(*) AS c FROM quizzes")["c"]
n_attempts = db.query_one("SELECT COUNT(*) AS c FROM attempts WHERE status='completed'")["c"]

c1, c2, c3, c4 = st.columns(4)
c1.metric("🎓 Mahasiswa", n_students)
c2.metric("📝 Bank Soal", n_questions)
c3.metric("🏆 Kuis & UAS", n_quizzes)
c4.metric("✅ Pengerjaan Selesai", n_attempts)

st.markdown("---")

col_left, col_right = st.columns(2)

with col_left:
    st.subheader("🆕 Kuis Terbaru")
    recent = db.query_all(
        "SELECT id, title, kind, status, created_at FROM quizzes ORDER BY created_at DESC LIMIT 5"
    )
    if not recent:
        st.info("Belum ada kuis. Buat kuis baru di menu **Kuis & UAS**.")
    else:
        df = pd.DataFrame([dict(r) for r in recent])
        df["kind"] = df["kind"].str.upper()
        st.dataframe(df[["title", "kind", "status", "created_at"]], hide_index=True, use_container_width=True)

with col_right:
    st.subheader("🏅 Top 5 Pengerjaan")
    top = db.query_all(
        """SELECT u.name, u.nim, q.title AS quiz, a.total_score, a.total_correct, a.total_questions
           FROM attempts a JOIN users u ON u.id=a.user_id JOIN quizzes q ON q.id=a.quiz_id
           WHERE a.status='completed'
           ORDER BY a.total_score DESC LIMIT 5"""
    )
    if not top:
        st.info("Belum ada pengerjaan yang selesai.")
    else:
        df = pd.DataFrame([dict(r) for r in top])
        st.dataframe(df, hide_index=True, use_container_width=True)

st.markdown("---")
st.markdown(
    "📌 **Mulai cepat:**\n\n"
    "1. **Bank Soal** — buat soal MCQ atau Esai (bisa import Excel)\n"
    "2. **Kuis & UAS** — kelompokkan soal jadi latihan/kuis/UAS\n"
    "3. **Kelompok** — bagi mahasiswa ke kelompok bila perlu mode kolaboratif\n"
    "4. **Tinjau Esai** — review skor AI dan override jika perlu\n"
    "5. **Nilai Kelas** — unduh Excel rekap untuk arsip akademik"
)
