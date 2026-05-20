import { NextResponse } from "next/server";
import { z } from "zod";
import { all, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

async function guard() {
  try {
    return await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) throw NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function GET() {
  await guard();
  const rows = await all(
    `SELECT g.id, g.name,
            (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id) AS member_count
     FROM groups g ORDER BY g.name ASC`
  );
  return NextResponse.json({ groups: rows });
}

const Body = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: Request) {
  await guard();
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nama tidak valid" }, { status: 400 });
  }
  try {
    const r = await run(`INSERT INTO groups (name) VALUES (?)`, [parsed.data.name]);
    return NextResponse.json({ ok: true, id: r.lastInsertRowid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Nama kelompok sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
