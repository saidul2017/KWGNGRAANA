# 📚 KWGN Learning Hub — Streamlit Edition

Platform pembelajaran Mata Kuliah Kewarganegaraan untuk **S1 PGMI**, di-deploy ke
[Streamlit Community Cloud](https://streamlit.io/cloud) sehingga bisa diakses
gratis dari URL `*.streamlit.app`.

> **Catatan:** Ada juga versi Next.js full-featured di branch
> [`feat/initial-mvp`](../../tree/feat/initial-mvp) yang punya **mode Live
> Kahoot multi-user** (PIN, real-time leaderboard, polling 1s). Versi Streamlit
> ini lebih ringkas, beberapa fitur dikurangi — lihat tabel di bawah.

## Fitur

| Fitur | Versi Streamlit | Versi Next.js (branch lama) |
|---|---|---|
| Login mahasiswa (NIM) & dosen (email) | ✅ | ✅ |
| Bank soal MCQ + Esai (CRUD) | ✅ | ✅ |
| Kuis & UAS individu (Kahoot-style scoring) | ✅ | ✅ |
| Latihan mandiri (boleh diulang) | ✅ | ✅ |
| Chatbot PKn (Gemini AI atau KB offline) | ✅ | ✅ |
| Auto-grading esai (Gemini AI atau rule-based) | ✅ | ✅ |
| Tinjau esai + override skor + catatan dosen | ✅ | ✅ |
| Kelompok mahasiswa (assign + lihat) | ✅ | ✅ |
| Rekap nilai kelas + ekspor Excel | ✅ | ✅ |
| Reset password mahasiswa | ✅ | ✅ |
| **Mode Live Kahoot multi-user (real-time)** | ❌ | ✅ |
| Excel import bank soal massal | ❌ | ✅ |
| Group quiz mode | ❌ | ✅ |

Mode Live Kahoot di-skip karena Streamlit's session model (per-WebSocket) tidak
ideal untuk shared real-time state. Untuk konteks live di kelas, gunakan
versi Next.js atau pakai mode kuis individu.

---

## Deploy ke Streamlit Community Cloud (URL `*.streamlit.app` — GRATIS)

1. **Push branch ini ke GitHub** (kalau belum). Branch sumbernya: `streamlit-rewrite`.
2. **Buka https://share.streamlit.io** → login dengan GitHub Anda.
3. **New app**:
   - Repository: `saidul2017/KWGNGRAANA`
   - Branch: `streamlit-rewrite`
   - Main file path: `streamlit_app.py`
   - App URL: pilih, mis. `kwgngraana` → akhirnya jadi `https://kwgngraana.streamlit.app`
4. **Advanced settings → Secrets** → paste isi berikut (ganti placeholder):
   ```toml
   DEFAULT_LECTURER_PASSWORD = "password_kuat_minimal_8_karakter"
   GEMINI_API_KEY = "AIza..."  # opsional, dari https://aistudio.google.com/apikey
   GEMINI_MODEL = "gemini-2.5-flash"
   ```
   - **Wajib:** `DEFAULT_LECTURER_PASSWORD` (untuk login dosen pertama kali).
   - **Opsional:** `GEMINI_API_KEY` — kalau kosong, chatbot dan grading esai jalan
     pakai mode rule-based / KB lokal (kualitas lebih rendah tapi tetap berfungsi).
5. Klik **Deploy**. Tunggu ~2-4 menit. App live di URL yang Anda pilih.
6. **Login pertama kali sebagai dosen:**
   - Email: `dosen@kampus.ac.id`
   - Password: nilai `DEFAULT_LECTURER_PASSWORD` di atas
7. **Login sebagai mahasiswa demo:**
   - NIM: `2401001` s/d `2401012` (12 mahasiswa demo otomatis ter-seed)
   - Password: sama dengan NIM-nya (mis. NIM `2401001` → password `2401001`)

### ⚠️ Tentang penyimpanan data di Streamlit Community Cloud

Streamlit Cloud pakai filesystem ephemeral. SQLite file `data/kwgn.db` **bisa
hilang** saat container di-restart (mis. setelah app idle sekitar seminggu).

Untuk **kelas demo / pengembangan**, ini tidak masalah — restart akan membuat
ulang skema dan seed data demo otomatis (idempoten).

Untuk **produksi sungguhan** (data nilai mahasiswa harus persisten), pilih:
- **Turso** (libsql cloud) — free tier 500 DB × 9 GB, bisa migrasi mudah dari
  SQLite. Saya bisa bantu migrasi kalau diminta.
- **Render Starter ($7/bln)** dengan persistent disk — versi Next.js sudah punya
  konfigurasi `render.yaml`-nya.

---

## Jalankan lokal

```bash
git clone https://github.com/saidul2017/KWGNGRAANA.git
cd KWGNGRAANA
git checkout streamlit-rewrite

# Buat virtual env (opsional tapi disarankan)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Setup secrets lokal
mkdir -p .streamlit
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# Edit .streamlit/secrets.toml, isi DEFAULT_LECTURER_PASSWORD minimal

streamlit run streamlit_app.py
# Buka http://localhost:8501
```

---

## Struktur proyek

```
KWGNGRAANA/
├── streamlit_app.py          # entry point — auth + routing
├── requirements.txt
├── .streamlit/
│   ├── config.toml
│   └── secrets.toml.example  # template, salin → secrets.toml
├── lib/
│   ├── db.py                 # SQLite wrapper + helpers
│   ├── schema.py             # CREATE TABLE SQL
│   ├── auth.py               # bcrypt + session_state
│   ├── seed.py               # seed dosen & mahasiswa demo
│   ├── scoring.py            # Kahoot scoring formula
│   ├── ai.py                 # Gemini chatbot + essay grading
│   ├── kb.py                 # Knowledge base PKn (fallback offline)
│   └── views/
│       ├── login.py          # halaman login
│       ├── student.py        # semua menu mahasiswa
│       └── lecturer.py       # semua menu dosen
└── data/
    └── kwgn.db               # SQLite file (auto-created, gitignored)
```

---

## Stack teknis

- **Streamlit 1.31+** — UI framework (Python)
- **SQLite** via `sqlite3` stdlib + WAL mode + foreign keys ON
- **bcrypt** — password hashing (cost 10)
- **google-generativeai** — Gemini AI (chatbot + essay grading)
- **pandas + openpyxl** — ekspor Excel rekap nilai

---

## Lisensi & atribusi

Materi PKn (Pancasila, UUD 1945, dll.) merujuk pada sumber resmi negara
(BPIP, MPR RI, situs DPR, JDIH, dll.). Tidak ada klaim hak atas teks yang
dirujuk. Implementasi software bebas dipakai untuk pembelajaran.
