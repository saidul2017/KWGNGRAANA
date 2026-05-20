"""Bank Soal — list, create/edit, delete, import Excel."""
import io
import json
import pandas as pd
import streamlit as st

from lib import auth, db

user = auth.require_role("lecturer")

TOPICS = [
    "Pancasila", "Identitas Nasional", "Integrasi Nasional", "UUD 1945",
    "Konstitusi", "Kewarganegaraan", "Hak & Kewajiban", "Demokrasi Pancasila",
    "Partisipasi Politik", "Penegakan Hukum", "Antikorupsi", "Wawasan Nusantara",
    "Hubungan Internasional", "Ketahanan Nasional", "Bela Negara", "Refleksi Pendidik",
]

st.title("📝 Bank Soal")

tab_list, tab_form, tab_import = st.tabs(["📋 Daftar Soal", "➕ Buat / Ubah", "📥 Import Excel"])

# ============================================================================
# Tab 1: Daftar Soal
# ============================================================================
with tab_list:
    rows = db.query_all("SELECT * FROM questions ORDER BY topic, id DESC")
    st.caption(f"Total **{len(rows)}** soal dalam bank.")
    if not rows:
        st.info("Belum ada soal. Buat di tab **Buat / Ubah** atau **Import Excel**.")
    else:
        # Group by topic
        by_topic: dict[str, list] = {}
        for r in rows:
            by_topic.setdefault(r["topic"], []).append(r)
        for topic, qs in by_topic.items():
            with st.expander(f"📚 {topic} ({len(qs)} soal)", expanded=False):
                for q in qs:
                    is_essay = q["type"] == "essay"
                    icon = "✍️" if is_essay else "📝"
                    st.markdown(f"**{icon} #{q['id']} · {q['text']}**")
                    if not is_essay:
                        opts = json.loads(q["options_json"] or "[]")
                        for i, o in enumerate(opts):
                            mark = " ✓" if i == q["correct_index"] else ""
                            color = "green" if i == q["correct_index"] else "gray"
                            st.markdown(f"<small>:{color}[{chr(65 + i)}. {o}{mark}]</small>", unsafe_allow_html=True)
                    else:
                        kp = json.loads(q["essay_key_points"] or "[]")
                        st.markdown("<small>**Rubrik poin kunci:**</small>", unsafe_allow_html=True)
                        for i, p in enumerate(kp):
                            st.markdown(f"<small>{i + 1}. {p}</small>", unsafe_allow_html=True)
                    meta = f"⏱️ {q['time_limit']}s · 🏅 {q['max_points']}pts · {q['difficulty']}"
                    if q["source_ref"]:
                        meta += f" · 📖 {q['source_ref']}"
                    st.caption(meta)
                    cols = st.columns([1, 1, 8])
                    if cols[0].button("✏️ Ubah", key=f"edit_{q['id']}"):
                        st.session_state["editing_qid"] = q["id"]
                        st.rerun()
                    if cols[1].button("🗑️ Hapus", key=f"del_{q['id']}"):
                        db.execute("DELETE FROM questions WHERE id=?", (q["id"],))
                        st.rerun()
                    st.divider()

