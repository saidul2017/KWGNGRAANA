import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/session";

/**
 * GET /api/questions/template
 * Mengembalikan template Excel kosong dengan baris contoh dan baris instruksi.
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
      topic: "Pancasila",
      text: "Pancasila secara resmi disahkan sebagai dasar negara pada tanggal...",
      optionA: "1 Juni 1945",
      optionB: "17 Agustus 1945",
      optionC: "18 Agustus 1945",
      optionD: "22 Juni 1945",
      correct: "C",
      explanation: "Pancasila disahkan PPKI pada 18 Agustus 1945.",
      sourceRef: "Pembukaan UUD 1945; Sidang PPKI 18-08-1945",
      difficulty: "easy",
      timeLimit: 20,
      maxPoints: 1000,
    },
    {
      topic: "UUD 1945",
      text: "Pasal 27 ayat (1) UUD 1945 menegaskan...",
      optionA: "Hak atas pekerjaan",
      optionB: "Persamaan kedudukan di hukum",
      optionC: "Hak atas pendidikan",
      optionD: "Wajib bela negara",
      correct: "B",
      explanation: "Pasal 27 (1) menegaskan equality before the law.",
      sourceRef: "UUD 1945 Pasal 27 ayat (1)",
      difficulty: "easy",
      timeLimit: 20,
      maxPoints: 1000,
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(example);
  XLSX.utils.book_append_sheet(wb, sheet, "Soal");

  // Sheet Instruksi
  const instr = XLSX.utils.aoa_to_sheet([
    ["Petunjuk Pengisian Bank Soal"],
    [""],
    ["Kolom yang WAJIB diisi pada sheet 'Soal':"],
    ["- topic        : Topik soal (mis. Pancasila, UUD 1945, Demokrasi Pancasila)"],
    ["- text         : Pertanyaan lengkap"],
    ["- optionA..D   : Opsi jawaban (E dan F bersifat opsional jika perlu)"],
    ["- correct      : Huruf opsi yang benar (A, B, C, D, E, atau F)"],
    ["- explanation  : Penjelasan jawaban (akan ditampilkan ke mahasiswa)"],
    ["- sourceRef    : Rujukan resmi (UUD/UU/RPS), wajib utk akademik"],
    ["- difficulty   : easy / medium / hard"],
    ["- timeLimit    : Detik (5–180), default 20"],
    ["- maxPoints    : Skor maksimum (100–2000), default 1000"],
    [""],
    ["Tips: Hapus 2 baris contoh lalu isi soal Anda sendiri."],
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
