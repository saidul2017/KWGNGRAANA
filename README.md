# KWGN Learning Hub

**Sistem Pembelajaran Mata Kuliah Kewarganegaraan – S1 PGMI**

Aplikasi web untuk mendukung pembelajaran mata kuliah Kewarganegaraan di Program Studi
Pendidikan Guru Madrasah Ibtidaiyah (PGMI). Mencakup chatbot pembelajaran, latihan
mandiri & kuis interaktif gaya **Kahoot**, ujian akhir (UAS), penilaian otomatis,
serta dashboard untuk mahasiswa dan dosen — termasuk mode **individu** dan
**kelompok**.

## ✨ Fitur

| Modul | Untuk | Keterangan |
| --- | --- | --- |
| 🤖 **Chatbot PKn** | Mahasiswa | Tanya konsep Pancasila, UUD 1945, demokrasi, dll. dengan rujukan resmi |
| 🎯 **Latihan Mandiri** | Mahasiswa | Soal Kahoot-style, timer, feedback langsung, boleh diulang |
| 🏆 **Kuis** | Mahasiswa & Dosen | Mode individu/kelompok, anti-curang (acak soal), dinilai |
| 🎓 **UAS** | Mahasiswa & Dosen | Mode ujian, sekali pengerjaan, penilaian otomatis |
| 📝 **Bank Soal** | Dosen | CRUD soal pilihan ganda + rujukan UUD/UU |
| 👥 **Manajemen Kelompok** | Dosen | Bagi 43 mahasiswa ke dalam kelompok |
| 📊 **Dashboard Dosen** | Dosen | Leaderboard kelas, statistik, rekap nilai |
| 📈 **Riwayat Mahasiswa** | Mahasiswa | Skor, persentase benar, tanggal pengerjaan |

## 🛠️ Stack Teknologi

- **Next.js 14** (App Router) + **TypeScript**
- **SQLite** (via `@libsql/client`) — file lokal, tanpa setup server
- **Tailwind CSS** dengan palet warna gaya Kahoot
- **iron-session** — autentikasi cookie HTTP-only
- **bcryptjs** — hashing password
- **Zod** — validasi input

## 🚀 Cara Menjalankan

### 1. Persiapan

```bash
# Salin file env (sudah disiapkan)
cp .env.example .env

# Pasang dependensi
npm install

# Inisialisasi database + seed (43 mahasiswa, dosen, 10 soal, 1 latihan demo)
npm run db:reset
```

### 2. Mode Pengembangan

```bash
npm run dev
# Buka http://localhost:3000
```

### 3. Mode Produksi

```bash
npm run build
npm run start
```

## 🔐 Akun Default

Setelah `npm run db:reset`:

| Peran | Username | Password |
| --- | --- | --- |
| Dosen | `dosen@kwgn.id` | `kwgn2026` |
| Mahasiswa | NIM (mis. `25104080001`) | sama dengan NIM |

> Ubah `DEFAULT_LECTURER_PASSWORD` di `.env` sebelum produksi.
> Mahasiswa disarankan mengganti password setelah login pertama (fitur ganti
> password belum ada di MVP — bisa ditambah pada iterasi berikutnya).

## 📚 Daftar Mahasiswa Yang Telah Di-Seed

43 mahasiswa S1 PGMI sesuai daftar absensi (NIM 25104080001 s.d. 25104080045
dengan beberapa nomor kosong sesuai data asli).

## 🧠 Penilaian Otomatis (Algoritma Kahoot)

Untuk setiap soal yang dijawab benar:

```
skor = max_points × (1 − 0.5 × waktu_respon ÷ batas_waktu)
```

- Jawab langsung → mendekati `max_points` (1000 poin default)
- Jawab di detik terakhir → ~50% × `max_points`
- Jawab salah / waktu habis → `0` poin

Implementasi: `src/lib/scoring.ts`.

## 🤖 Chatbot

Default berjalan **rule-based** menggunakan basis pengetahuan di
`src/lib/chatbot-rules.ts`. Setiap jawaban menyertakan **rujukan resmi**
(UUD 1945, UU No. 12 Tahun 2006, dll.) dan opsional pertanyaan refleksi
untuk calon guru MI.

Untuk mengaktifkan LLM (OpenAI), isi `OPENAI_API_KEY` di `.env` dan kembangkan
handler di `src/app/api/chatbot/route.ts`.

## 🗂️ Struktur Direktori

```
KWGNGRAANA/
├── data/                    # File SQLite (gitignored)
├── scripts/
│   ├── init-db.ts           # Membuat tabel
│   └── seed.ts              # Mengisi data awal
└── src/
    ├── app/
    │   ├── api/             # Route handler API
    │   ├── lecturer/        # Halaman dosen
    │   ├── student/         # Halaman mahasiswa
    │   ├── login/           # Halaman login
    │   └── page.tsx         # Landing page
    ├── components/          # Komponen reusable (Navbar, QuizPlayer)
    └── lib/
        ├── db.ts            # Wrapper @libsql
        ├── schema.ts        # Skema SQL
        ├── session.ts       # iron-session
        ├── scoring.ts       # Algoritma Kahoot
        ├── chatbot-rules.ts # Basis pengetahuan PKn
        ├── students-data.ts # Daftar 43 mahasiswa
        └── seed-questions.ts# 10 soal contoh
```

## 🛣️ Roadmap

Fitur lanjutan yang dapat ditambahkan pada iterasi berikutnya:

- [ ] Mode **Live Kahoot** real-time (host PIN + WebSocket)
- [ ] Skor kelompok + leaderboard antar-kelompok
- [ ] Soal **esai pendek** dengan rubric & auto-grading LLM
- [ ] Ekspor nilai ke Excel/CSV
- [ ] Ganti password mahasiswa
- [ ] Anti-curang lanjutan (lockdown browser, deteksi tab switch)
- [ ] Integrasi LLM penuh untuk chatbot (OpenAI / Anthropic / Gemini)
- [ ] Unggah materi RPS untuk basis chatbot RAG

## 📜 Catatan Akademik

Aplikasi ini berorientasi pendidikan dan **tidak menggantikan dosen**. Setiap
jawaban chatbot maupun soal kuis menyertakan rujukan resmi
(Pancasila, UUD 1945, UU No. 12 Tahun 2006, dll.) sehingga mahasiswa terbiasa
berpikir konstitusional dan akademis.
