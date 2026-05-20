import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

const Body = z.object({
  score: z.number().int().min(0).max(2000),
  note: z.string().max(2000).optional().default(""),
});

/**
 * PATCH /api/answers/[id]/override
 *
 * Dosen override skor jawaban (terutama esai). Operasi:
 *   1. Backup score_awarded ke original_score (sekali saja).
 *   2. Update score_awarded ke nilai baru.
 *   3. is_correct = (score_awarded / max_points >= 0.7) ? 1 : 0.
 *   4. Catat lecturer_note + reviewed_at.
 *   5. Recompute attempts.total_score & total_correct.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const id = Number(params.id);
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { score, note } = parsed.data;

  const ans = await get<{
    id: number;
    attempt_id: number;
    question_id: number;
    score_awarded: number;
    original_score: number | null;
  }>(
    `SELECT id, attempt_id, question_id, score_awarded, original_score
     FROM answers WHERE id = ?`,
    [id]
  );
  if (!ans) return NextResponse.json({ error: "Jawaban tidak ditemukan" }, { status: 404 });

  const q = await get<{ max_points: number }>(
    `SELECT max_points FROM questions WHERE id = ?`,
    [ans.question_id]
  );
  if (!q) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  if (score > q.max_points) {
    return NextResponse.json(
      { error: `Skor melebihi maksimum soal (${q.max_points})` },
      { status: 400 }
    );
  }

  const isCorrect = score / q.max_points >= 0.7 ? 1 : 0;
  const newOriginal = ans.original_score ?? ans.score_awarded;

  await run(
    `UPDATE answers
       SET score_awarded = ?, is_correct = ?, original_score = ?, lecturer_note = ?, reviewed_at = datetime('now')
     WHERE id = ?`,
    [score, isCorrect, newOriginal, note, id]
  );

  // Recompute attempt totals
  await run(
    `UPDATE attempts
       SET total_score = (SELECT COALESCE(SUM(score_awarded),0) FROM answers WHERE attempt_id = attempts.id),
           total_correct = (SELECT COUNT(*) FROM answers WHERE attempt_id = attempts.id AND is_correct = 1)
     WHERE id = ?`,
    [ans.attempt_id]
  );

  return NextResponse.json({ ok: true, score, isCorrect: !!isCorrect, originalScore: newOriginal });
}
