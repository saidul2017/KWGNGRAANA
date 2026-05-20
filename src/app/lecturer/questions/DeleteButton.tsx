"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("Hapus soal ini secara permanen?")) return;
    setLoading(true);
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Gagal menghapus soal.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={handle} disabled={loading} className="text-xs text-rose-600 hover:underline disabled:opacity-50">
      {loading ? "..." : "Hapus"}
    </button>
  );
}
