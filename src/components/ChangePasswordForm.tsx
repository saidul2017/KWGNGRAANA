"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (next.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal mengubah password");
        return;
      }
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div>
        <label className="label">Password Saat Ini</label>
        <input
          type="password"
          className="input"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Mahasiswa: NIM Anda jika belum pernah diubah"
        />
      </div>
      <div>
        <label className="label">Password Baru (minimal 8 karakter)</label>
        <input
          type="password"
          className="input"
          required
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Konfirmasi Password Baru</label>
        <input
          type="password"
          className="input"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          ✅ Password berhasil diubah. Gunakan password baru pada login berikutnya.
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Menyimpan..." : "Ubah Password"}
      </button>
    </form>
  );
}