# ============================================================================
# Tab 2: Buat / Ubah
# ============================================================================
with tab_form:
    edit_id = st.session_state.get("editing_qid")
    edit_q = db.query_one("SELECT * FROM questions WHERE id=?", (edit_id,)) if edit_id else None

    if edit_q:
        st.info(f"✏️ Mengubah soal #{edit_id}. Klik **Batal Edit** untuk buat baru.")
        if st.button("Batal Edit"):
            st.session_state.pop("editing_qid", None)
            st.rerun()

    qtype = st.radio(
        "Tipe Soal",
        options=["mcq", "essay"],
        format_func=lambda x: "📝 Pilihan Ganda" if x == "mcq" else "✍️ Esai (auto-grading AI)",
        index=0 if (not edit_q or edit_q["type"] != "essay") else 1,
        horizontal=True,
        key="qtype_radio",
    )

    with st.form("question_form"):
        c1, c2, c3 = st.columns(3)
        topic = c1.selectbox(
            "Topik",
            options=TOPICS,
            index=TOPICS.index(edit_q["topic"]) if edit_q and edit_q["topic"] in TOPICS else 0,
        )
        difficulty = c2.selectbox(
            "Kesulitan",
            options=["easy", "medium", "hard"],
            format_func=lambda x: {"easy": "Mudah", "medium": "Sedang", "hard": "Sulit"}[x],
            index=["easy", "medium", "hard"].index(edit_q["difficulty"]) if edit_q else 1,
        )
        max_points = c3.number_input("Skor Maks", 100, 2000, edit_q["max_points"] if edit_q else 1000, 100)

        text = st.text_area("Pertanyaan", value=edit_q["text"] if edit_q else "", height=80)

        if qtype == "mcq":
            existing_opts = json.loads(edit_q["options_json"]) if edit_q and edit_q["type"] != "essay" else ["", "", "", ""]
            existing_correct = edit_q["correct_index"] if edit_q and edit_q["type"] != "essay" else 0
            n_opts = st.number_input("Jumlah Opsi", 2, 6, len(existing_opts) if existing_opts else 4)
            opts: list[str] = []
            for i in range(int(n_opts)):
                default = existing_opts[i] if i < len(existing_opts) else ""
                opts.append(st.text_input(f"Opsi {chr(65 + i)}", value=default, key=f"opt_{i}"))
            correct_idx = st.radio(
                "Jawaban Benar",
                options=list(range(int(n_opts))),
                format_func=lambda i: f"Opsi {chr(65 + i)}",
                index=min(existing_correct, int(n_opts) - 1),
                horizontal=True,
            )
            time_limit = st.number_input("Batas Waktu (detik)", 5, 600, edit_q["time_limit"] if edit_q else 20)
            essay_kp_text = ""
            essay_min_words = 0
        else:
            existing_kp = json.loads(edit_q["essay_key_points"]) if edit_q and edit_q["essay_key_points"] else [""]
            st.markdown("**Poin Kunci Rubrik** (pisah baris baru — masing-masing jadi 1 poin)")
            essay_kp_text = st.text_area(
                "Poin Kunci",
                value="\n".join(existing_kp),
                height=120,
                placeholder="Persamaan kedudukan di hadapan hukum\nKewajiban menjunjung hukum\nRelevansi bagi guru MI: keadilan",
                label_visibility="collapsed",
            )
            essay_min_words = st.number_input(
                "Minimal Kata Jawaban (0 = bebas)", 0, 2000,
                edit_q["essay_min_words"] if edit_q and edit_q["essay_min_words"] else 30,
            )
            time_limit = st.number_input("Batas Waktu (detik)", 30, 600, edit_q["time_limit"] if edit_q else 180)
            opts = []
            correct_idx = 0

        explanation = st.text_area("Penjelasan / Kunci Jawaban", value=edit_q["explanation"] or "" if edit_q else "")
        source_ref = st.text_input("Rujukan Sumber", value=edit_q["source_ref"] or "" if edit_q else "", placeholder="Mis. UUD 1945 Pasal 27")

        if st.form_submit_button("💾 Simpan", type="primary"):
            errors = []
            if len(text.strip()) < 5:
                errors.append("Pertanyaan minimal 5 karakter.")
            if qtype == "mcq":
                clean_opts = [o.strip() for o in opts if o.strip()]
                if len(clean_opts) < 2:
                    errors.append("MCQ butuh minimal 2 opsi terisi.")
                if correct_idx >= len(clean_opts):
                    errors.append("Indeks jawaban benar di luar jumlah opsi.")
            else:
                kp_list = [k.strip() for k in essay_kp_text.split("\n") if k.strip()]
                if not kp_list:
                    errors.append("Esai butuh minimal 1 poin kunci rubrik.")

            if errors:
                for e in errors:
                    st.error(e)
            else:
                if qtype == "mcq":
                    options_json = json.dumps(clean_opts)
                    essay_kp_json = None
                    essay_min_val = None
                    final_correct = correct_idx
                else:
                    options_json = "[]"
                    essay_kp_json = json.dumps(kp_list)
                    essay_min_val = essay_min_words
                    final_correct = 0

                if edit_q:
                    db.execute(
                        """UPDATE questions SET topic=?, text=?, type=?, options_json=?, correct_index=?,
                           explanation=?, source_ref=?, difficulty=?, time_limit=?, max_points=?,
                           essay_key_points=?, essay_min_words=? WHERE id=?""",
                        (topic, text, qtype, options_json, final_correct, explanation, source_ref,
                         difficulty, time_limit, max_points, essay_kp_json, essay_min_val, edit_q["id"]),
                    )
                    st.success(f"✅ Soal #{edit_q['id']} diperbarui.")
                    st.session_state.pop("editing_qid", None)
                else:
                    db.execute(
                        """INSERT INTO questions (topic, text, type, options_json, correct_index,
                           explanation, source_ref, difficulty, time_limit, max_points,
                           essay_key_points, essay_min_words, created_by)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (topic, text, qtype, options_json, final_correct, explanation, source_ref,
                         difficulty, time_limit, max_points, essay_kp_json, essay_min_val, user["id"]),
                    )
                    st.success("✅ Soal baru tersimpan.")
                st.rerun()

# ============================================================================
# Tab 3: Import Excel
# ============================================================================
with tab_import:
    st.markdown(
        "Unggah file `.xlsx` dengan kolom (sheet pertama):\n\n"
        "- **type** — `mcq` atau `essay`\n"
        "- **topic, text** — wajib\n"
        "- **MCQ:** `optionA..F` + `correct` (huruf A..F)\n"
        "- **Essay:** `keyPoints` (poin dipisah `|`) + `minWords`\n"
        "- Opsional: `explanation, sourceRef, difficulty, timeLimit, maxPoints`\n"
    )

    # Tombol unduh template
    template_data = [
        {"type": "mcq", "topic": "Pancasila",
         "text": "Pancasila disahkan pada tanggal...",
         "optionA": "1 Juni 1945", "optionB": "17 Agustus 1945",
         "optionC": "18 Agustus 1945", "optionD": "22 Juni 1945",
         "correct": "C", "keyPoints": "", "minWords": "",
         "explanation": "PPKI 18-08-1945", "sourceRef": "Pembukaan UUD 1945",
         "difficulty": "easy", "timeLimit": 20, "maxPoints": 1000},
        {"type": "essay", "topic": "UUD 1945",
         "text": "Jelaskan makna Pasal 27 ayat (1) bagi calon guru MI.",
         "optionA": "", "optionB": "", "optionC": "", "optionD": "", "correct": "",
         "keyPoints": "Persamaan kedudukan di hukum | Kewajiban menjunjung hukum | Relevansi guru MI",
         "minWords": 50,
         "explanation": "", "sourceRef": "UUD 1945 Pasal 27 ayat (1)",
         "difficulty": "medium", "timeLimit": 300, "maxPoints": 1000},
    ]
    tpl_df = pd.DataFrame(template_data)
    tpl_buf = io.BytesIO()
    with pd.ExcelWriter(tpl_buf, engine="openpyxl") as w:
        tpl_df.to_excel(w, sheet_name="Soal", index=False)
    st.download_button(
        "📄 Unduh Template Excel",
        data=tpl_buf.getvalue(),
        file_name="KWGN-Template-Bank-Soal.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    uploaded = st.file_uploader("Unggah .xlsx", type=["xlsx"])
    if uploaded:
        if uploaded.size > 5 * 1024 * 1024:
            st.error("File terlalu besar (>5 MB).")
        else:
            try:
                df = pd.read_excel(uploaded, sheet_name=0, dtype=str).fillna("")
            except Exception as e:
                st.error(f"Gagal membaca: {e}")
                st.stop()

            if len(df) > 500:
                st.error(f"Terlalu banyak baris ({len(df)}). Maks 500 per upload.")
                st.stop()

            results = []
            created = skipped = errors = 0
            for i, r in df.iterrows():
                row_num = i + 2
                try:
                    qt = str(r.get("type", "mcq")).strip().lower() or "mcq"
                    if qt not in ("mcq", "essay"):
                        results.append((row_num, "❌", f"type tidak valid: {qt}"))
                        errors += 1
                        continue
                    topic = str(r.get("topic", "")).strip()
                    text_q = str(r.get("text", "")).strip()
                    if not topic or not text_q:
                        results.append((row_num, "❌", "topic atau text kosong"))
                        errors += 1
                        continue

                    explanation = str(r.get("explanation", "")).strip()
                    source_ref = str(r.get("sourceRef", "")).strip()
                    difficulty = (str(r.get("difficulty", "medium")).strip().lower() or "medium")
                    if difficulty not in ("easy", "medium", "hard"):
                        difficulty = "medium"
                    try:
                        max_points = max(100, min(2000, int(float(r.get("maxPoints") or 1000))))
                    except Exception:
                        max_points = 1000

                    if qt == "mcq":
                        opts = []
                        for k in ("optionA", "optionB", "optionC", "optionD", "optionE", "optionF"):
                            v = str(r.get(k, "")).strip()
                            if v:
                                opts.append(v)
                        if len(opts) < 2:
                            results.append((row_num, "❌", "MCQ butuh ≥2 opsi"))
                            errors += 1
                            continue
                        letter = str(r.get("correct", "")).strip().upper()
                        if letter not in "ABCDEF" or "ABCDEF".index(letter) >= len(opts):
                            results.append((row_num, "❌", f"correct '{letter}' di luar opsi"))
                            errors += 1
                            continue
                        opts_json = json.dumps(opts)
                        correct_idx = "ABCDEF".index(letter)
                        essay_kp_json = None
                        essay_min_v = None
                        try:
                            time_limit = max(5, min(600, int(float(r.get("timeLimit") or 20))))
                        except Exception:
                            time_limit = 20
                    else:
                        kp_raw = str(r.get("keyPoints", "")).strip()
                        kp = [s.strip() for s in kp_raw.split("|") if s.strip()]
                        if not kp:
                            results.append((row_num, "❌", "Essay butuh keyPoints (dipisah '|')"))
                            errors += 1
                            continue
                        opts_json = "[]"
                        correct_idx = 0
                        essay_kp_json = json.dumps(kp)
                        try:
                            essay_min_v = max(0, min(2000, int(float(r.get("minWords") or 0))))
                        except Exception:
                            essay_min_v = 0
                        try:
                            time_limit = max(30, min(600, int(float(r.get("timeLimit") or 180))))
                        except Exception:
                            time_limit = 180

                    existing = db.query_one(
                        "SELECT id FROM questions WHERE topic=? AND text=?",
                        (topic, text_q),
                    )
                    if existing:
                        results.append((row_num, "⏭️", "Sudah ada (di-skip)"))
                        skipped += 1
                        continue
                    db.execute(
                        """INSERT INTO questions (topic, text, type, options_json, correct_index,
                           explanation, source_ref, difficulty, time_limit, max_points,
                           essay_key_points, essay_min_words, created_by)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (topic, text_q, qt, opts_json, correct_idx, explanation, source_ref,
                         difficulty, time_limit, max_points, essay_kp_json, essay_min_v, user["id"]),
                    )
                    results.append((row_num, "✅", "Tersimpan"))
                    created += 1
                except Exception as e:
                    results.append((row_num, "❌", str(e)[:120]))
                    errors += 1

            cols = st.columns(3)
            cols[0].metric("✅ Berhasil", created)
            cols[1].metric("⏭️ Dilewati", skipped)
            cols[2].metric("❌ Error", errors)
            with st.expander("Detail per baris"):
                rdf = pd.DataFrame(results, columns=["Baris", "Status", "Catatan"])
                st.dataframe(rdf, hide_index=True, use_container_width=True)
