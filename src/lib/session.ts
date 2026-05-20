import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  role: "student" | "lecturer";
  name: string;
  nim?: string;
  email?: string;
  groupId?: number | null;
};

export type AppSession = {
  user?: SessionUser;
};

const password =
  process.env.SESSION_PASSWORD ||
  "ganti_dengan_minimal_32_karakter_random_yang_aman_xx";

if (password.length < 32) {
  // Aman: tetap berjalan dev, tapi log peringatan
  // eslint-disable-next-line no-console
  console.warn(
    "[session] SESSION_PASSWORD terlalu pendek (<32 char). Set di .env.local sebelum produksi."
  );
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "kwgn_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 jam
  },
};

export async function getSession() {
  return getIronSession<AppSession>(cookies(), sessionOptions);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

export async function requireUser(role?: "student" | "lecturer"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (role && user.role !== role) throw new AuthError("FORBIDDEN");
  return user;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}
