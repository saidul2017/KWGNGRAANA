"""Tinjauan Esai — dosen lihat jawaban + AI feedback, override skor bila perlu."""
import json
import streamlit as st

from lib import auth, db

auth.require_role("lecturer")

st.title("✍️ Tinjauan Esai")
st.caption("Skor AI dapat di-override. Skor AI awal disimpan sebagai jejak audit.")

# Filter
quiz_essays = db.query_all(
    """SELECT q.id, q.title,
              (SELECT COUNT(*) FROM quiz_questions qq
                JOIN questions qn ON qn.id=qq.question_id
                WHERE qq.quiz_id=q.id AND qn.type='essay') AS n_essay
       FROM quizzes q ORDER BY q.created_at DESC"""
)
quiz_essays = [q for q in quiz_essays if q["n_essay"] > 0]

c1, c2 = st.columns([3, 1])
quiz_options = {0: "Semua kuis dengan esai"}
for q in quiz_essays:
    quiz_options[q["id"]] = f"{q['title']} ({q['n_essay']} esai)"
selected_qz = c1.selectbox("Kuis", options=list(quiz_options.keys()),
                           format_func=lambda x: quiz_options[x])
only_unrev = c2.checkbox("⚠️ Belum ditinjau saja")

where_extra = ""
params: list = []
if selected_qz:
    where_extra += " AND a.quiz_id = ?"
    params.append(selected_qz)
if only_unrev:
    where_extra += " AND ans.reviewed_at IS NULL"

rows = db.query_all(
    f"""SELECT ans.id AS aid, ans.essay_text, ans.ai_feedback, ans.score_awarded,
              ans.original_score, ans.lecturer_note, ans.reviewed_at,
              u.name, u.nim, g.name AS kelompok,
              qn.id AS qid, qn.topic, qn.text AS pertanyaan, qn.max_points,
              qn.essay_key_points, qn.source_ref,
              qz.title AS quiz_title, a.finished_at
       FROM answers ans
       JOIN attempts a ON a.id=ans.attempt_id
       JOIN questions qn ON qn.id=ans.question_id AND qn.type='essay'
       JOIN users u ON u.id=a.user_id
       LEFT JOIN groups g ON g.id=u.group_id
       JOIN quizzes qz ON qz.id=a.quiz_id
       WHERE 1=1 {where_extra}
       ORDER BY ans.reviewed_at IS NULL DESC, a.finished_at DESC""",
    params,
)
reviewed = sum(1 for r in rows if r["reviewed_at"])
st.caption(f"Total **{len(rows)}** jawaban esai · sudah ditinjau **{reviewed}**.")

if not rows:
    st.info("Tidak ada jawaban esai untuk filter ini.")
else:
    for r in rows:
        try:
            ai = json.loads(r["ai_feedback"] or "{}")
        except Exception:
            ai = {}
        try:
            kp = json.loads(r["essay_key_points"] or "[]")
        except Exception:
            kp = []

        pct = round(r["score_awarded"] * 100 / r["max_points"]) if r["max_points"] else 0
        status = "✓ Ditinjau" if r["reviewed_at"] else "⏳ Belum ditinjau"
        score_color = "🟢" if pct >= 70 else "🟡" if pct >= 40 else "🔴"

        with st.expander(
            f"{score_color} **{r['name']}** · `{r['nim']}` · Skor: {r['score_awarded']}/{r['max_points']} ({pct}%) · {status}",
            expanded=False,
        ):
            left, right = st.columns(2)
            with left:
                st.markdown(f"**Pertanyaan** ({r['topic']})")
                st.write(r["pertanyaan"])
                if r["source_ref"]:
                    st.caption(f"📖 {r['source_ref']}")
                if kp:
                    st.markdown("**Rubrik Poin Kunci:**")
                    for i, p in enumerate(kp):
                        st.markdown(f"{i + 1}. {p}")
                st.markdown("**Jawaban Mahasiswa:**")
                st.markdown(f"> {r['essay_text'] or '_(kosong)_'}")
                if ai.get("feedback"):
                    st.info(f"🤖 **Penilaian AI ({ai.get('scorePct', 0)}%):** {ai['feedback']}")
                if ai.get("matchedPoints"):
                    st.markdown("**✓ Tertangkap:**")
                    for p in ai["matchedPoints"]:
                        st.markdown(f"- {p}")
                if ai.get("missingPoints"):
                    st.markdown("**○ Belum tertangkap:**")
                    for p in ai["missingPoints"]:
                        st.markdown(f"- {p}")

            with right:
                st.markdown("**Override Skor**")
                if r["original_score"] is not None:
                    st.caption(f"Skor AI awal: {r['original_score']}/{r['max_points']}")
                with st.form(f"override_{r['aid']}"):
                    new_score = st.number_input(
                        f"Skor (0–{r['max_points']})", 0, r["max_points"],
                        r["score_awarded"], 50, key=f"score_{r['aid']}",
                    )
                    note = st.text_area(
                        "Catatan dosen (opsional)",
                        value=r["lecturer_note"] or "",
                        height=80,
                        key=f"note_{r['aid']}",
                    )
                    if st.form_submit_button("💾 Simpan Override"):
                        is_correct = 1 if new_score / r["max_points"] >= 0.7 else 0
                        original = r["original_score"] if r["original_score"] is not None else r["score_awarded"]
                        db.execute(
                            """UPDATE answers SET score_awarded=?, is_correct=?,
                               original_score=?, lecturer_note=?, reviewed_at=datetime('now')
                               WHERE id=?""",
                            (new_score, is_correct, original, note, r["aid"]),
                        )
                        # Recompute attempt totals
                        db.execute(
                            """UPDATE attempts SET
                                 total_score = (SELECT COALESCE(SUM(score_awarded),0) FROM answers WHERE attempt_id=attempts.id),
                                 total_correct = (SELECT COUNT(*) FROM answers WHERE attempt_id=attempts.id AND is_correct=1)
                               WHERE id=(SELECT attempt_id FROM answers WHERE id=?)""",
                            (r["aid"],),
                        )
                        st.success("✅ Tersimpan.")
                        st.rerun()
