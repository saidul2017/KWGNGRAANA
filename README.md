# KWGN Learning Hub — Streamlit Edition

**Sistem Pembelajaran Mata Kuliah Kewarganegaraan — S1 PGMI**

Aplikasi web pendukung mata kuliah Kewarganegaraan PGMI dengan Streamlit:
- Chatbot 2-layer (KB lokal + Gemini AI)
- Latihan mandiri & kuis Kahoot-style (self-paced, timer per soal)
- Soal pilihan ganda + **esai dengan auto-grading AI Gemini**
- Dashboard mahasiswa & dosen
- Tinjauan esai dengan override skor
- Excel export 5 sheet & import bank soal

## ⚠️ Keterbatasan Streamlit (vs versi Next.js sebelumnya)

| Fitur | Status |
|---|---|
| 🎮 Live Kahoot real-time multi-user | ❌ **DROPPED** — Streamlit tidak cocok |
| 👥 43 mahasiswa concurrent | ⚠️ ~5–10 OK, di atas itu lambat |
| 🎯 Timer Kuis | ✅ Otomatis refresh tiap 1s (tidak flicker) |
| 🤖 Chatbot Gemini | ✅ Bekerja |
| ✍️ Esai + AI Grading | ✅ Bekerja |
| 📊 Excel Export 5 sheet | ✅ Bekerja |
| 👨‍🏫 Tinjau Esai + override | ✅ Bekerja |

> Versi **Next.js full-feature** ada di branch `feat/initial-mvp` bila Anda
> butuh kembali ke Live Kahoot real-time multi-user.

## 🚀 Cara Menjalankan Lokal

```bash
# 1. Clone & install dependencies
git clone -b feat/streamlit https://github.com/saidul2017/KWGNGRAANA.git
cd KWGNGRAANA
python3 -m pip install -r requirements.txt

# 2. Salin & isi secrets (TIDAK akan ter-commit)
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# Edit .streamlit/secrets.toml:
#   - GEMINI_API_KEY (dari aistudio.google.com/apikey)
#   - DEFAULT_LECTURER_PASSWORD (password kuat baru)

# 3. Inisialisasi DB + seed (43 mahasiswa, dosen, 10 soal, 1 latihan demo)
python3 scripts/init_db.py
python3 scripts/seed.py

# 4. Jalankan aplikasi
streamlit run streamlit_app.py
# Buka http://localhost:8501
```

## 🔐 Akun Default

| Peran | Username | Password |
| --- | --- | --- |
| Dosen | `dosen@kwgn.id` | nilai `DEFAULT_LECTURER_PASSWORD` di secrets |
| Mahasiswa | NIM (mis. `25104080001`) | sama dengan NIM |

> ⚠️ Mahasiswa & dosen **wajib ganti password** setelah login pertama
> via menu **Profil → Ganti Password**.

## 🌐 Deployment

### 🥇 Streamlit Community Cloud (gratis)

