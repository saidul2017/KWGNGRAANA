import { NextResponse } from "next/server";
import { z } from "zod";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

const Body = z.object({
  groupId: z.number().int().positive().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const studentId = Number(params.id);
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "ID mahasiswa tidak valid" }, { status: 400 });
  }

  // Validasi: kalau groupId di-set, pastikan ada — supaya client dapat 400 ramah
  // alih-alih 500 dari SQLite FOREIGN KEY constraint (yang mengembalikan stack trace).
  if (parsed.data.groupId !== null) {
    const g = await get<{ id: number }>(`SELECT id FROM groups WHERE id = ?`, [
      parsed.data.groupId,
    ]);
    if (!g) {
      return NextResponse.json({ error: "Kelompok tidak ditemukan" }, { status: 400 });
    }
  }

  // Validasi mahasiswa juga ada (memastikan rowsAffected akurat untuk feedback UI)
  const stu = await get<{ id: number }>(
    `SELECT id FROM users WHERE id = ? AND role='student'`,
    [studentId]
  );
  if (!stu) {
    return NextResponse.json({ error: "Mahasiswa tidak ditemukan" }, { status: 404 });
  }

  await run(`UPDATE users SET group_id = ? WHERE id = ? AND role='student'`, [
    parsed.data.groupId,
    studentId,
  ]);
  return NextResponse.json({ ok: true });
}
