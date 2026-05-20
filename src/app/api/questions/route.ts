import { NextResponse } from "next/server";
import { z } from "zod";
import { all, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuestion, type QuestionRow } from "@/lib/types";

export async function GET() {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const rows = await all<QuestionRow>(
    `SELECT * FROM questions ORDER BY topic ASC, id DESC`
  );
  return NextResponse.json({ questions: rows.map(rowToQuestion) });
}

const Body = z.object({
  topic: z.string().min(1),
  text: z.string().min(5),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional().default(""),
  sourceRef: z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  timeLimit: z.number().int().min(5).max(180).default(20),
  maxPoints: z.number().int().min(100).max(2000).default(1000),
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
  const q = parsed.data;
  if (q.correctIndex >= q.options.length) {
    return NextResponse.json({ error: "Indeks jawaban benar di luar jangkauan" }, { status: 400 });
  }

  const r = await run(
    `INSERT INTO questions
       (topic, text, type, options_json, correct_index, explanation, source_ref, difficulty, time_limit, max_points, created_by)
     VALUES (?, ?, 'mcq', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      q.topic,
      q.text,
      JSON.stringify(q.options),
      q.correctIndex,
      q.explanation,
      q.sourceRef,
      q.difficulty,
      q.timeLimit,
      q.maxPoints,
      user.id,
    ]
  );
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
