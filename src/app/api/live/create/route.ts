import { NextResponse } from "next/server";
import { z } from "zod";
import { all, get } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuiz, rowToQuestion, type QuizRow, type QuestionRow } from "@/lib/types";
import { createSession } from "@/lib/live-store";

const Body = z.object({
  quizId: z.number().int().positive(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const quizRow = await get<QuizRow>(`SELECT * FROM quizzes WHERE id = ?`, [parsed.data.quizId]);
  if (!quizRow) return NextResponse.json({ error: "Kuis tidak ditemukan" }, { status: 404 });
  const quiz = rowToQuiz(quizRow);

  const qRows = await all<QuestionRow & { position: number }>(
    `SELECT q.*, qq.position FROM questions q
     JOIN quiz_questions qq ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
     ORDER BY qq.position ASC`,
    [quiz.id]
  );
  if (qRows.length === 0) {
    return NextResponse.json({ error: "Kuis ini belum berisi soal." }, { status: 400 });
  }

  // Live Kahoot tidak cocok untuk soal esai (AI grading butuh waktu, blok flow).
  // Filter keluar agar live session berjalan lancar.
  const mcqRows = qRows.filter((q) => q.type !== "essay");
  if (mcqRows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Kuis ini hanya berisi soal esai. Mode Live Kahoot tidak mendukung soal esai (gunakan mode self-paced agar AI grading bisa berjalan).",
      },
      { status: 400 }
    );
  }
  const skipped = qRows.length - mcqRows.length;

  const session = createSession({
    quizId: quiz.id,
    quizTitle: quiz.title,
    quizMode: quiz.mode,
    hostId: user.id,
    hostName: user.name,
    questions: mcqRows.map(rowToQuestion),
    shuffleQuestions: quiz.shuffle,
  });

  return NextResponse.json({
    ok: true,
    pin: session.pin,
    skippedEssayCount: skipped,
  });
}
