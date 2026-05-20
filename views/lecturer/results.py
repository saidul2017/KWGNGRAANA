"""Nilai Kelas — leaderboard individu, leaderboard kelompok, ekspor Excel."""
import io
import json
import pandas as pd
import streamlit as st

from lib import auth, db

auth.require_role("lecturer")

st.title("📈 Nilai Kelas")

# Filter
quizzes = db.query_all("SELECT id, title, kind FROM quizzes ORDER BY created_at DESC")
quiz_options = {0: "Semua kuis"}
for q in quizzes:
    quiz_options[q["id"]] = f"[{q['kind'].upper()}] {q['title']}"
selected_quiz = st.selectbox(
    "Filter Kuis",
    options=list(quiz_options.keys()),
    format_func=lambda k: quiz_options[k],
)

quiz_filter = "AND a.quiz_id = ?" if selected_quiz else ""
params: list = [selected_quiz] if selected_quiz else []

# ===== Statistik =====
attempts = db.query_all(
    f"""SELECT a.id, u.name, u.nim, g.name AS kelompok,
              q.title AS kuis, q.kind AS jenis,
              a.total_score, a.total_correct, a.total_questions, a.finished_at
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN quizzes q ON q.id = a.quiz_id
       LEFT JOIN groups g ON g.id = u.group_id
       WHERE a.status='completed' {quiz_filter}
       ORDER BY a.total_score DESC, a.finished_at ASC""",
    params,
)

c1, c2, c3 = st.columns(3)
c1.metric("Total Pengerjaan", len(attempts))
avg = round(sum(a["total_score"] for a in attempts) / len(attempts), 0) if attempts else 0
c2.metric("Skor Rata-rata", int(avg))
c3.metric("Skor Tertinggi", attempts[0]["total_score"] if attempts else 0)

tab1, tab2 = st.tabs(["🏅 Leaderboard Individu", "👥 Leaderboard Kelompok"])

# ===== Tab 1: per individu =====
with tab1:
    if not attempts:
        st.info("Belum ada pengerjaan yang selesai.")
    else:
        rows = []
        for i, a in enumerate(attempts):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"#{i + 1}"
            rows.append({
                "Peringkat": medal,
                "NIM": a["nim"],
                "Nama": a["name"],
                "Kelompok": a["kelompok"] or "—",
                "Kuis": a["kuis"],
                "Jenis": a["jenis"].upper(),
                "Benar": f"{a['total_correct']}/{a['total_questions']}",
                "Skor": a["total_score"],
                "Selesai": a["finished_at"] or "",
            })
        st.dataframe(pd.DataFrame(rows), hide_index=True, use_container_width=True, height=500)

# ===== Tab 2: per kelompok =====
with tab2:
    group_filter = "AND a.quiz_id = ?" if selected_quiz else ""
    group_params: list = [selected_quiz] if selected_quiz else []
    grows = db.query_all(
        f"""SELECT g.id, g.name AS kelompok,
                  (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role='student') AS member_count,
                  COUNT(DISTINCT a.user_id) AS active_members,
                  COUNT(a.id) AS attempts,
                  COALESCE(SUM(a.total_score), 0) AS total,
                  COALESCE(ROUND(AVG(a.total_score), 0), 0) AS avg_score
           FROM groups g
           LEFT JOIN attempts a ON a.group_id = g.id AND a.status='completed' {group_filter}
           GROUP BY g.id, g.name
           ORDER BY avg_score DESC, total DESC""",
        group_params,
    )
    if not grows:
        st.info("Belum ada kelompok. Buat di menu **Kelompok**.")
    else:
        gdata = []
        for i, g in enumerate(grows):
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"#{i + 1}"
            gdata.append({
                "Peringkat": medal,
                "Kelompok": g["kelompok"],
                "Anggota Aktif": f"{g['active_members']}/{g['member_count']}",
                "Pengerjaan": g["attempts"],
                "Total Skor": g["total"],
                "Rata-rata": int(g["avg_score"]),
            })
        st.dataframe(pd.DataFrame(gdata), hide_index=True, use_container_width=True)

# ===== Ekspor Excel =====
st.markdown("---")
st.subheader("📥 Ekspor Excel")

