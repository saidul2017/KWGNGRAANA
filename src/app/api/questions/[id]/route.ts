import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuestion, type QuestionRow } from "@/lib/types";

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

async function guard() {
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
  await guard();
  const id = Number(params.id);
  const row = await get<QuestionRow>(`SELECT * FROM questions WHERE id = ?`, [id]);
  if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ question: rowToQuestion(row) });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await guard();
  const id = Number(params.id);
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
  await run(
    `UPDATE questions SET topic=?, text=?, options_json=?, correct_index=?, explanation=?, source_ref=?, difficulty=?, time_limit=?, max_points=?
     WHERE id=?`,
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
      id,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await guard();
  const id = Number(params.id);
  await run(`DELETE FROM questions WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
