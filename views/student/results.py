"""Riwayat nilai mahasiswa."""
import streamlit as st
import pandas as pd

from lib import auth, db

user = auth.require_role("student")

st.title("📊 Riwayat Nilai Saya")

rows = db.query_all(
    """SELECT a.id, q.title AS kuis, q.kind AS jenis,
              a.total_score, a.total_correct, a.total_questions,
              a.status, a.started_at, a.finished_at
       FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = ?
       ORDER BY a.started_at DESC""",
    (user["id"],),
)

if not rows:
    st.info("Belum ada riwayat. Mulai dari **🎯 Latihan Mandiri** di sidebar.")
else:
    total = sum(r["total_score"] for r in rows if r["status"] == "completed")
    n_done = sum(1 for r in rows if r["status"] == "completed")

    c1, c2 = st.columns(2)
    c1.metric("🏅 Total Poin Terkumpul", total)
    c2.metric("✅ Pengerjaan Selesai", n_done)

    st.markdown("---")

    rows_data = []
    for r in rows:
        pct = round(r["total_correct"] * 100 / r["total_questions"]) if r["total_questions"] else 0
        rows_data.append({
            "Kuis": r["kuis"],
            "Jenis": r["jenis"].upper(),
            "Status": "✅ Selesai" if r["status"] == "completed" else "⏳ Berjalan",
            "Benar": f"{r['total_correct']}/{r['total_questions']} ({pct}%)",
            "Skor": r["total_score"],
            "Tanggal": r["finished_at"] or r["started_at"],
        })
    st.dataframe(pd.DataFrame(rows_data), hide_index=True, use_container_width=True, height=500)
