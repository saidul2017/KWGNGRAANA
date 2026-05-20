# KWGN Learning Hub

**Sistem Pembelajaran Mata Kuliah Kewarganegaraan – S1 PGMI**

Aplikasi web pendukung mata kuliah Kewarganegaraan PGMI: chatbot pembelajaran,
latihan mandiri & kuis Kahoot-style (self-paced + Live), UAS dengan soal
pilihan ganda dan **esai dengan auto-grading AI Gemini**, serta dashboard
mahasiswa & dosen.

## ✨ Fitur

| Modul | Untuk | Keterangan |
| --- | --- | --- |
| 🤖 **Chatbot 2-Layer** | Mahasiswa | KB lokal otoritatif → fallback Gemini dengan rambu akademis |
| 🎯 **Latihan Mandiri** | Mahasiswa | Soal Kahoot-style, timer, feedback langsung, boleh diulang |
| 🏆 **Kuis & UAS** | Mahasiswa & Dosen | Mode individu/kelompok, anti-curang (acak soal) |
| 🎮 **Live Kahoot** | Real-time | PIN 6 digit, lobby, auto-reveal, leaderboard live |
| ✍️ **Soal Esai + AI Grading** | Mahasiswa & Dosen | Rubrik berbasis poin kunci, skor 0–100% + feedback |
| 👨‍🏫 **Tinjau Esai** | Dosen | Override skor AI dengan audit trail |
| 📝 **Bank Soal** | Dosen | CRUD MCQ + Esai, import dari Excel |
| 👥 **Manajemen Kelompok** | Dosen | Bagi mahasiswa, leaderboard antar-kelompok |
| 📊 **Dashboard** | Mahasiswa & Dosen | Statistik, riwayat, progress |
| 📥 **Excel Export** | Dosen | 5 sheet termasuk audit jawaban esai |

## 🛠️ Stack Teknologi

- **Next.js 14** (App Router) + **TypeScript**
- **SQLite** via `@libsql/client` (lokal, tanpa setup server)
- **Tailwind CSS** dengan palet warna gaya Kahoot
- **iron-session** untuk autentikasi cookie HTTP-only
- **bcryptjs** untuk hashing password
- **Zod** untuk validasi input
- **Gemini API** (Google AI) untuk chatbot LLM & auto-grading esai

## 🚀 Persiapan & Menjalankan Lokal

```bash
# 1. Salin & isi file env
cp .env.example .env

# 2. WAJIB diisi sebelum dipakai:
# - SESSION_PASSWORD : minimal 32 karakter random
#                      generate: openssl rand -base64 48
# - GEMINI_API_KEY   : key dari https://aistudio.google.com/apikey
#                      (bisa kosong; chatbot jalan rule-based & esai dinilai 0)
# - DEFAULT_LECTURER_PASSWORD : ganti dari "kwgn2026"

# 3. Pasang dependensi
npm install

# 4. Inisialisasi database + seed (43 mahasiswa, dosen, 10 soal, 1 latihan demo)
npm run db:reset

# 5. Mode pengembangan
npm run dev
# Buka http://localhost:3000

# 6. Mode produksi
npm run build
npm run start
```

## 🔐 Akun Default Pasca-Seed

| Peran | Username | Password |
| --- | --- | --- |
| Dosen | `dosen@kwgn.id` | nilai `DEFAULT_LECTURER_PASSWORD` di .env |
| Mahasiswa | NIM (mis. `25104080001`) | sama dengan NIM (HARUS diganti) |

> ⚠️ **Wajib ganti password dosen** dari default segera setelah seed.
> Mahasiswa diarahkan ke menu **Profil → Ganti Password** pada login pertama.

## 🌐 Deployment

### 🚀 Pilihan 1: Railway (rekomendasi · paling mudah)

Railway punya **persistent disk** + auto-deploy dari GitHub + free tier.

