"""Knowledge base ringkas materi PKn — dipakai chatbot saat fallback (tanpa AI).

Bukan menggantikan buku ajar — hanya jawaban cepat untuk pertanyaan umum.
Sumber utama: UUD 1945, UU MD3, UU Kewarganegaraan, materi resmi BPIP.
"""

from __future__ import annotations

KB_ENTRIES: list[dict] = [
    {
        "topic": "Pancasila",
        "keywords": ["pancasila", "lima sila", "5 sila", "dasar negara"],
        "answer": (
            "Pancasila adalah dasar negara Republik Indonesia yang ditetapkan dalam Pembukaan UUD 1945 "
            "alinea keempat. Lima sila Pancasila:\n\n"
            "1. Ketuhanan Yang Maha Esa\n"
            "2. Kemanusiaan yang Adil dan Beradab\n"
            "3. Persatuan Indonesia\n"
            "4. Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan\n"
            "5. Keadilan Sosial bagi Seluruh Rakyat Indonesia\n\n"
            "Ditetapkan oleh PPKI pada 18 Agustus 1945."
        ),
        "ref": "Pembukaan UUD 1945",
    },
    {
        "topic": "UUD 1945",
        "keywords": ["uud 1945", "undang-undang dasar", "konstitusi", "amandemen"],
        "answer": (
            "UUD 1945 adalah hukum dasar tertulis Negara Republik Indonesia, ditetapkan pada "
            "18 Agustus 1945 oleh PPKI. Telah mengalami 4 kali amandemen pada periode 1999-2002 "
            "yang menghasilkan struktur:\n\n"
            "- Pembukaan (4 alinea — tidak boleh diubah)\n"
            "- Pasal-pasal (16 bab, 37 pasal setelah amandemen)\n\n"
            "Pasal-pasal penting tentang HAM ada di Pasal 28A-28J."
        ),
        "ref": "UUD Negara Republik Indonesia Tahun 1945",
    },
    {
        "topic": "Bhinneka Tunggal Ika",
        "keywords": ["bhinneka", "tunggal ika", "semboyan"],
        "answer": (
            "Bhinneka Tunggal Ika adalah semboyan resmi negara Indonesia, tertulis di pita yang "
            "dicengkeram Garuda Pancasila. Diambil dari kitab Sutasoma karya Mpu Tantular (abad XIV), "
            "artinya 'Berbeda-beda tetapi tetap satu jua'. Mencerminkan persatuan dalam keragaman "
            "suku, agama, ras, dan budaya."
        ),
        "ref": "Pasal 36A UUD 1945",
    },
    {
        "topic": "Hak Asasi Manusia",
        "keywords": ["ham", "hak asasi", "hak manusia", "pasal 28"],
        "answer": (
            "Hak Asasi Manusia (HAM) adalah hak yang melekat pada manusia sejak lahir sebagai "
            "anugerah Tuhan. Di Indonesia diatur dalam:\n\n"
            "- Pasal 28A-28J UUD 1945 (10 pasal HAM)\n"
            "- UU Nomor 39 Tahun 1999 tentang HAM\n"
            "- UU Nomor 26 Tahun 2000 tentang Pengadilan HAM\n\n"
            "Termasuk hak hidup, hak beragama, hak pendidikan, hak berpendapat, dan hak atas "
            "perlindungan hukum."
        ),
        "ref": "Pasal 28A-28J UUD 1945",
    },
    {
        "topic": "Demokrasi Pancasila",
        "keywords": ["demokrasi", "pancasila demokrasi", "musyawarah"],
        "answer": (
            "Demokrasi Pancasila adalah sistem demokrasi yang bersumber pada nilai-nilai Pancasila, "
            "khususnya sila keempat: 'Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam "
            "Permusyawaratan/Perwakilan'.\n\n"
            "Ciri utamanya: musyawarah untuk mufakat, menghargai pendapat minoritas, keseimbangan "
            "hak dan kewajiban, serta tidak mengenal diktator mayoritas atau tirani minoritas."
        ),
        "ref": "Pancasila Sila ke-4 & Pasal 1 ayat (2) UUD 1945",
    },
    {
        "topic": "Bela Negara",
        "keywords": ["bela negara", "wajib bela", "pasal 27", "pasal 30"],
        "answer": (
            "Bela negara adalah hak sekaligus kewajiban setiap warga negara untuk mempertahankan "
            "kedaulatan dan keutuhan NKRI. Diatur dalam:\n\n"
            "- Pasal 27 ayat (3) UUD 1945: 'Setiap warga negara berhak dan wajib ikut serta dalam "
            "  upaya pembelaan negara.'\n"
            "- Pasal 30 ayat (1) UUD 1945: pertahanan & keamanan negara\n"
            "- UU Nomor 23 Tahun 2019 tentang Pengelolaan Sumber Daya Nasional untuk Pertahanan Negara\n\n"
            "Bentuknya tidak hanya militer — termasuk juga kontribusi profesi, kesadaran berbangsa, "
            "dan menjaga keutuhan ideologi."
        ),
        "ref": "Pasal 27 ayat (3) & Pasal 30 UUD 1945",
    },
    {
        "topic": "Wawasan Nusantara",
        "keywords": ["wawasan nusantara", "nusantara", "deklarasi djuanda"],
        "answer": (
            "Wawasan Nusantara adalah cara pandang bangsa Indonesia tentang diri & lingkungannya "
            "yang berdasarkan Pancasila & UUD 1945, mencakup kesatuan: politik, ekonomi, sosial-budaya, "
            "dan pertahanan-keamanan.\n\n"
            "Lahir dari Deklarasi Djuanda 13 Desember 1957 yang menetapkan Indonesia sebagai negara "
            "kepulauan (archipelagic state) — diakui internasional lewat UNCLOS 1982."
        ),
        "ref": "Deklarasi Djuanda 1957 & UNCLOS 1982",
    },
    {
        "topic": "Kewarganegaraan",
        "keywords": ["kewarganegaraan", "wni", "warga negara", "naturalisasi"],
        "answer": (
            "Kewarganegaraan Indonesia diatur dalam UU Nomor 12 Tahun 2006. Asas yang dipakai:\n\n"
            "- Ius sanguinis (berdasar keturunan)\n"
            "- Ius soli terbatas (berdasar tempat lahir, hanya kasus tertentu)\n"
            "- Tunggal (satu kewarganegaraan saja)\n"
            "- Ganda terbatas (hanya untuk anak hingga 18 tahun)\n\n"
            "WNI bisa diperoleh lewat kelahiran, pengangkatan, dikabulkan permohonan, atau "
            "naturalisasi (setelah tinggal ≥ 5 tahun berturut atau 10 tahun tidak berturut)."
        ),
        "ref": "UU Nomor 12 Tahun 2006",
    },
    {
        "topic": "Lembaga Negara",
        "keywords": ["lembaga negara", "mpr", "dpr", "presiden", "mk", "ma"],
        "answer": (
            "Lembaga negara berdasarkan UUD 1945 (pasca amandemen):\n\n"
            "- **Lembaga tinggi:** MPR, DPR, DPD, Presiden & Wapres, MA, MK, BPK, KY\n"
            "- MPR: dulu lembaga tertinggi, sekarang sederajat dengan lembaga lain\n"
            "- DPR: legislatif (membuat UU bersama Presiden)\n"
            "- Presiden: eksekutif (kepala negara + kepala pemerintahan)\n"
            "- MA & MK: yudikatif\n"
            "- BPK: audit keuangan negara\n"
            "- KY: pengawasan hakim"
        ),
        "ref": "UUD 1945 Bab II-VIII",
    },
]


def search_kb(query: str) -> dict | None:
    """Cari entri KB yang paling cocok dengan keyword sederhana.

    Return None kalau tidak ada match sama sekali.
    """
    q = (query or "").lower()
    if not q:
        return None
    best = None
    best_score = 0
    for entry in KB_ENTRIES:
        score = sum(1 for kw in entry["keywords"] if kw in q)
        if score > best_score:
            best_score = score
            best = entry
    return best if best_score > 0 else None
