import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";
import { submitAnswer } from "@/lib/live-store";

const Body = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z.number().int().min(-1),
  responseMs: z.number().int().min(0),
});

/** POST /api/live/[pin]/answer — peserta kirim jawaban. */
export async function POST(req: Request, { params }: { params: { pin: string } }) {
  let user;
  try {
    user = await requireUser("student");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });

  const result = submitAnswer({
    pin: params.pin,
    userId: user.id,
    questionId: parsed.data.questionId,
    selectedIndex: parsed.data.selectedIndex,
    responseMs: parsed.data.responseMs,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    isCorrect: result.isCorrect,
    points: result.points,
    runningScore: result.runningScore,
  });
}