if st.button("📊 Hasilkan Excel (5 sheet)", type="primary"):
    quiz_id = selected_quiz if selected_quiz else None
    qf = "AND a.quiz_id = ?" if quiz_id else ""
    qp: list = [quiz_id] if quiz_id else []

    # Sheet 1
    cs = db.query_all(
        """SELECT u.nim, u.name, g.name AS kelompok,
                  (SELECT COUNT(*) FROM attempts a WHERE a.user_id=u.id AND a.status='completed') AS selesai,
                  COALESCE((SELECT SUM(total_score) FROM attempts a WHERE a.user_id=u.id AND a.status='completed'),0) AS total
           FROM users u LEFT JOIN groups g ON g.id=u.group_id
           WHERE u.role='student' ORDER BY u.nim"""
    )
    df1 = pd.DataFrame([{"No": i + 1, "NIM": r["nim"], "Nama": r["name"],
                         "Kelompok": r["kelompok"] or "—",
                         "Jumlah Pengerjaan": r["selesai"],
                         "Total Poin": r["total"]} for i, r in enumerate(cs)])

    # Sheet 2: Detail
    detail = db.query_all(
        f"""SELECT a.finished_at, u.nim, u.name, g.name AS kelompok,
                  q.title AS kuis, q.kind AS jenis,
                  a.total_score, a.total_correct, a.total_questions
           FROM attempts a JOIN users u ON u.id=a.user_id JOIN quizzes q ON q.id=a.quiz_id
           LEFT JOIN groups g ON g.id=u.group_id
           WHERE a.status='completed' {qf}
           ORDER BY q.title, a.total_score DESC""", qp,
    )
    df2_rows = []
    for i, r in enumerate(detail):
        pct = round(r["total_correct"] * 100 / r["total_questions"], 1) if r["total_questions"] else 0
        df2_rows.append({
            "No": i + 1, "Tanggal": r["finished_at"] or "", "NIM": r["nim"], "Nama": r["name"],
            "Kelompok": r["kelompok"] or "—", "Kuis": r["kuis"], "Jenis": r["jenis"].upper(),
            "Benar": r["total_correct"], "Total Soal": r["total_questions"],
            "Persen (%)": pct, "Skor": r["total_score"],
        })
    df2 = pd.DataFrame(df2_rows)

    # Sheet 3: Per kuis
    pq = db.query_all(
        f"""SELECT q.title, q.kind,
                  COUNT(a.id) AS attempts,
                  COALESCE(ROUND(AVG(a.total_score),0),0) AS avg_score,
                  COALESCE(MAX(a.total_score),0) AS max_score,
                  COALESCE(MIN(a.total_score),0) AS min_score
           FROM quizzes q LEFT JOIN attempts a ON a.quiz_id=q.id AND a.status='completed'
           {('WHERE q.id = ?' if quiz_id else '')}
           GROUP BY q.id ORDER BY q.title""",
        [quiz_id] if quiz_id else [],
    )
    df3 = pd.DataFrame([{
        "Kuis": r["title"], "Jenis": r["kind"].upper(),
        "Pengerjaan": r["attempts"], "Rata-rata": r["avg_score"],
        "Tertinggi": r["max_score"], "Terendah": r["min_score"],
    } for r in pq])

    # Sheet 4: Per kelompok
    pg = db.query_all(
        f"""SELECT g.name AS kelompok,
                  (SELECT COUNT(*) FROM users u WHERE u.group_id=g.id AND u.role='student') AS member_count,
                  COUNT(DISTINCT a.user_id) AS active,
                  COUNT(a.id) AS attempts,
                  COALESCE(SUM(a.total_score),0) AS total,
                  COALESCE(ROUND(AVG(a.total_score),0),0) AS avg_score
           FROM groups g LEFT JOIN attempts a ON a.group_id=g.id AND a.status='completed' {qf}
           GROUP BY g.id, g.name ORDER BY avg_score DESC""", qp,
    )
    df4 = pd.DataFrame([{
        "Peringkat": i + 1, "Kelompok": r["kelompok"],
        "Anggota Aktif": r["active"], "Total Anggota": r["member_count"],
        "Pengerjaan": r["attempts"], "Total Skor": r["total"], "Rata-rata": r["avg_score"],
    } for i, r in enumerate(pg)])

    # Sheet 5: Esai
    essays = db.query_all(
        f"""SELECT u.nim, u.name, qz.title AS kuis,
                  qn.topic, qn.text AS pertanyaan, qn.max_points,
                  ans.essay_text, ans.score_awarded, ans.original_score,
                  ans.lecturer_note, ans.reviewed_at, ans.ai_feedback
           FROM answers ans JOIN attempts a ON a.id=ans.attempt_id
           JOIN questions qn ON qn.id=ans.question_id AND qn.type='essay'
           JOIN users u ON u.id=a.user_id JOIN quizzes qz ON qz.id=a.quiz_id
           WHERE a.status='completed' {qf} ORDER BY qz.title, u.nim""", qp,
    )
    df5_rows = []
    for i, r in enumerate(essays):
        try:
            fb = json.loads(r["ai_feedback"] or "{}").get("feedback", "")
        except Exception:
            fb = ""
        df5_rows.append({
            "No": i + 1, "NIM": r["nim"], "Nama": r["name"], "Kuis": r["kuis"],
            "Topik": r["topic"], "Pertanyaan": r["pertanyaan"],
            "Jawaban Mahasiswa": r["essay_text"] or "",
            "Skor Final": r["score_awarded"], "Skor Maks": r["max_points"],
            "Persen": round(r["score_awarded"] * 100 / r["max_points"]),
            "Skor AI Awal": r["original_score"] if r["original_score"] is not None else r["score_awarded"],
            "Status": "Ditinjau dosen" if r["reviewed_at"] else "Otomatis AI",
            "Feedback AI": fb, "Catatan Dosen": r["lecturer_note"] or "",
            "Tanggal Tinjau": r["reviewed_at"] or "",
        })
    df5 = pd.DataFrame(df5_rows)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df1.to_excel(w, sheet_name="Ringkasan Kelas", index=False)
        df2.to_excel(w, sheet_name="Detail Pengerjaan", index=False)
        df3.to_excel(w, sheet_name="Per Kuis", index=False)
        df4.to_excel(w, sheet_name="Per Kelompok", index=False)
        if len(df5) > 0:
            df5.to_excel(w, sheet_name="Jawaban Esai", index=False)
    from datetime import date
    fname = f"KWGN-Nilai-Kelas-{date.today().isoformat()}.xlsx"
    if quiz_id:
        fname = f"KWGN-Nilai-Kuis{quiz_id}-{date.today().isoformat()}.xlsx"
    st.download_button(
        "⬇️ Unduh File",
        data=buf.getvalue(),
        file_name=fname,
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    st.success(f"Excel siap. Sheet: Ringkasan Kelas, Detail Pengerjaan, Per Kuis, Per Kelompok"
               f"{', Jawaban Esai' if len(df5) > 0 else ''}.")
