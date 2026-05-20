import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser("student");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const attemptId = Number(params.id);
  const attempt = await get<{
    id: number;
    user_id: number;
    quiz_id: number;
    total_score: number;
    total_correct: number;
    total_questions: number;
    status: string;
  }>(`SELECT * FROM attempts WHERE id = ? LIMIT 1`, [attemptId]);
  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Attempt tidak ditemukan" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({
      ok: true,
      attempt: {
        id: attempt.id,
        totalScore: attempt.total_score,
        totalCorrect: attempt.total_correct,
        totalQuestions: attempt.total_questions,
      },
    });
  }
  await run(
    `UPDATE attempts SET status = 'completed', finished_at = datetime('now') WHERE id = ?`,
    [attemptId]
  );
  return NextResponse.json({
    ok: true,
    attempt: {
      id: attempt.id,
      quizId: attempt.quiz_id,
      totalScore: attempt.total_score,
      totalCorrect: attempt.total_correct,
      totalQuestions: attempt.total_questions,
    },
  });
}
