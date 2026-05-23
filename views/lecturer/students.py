"""Daftar 43 mahasiswa + statistik per mahasiswa."""
import streamlit as st
import pandas as pd

from lib import auth, db

auth.require_role("lecturer")

st.title("🎓 Daftar Mahasiswa")

rows = db.query_all(
    """SELECT u.id, u.nim, u.name, g.name AS kelompok,
              (SELECT COUNT(*) FROM attempts a WHERE a.user_id=u.id AND a.status='completed') AS selesai,
              COALESCE((SELECT SUM(total_score) FROM attempts a WHERE a.user_id=u.id AND a.status='completed'), 0) AS total_poin
       FROM users u LEFT JOIN groups g ON g.id=u.group_id
       WHERE u.role='student' ORDER BY u.nim"""
)
df = pd.DataFrame([dict(r) for r in rows])
df.insert(0, "No", range(1, len(df) + 1))
df = df.drop(columns=["id"])
df = df.rename(columns={"nim": "NIM", "name": "Nama", "kelompok": "Kelompok", "selesai": "Selesai", "total_poin": "Total Poin"})

st.caption(f"Total **{len(df)}** mahasiswa terdaftar.")
st.dataframe(df, hide_index=True, use_container_width=True, height=600)
