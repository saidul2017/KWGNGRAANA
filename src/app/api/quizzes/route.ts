import { NextResponse } from "next/server";
import { z } from "zod";
import { all, run, db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuiz, type QuizRow } from "@/lib/types";

export async function GET() {
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const rows = await all<QuizRow>(
    `SELECT q.*, (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
     FROM quizzes q
     ORDER BY q.created_at DESC`
  );
  return NextResponse.json({ quizzes: rows.map(rowToQuiz) });
}

const Body = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(""),
  kind: z.enum(["practice", "quiz", "uas"]),
  mode: z.enum(["individual", "group"]).default("individual"),
  shuffle: z.boolean().default(true),
  questionIds: z.array(z.number().int().positive()).min(1),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Buat quiz, status default 'draft'. Dosen aktifkan setelahnya.
  const r = await run(
    `INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by)
     VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
    [data.title, data.description, data.kind, data.mode, data.shuffle ? 1 : 0, user.id]
  );
  const quizId = r.lastInsertRowid;

  // Sisipkan posisi soal sesuai urutan input
  for (let i = 0; i < data.questionIds.length; i++) {
    await run(
      `INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)`,
      [quizId, data.questionIds[i], i]
    );
  }
  return NextResponse.json({ ok: true, id: quizId });
}
