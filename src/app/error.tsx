"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[KWGN] Uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full card text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
        <p className="text-sm text-slate-600">
          Maaf, ada gangguan yang tidak terduga. Anda bisa mencoba lagi atau kembali ke beranda.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">Kode: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="btn-primary">Coba Lagi</button>
          <Link href="/" className="btn-ghost">Beranda</Link>
        </div>
      </div>
    </div>
  );
}
