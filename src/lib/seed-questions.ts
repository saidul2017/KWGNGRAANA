/**
 * Bank soal awal untuk demonstrasi.
 * Dosen dapat menambah/mengubah/menghapus melalui dashboard.
 *
 * Sumber rujukan:
 * - UUD 1945 (sebelum & sesudah amandemen)
 * - UU No. 12 Tahun 2006 tentang Kewarganegaraan RI
 * - UU No. 23 Tahun 2019 tentang Pengelolaan Sumber Daya Nasional untuk Pertahanan Negara
 * - Pancasila & Ketetapan MPR yang relevan
 */
export type QuestionSeed = {
  topic: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRef: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit?: number;
};

export const SEED_QUESTIONS: QuestionSeed[] = [
  {
    topic: "Pancasila",
    text: "Pancasila secara resmi disahkan sebagai dasar negara pada tanggal...",
    options: ["1 Juni 1945", "17 Agustus 1945", "18 Agustus 1945", "22 Juni 1945"],
    correctIndex: 2,
    explanation:
      "Pancasila disahkan sebagai dasar negara oleh PPKI bersamaan dengan pengesahan UUD 1945 pada 18 Agustus 1945.",
    sourceRef: "Pembukaan UUD 1945; Sidang PPKI 18 Agustus 1945",
    difficulty: "easy",
  },
  {
    topic: "Identitas Nasional",
    text: "Lambang negara Republik Indonesia adalah...",
    options: ["Bendera Merah Putih", "Garuda Pancasila", "Pohon Beringin", "Padi dan Kapas"],
    correctIndex: 1,
    explanation:
      "Lambang negara adalah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika.",
    sourceRef: "UUD 1945 Pasal 36A",
    difficulty: "easy",
  },
  {
    topic: "UUD 1945",
    text: "Pasal 27 ayat (1) UUD 1945 menegaskan bahwa segala warga negara...",
    options: [
      "Berhak memperoleh pekerjaan yang layak",
      "Bersamaan kedudukannya di dalam hukum dan pemerintahan",
      "Berhak atas pendidikan",
      "Wajib ikut serta dalam usaha pertahanan negara",
    ],
    correctIndex: 1,
    explanation:
      "Pasal 27 ayat (1) menegaskan persamaan kedudukan setiap warga negara di hadapan hukum dan pemerintahan tanpa kecuali.",
    sourceRef: "UUD 1945 Pasal 27 ayat (1)",
    difficulty: "easy",
  },
  {
    topic: "Hak & Kewajiban",
    text: "Pasal 31 ayat (1) UUD 1945 menyatakan bahwa setiap warga negara berhak...",
    options: [
      "Mendapatkan pekerjaan",
      "Mendapat pendidikan",
      "Memilih agama",
      "Mengeluarkan pendapat",
    ],
    correctIndex: 1,
    explanation:
      "Pasal 31 ayat (1) menjamin hak setiap warga negara atas pendidikan; ayat (2) mewajibkan mengikuti pendidikan dasar.",
    sourceRef: "UUD 1945 Pasal 31 ayat (1)",
    difficulty: "easy",
  },
  {
    topic: "Kewarganegaraan",
    text: "Asas kewarganegaraan yang mendasarkan kewarganegaraan seseorang pada keturunan/garis darah orang tua disebut...",
    options: ["Ius Soli", "Ius Sanguinis", "Apatride", "Bipatride"],
    correctIndex: 1,
    explanation:
      "Ius sanguinis menetapkan kewarganegaraan berdasarkan keturunan; ius soli berdasarkan tempat kelahiran.",
    sourceRef: "UU No. 12 Tahun 2006 tentang Kewarganegaraan RI",
    difficulty: "medium",
  },
  {
    topic: "Kewarganegaraan",
    text: "Undang-Undang yang mengatur Kewarganegaraan Republik Indonesia adalah...",
    options: [
      "UU No. 62 Tahun 1958",
      "UU No. 12 Tahun 2006",
      "UU No. 39 Tahun 1999",
      "UU No. 23 Tahun 2019",
    ],
    correctIndex: 1,
    explanation:
      "UU No. 12 Tahun 2006 menggantikan UU No. 62 Tahun 1958 dan mengatur asas, syarat, kehilangan, serta perolehan kewarganegaraan RI.",
    sourceRef: "UU No. 12 Tahun 2006",
    difficulty: "medium",
  },
  {
    topic: "Demokrasi Pancasila",
    text: "Ciri khas Demokrasi Pancasila yang membedakannya dari demokrasi liberal adalah...",
    options: [
      "Menonjolkan kebebasan individu mutlak",
      "Mengutamakan musyawarah untuk mufakat",
      "Menolak adanya pemilu",
      "Menerapkan sistem satu partai",
    ],
    correctIndex: 1,
    explanation:
      "Demokrasi Pancasila menempatkan musyawarah-mufakat (sila ke-4) sebagai mekanisme utama, dengan tetap menjamin HAM dan supremasi hukum.",
    sourceRef: "Pancasila sila ke-4; Pembukaan UUD 1945 alinea IV",
    difficulty: "medium",
  },
  {
    topic: "Bela Negara",
    text: "Pasal 30 ayat (1) UUD 1945 menyatakan bahwa usaha pertahanan dan keamanan negara adalah...",
    options: [
      "Tugas TNI dan Polri saja",
      "Hak dan kewajiban setiap warga negara",
      "Tanggung jawab pemerintah pusat",
      "Tugas presiden sebagai panglima tertinggi",
    ],
    correctIndex: 1,
    explanation:
      "Pasal 30 ayat (1) menegaskan bela negara sebagai hak sekaligus kewajiban tiap-tiap warga negara.",
    sourceRef: "UUD 1945 Pasal 30 ayat (1); UU No. 23 Tahun 2019",
    difficulty: "easy",
  },
  {
    topic: "Wawasan Nusantara",
    text: "Wawasan Nusantara pada hakikatnya adalah cara pandang bangsa Indonesia tentang...",
    options: [
      "Keunggulan ekonomi nasional",
      "Diri dan lingkungannya berdasarkan Pancasila dan UUD 1945",
      "Strategi militer modern",
      "Hubungan luar negeri bebas aktif",
    ],
    correctIndex: 1,
    explanation:
      "Wawasan Nusantara adalah cara pandang bangsa Indonesia mengenai diri dan lingkungannya yang berlandaskan Pancasila dan UUD 1945, dengan semangat Bhinneka Tunggal Ika.",
    sourceRef: "Tap MPR No. IV/MPR/1973 (asas); Buku Ajar PKn",
    difficulty: "medium",
  },
  {
    topic: "Antikorupsi",
    text: "Nilai integritas yang relevan ditanamkan sejak Madrasah Ibtidaiyah untuk mencegah korupsi adalah...",
    options: [
      "Jujur, disiplin, tanggung jawab",
      "Pintar berhitung",
      "Berani berdebat",
      "Mahir berbahasa asing",
    ],
    correctIndex: 0,
    explanation:
      "KPK merumuskan 9 nilai antikorupsi; kejujuran, disiplin, dan tanggung jawab adalah nilai dasar yang sangat relevan diajarkan kepada peserta didik MI.",
    sourceRef: "Modul Pendidikan Antikorupsi KPK",
    difficulty: "easy",
  },
];
