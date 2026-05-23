/**
 * Next.js instrumentation hook — dipanggil sekali saat server boot.
 * Dipakai untuk fail-fast validasi konfigurasi env wajib SEBELUM melayani request.
 *
 * Tanpa ini, validasi SESSION_PASSWORD baru jalan saat request pertama menyentuh
 * session — dosen lupa set env var → setiap GET ke '/' dst. lempar 500 dengan
 * stack trace di log dan susah didebug.
 *
 * Dengan ini, container/proses langsung gagal start dan platform (Render/Railway/
 * Docker) akan menampilkan error startup yang jelas.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Hanya validasi di runtime Node.js (bukan edge runtime).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const isProd = process.env.NODE_ENV === "production";
  const password = process.env.SESSION_PASSWORD;

  if (isProd) {
    if (!password) {
      throw new Error(
        "[startup] FATAL: SESSION_PASSWORD wajib diisi di production. " +
          "Generate dengan `openssl rand -base64 48` lalu set sebagai environment variable."
      );
    }
    if (password.length < 32) {
      throw new Error(
        `[startup] FATAL: SESSION_PASSWORD minimal 32 karakter (saat ini ${password.length}). ` +
          "Generate ulang dengan `openssl rand -base64 48`."
      );
    }
    if (!process.env.DEFAULT_LECTURER_PASSWORD) {
      // eslint-disable-next-line no-console
      console.warn(
        "[startup] PERINGATAN: DEFAULT_LECTURER_PASSWORD belum di-set. " +
          "Saat seed pertama kali, password dosen default akan jadi nilai placeholder yang tidak aman."
      );
    }
  } else if (!password || password.length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[startup] DEV: SESSION_PASSWORD tidak di-set / <32 char. OK untuk development, " +
        "WAJIB diset sebelum deploy production."
    );
  }
}
