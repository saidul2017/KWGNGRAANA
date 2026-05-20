"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "student" | "lecturer";

export default function LoginForm({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        return;
      }
      router.push(data.redirect || "/");
      router.refresh();
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Saya masuk sebagai</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`btn ${role === "student" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            🎓 Mahasiswa
          </button>
          <button
            type="button"
            onClick={() => setRole("lecturer")}
            className={`btn ${role === "lecturer" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            👨‍🏫 Dosen
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="identifier">
          {role === "student" ? "NIM" : "Email"}
        </label>
        <input
          id="identifier"
          type={role === "student" ? "text" : "email"}
          inputMode={role === "student" ? "numeric" : "email"}
          autoComplete="username"
          className="input"
          placeholder={role === "student" ? "25104080001" : "dosen@kwgn.id"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
