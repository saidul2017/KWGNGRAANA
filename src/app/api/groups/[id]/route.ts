import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const id = Number(params.id);
  // Karena ON DELETE SET NULL pada users.group_id, anggota akan otomatis kehilangan kelompok.
  await run(`DELETE FROM groups WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
