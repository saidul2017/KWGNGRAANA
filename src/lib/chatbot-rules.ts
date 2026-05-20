/**
 * Chatbot rule-based untuk mata kuliah Kewarganegaraan.
 * Mode default (tanpa LLM): mencocokkan kata kunci ke jawaban dengan rujukan resmi.
 *
 * Sumber rujukan setiap entri WAJIB dicantumkan sesuai aturan asisten:
 * UUD 1945, UU No. 12 Tahun 2006, Pancasila, Tap MPR yang relevan, dll.
 *
 * Dosen/pengembang dapat memperluas array ini, atau mengaktifkan integrasi LLM
 * di src/app/api/chatbot/route.ts dengan menyetel OPENAI_API_KEY.
 */
export type KbEntry = {
  keywords: string[];     // semua kata kunci harus muncul (lowercased)
  answer: string;
  source: string;
  followUp?: string;
};

export const KB: KbEntry[] = [
  {
    keywords: ["pancasila", "dasar negara"],
    answer:
      "Pancasila adalah dasar negara Republik Indonesia yang disahkan PPKI pada 18 Agustus 1945, terdiri dari lima sila: (1) Ketuhanan Yang Maha Esa, (2) Kemanusiaan yang adil dan beradab, (3) Persatuan Indonesia, (4) Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan, (5) Keadilan sosial bagi seluruh rakyat Indonesia.",
    source: "Pembukaan UUD 1945 alinea IV; Sidang PPKI 18 Agustus 1945",
    followUp:
      "Coba renungkan: bagaimana Anda sebagai calon guru MI dapat mengajarkan masing-masing sila kepada peserta didik kelas rendah secara konkret?",
  },
  {
    keywords: ["pasal 27", "kesamaan kedudukan", "sama di hadapan hukum"],
    answer:
      "Pasal 27 ayat (1) UUD 1945 berbunyi: ‘Segala warga negara bersamaan kedudukannya di dalam hukum dan pemerintahan dan wajib menjunjung hukum dan pemerintahan itu dengan tidak ada kecualinya.’ Ini adalah landasan asas equality before the law.",
    source: "UUD 1945 Pasal 27 ayat (1)",
  },
  {
    keywords: ["pasal 31", "pendidikan", "hak"],
    answer:
      "Pasal 31 ayat (1) UUD 1945 menyatakan ‘Setiap warga negara berhak mendapat pendidikan’. Ayat (2) mewajibkan setiap warga negara mengikuti pendidikan dasar dan pemerintah wajib membiayainya. Ini relevan bagi calon guru MI sebagai pelaku pendidikan dasar.",
    source: "UUD 1945 Pasal 31 ayat (1) dan (2)",
  },
  {
    keywords: ["pasal 30", "bela negara", "pertahanan"],
    answer:
      "Pasal 30 ayat (1) UUD 1945 menegaskan: ‘Tiap-tiap warga negara berhak dan wajib ikut serta dalam usaha pertahanan dan keamanan negara.’ Bela negara meliputi keikutsertaan dalam pendidikan kewarganegaraan, pengabdian sesuai profesi, hingga keikutsertaan TNI/Polri.",
    source: "UUD 1945 Pasal 30 ayat (1); UU No. 23 Tahun 2019",
  },
  {
    keywords: ["ius soli"],
    answer:
      "Ius soli adalah asas kewarganegaraan berdasarkan tempat kelahiran seseorang, tanpa memperhatikan kewarganegaraan orang tuanya.",
    source: "UU No. 12 Tahun 2006 tentang Kewarganegaraan RI",
  },
  {
    keywords: ["ius sanguinis"],
    answer:
      "Ius sanguinis adalah asas kewarganegaraan berdasarkan keturunan/garis darah orang tua. Indonesia menganut asas ius sanguinis sebagai asas utama, dengan kombinasi ius soli terbatas.",
    source: "UU No. 12 Tahun 2006 tentang Kewarganegaraan RI",
  },
  {
    keywords: ["apatride"],
    answer:
      "Apatride adalah keadaan seseorang yang tidak memiliki kewarganegaraan apa pun, biasanya akibat konflik penerapan asas kewarganegaraan antarnegara.",
    source: "Buku Ajar PKn; UU No. 12 Tahun 2006",
  },
  {
    keywords: ["bipatride", "dwi kewarganegaraan"],
    answer:
      "Bipatride adalah keadaan seseorang memiliki dua kewarganegaraan sekaligus. Bagi anak hasil perkawinan campuran, UU No. 12 Tahun 2006 memberikan kewarganegaraan ganda terbatas hingga usia 18 tahun (atau 21 dengan pertimbangan).",
    source: "UU No. 12 Tahun 2006 Pasal 4 dan Pasal 6",
  },
  {
    keywords: ["demokrasi pancasila"],
    answer:
      "Demokrasi Pancasila adalah sistem demokrasi yang dijiwai sila ke-4: ‘Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan’. Cirinya: musyawarah-mufakat, menghormati HAM, supremasi hukum, kebebasan bertanggung jawab, dan persatuan.",
    source: "Pancasila sila ke-4; Pembukaan UUD 1945",
  },
  {
    keywords: ["wawasan nusantara"],
    answer:
      "Wawasan Nusantara adalah cara pandang bangsa Indonesia tentang diri dan lingkungannya yang berlandaskan Pancasila dan UUD 1945, dengan semangat Bhinneka Tunggal Ika; mencakup aspek geografis, politik, ekonomi, sosial-budaya, dan hankam dalam satu kesatuan.",
    source: "Tap MPR No. IV/MPR/1973; Buku Ajar PKn",
  },
  {
    keywords: ["bhinneka tunggal ika"],
    answer:
      "‘Bhinneka Tunggal Ika’ adalah semboyan negara yang berarti ‘berbeda-beda tetapi tetap satu’. Diambil dari Kitab Sutasoma karya Mpu Tantular.",
    source: "UUD 1945 Pasal 36A; Kitab Sutasoma",
  },
  {
    keywords: ["lambang negara", "garuda"],
    answer:
      "Lambang negara Republik Indonesia adalah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika.",
    source: "UUD 1945 Pasal 36A; UU No. 24 Tahun 2009",
  },
  {
    keywords: ["bendera"],
    answer:
      "Bendera Negara Indonesia adalah Sang Saka Merah Putih.",
    source: "UUD 1945 Pasal 35; UU No. 24 Tahun 2009",
  },
  {
    keywords: ["lagu kebangsaan", "indonesia raya"],
    answer:
      "Lagu Kebangsaan adalah Indonesia Raya, ciptaan W.R. Supratman.",
    source: "UUD 1945 Pasal 36B; UU No. 24 Tahun 2009",
  },
  {
    keywords: ["bahasa negara", "bahasa indonesia"],
    answer:
      "Bahasa negara adalah Bahasa Indonesia.",
    source: "UUD 1945 Pasal 36",
  },
  {
    keywords: ["antikorupsi", "nilai", "korupsi"],
    answer:
      "Sembilan nilai antikorupsi (KPK) yang relevan ditanamkan sejak MI: jujur, peduli, mandiri, disiplin, tanggung jawab, kerja keras, sederhana, berani, dan adil. Bagi guru MI, contoh penerapannya: pembiasaan mengembalikan barang temuan, antri, jadwal piket, mengakui kesalahan saat ulangan.",
    source: "Modul Pendidikan Antikorupsi KPK",
  },
  {
    keywords: ["ham", "hak asasi"],
    answer:
      "Hak Asasi Manusia (HAM) adalah hak yang melekat pada manusia sebagai anugerah Tuhan, bersifat universal dan tidak dapat dicabut. UUD 1945 mengatur HAM dalam Bab XA (Pasal 28A–28J), dan UU No. 39 Tahun 1999 menjabarkan lebih lanjut.",
    source: "UUD 1945 Pasal 28A–28J; UU No. 39 Tahun 1999",
  },
  {
    keywords: ["integrasi nasional"],
    answer:
      "Integrasi nasional adalah proses penyatuan berbagai kelompok masyarakat yang berbeda suku, agama, dan budaya menjadi satu kesatuan bangsa. Tantangannya antara lain primordialisme sempit, hoaks, kesenjangan sosial, dan radikalisme.",
    source: "Buku Ajar PKn; UUD 1945 Pasal 18B, 32",
  },
  {
    keywords: ["ketahanan nasional"],
    answer:
      "Ketahanan Nasional adalah kondisi dinamis suatu bangsa yang berisi keuletan dan ketangguhan, mengandung kemampuan mengembangkan kekuatan nasional dalam menghadapi segala ancaman, baik dari luar maupun dari dalam, untuk menjamin identitas, integritas, kelangsungan hidup bangsa dan negara.",
    source: "Doktrin Pertahanan Negara; Buku Ajar PKn",
  },
  {
    keywords: ["konstitusi"],
    answer:
      "Konstitusi adalah hukum dasar tertulis (UUD 1945) yang mengatur penyelenggaraan negara: pembagian kekuasaan, hak warga negara, dan hubungan negara-warga. Perilaku konstitusional artinya bertindak sesuai jiwa & pasal-pasal konstitusi.",
    source: "UUD 1945 Pembukaan dan Batang Tubuh",
  },
  {
    keywords: ["hak warga negara"],
    answer:
      "Hak warga negara antara lain: persamaan kedudukan di hukum (Pasal 27), pekerjaan & penghidupan layak (Pasal 27 ayat 2), bela negara (Pasal 27 ayat 3 & Pasal 30), kemerdekaan berserikat & berpendapat (Pasal 28), kebebasan beragama (Pasal 29), pendidikan (Pasal 31), dan hak-hak HAM (Pasal 28A–28J).",
    source: "UUD 1945 Pasal 27–34",
  },
  {
    keywords: ["kewajiban warga negara"],
    answer:
      "Kewajiban warga negara antara lain: menjunjung hukum & pemerintahan (Pasal 27 ayat 1), ikut serta bela negara (Pasal 27 ayat 3 & Pasal 30), menghormati HAM orang lain (Pasal 28J), mengikuti pendidikan dasar (Pasal 31 ayat 2), dan ikut serta dalam pertahanan & keamanan.",
    source: "UUD 1945 Pasal 27, 28J, 30, 31",
  },
];

