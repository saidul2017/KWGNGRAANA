import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { getSession, sessions } from "@/lib/live-store";

/**
 * POST /api/live/[pin]/finish — host menyimpan hasil sesi ke tabel attempts.
 *
 * Hanya boleh jika status 'final'. Idempoten via dua lapis:
 *   1. Flag in-memory `s.saved` mencegah double-save dalam memori.
 *   2. Seluruh INSERT (attempts + answers untuk semua pemain) dibungkus dalam
 *      satu transaksi SQLite. Kalau gagal di tengah, rollback total — tidak
 *      menyisakan setengah data. Saat host retry, tidak akan ada duplikasi.
 */
export async function POST(_: Request, { params }: { params: { pin: string } }) {
  let user;
  try {
    user = await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const s = getSession(params.pin);
  if (!s || s.hostId !== user.id) {
    return NextResponse.json({ error: "Sesi tidak ditemukan / bukan host" }, { status: 404 });
  }
  if (s.status !== "final") {
    return NextResponse.json({ error: "Sesi belum selesai" }, { status: 400 });
  }
  if (s.saved) {
    return NextResponse.json({ ok: true, alreadySaved: true });
  }

  // Atomic save: kalau ada error di tengah loop, rollback semuanya.
  const tx = await db().transaction("write");
  try {
    let savedCount = 0;
    for (const p of Object.values(s.players)) {
      const totalCorrect = Object.values(p.answers).filter((a) => a.isCorrect).length;
      const r = await tx.execute({
        sql: `INSERT INTO attempts
                (quiz_id, user_id, group_id, total_score, total_correct, total_questions,
                 status, started_at, finished_at)
              VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))`,
        args: [
          s.quizId,
          p.userId,
          p.groupId ?? null,
          p.score,
          totalCorrect,
          s.questions.length,
        ],
      });
      const attemptId = Number(r.lastInsertRowid ?? 0);
      for (const q of s.questions) {
        const a = p.answers[q.id];
        if (!a) continue;
        await tx.execute({
          sql: `INSERT INTO answers
                  (attempt_id, question_id, selected_index, is_correct, response_ms, score_awarded)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            attemptId,
            q.id,
            a.selectedIndex,
            a.isCorrect ? 1 : 0,
            a.responseMs,
            a.points,
          ],
        });
      }
      savedCount++;
    }
    await tx.commit();
    s.saved = true;
    sessions.delete(params.pin);
    return NextResponse.json({ ok: true, saved: true, players: savedCount });
  } catch (e) {
    await tx.rollback().catch(() => null);
    // eslint-disable-next-line no-console
    console.error("[live/finish] gagal menyimpan, transaksi di-rollback:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan hasil. Coba lagi atau hubungi admin.", detail: String(e) },
      { status: 500 }
    );
  }
}
