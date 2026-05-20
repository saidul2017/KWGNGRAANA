import { NextResponse } from "next/server";
import { z } from "zod";
import { run } from "@/lib/db";
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
  await run(`UPDATE users SET group_id = ? WHERE id = ? AND role='student'`, [
    parsed.data.groupId,
    Number(params.id),
  ]);
  return NextResponse.json({ ok: true });
}
