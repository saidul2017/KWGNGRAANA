import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { all } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

/**
 * GET /api/lecturer/export
 *
 * Query opsional:
 *   - quizId : nomor — filter ke 1 kuis tertentu
 *
 * Mengembalikan file .xlsx berisi 3 sheet:
 *   1. "Ringkasan Kelas"  — daftar mahasiswa + total poin
 *   2. "Detail Pengerjaan" — semua attempt selesai
 *   3. "Per Kuis"          — agregasi per kuis
 */
export async function GET(req: Request) {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");

  const filterSql = quizId ? `AND a.quiz_id = ?` : "";
  const params: unknown[] = quizId ? [Number(quizId)] : [];

  // Sheet 1: Ringkasan kelas
  const classSummary = await all<{
    no: number;
    nim: string;
    name: string;
    group_name: string | null;
    attempts_done: number;
    total_score: number;
  }>(
    `SELECT u.nim AS nim, u.name AS name, g.name AS group_name,
            (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id AND a.status='completed') AS attempts_done,
            COALESCE((SELECT SUM(total_score) FROM attempts a WHERE a.user_id = u.id AND a.status='completed'), 0) AS total_score
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.role = 'student'
     ORDER BY u.nim ASC`
  );

  // Sheet 2: Detail attempt
  const detail = await all<{
    finished_at: string | null;
    nim: string;
    name: string;
    group_name: string | null;
    quiz_title: string;
    quiz_kind: string;
    total_score: number;
    total_correct: number;
    total_questions: number;
    pct: number;
  }>(
    `SELECT a.finished_at, u.nim, u.name, g.name AS group_name,
            q.title AS quiz_title, q.kind AS quiz_kind,
            a.total_score, a.total_correct, a.total_questions,
            CASE WHEN a.total_questions > 0
                 THEN ROUND(a.total_correct * 100.0 / a.total_questions, 1)
                 ELSE 0 END AS pct
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     JOIN quizzes q ON q.id = a.quiz_id
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE a.status = 'completed' ${filterSql}
     ORDER BY q.title ASC, a.total_score DESC`,
    params
  );

  // Sheet 3: Per kuis
  const perQuiz = await all<{
    quiz_title: string;
    quiz_kind: string;
    attempts: number;
    avg_score: number;
    max_score: number;
    min_score: number;
  }>(
    `SELECT q.title AS quiz_title, q.kind AS quiz_kind,
            COUNT(a.id) AS attempts,
            COALESCE(ROUND(AVG(a.total_score), 0), 0) AS avg_score,
            COALESCE(MAX(a.total_score), 0) AS max_score,
            COALESCE(MIN(a.total_score), 0) AS min_score
     FROM quizzes q
     LEFT JOIN attempts a ON a.quiz_id = q.id AND a.status='completed'
     ${quizId ? `WHERE q.id = ?` : ""}
     GROUP BY q.id ORDER BY q.title ASC`,
    quizId ? [Number(quizId)] : []
  );

  // Bangun workbook
  const wb = XLSX.utils.book_new();

  const sheet1 = XLSX.utils.json_to_sheet(
    classSummary.map((r, i) => ({
      "No.": i + 1,
      NIM: r.nim,
      Nama: r.name,
      Kelompok: r.group_name ?? "—",
      "Jumlah Pengerjaan": r.attempts_done,
      "Total Poin": r.total_score,
    }))
  );
  XLSX.utils.book_append_sheet(wb, sheet1, "Ringkasan Kelas");

  const sheet2 = XLSX.utils.json_to_sheet(
    detail.map((r, i) => ({
      "No.": i + 1,
      Tanggal: r.finished_at ?? "",
      NIM: r.nim,
      Nama: r.name,
      Kelompok: r.group_name ?? "—",
      Kuis: r.quiz_title,
      Jenis: r.quiz_kind.toUpperCase(),
      "Benar": r.total_correct,
      "Total Soal": r.total_questions,
      "Persen (%)": r.pct,
      "Skor": r.total_score,
    }))
  );
  XLSX.utils.book_append_sheet(wb, sheet2, "Detail Pengerjaan");

  const sheet3 = XLSX.utils.json_to_sheet(
    perQuiz.map((r) => ({
      Kuis: r.quiz_title,
      Jenis: r.quiz_kind.toUpperCase(),
      "Jumlah Pengerjaan": r.attempts,
      "Skor Rata-rata": r.avg_score,
      "Skor Tertinggi": r.max_score,
      "Skor Terendah": r.min_score,
    }))
  );
  XLSX.utils.book_append_sheet(wb, sheet3, "Per Kuis");

  // Sheet 4: Per Kelompok
  const perGroup = await all<{
    group_name: string;
    member_count: number;
    active_members: number;
    total_attempts: number;
    total_score: number;
    avg_score: number;
  }>(
    `SELECT g.name AS group_name,
            (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role='student') AS member_count,
            COUNT(DISTINCT a.user_id) AS active_members,
            COUNT(a.id) AS total_attempts,
            COALESCE(SUM(a.total_score), 0) AS total_score,
            COALESCE(ROUND(AVG(a.total_score), 0), 0) AS avg_score
     FROM groups g
     LEFT JOIN attempts a ON a.group_id = g.id AND a.status='completed' ${filterSql.replace(/^AND/, "AND")}
     GROUP BY g.id, g.name
     ORDER BY avg_score DESC`,
    params
  );
  const sheet4 = XLSX.utils.json_to_sheet(
    perGroup.map((r, i) => ({
      "Peringkat": i + 1,
      "Kelompok": r.group_name,
      "Anggota Aktif": r.active_members,
      "Total Anggota": r.member_count,
      "Jumlah Pengerjaan": r.total_attempts,
      "Total Skor": r.total_score,
      "Skor Rata-rata": r.avg_score,
    }))
  );
  XLSX.utils.book_append_sheet(wb, sheet4, "Per Kelompok");

  // Sheet 5: Jawaban Esai (jika ada)
  const essays = await all<{
    nim: string;
    name: string;
    quiz_title: string;
    question_topic: string;
    question_text: string;
    essay_text: string | null;
    score_awarded: number;
    max_points: number;
    original_score: number | null;
    lecturer_note: string | null;
    reviewed_at: string | null;
    ai_feedback: string | null;
  }>(
    `SELECT u.nim, u.name, qz.title AS quiz_title,
            qn.topic AS question_topic, qn.text AS question_text,
            qn.max_points,
            ans.essay_text, ans.score_awarded, ans.original_score,
            ans.lecturer_note, ans.reviewed_at, ans.ai_feedback
     FROM answers ans
     JOIN attempts a ON a.id = ans.attempt_id
     JOIN questions qn ON qn.id = ans.question_id AND qn.type='essay'
     JOIN users u ON u.id = a.user_id
     JOIN quizzes qz ON qz.id = a.quiz_id
     WHERE a.status='completed' ${filterSql}
     ORDER BY qz.title, u.nim`,
    params
  );
  if (essays.length > 0) {
    const sheet5 = XLSX.utils.json_to_sheet(
      essays.map((r, i) => {
        let aiFeedback = "";
        try {
          const parsed = JSON.parse(r.ai_feedback ?? "");
          aiFeedback = parsed.feedback || "";
        } catch { /* ignore */ }
        return {
          "No.": i + 1,
          NIM: r.nim,
          Nama: r.name,
          Kuis: r.quiz_title,
          Topik: r.question_topic,
          Pertanyaan: r.question_text,
          "Jawaban Mahasiswa": r.essay_text ?? "",
          "Skor Final": r.score_awarded,
          "Skor Maks": r.max_points,
          "Persen": Math.round((r.score_awarded / r.max_points) * 100),
          "Skor AI Awal":
            r.original_score !== null ? r.original_score : r.score_awarded,
          "Status": r.reviewed_at ? "Ditinjau dosen" : "Otomatis AI",
          "Feedback AI": aiFeedback,
          "Catatan Dosen": r.lecturer_note ?? "",
          "Tanggal Tinjau": r.reviewed_at ?? "",
        };
      })
    );
    XLSX.utils.book_append_sheet(wb, sheet5, "Jawaban Esai");
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const ts = new Date().toISOString().slice(0, 10);
  const filename = quizId
    ? `KWGN-Nilai-Kuis${quizId}-${ts}.xlsx`
    : `KWGN-Nilai-Kelas-${ts}.xlsx`;

  // Convert Node Buffer ke Uint8Array agar kompatibel dengan tipe BodyInit
  const body = new Uint8Array(buf);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
