import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/session";
import { hostAdvance } from "@/lib/live-store";

/** POST /api/live/[pin]/next — host majukan state machine. */
export async function POST(_: Request, { params }: { params: { pin: string } }) {
  let user;
  try {
    user = await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const s = hostAdvance(params.pin, user.id);
  if (!s) {
    return NextResponse.json({ error: "Sesi tidak ditemukan / bukan host" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, status: s.status, currentIndex: s.currentIndex });
}
