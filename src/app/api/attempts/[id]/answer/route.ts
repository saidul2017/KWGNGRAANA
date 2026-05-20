import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { calculateScore } from "@/lib/scoring";
import { rowToQuestion, type QuestionRow } from "@/lib/types";

const Body = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z.number().int().min(-1), // -1 = timeout / tidak menjawab
  responseMs: z.number().int().min(0),
});

/**
 * Mahasiswa submit jawaban satu soal.
 * POST /api/attempts/[id]/answer
 *
 * Mengembalikan koreksi: { isCorrect, correctIndex, scoreAwarded, explanation }.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser("student");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const attemptId = Number(params.id);
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { questionId, selectedIndex, responseMs } = parsed.data;

  // Validasi attempt milik user dan masih in_progress.
  const attempt = await get<{
    id: number;
    user_id: number;
    quiz_id: number;
    status: string;
    total_score: number;
    total_correct: number;
  }>(
    `SELECT id, user_id, quiz_id, status, total_score, total_correct
     FROM attempts WHERE id = ? LIMIT 1`,
    [attemptId]
  );
  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Attempt tidak ditemukan" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Attempt sudah selesai" }, { status: 409 });
  }

  // Cegah jawaban duplikat untuk soal yang sama dalam 1 attempt.
  const existing = await get<{ id: number }>(
    `SELECT id FROM answers WHERE attempt_id = ? AND question_id = ? LIMIT 1`,
    [attemptId, questionId]
  );
  if (existing) {
    return NextResponse.json({ error: "Soal ini sudah dijawab." }, { status: 409 });
  }

  // Ambil soal dari DB (otoritatif)
  const qRow = await get<QuestionRow>(`SELECT * FROM questions WHERE id = ?`, [questionId]);
  if (!qRow) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  const q = rowToQuestion(qRow);

  const isCorrect = selectedIndex === q.correctIndex;
  const score = calculateScore({
    isCorrect,
    responseMs,
    timeLimitSec: q.timeLimit,
    maxPoints: q.maxPoints,
  });

  await run(
    `INSERT INTO answers (attempt_id, question_id, selected_index, is_correct, response_ms, score_awarded)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [attemptId, questionId, selectedIndex, isCorrect ? 1 : 0, responseMs, score]
  );
  await run(
    `UPDATE attempts SET total_score = total_score + ?, total_correct = total_correct + ?
     WHERE id = ?`,
    [score, isCorrect ? 1 : 0, attemptId]
  );

  return NextResponse.json({
    isCorrect,
    correctIndex: q.correctIndex,
    scoreAwarded: score,
    explanation: q.explanation,
    sourceRef: q.sourceRef,
    runningTotal: attempt.total_score + score,
  });
}
