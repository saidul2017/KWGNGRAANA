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

const DEV_FALLBACK = "ganti_dengan_minimal_32_karakter_random_yang_aman_xx";

/** Validasi runtime — dipanggil saat request menyentuh session. */
function getSessionPassword(): string {
  const password = process.env.SESSION_PASSWORD || DEV_FALLBACK;
  if (process.env.NODE_ENV === "production") {
    if (!process.env.SESSION_PASSWORD || password === DEV_FALLBACK) {
      throw new Error(
        "[session] FATAL: SESSION_PASSWORD wajib diisi di production (minimal 32 karakter random). " +
          "Generate dengan: `openssl rand -base64 48` lalu set di environment server."
      );
    }
    if (password.length < 32) {
      throw new Error(
        "[session] FATAL: SESSION_PASSWORD minimal 32 karakter. Saat ini: " + password.length
      );
    }
  } else if (password.length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[session] SESSION_PASSWORD terlalu pendek (<32 char). Set di .env sebelum produksi."
    );
  }
  return password;
}

function buildSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: "kwgn_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 jam
    },
  };
}

export async function getSession() {
  return getIronSession<AppSession>(cookies(), buildSessionOptions());
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
