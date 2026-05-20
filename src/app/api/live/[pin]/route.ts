import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/session";
import { publicView, getSession } from "@/lib/live-store";

/** GET /api/live/[pin] — kembalikan state publik untuk peran user saat ini. */
export async function GET(_: Request, { params }: { params: { pin: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const s = getSession(params.pin);
  if (!s) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });

  const role: "host" | "player" =
    user.role === "lecturer" && user.id === s.hostId ? "host" : "player";
  const view = publicView(params.pin, { role, userId: user.id });
  return NextResponse.json({ role, view });
}