/**
 * Cari jawaban di KB berdasarkan kata kunci. Mengembalikan jawaban dengan
 * skor pencocokan tertinggi, atau null jika tidak ada yang cocok dengan
 * threshold yang cukup.
 *
 * Aturan match (lebih ketat):
 *   - Single keyword → minimal 6 char (mis. "pasal 27", "ius soli")
 *   - Atau ≥2 keyword cocok
 *   - Skor minimum 12
 */
export function searchKb(query: string): KbEntry | null {
  const q = query.toLowerCase();
  let best: { entry: KbEntry; score: number; matchCount: number; minLen: number } | null = null;
  for (const entry of KB) {
    const matched = entry.keywords.filter((k) => q.includes(k.toLowerCase()));
    if (matched.length === 0) continue;
    const minKwLen = Math.min(...matched.map((k) => k.length));
    const score = matched.length * 10 + matched.reduce((s, k) => s + k.length, 0);
    if (!best || score > best.score) {
      best = { entry, score, matchCount: matched.length, minLen: minKwLen };
    }
  }
  if (!best) return null;
  // Threshold: minimal 2 keyword cocok, atau 1 keyword dengan panjang ≥6 char
  if (best.matchCount === 1 && best.minLen < 6) return null;
  if (best.score < 12) return null;
  return best.entry;
}
