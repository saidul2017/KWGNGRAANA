import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rowToQuestion, type QuestionRow } from "@/lib/types";

const Body = z
  .object({
    topic: z.string().min(1),
    text: z.string().min(5),
    type: z.enum(["mcq", "essay"]).default("mcq"),
    options: z.array(z.string()).default([]),
    correctIndex: z.number().int().min(0).default(0),
    explanation: z.string().optional().default(""),
    sourceRef: z.string().optional().default(""),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    timeLimit: z.number().int().min(5).max(600).default(20),
    maxPoints: z.number().int().min(100).max(2000).default(1000),
    essayKeyPoints: z.array(z.string().min(1)).optional().default([]),
    essayMinWords: z.number().int().min(0).max(2000).optional().default(0),
  })
  .superRefine((v, ctx) => {
    if (v.type === "mcq") {
      if (v.options.length < 2 || v.options.length > 6) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "MCQ butuh 2–6 opsi" });
      }
      if (v.correctIndex >= v.options.length) {
        ctx.addIssue({ code: "custom", path: ["correctIndex"], message: "correctIndex di luar jangkauan" });
      }
    } else {
      if (v.essayKeyPoints.length < 1) {
        ctx.addIssue({ code: "custom", path: ["essayKeyPoints"], message: "Esai butuh minimal 1 poin kunci rubrik" });
      }
    }
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
  const isEssay = q.type === "essay";
  const optionsJson = isEssay ? "[]" : JSON.stringify(q.options);
  const correctIndex = isEssay ? 0 : q.correctIndex;
  const essayKp = isEssay ? JSON.stringify(q.essayKeyPoints) : null;
  const essayMin = isEssay ? q.essayMinWords : null;
  const timeLimit = isEssay && q.timeLimit < 60 ? 180 : q.timeLimit;

  await run(
    `UPDATE questions SET topic=?, text=?, type=?, options_json=?, correct_index=?,
       explanation=?, source_ref=?, difficulty=?, time_limit=?, max_points=?,
       essay_key_points=?, essay_min_words=?
     WHERE id=?`,
    [
      q.topic,
      q.text,
      q.type,
      optionsJson,
      correctIndex,
      q.explanation,
      q.sourceRef,
      q.difficulty,
      timeLimit,
      q.maxPoints,
      essayKp,
      essayMin,
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
