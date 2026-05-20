import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { joinSession } from "@/lib/live-store";

/** POST /api/live/[pin]/join — mahasiswa join sesi via PIN. */
export async function POST(_: Request, { params }: { params: { pin: string } }) {
  let user;
  try {
    user = await requireUser("student");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const groupRow = user.groupId
    ? await get<{ name: string }>(`SELECT name FROM groups WHERE id = ?`, [user.groupId])
    : null;
  const session = joinSession(params.pin, {
    id: user.id,
    name: user.name,
    nim: user.nim,
    groupId: user.groupId,
    groupName: groupRow?.name ?? null,
  });
  if (!session) {
    return NextResponse.json(
      { error: "PIN tidak valid atau sesi sudah berakhir." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
