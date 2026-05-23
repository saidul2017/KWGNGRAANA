import { NextResponse } from "next/server";
import { all, get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuestion, rowToQuiz, type QuestionRow, type QuizRow } from "@/lib/types";
import { shuffle } from "@/lib/scoring";

/**
 * Mahasiswa memulai pengerjaan kuis.
 * POST /api/quizzes/[id]/start
 *
 * Body opsional: { resume?: boolean }  — kalau true, lanjutkan attempt yang masih in_progress.
 *
 * Mengembalikan attemptId + daftar soal (TANPA correct_index, supaya tidak bocor).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser("student");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const quizId = Number(params.id);
  const quizRow = await get<QuizRow>(`SELECT * FROM quizzes WHERE id = ?`, [quizId]);
  if (!quizRow) return NextResponse.json({ error: "Kuis tidak ditemukan" }, { status: 404 });
  const quiz = rowToQuiz(quizRow);

  // Latihan boleh dikerjakan kapan saja meski draft. Kuis & UAS harus 'open'.
  if (quiz.kind !== "practice" && quiz.status !== "open") {
    return NextResponse.json(
      { error: `Kuis belum dibuka oleh dosen (status: ${quiz.status}).` },
      { status: 403 }
    );
  }

  // Untuk kuis & UAS: 1 mahasiswa hanya boleh 1 attempt selesai.
  // Latihan: boleh berulang.
  if (quiz.kind !== "practice") {
    const done = await get<{ id: number }>(
      `SELECT id FROM attempts WHERE quiz_id = ? AND user_id = ? AND status = 'completed' LIMIT 1`,
      [quizId, user.id]
    );
    if (done) {
      return NextResponse.json(
        { error: "Anda sudah menyelesaikan kuis ini. Tidak bisa mengulang." },
        { status: 409 }
      );
    }
  }

  // Resume jika ada attempt in_progress
  let attempt = await get<{ id: number; total_questions: number }>(
    `SELECT id, total_questions FROM attempts WHERE quiz_id = ? AND user_id = ? AND status = 'in_progress' LIMIT 1`,
    [quizId, user.id]
  );

  // Ambil soal-soal kuis
  const questions = await all<QuestionRow & { position: number }>(
    `SELECT q.*, qq.position FROM questions q
     JOIN quiz_questions qq ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
     ORDER BY qq.position ASC`,
    [quizId]
  );
  if (questions.length === 0) {
    return NextResponse.json({ error: "Kuis ini belum berisi soal." }, { status: 400 });
  }

  // Insert attempt LEBIH DULU agar seed shuffle selalu deterministik antar resume.
  // Sebelumnya: kalau attempt belum ada, seed pakai Date.now() — refresh = urutan
  // baru = soal yang sama dianggap "sudah dijawab" oleh server → mahasiswa stuck.
  if (!attempt) {
    const r = await run(
      `INSERT INTO attempts (quiz_id, user_id, group_id, total_questions, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
      [quizId, user.id, user.groupId ?? null, questions.length]
    );
    attempt = { id: r.lastInsertRowid, total_questions: questions.length };
  }

  let ordered = questions.map(rowToQuestion);
  if (quiz.shuffle) {
    const seed = (user.id * 1009 + quizId * 31 + attempt.id * 7) | 0;
    ordered = shuffle(ordered, seed);
  }

  // Jangan kirim correct_index ke klien.
  const safeQuestions = ordered.map((q) => ({
    id: q.id,
    topic: q.topic,
    text: q.text,
    options: q.options,
    timeLimit: q.timeLimit,
    maxPoints: q.maxPoints,
    sourceRef: q.sourceRef,
  }));

  return NextResponse.json({
    attemptId: attempt.id,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      kind: quiz.kind,
      mode: quiz.mode,
    },
    questions: safeQuestions,
  });
}
