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

  // Pesan generik untuk mencegah user enumeration. Selalu jalankan bcrypt.compare
  // dengan dummy hash bila user tidak ada agar timing relatif konstan.
  const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV";
  const hashToCheck = user?.password_hash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCheck);
  if (!user || !ok) {
    return NextResponse.json(
      {
        error:
          role === "student"
            ? "NIM atau password salah"
            : "Email atau password salah",
      },
      { status: 401 }
    );
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
