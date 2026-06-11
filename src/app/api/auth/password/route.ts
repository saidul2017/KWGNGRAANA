import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .max(100),
});

/**
 * PATCH /api/auth/password
 * Mengubah password user yang sedang login (mahasiswa atau dosen).
 * Memverifikasi password lama dulu agar aman.
 */
export async function PATCH(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  // Rate limiting: max 3 password change attempts per hour per user
  const rl = rateLimit(`password:${user.id}`, 3, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan mengubah password. Tunggu ${Math.ceil(
          rl.retryAfterMs / 1000
        )} detik sebelum mencoba lagi.`,
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Password baru harus berbeda dari password lama." },
      { status: 400 }
    );
  }

  const row = await get<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ?`,
    [user.id]
  );
  if (!row) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) return NextResponse.json({ error: "Password lama salah" }, { status: 401 });

  const hash = await bcrypt.hash(newPassword, 10);
  await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, user.id]);
  return NextResponse.json({ ok: true });
}
