import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { getSession, sessions } from "@/lib/live-store";

/**
 * POST /api/live/[pin]/finish — host menyimpan hasil sesi ke tabel attempts.
 *
 * Hanya boleh jika status 'final'. Idempoten: kalau sudah saved, tidak duplikat.
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

  // Simpan attempt + answers untuk setiap pemain
  for (const p of Object.values(s.players)) {
    const totalCorrect = Object.values(p.answers).filter((a) => a.isCorrect).length;
    const r = await run(
      `INSERT INTO attempts (quiz_id, user_id, group_id, total_score, total_correct, total_questions, status, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))`,
      [s.quizId, p.userId, p.groupId ?? null, p.score, totalCorrect, s.questions.length]
    );
    const attemptId = r.lastInsertRowid;
    for (const q of s.questions) {
      const a = p.answers[q.id];
      if (!a) continue;
      await run(
        `INSERT INTO answers (attempt_id, question_id, selected_index, is_correct, response_ms, score_awarded)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [attemptId, q.id, a.selectedIndex, a.isCorrect ? 1 : 0, a.responseMs, a.points]
      );
    }
  }
  s.saved = true;
  // Sesi bisa dibersihkan
  sessions.delete(params.pin);

  return NextResponse.json({ ok: true, saved: true });
}
