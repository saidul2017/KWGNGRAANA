import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { calculateScore } from "@/lib/scoring";
import { gradeEssay } from "@/lib/essay-grading";
import { rowToQuestion, type QuestionRow } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z.number().int().min(-1).optional(),
  essayText: z.string().max(5000).optional(),
  responseMs: z.number().int().min(0),
});

/**
 * POST /api/attempts/[id]/answer
 * Mendukung MCQ (selectedIndex) dan Essay (essayText, dinilai Gemini).
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
  const { questionId, selectedIndex, essayText, responseMs } = parsed.data;

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

  const existing = await get<{ id: number }>(
    `SELECT id FROM answers WHERE attempt_id = ? AND question_id = ? LIMIT 1`,
    [attemptId, questionId]
  );
  if (existing) {
    return NextResponse.json({ error: "Soal ini sudah dijawab." }, { status: 409 });
  }

  const qRow = await get<QuestionRow>(`SELECT * FROM questions WHERE id = ?`, [questionId]);
  if (!qRow) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  const q = rowToQuestion(qRow);

  // ===== ESSAY =====
  if (q.type === "essay") {
    // Rate limit: max 10 esai per 5 menit per user (tiap esai = 1 panggilan Gemini berbayar).
    const rl = rateLimit(`essay:user:${user.id}`, 10, 5 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `Penilaian esai sementara dibatasi. Tunggu ${Math.ceil(
            rl.retryAfterMs / 1000
          )} detik.`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }
    const text = (essayText ?? "").trim();
    const grading = await gradeEssay({
      questionText: q.text,
      questionTopic: q.topic,
      sourceRef: q.sourceRef,
      keyPoints: q.essayKeyPoints ?? [],
      studentAnswer: text,
      maxPoints: q.maxPoints,
    });

    const isCorrect = grading.scorePct >= 70 ? 1 : 0;
    await run(
      `INSERT INTO answers
        (attempt_id, question_id, selected_index, essay_text, ai_feedback, is_correct, response_ms, score_awarded)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        questionId,
        text,
        JSON.stringify({
          feedback: grading.feedback,
          matchedPoints: grading.matchedPoints,
          missingPoints: grading.missingPoints,
          scorePct: grading.scorePct,
          needsReview: grading.needsReview,
        }),
        isCorrect,
        responseMs,
        grading.scoreAwarded,
      ]
    );
    await run(
      `UPDATE attempts SET total_score = total_score + ?, total_correct = total_correct + ?
       WHERE id = ?`,
      [grading.scoreAwarded, isCorrect, attemptId]
    );
    return NextResponse.json({
      isCorrect: !!isCorrect,
      scoreAwarded: grading.scoreAwarded,
      scorePct: grading.scorePct,
      feedback: grading.feedback,
      matchedPoints: grading.matchedPoints,
      missingPoints: grading.missingPoints,
      explanation: q.explanation,
      sourceRef: q.sourceRef,
      runningTotal: attempt.total_score + grading.scoreAwarded,
    });
  }

  // ===== MCQ =====
  if (selectedIndex === undefined) {
    return NextResponse.json({ error: "selectedIndex wajib untuk MCQ" }, { status: 400 });
  }
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
