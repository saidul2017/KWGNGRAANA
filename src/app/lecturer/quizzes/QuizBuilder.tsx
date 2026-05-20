"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/types";

type Initial = {
  id?: number;
  title: string;
  description: string;
  kind: "practice" | "quiz" | "uas";
  mode: "individual" | "group";
  shuffle: boolean;
  selectedIds: number[];
  status?: "draft" | "open" | "closed";
};

const EMPTY: Initial = {
  title: "",
  description: "",
  kind: "practice",
  mode: "individual",
  shuffle: true,
  selectedIds: [],
};

export default function QuizBuilder({
  questions,
  initial,
}: {
  questions: Question[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial ?? EMPTY);
  const [filter, setFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const topics = useMemo(
    () => Array.from(new Set(questions.map((q) => q.topic))).sort(),
    [questions]
  );

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (topicFilter && q.topic !== topicFilter) return false;
      if (filter) {
        const t = filter.toLowerCase();
        return q.text.toLowerCase().includes(t) || q.topic.toLowerCase().includes(t);
      }
      return true;
    });
  }, [questions, filter, topicFilter]);

  function toggleSelect(id: number) {
    setData((d) =>
      d.selectedIds.includes(id)
        ? { ...d, selectedIds: d.selectedIds.filter((x) => x !== id) }
        : { ...d, selectedIds: [...d.selectedIds, id] }
    );
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const arr = [...data.selectedIds];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setData({ ...data, selectedIds: arr });
  }
  function moveDown(idx: number) {
    if (idx >= data.selectedIds.length - 1) return;
    const arr = [...data.selectedIds];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setData({ ...data, selectedIds: arr });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (data.selectedIds.length === 0) {
      setError("Pilih minimal 1 soal.");
      return;
    }
    setLoading(true);
    try {
      const url = data.id ? `/api/quizzes/${data.id}` : `/api/quizzes`;
      const method = data.id ? "PATCH" : "POST";
      const body = data.id
        ? {
            title: data.title,
            description: data.description,
            kind: data.kind,
            mode: data.mode,
            shuffle: data.shuffle,
            status: data.status,
            questionIds: data.selectedIds,
          }
        : {
            title: data.title,
            description: data.description,
            kind: data.kind,
            mode: data.mode,
            shuffle: data.shuffle,
            questionIds: data.selectedIds,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal menyimpan");
        setLoading(false);
        return;
      }
      router.push(`/lecturer/quizzes/${data.id ?? j.id}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-4">
      <div className="card space-y-4">
        <h2 className="font-semibold">1. Informasi Dasar</h2>
        <div>
          <label className="label">Judul</label>
          <input
            className="input"
            required
            minLength={3}
            placeholder="Mis. Kuis Pancasila & UUD 1945 - Pertemuan 3"
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Deskripsi (opsional)</label>
          <textarea
            className="input min-h-[60px]"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Catatan singkat untuk mahasiswa, capaian pembelajaran, dsb."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jenis</label>
            <select
              className="input"
              value={data.kind}
              onChange={(e) => setData({ ...data, kind: e.target.value as Initial["kind"] })}
            >
              <option value="practice">🎯 Latihan Mandiri</option>
              <option value="quiz">🏆 Kuis (dinilai)</option>
              <option value="uas">🎓 UAS</option>
            </select>
          </div>
          <div>
            <label className="label">Mode</label>
            <select
              className="input"
              value={data.mode}
              onChange={(e) => setData({ ...data, mode: e.target.value as Initial["mode"] })}
            >
              <option value="individual">🧑 Individu</option>
              <option value="group">👥 Kelompok</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="shuffle"
            type="checkbox"
            checked={data.shuffle}
            onChange={(e) => setData({ ...data, shuffle: e.target.checked })}
          />
          <label htmlFor="shuffle" className="text-sm text-slate-700">
            Acak urutan soal &amp; opsi (anti-curang)
          </label>
        </div>

        {data.id && (
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={data.status}
              onChange={(e) =>
                setData({ ...data, status: e.target.value as Initial["status"] })
              }
            >
              <option value="draft">Draft</option>
              <option value="open">Aktif (mahasiswa bisa kerjakan)</option>
              <option value="closed">Ditutup</option>
            </select>
          </div>
        )}

        <h2 className="font-semibold pt-2 border-t">
          2. Soal Terpilih ({data.selectedIds.length})
        </h2>
        {data.selectedIds.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada soal terpilih.</p>
        ) : (
          <ol className="space-y-1 list-decimal list-inside text-sm">
            {data.selectedIds.map((id, idx) => {
              const q = questions.find((x) => x.id === id);
              if (!q) return null;
              return (
                <li key={id} className="flex items-start gap-2 py-1 border-b border-slate-100 last:border-0">
                  <span className="flex-1">
                    <span className="text-slate-500 mr-1">{q.topic} —</span>
                    {q.text.slice(0, 80)}{q.text.length > 80 ? "..." : ""}
                  </span>
                  <button type="button" onClick={() => moveUp(idx)} className="text-xs text-slate-500 hover:text-slate-800">↑</button>
                  <button type="button" onClick={() => moveDown(idx)} className="text-xs text-slate-500 hover:text-slate-800">↓</button>
                  <button type="button" onClick={() => toggleSelect(id)} className="text-xs text-rose-600 hover:underline">×</button>
                </li>
              );
            })}
          </ol>
        )}

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Menyimpan..." : data.id ? "Simpan Perubahan" : "Simpan & Lihat"}
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">3. Pilih Soal dari Bank</h2>
        <div className="flex gap-2">
          <input
            type="search"
            className="input"
            placeholder="Cari soal..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="input max-w-[180px]"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            <option value="">Semua Topik</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-500">{filtered.length} soal ditampilkan</p>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 -mx-2">
          {filtered.map((q) => {
            const checked = data.selectedIds.includes(q.id);
            return (
              <label
                key={q.id}
                className={`flex gap-2 p-2 cursor-pointer hover:bg-slate-50 ${checked ? "bg-brand-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelect(q.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">{q.topic} · {q.difficulty}</div>
                  <div className="text-sm">{q.text}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </form>
  );
}
