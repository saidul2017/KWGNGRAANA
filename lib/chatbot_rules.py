"""Basis pengetahuan rule-based untuk chatbot PKn.
Setiap entri WAJIB punya rujukan resmi (UUD/UU/Pancasila).
"""
from __future__ import annotations

KB: list[dict] = [
    {
        "keywords": ["pancasila", "dasar negara"],
        "answer": "Pancasila adalah dasar negara Republik Indonesia yang disahkan PPKI pada 18 Agustus 1945, terdiri dari lima sila: (1) Ketuhanan Yang Maha Esa, (2) Kemanusiaan yang adil dan beradab, (3) Persatuan Indonesia, (4) Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan, (5) Keadilan sosial bagi seluruh rakyat Indonesia.",
        "source": "Pembukaan UUD 1945 alinea IV; Sidang PPKI 18 Agustus 1945",
        "follow_up": "Coba renungkan: bagaimana Anda sebagai calon guru MI dapat mengajarkan masing-masing sila kepada peserta didik kelas rendah secara konkret?",
    },
    {
        "keywords": ["pasal 27", "kesamaan kedudukan", "sama di hadapan hukum"],
        "answer": "Pasal 27 ayat (1) UUD 1945 berbunyi: 'Segala warga negara bersamaan kedudukannya di dalam hukum dan pemerintahan dan wajib menjunjung hukum dan pemerintahan itu dengan tidak ada kecualinya.' Ini adalah landasan asas equality before the law.",
        "source": "UUD 1945 Pasal 27 ayat (1)",
    },
    {
        "keywords": ["pasal 31", "pendidikan", "hak"],
        "answer": "Pasal 31 ayat (1) UUD 1945 menyatakan 'Setiap warga negara berhak mendapat pendidikan'. Ayat (2) mewajibkan setiap warga negara mengikuti pendidikan dasar dan pemerintah wajib membiayainya.",
        "source": "UUD 1945 Pasal 31 ayat (1) dan (2)",
    },
    {
        "keywords": ["pasal 30", "bela negara", "pertahanan"],
        "answer": "Pasal 30 ayat (1) UUD 1945 menegaskan: 'Tiap-tiap warga negara berhak dan wajib ikut serta dalam usaha pertahanan dan keamanan negara.' Bela negara meliputi keikutsertaan dalam pendidikan kewarganegaraan, pengabdian sesuai profesi, hingga keikutsertaan TNI/Polri.",
        "source": "UUD 1945 Pasal 30 ayat (1); UU No. 23 Tahun 2019",
    },
    {
        "keywords": ["ius soli"],
        "answer": "Ius soli adalah asas kewarganegaraan berdasarkan tempat kelahiran seseorang, tanpa memperhatikan kewarganegaraan orang tuanya.",
        "source": "UU No. 12 Tahun 2006 tentang Kewarganegaraan RI",
    },
    {
        "keywords": ["ius sanguinis"],
        "answer": "Ius sanguinis adalah asas kewarganegaraan berdasarkan keturunan/garis darah orang tua. Indonesia menganut asas ius sanguinis sebagai asas utama, dengan kombinasi ius soli terbatas.",
        "source": "UU No. 12 Tahun 2006 tentang Kewarganegaraan RI",
    },
    {
        "keywords": ["apatride"],
        "answer": "Apatride adalah keadaan seseorang yang tidak memiliki kewarganegaraan apa pun, biasanya akibat konflik penerapan asas kewarganegaraan antarnegara.",
        "source": "Buku Ajar PKn; UU No. 12 Tahun 2006",
    },
    {
        "keywords": ["bipatride", "dwi kewarganegaraan"],
        "answer": "Bipatride adalah keadaan seseorang memiliki dua kewarganegaraan sekaligus. Bagi anak hasil perkawinan campuran, UU No. 12 Tahun 2006 memberikan kewarganegaraan ganda terbatas hingga usia 18 tahun.",
        "source": "UU No. 12 Tahun 2006 Pasal 4 dan Pasal 6",
    },
    {
        "keywords": ["demokrasi pancasila"],
        "answer": "Demokrasi Pancasila adalah sistem demokrasi yang dijiwai sila ke-4: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan'. Cirinya: musyawarah-mufakat, menghormati HAM, supremasi hukum, kebebasan bertanggung jawab, dan persatuan.",
        "source": "Pancasila sila ke-4; Pembukaan UUD 1945",
    },
    {
        "keywords": ["wawasan nusantara"],
        "answer": "Wawasan Nusantara adalah cara pandang bangsa Indonesia tentang diri dan lingkungannya yang berlandaskan Pancasila dan UUD 1945, dengan semangat Bhinneka Tunggal Ika; mencakup aspek geografis, politik, ekonomi, sosial-budaya, dan hankam dalam satu kesatuan.",
        "source": "Tap MPR No. IV/MPR/1973; Buku Ajar PKn",
    },
    {
        "keywords": ["bhinneka tunggal ika"],
        "answer": "'Bhinneka Tunggal Ika' adalah semboyan negara yang berarti 'berbeda-beda tetapi tetap satu'. Diambil dari Kitab Sutasoma karya Mpu Tantular.",
        "source": "UUD 1945 Pasal 36A; Kitab Sutasoma",
    },
    {
        "keywords": ["lambang negara", "garuda"],
        "answer": "Lambang negara Republik Indonesia adalah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika.",
        "source": "UUD 1945 Pasal 36A; UU No. 24 Tahun 2009",
    },
    {
        "keywords": ["bendera"],
        "answer": "Bendera Negara Indonesia adalah Sang Saka Merah Putih.",
        "source": "UUD 1945 Pasal 35; UU No. 24 Tahun 2009",
    },
    {
        "keywords": ["lagu kebangsaan", "indonesia raya"],
        "answer": "Lagu Kebangsaan adalah Indonesia Raya, ciptaan W.R. Supratman.",
        "source": "UUD 1945 Pasal 36B; UU No. 24 Tahun 2009",
    },
    {
        "keywords": ["bahasa negara", "bahasa indonesia"],
        "answer": "Bahasa negara adalah Bahasa Indonesia.",
        "source": "UUD 1945 Pasal 36",
    },
    {
        "keywords": ["antikorupsi", "nilai", "korupsi"],
        "answer": "Sembilan nilai antikorupsi (KPK) yang relevan ditanamkan sejak MI: jujur, peduli, mandiri, disiplin, tanggung jawab, kerja keras, sederhana, berani, dan adil. Bagi guru MI: pembiasaan mengembalikan barang temuan, antri, jadwal piket, mengakui kesalahan saat ulangan.",
        "source": "Modul Pendidikan Antikorupsi KPK",
    },
    {
        "keywords": ["ham", "hak asasi"],
        "answer": "Hak Asasi Manusia (HAM) adalah hak yang melekat pada manusia sebagai anugerah Tuhan, bersifat universal dan tidak dapat dicabut. UUD 1945 mengatur HAM dalam Bab XA (Pasal 28A–28J), dan UU No. 39 Tahun 1999 menjabarkan lebih lanjut.",
        "source": "UUD 1945 Pasal 28A–28J; UU No. 39 Tahun 1999",
    },
    {
        "keywords": ["integrasi nasional"],
        "answer": "Integrasi nasional adalah proses penyatuan berbagai kelompok masyarakat yang berbeda suku, agama, dan budaya menjadi satu kesatuan bangsa. Tantangannya antara lain primordialisme sempit, hoaks, kesenjangan sosial, dan radikalisme.",
        "source": "Buku Ajar PKn; UUD 1945 Pasal 18B, 32",
    },
    {
        "keywords": ["ketahanan nasional"],
        "answer": "Ketahanan Nasional adalah kondisi dinamis suatu bangsa yang berisi keuletan dan ketangguhan, mengandung kemampuan mengembangkan kekuatan nasional dalam menghadapi segala ancaman, baik dari luar maupun dari dalam.",
        "source": "Doktrin Pertahanan Negara; Buku Ajar PKn",
    },
    {
        "keywords": ["konstitusi"],
        "answer": "Konstitusi adalah hukum dasar tertulis (UUD 1945) yang mengatur penyelenggaraan negara: pembagian kekuasaan, hak warga negara, dan hubungan negara-warga. Perilaku konstitusional artinya bertindak sesuai jiwa & pasal-pasal konstitusi.",
        "source": "UUD 1945 Pembukaan dan Batang Tubuh",
    },
    {
        "keywords": ["hak warga negara"],
        "answer": "Hak warga negara antara lain: persamaan kedudukan di hukum (Pasal 27), pekerjaan & penghidupan layak, bela negara (Pasal 27 ayat 3 & Pasal 30), kemerdekaan berserikat & berpendapat (Pasal 28), kebebasan beragama (Pasal 29), pendidikan (Pasal 31), dan hak-hak HAM (Pasal 28A–28J).",
        "source": "UUD 1945 Pasal 27–34",
    },
    {
        "keywords": ["kewajiban warga negara"],
        "answer": "Kewajiban warga negara antara lain: menjunjung hukum & pemerintahan (Pasal 27 ayat 1), ikut serta bela negara (Pasal 27 ayat 3 & Pasal 30), menghormati HAM orang lain (Pasal 28J), mengikuti pendidikan dasar (Pasal 31 ayat 2).",
        "source": "UUD 1945 Pasal 27, 28J, 30, 31",
    },
]


