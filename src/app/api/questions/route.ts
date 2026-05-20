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

const Body = z
  .object({
    topic: z.string().min(1),
    text: z.string().min(5),
    type: z.enum(["mcq", "essay"]).default("mcq"),
    // MCQ fields
    options: z.array(z.string()).default([]),
    correctIndex: z.number().int().min(0).default(0),
    // Common
    explanation: z.string().optional().default(""),
    sourceRef: z.string().optional().default(""),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    timeLimit: z.number().int().min(5).max(600).default(20),
    maxPoints: z.number().int().min(100).max(2000).default(1000),
    // Essay fields
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
  const isEssay = q.type === "essay";
  const optionsJson = isEssay ? "[]" : JSON.stringify(q.options);
  const correctIndex = isEssay ? 0 : q.correctIndex;
  const essayKp = isEssay ? JSON.stringify(q.essayKeyPoints) : null;
  const essayMin = isEssay ? q.essayMinWords : null;
  // Esai default time limit lebih panjang
  const timeLimit = isEssay && q.timeLimit < 60 ? 180 : q.timeLimit;

  const r = await run(
    `INSERT INTO questions
       (topic, text, type, options_json, correct_index, explanation, source_ref, difficulty, time_limit, max_points, essay_key_points, essay_min_words, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      user.id,
    ]
  );
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
