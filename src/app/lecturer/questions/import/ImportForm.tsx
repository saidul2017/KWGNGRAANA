"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Result =
  | { ok: true; row: number; topic: string; text: string; action: "created" | "skipped" }
  | { ok: false; row: number; error: string };

export default function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary: { totalRows: number; created: number; skipped: number; errors: number };
    results: Result[];
  } | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/questions/import", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal mengimpor");
        return;
      }
      setReport(j);
      router.refresh();
    } catch {
      setError("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <input
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600
                   file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                   file:bg-brand-100 file:text-brand-700 file:font-medium
                   hover:file:bg-brand-200 cursor-pointer"
      />
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button type="submit" disabled={!file || loading} className="btn-primary w-full">
        {loading ? "Mengimpor..." : "Unggah & Impor"}
      </button>

      {report && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="font-semibold">Ringkasan:</div>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              <li>Total baris: <strong>{report.summary.totalRows}</strong></li>
              <li className="text-emerald-700">
                Berhasil: <strong>{report.summary.created}</strong>
              </li>
              <li className="text-amber-700">
                Dilewati (sudah ada): <strong>{report.summary.skipped}</strong>
              </li>
              <li className="text-rose-700">
                Error: <strong>{report.summary.errors}</strong>
              </li>
            </ul>
          </div>
          {report.summary.errors > 0 && (
            <details className="card text-sm">
              <summary className="cursor-pointer font-semibold">
                ⚠️ Lihat detail kesalahan
              </summary>
              <ul className="mt-2 space-y-1">
                {report.results
                  .filter((r): r is Extract<Result, { ok: false }> => !r.ok)
                  .map((r, i) => (
                    <li key={i} className="text-rose-700">
                      <strong>Baris {r.row}:</strong> {r.error}
                    </li>
                  ))}
              </ul>
            </details>
          )}
          <a href="/lecturer/questions" className="btn-ghost block text-center">
            → Lihat Bank Soal
          </a>
        </div>
      )}
    </form>
  );
}
