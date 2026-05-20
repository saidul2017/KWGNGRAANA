import { NextResponse } from "next/server";
import { z } from "zod";
import { all, get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuiz, rowToQuestion, type QuizRow, type QuestionRow } from "@/lib/types";

async function guardLecturer() {
  try {
    return await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) {
      throw NextResponse.json({ error: e.code }, { status: 401 });
    }
    throw e;
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const id = Number(params.id);
  const row = await get<QuizRow>(`SELECT * FROM quizzes WHERE id = ?`, [id]);
  if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const questions = await all<QuestionRow & { position: number }>(
    `SELECT q.*, qq.position FROM questions q
     JOIN quiz_questions qq ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
     ORDER BY qq.position ASC`,
    [id]
  );
  return NextResponse.json({
    quiz: rowToQuiz(row),
    questions: questions.map(rowToQuestion),
  });
}

const PatchBody = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  kind: z.enum(["practice", "quiz", "uas"]).optional(),
  mode: z.enum(["individual", "group"]).optional(),
  status: z.enum(["draft", "open", "closed"]).optional(),
  shuffle: z.boolean().optional(),
  questionIds: z.array(z.number().int().positive()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await guardLecturer();
  const id = Number(params.id);
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const data = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.kind !== undefined) { fields.push("kind = ?"); values.push(data.kind); }
  if (data.mode !== undefined) { fields.push("mode = ?"); values.push(data.mode); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.shuffle !== undefined) { fields.push("shuffle = ?"); values.push(data.shuffle ? 1 : 0); }
  if (fields.length) {
    values.push(id);
    await run(`UPDATE quizzes SET ${fields.join(", ")} WHERE id = ?`, values);
  }
  if (data.questionIds) {
    await run(`DELETE FROM quiz_questions WHERE quiz_id = ?`, [id]);
    for (let i = 0; i < data.questionIds.length; i++) {
      await run(
        `INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)`,
        [id, data.questionIds[i], i]
      );
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await guardLecturer();
  await run(`DELETE FROM quizzes WHERE id = ?`, [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