def search_kb(query: str) -> dict | None:
    """Threshold ketat: minimal 2 keyword cocok atau 1 keyword ≥6 char."""
    q = query.lower()
    best: tuple[dict, int, int, int] | None = None  # entry, score, match_count, min_len
    for entry in KB:
        matched = [k for k in entry["keywords"] if k.lower() in q]
        if not matched:
            continue
        min_len = min(len(k) for k in matched)
        score = len(matched) * 10 + sum(len(k) for k in matched)
        if best is None or score > best[1]:
            best = (entry, score, len(matched), min_len)
    if not best:
        return None
    _, score, match_count, min_len = best
    if match_count == 1 and min_len < 6:
        return None
    if score < 12:
        return None
    return best[0]


SYSTEM_INSTRUCTION = """\
Anda adalah asisten pembelajaran mata kuliah Kewarganegaraan untuk mahasiswa S1 PGMI
(calon Guru Madrasah Ibtidaiyah).

ATURAN WAJIB:
1. Jawab dalam Bahasa Indonesia santun, akademis, jelas.
2. Selalu sebutkan rujukan resmi (UUD 1945 + nomor pasal, UU No. 12 Tahun 2006,
   Pancasila, dsb.) dengan format "📖 Sumber: ..."
3. JANGAN mengarang Pasal/UU. Jika tidak yakin, katakan jujur.
4. JANGAN dukungan partisan ke partai/calon/tokoh politik. Bersikap netral.
5. Untuk isu sensitif (hukum, politik, SARA, HAM), berbasis sumber.
6. Hubungkan dengan konteks calon guru MI: contoh konkret untuk peserta didik 7-12 tahun.
7. Tutup dengan "💭 Refleksi: ..." satu pertanyaan reflektif singkat.
8. Tolak halus jika diminta mengerjakan seluruh tugas mahasiswa.

Format jawaban: 3-6 kalimat untuk konsep umum, lebih rinci untuk teknis spesifik.
"""

SUGGESTIONS = [
    "Apa isi Pasal 27 UUD 1945?",
    "Jelaskan asas ius sanguinis dan ius soli",
    "Apa itu Demokrasi Pancasila?",
    "Apa itu Wawasan Nusantara?",
    "Sebutkan 9 nilai antikorupsi KPK",
    "Apa hak dan kewajiban warga negara?",
]
