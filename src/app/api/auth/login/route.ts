import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { get } from "@/lib/db";

const Body = z.object({
  role: z.enum(["student", "lecturer"]),
  identifier: z.string().min(1, "NIM/email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type UserRow = {
  id: number;
  role: "student" | "lecturer";
  name: string;
  nim: string | null;
  email: string | null;
  password_hash: string;
  group_id: number | null;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }
  const { role, identifier, password } = parsed.data;

  const user =
    role === "student"
      ? await get<UserRow>(
          `SELECT id, role, name, nim, email, password_hash, group_id
           FROM users WHERE role='student' AND nim = ? LIMIT 1`,
          [identifier.trim()]
        )
      : await get<UserRow>(
          `SELECT id, role, name, nim, email, password_hash, group_id
           FROM users WHERE role='lecturer' AND email = ? LIMIT 1`,
          [identifier.trim().toLowerCase()]
        );

  if (!user) {
    return NextResponse.json(
      { error: role === "student" ? "NIM tidak terdaftar" : "Email tidak terdaftar" },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    role: user.role,
    name: user.name,
    nim: user.nim ?? undefined,
    email: user.email ?? undefined,
    groupId: user.group_id,
  };
  await session.save();

  return NextResponse.json({
    ok: true,
    redirect: user.role === "lecturer" ? "/lecturer" : "/student",
    user: session.user,
  });
}