1. Push branch ini ke GitHub Anda (sudah).
2. Buka [share.streamlit.io](https://share.streamlit.io) → login GitHub.
3. **New app** → pilih repo `KWGNGRAANA`, branch `feat/streamlit`,
   main file: `streamlit_app.py`.
4. Klik **Advanced settings → Secrets** → tempel:
   ```toml
   DATABASE_PATH = "/mount/data/kwgn.db"
   DEFAULT_LECTURER_EMAIL = "dosen@kwgn.id"
   DEFAULT_LECTURER_NAME = "Dosen Kewarganegaraan"
   DEFAULT_LECTURER_PASSWORD = "<password kuat>"
   GEMINI_API_KEY = "<key dari aistudio.google.com>"
   GEMINI_MODEL = "gemini-2.5-flash"
   ```
5. **Deploy**. Tunggu build pertama ~3 menit.
6. Pasca deploy pertama, Streamlit Cloud → **Manage app → Shell**, jalankan:
   ```bash
   python scripts/init_db.py && python scripts/seed.py
   ```

> ⚠️ **Disk persistent di Streamlit Cloud**: file SQLite di-reset tiap
> redeploy/restart container. Untuk produksi serius, ganti DB ke
> **Turso libSQL** (kompatibel API).

### 🥈 VPS / Docker

```bash
# Di server Anda:
git clone -b feat/streamlit https://github.com/saidul2017/KWGNGRAANA.git
cd KWGNGRAANA
python3 -m pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
nano .streamlit/secrets.toml  # isi GEMINI_API_KEY, password
python3 scripts/init_db.py && python3 scripts/seed.py

# Jalankan dengan systemd (atau pm2 / supervisor)
streamlit run streamlit_app.py --server.port 8501 --server.headless true

# Reverse proxy via Nginx/Caddy untuk HTTPS — lihat docs.streamlit.io
```

## 🧠 Penilaian Otomatis

### Pilihan Ganda — Algoritma Kahoot
```
skor = max_points × (1 − 0.5 × waktu_respon ÷ batas_waktu)
```
Jawab cepat → mendekati `max_points`. Detik terakhir → ~50%. Salah → 0.

### Esai — AI Grading via Gemini
Dosen tetapkan **rubrik poin kunci** → Gemini menilai jawaban mahasiswa
0–100% + feedback edukatif. Dosen dapat **override skor** (skor AI awal
tetap tersimpan sebagai jejak audit).

## 🗂️ Struktur Direktori

```
KWGNGRAANA/
├── streamlit_app.py        # Entry: login + role-based navigation
├── views/
│   ├── profile.py          # Ganti password (shared lecturer & student)
│   ├── lecturer/
│   │   ├── home.py         # Ringkasan kelas
│   │   ├── questions.py    # CRUD soal + import Excel
│   │   ├── quizzes.py      # CRUD kuis (set status open/draft/closed)
│   │   ├── groups.py       # Bagi mahasiswa ke kelompok
│   │   ├── students.py     # Daftar 43 mahasiswa
│   │   ├── results.py      # Leaderboard + ekspor Excel 5 sheet
│   │   └── essays.py       # Tinjau esai, override skor
│   └── student/
│       ├── home.py
│       ├── practice.py     # Latihan boleh diulang
│       ├── quizzes.py      # Kuis & UAS (1x pengerjaan)
│       ├── play.py         # Player Kahoot-style timer
│       ├── chatbot.py      # KB + Gemini fallback
│       └── results.py      # Riwayat nilai
├── lib/
│   ├── db.py               # SQLite wrapper
│   ├── schema.py           # Skema SQL
│   ├── auth.py             # bcrypt + session_state
│   ├── llm.py              # Gemini REST wrapper
│   ├── essay_grading.py    # AI grading rubrik
│   ├── chatbot_rules.py    # KB PKn (22 entri rujukan resmi)
│   ├── scoring.py          # Algoritma Kahoot
│   ├── rate_limit.py       # Sliding window
│   ├── students_data.py    # 43 mahasiswa
│   └── seed_questions.py   # Soal awal
├── scripts/
│   ├── init_db.py          # Buat tabel + migrasi idempoten
│   └── seed.py             # Isi data awal
├── .streamlit/
│   ├── config.toml         # Tema warna
│   └── secrets.toml.example
└── requirements.txt
```

## 🔒 Keamanan

- ✅ Password hash bcrypt cost 10
- ✅ Login generic message (no user enumeration)
- ✅ Rate limit chatbot 30 pesan/menit/user
- ✅ Timeout 30s panggilan Gemini
- ✅ Excel import dibatasi 500 baris & 5 MB
- ✅ Validasi auth di awal setiap halaman (`require_login` / `require_role`)
- ✅ Rubric/correctIndex tidak terlihat user saat fase question

## 📜 Catatan Akademik

Aplikasi ini berorientasi pendidikan dan **tidak menggantikan dosen**.
Setiap jawaban chatbot dan soal kuis menyertakan rujukan resmi (Pancasila,
UUD 1945, UU No. 12 Tahun 2006, dll.).
