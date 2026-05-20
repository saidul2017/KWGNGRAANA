import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/session";

/**
 * GET /api/questions/template
 * Mengembalikan template Excel kosong dengan baris contoh dan baris instruksi.
 * Mendukung tipe MCQ (default) dan Essay (kolom type='essay' + keyPoints).
 */
export async function GET() {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const wb = XLSX.utils.book_new();
  const example = [
    {
      type: "mcq",
      topic: "Pancasila",
      text: "Pancasila secara resmi disahkan sebagai dasar negara pada tanggal...",
      optionA: "1 Juni 1945",
      optionB: "17 Agustus 1945",
      optionC: "18 Agustus 1945",
      optionD: "22 Juni 1945",
      correct: "C",
      keyPoints: "",
      minWords: "",
      explanation: "Pancasila disahkan PPKI pada 18 Agustus 1945.",
      sourceRef: "Pembukaan UUD 1945; Sidang PPKI 18-08-1945",
      difficulty: "easy",
      timeLimit: 20,
      maxPoints: 1000,
    },
    {
      type: "mcq",
      topic: "UUD 1945",
      text: "Pasal 27 ayat (1) UUD 1945 menegaskan...",
      optionA: "Hak atas pekerjaan",
      optionB: "Persamaan kedudukan di hukum",
      optionC: "Hak atas pendidikan",
      optionD: "Wajib bela negara",
      correct: "B",
      keyPoints: "",
      minWords: "",
      explanation: "Pasal 27 (1) menegaskan equality before the law.",
      sourceRef: "UUD 1945 Pasal 27 ayat (1)",
      difficulty: "easy",
      timeLimit: 20,
      maxPoints: 1000,
    },
    {
      type: "essay",
      topic: "UUD 1945",
      text: "Jelaskan makna Pasal 27 ayat (1) UUD 1945 dan kaitannya dengan tugas calon guru MI.",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "",
      keyPoints:
        "Persamaan kedudukan di hadapan hukum | Kewajiban menjunjung hukum | Relevansi guru MI: keadilan | Contoh praktik di kelas MI",
      minWords: 50,
      explanation: "Pasal 27 (1) menegaskan equality before the law.",
      sourceRef: "UUD 1945 Pasal 27 ayat (1)",
      difficulty: "medium",
      timeLimit: 300,
      maxPoints: 1000,
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(example);
  XLSX.utils.book_append_sheet(wb, sheet, "Soal");

  const instr = XLSX.utils.aoa_to_sheet([
    ["Petunjuk Pengisian Bank Soal"],
    [""],
    ["Kolom WAJIB:"],
    ["- type        : 'mcq' (pilihan ganda) atau 'essay' (auto-grading AI)"],
    ["- topic       : Topik soal (Pancasila, UUD 1945, Demokrasi, dsb.)"],
    ["- text        : Pertanyaan lengkap"],
    [""],
    ["Khusus MCQ:"],
    ["- optionA..D  : Opsi jawaban (E dan F opsional)"],
    ["- correct     : Huruf opsi benar (A/B/C/D/E/F)"],
    [""],
    ["Khusus Essay:"],
    ["- keyPoints   : Daftar poin kunci rubrik dipisah '|', mis."],
    ["                'Persamaan hukum | Kewajiban warga | Contoh kelas MI'"],
    ["                AI akan menilai jawaban berdasarkan berapa poin tertangkap."],
    ["- minWords    : Minimal kata jawaban (0 = bebas)"],
    [""],
    ["Umum (opsional):"],
    ["- explanation : Penjelasan / kunci jawaban ringkas"],
    ["- sourceRef   : Rujukan resmi (UUD/UU/RPS) — sangat dianjurkan"],
    ["- difficulty  : easy / medium / hard"],
    ["- timeLimit   : Detik (5–600). Esai disarankan ≥120 detik"],
    ["- maxPoints   : Skor maksimum (100–2000), default 1000"],
    [""],
    ["Tips: Hapus 3 baris contoh lalu isi soal Anda sendiri."],
  ]);
  XLSX.utils.book_append_sheet(wb, instr, "Petunjuk");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="KWGN-Template-Bank-Soal.xlsx"`,
    },
  });
}
