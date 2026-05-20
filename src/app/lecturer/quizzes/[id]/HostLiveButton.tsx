"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HostLiveButton({
  quizId,
  disabled,
}: {
  quizId: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal memulai sesi live");
        setBusy(false);
        return;
      }
      router.push(`/lecturer/live/${j.pin}`);
    } catch {
      setError("Kesalahan jaringan");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={start}
        disabled={busy || disabled}
        className="btn-primary bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
        title={disabled ? "Tambahkan minimal 1 soal terlebih dahulu" : ""}
      >
        🎮 {busy ? "Memulai..." : "Mulai Live Kahoot"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
