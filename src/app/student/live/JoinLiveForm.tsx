"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinLiveForm({
  initialPin,
  initialError,
}: {
  initialPin: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN harus 6 digit angka.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/live/${pin}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal bergabung.");
        setLoading(false);
        return;
      }
      router.push(`/student/live/${pin}`);
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="pin">PIN Sesi</label>
        <input
          id="pin"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          required
          className="input text-center text-3xl tracking-widest font-mono py-4"
          placeholder="123456"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading || pin.length !== 6} className="btn-primary w-full">
        {loading ? "Bergabung..." : "Gabung Sesi →"}
      </button>
    </form>
  );
}