1. Sign-up di [railway.app](https://railway.app) (login dengan akun GitHub Anda)
2. **New Project → Deploy from GitHub Repo → pilih `KWGNGRAANA`**
3. Railway otomatis mendeteksi `Dockerfile` & `railway.toml`. Tunggu build pertama.
4. Tab **Variables** — tambahkan environment ini:
   ```
   SESSION_PASSWORD=<hasil dari `openssl rand -base64 48`>
   DEFAULT_LECTURER_PASSWORD=<password kuat baru>
   GEMINI_API_KEY=<rotasi key di aistudio.google.com/apikey>
   SEED_ON_START=1                  ← sekali saja saat first deploy
   ```
5. Tab **Volumes → New Volume** → mount path `/app/data`, ukuran `1 GB`.
6. **Deployments → Redeploy**. App live di domain `*.up.railway.app` ✨
7. Setelah seed berhasil (cek log), set `SEED_ON_START=0` dan redeploy.

Setiap `git push` ke `main` akan **auto-build & deploy** di Railway.

### 🐳 Pilihan 2: VPS / Docker (full kontrol)

Untuk VPS (DigitalOcean, Hetzner, Lightsail) atau server kampus:

```bash
git clone https://github.com/saidul2017/KWGNGRAANA.git
cd KWGNGRAANA

# Salin & isi env (TIDAK akan ter-commit)
cp .env.example .env
# Edit .env dengan nilai produksi:
#   SESSION_PASSWORD=...   (openssl rand -base64 48)
#   GEMINI_API_KEY=...
#   DEFAULT_LECTURER_PASSWORD=...
#   SEED_ON_START=1        ← sekali untuk seed pertama

docker compose up -d --build

# Cek log pertama
docker compose logs -f app

# Aplikasi tersedia di http://YOUR_SERVER:3000
# Untuk HTTPS, taruh di belakang Nginx/Caddy/Traefik (lihat docs masing-masing)

# Setelah seed sukses, ubah SEED_ON_START=0 di .env, lalu:
docker compose up -d
```

**Update aplikasi:** `git pull && docker compose up -d --build`
**Backup DB:** `docker compose exec app cp /app/data/kwgn.db /app/data/backup-$(date +%F).db`

### ⚙️ Pilihan 3: Render (alternatif Railway)

[render.com](https://render.com) baca `render.yaml` otomatis:

1. Sign-up Render dengan GitHub
2. Dashboard → **New → Blueprint** → connect repo
3. Isi env yang ditandai `sync: false` saat prompt:
   `SESSION_PASSWORD`, `DEFAULT_LECTURER_PASSWORD`, `GEMINI_API_KEY`
4. Klik **Apply**. Render build & deploy otomatis.
5. Pasca-live, tab **Shell** → jalankan sekali:
   ```
   node node_modules/tsx/dist/cli.mjs scripts/seed.ts
   ```
   untuk seed dosen + 43 mahasiswa + soal demo.

> Render free tier **tidak punya disk persisten** — wajib pakai paket `starter` ($7/bln) untuk SQLite.

### ⚠️ Tidak direkomendasikan: Vercel / Netlify

SQLite file tidak persisten di serverless filesystem. Bila ngotot pakai Vercel:
- Migrasi DB ke **Turso** (`@libsql/client` sudah kompatibel — ubah `DATABASE_PATH`
  ke URL Turso seperti `libsql://your-db-xxx.turso.io?authToken=...`)
- In-memory live store + rate-limit ganti ke **Upstash Redis**

### 🔍 Health Check

`GET /api/health` mengembalikan status DB & LLM. Cocok untuk:
- Liveness probe Docker (sudah dikonfigurasi di `Dockerfile`)
- Health check Railway/Render (sudah dikonfigurasi di config)
- Uptime monitor eksternal: UptimeRobot, Better Stack, dsb.

## 🧠 Penilaian Otomatis

### Pilihan Ganda — Algoritma Kahoot

```
skor = max_points × (1 − 0.5 × waktu_respon ÷ batas_waktu)
```

Jawab cepat → mendekati `max_points`. Jawab di detik terakhir → ~50%.
Jawab salah / waktu habis → `0`.

### Esai — AI Grading via Gemini

1. Dosen mendefinisikan **rubrik** (poin kunci yang harus muncul dalam jawaban)
2. Mahasiswa menjawab dengan teks (dengan validasi minimal kata)
3. Gemini menilai berdasarkan rubrik → **skor 0–100%**, daftar poin
   tertangkap & yang masih kurang, plus feedback edukatif
4. Dosen bisa **override skor** di halaman *Tinjau Esai*; skor AI awal
   tetap tersimpan sebagai jejak audit

## 🔒 Catatan Keamanan

- ✅ Cookie sesi `httpOnly`, `secure` di production, `sameSite=lax`, expire 8 jam
- ✅ Password di-hash bcrypt cost 10
- ✅ `correctIndex` MCQ tidak pernah dikirim ke client saat fase question
- ✅ `requireUser()` guard di setiap endpoint API non-publik
- ✅ Validasi Zod di semua POST/PATCH/PUT
- ✅ Rate limit chatbot (30 pesan/menit/user) dan grading esai (10 esai/5 menit/user)
- ✅ Timeout 30 detik untuk panggilan Gemini agar request tidak hang
- ✅ Login pesan generik (tidak leak user enumeration)
- ✅ Excel import dibatasi 500 baris & 5 MB
- ✅ Schedule kuis (`starts_at`/`ends_at`) di-enforce server-side

## 🗂️ Struktur Direktori

```
KWGNGRAANA/
├── data/                    # File SQLite (gitignored)
├── scripts/
│   ├── init-db.ts           # Membuat tabel + migrasi idempoten
│   └── seed.ts              # Mengisi data awal
└── src/
    ├── app/
    │   ├── api/             # Route handler API
    │   │   ├── health/      # Health check
    │   │   ├── auth/        # login, logout, me, password
    │   │   ├── questions/   # CRUD soal + import + template
    │   │   ├── quizzes/     # CRUD kuis + start
    │   │   ├── attempts/    # submit jawaban + finish
    │   │   ├── live/        # Live Kahoot (create, join, next, ...)
    │   │   ├── chatbot/     # Chatbot 2-layer
    │   │   ├── answers/     # Override skor esai
    │   │   ├── groups/      # Kelompok
    │   │   └── lecturer/    # Excel export
    │   ├── lecturer/        # Halaman dosen
    │   ├── student/         # Halaman mahasiswa
    │   ├── login/           # Halaman login
    │   ├── error.tsx        # Custom error page
    │   ├── not-found.tsx    # Custom 404
    │   └── page.tsx         # Landing
    ├── components/          # Komponen reusable
    └── lib/
        ├── db.ts            # Wrapper @libsql
        ├── schema.ts        # Skema SQL
        ├── session.ts       # iron-session config
        ├── scoring.ts       # Algoritma Kahoot
        ├── chatbot-rules.ts # KB PKn (rule-based)
        ├── llm.ts           # Gemini wrapper
        ├── essay-grading.ts # Auto-grading rubric
        ├── live-store.ts    # In-memory state Live Kahoot
        ├── rate-limit.ts    # Sliding window rate limiter
        ├── students-data.ts # Daftar 43 mahasiswa
        └── seed-questions.ts# Soal awal
```

## 🛣️ Roadmap

- [ ] Brute-force protection di login (rate limit per IP)
- [ ] Migrasi ke Redis untuk live store agar bisa multi-instance
- [ ] Anti-curang lanjutan (deteksi tab switch, fullscreen lock)
- [ ] PWA (instalable di home screen mahasiswa)
- [ ] Soal benar/salah (TF) di QuestionForm
- [ ] Upload materi RPS untuk RAG chatbot

## 📜 Catatan Akademik

Aplikasi ini berorientasi pendidikan dan **tidak menggantikan dosen**.
Setiap jawaban chatbot dan soal kuis menyertakan rujukan resmi (Pancasila,
UUD 1945, UU No. 12 Tahun 2006, dll.) sehingga mahasiswa terbiasa berpikir
konstitusional dan akademis.
