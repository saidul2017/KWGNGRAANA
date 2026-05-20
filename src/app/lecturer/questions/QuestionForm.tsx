"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOPICS } from "@/lib/types";

type Initial = {
  id?: number;
  topic: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRef: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  maxPoints: number;
};

const EMPTY: Initial = {
  topic: "Pancasila",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  sourceRef: "",
  difficulty: "medium",
  timeLimit: 20,
  maxPoints: 1000,
};

export default function QuestionForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setOption(i: number, value: string) {
    const opts = [...data.options];
    opts[i] = value;
    setData({ ...data, options: opts });
  }
  function addOption() {
    if (data.options.length >= 6) return;
    setData({ ...data, options: [...data.options, ""] });
  }
  function removeOption(i: number) {
    if (data.options.length <= 2) return;
    const opts = data.options.filter((_, idx) => idx !== i);
    let correct = data.correctIndex;
    if (correct === i) correct = 0;
    else if (correct > i) correct--;
    setData({ ...data, options: opts, correctIndex: correct });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = data.id ? `/api/questions/${data.id}` : `/api/questions`;
      const method = data.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal menyimpan");
        setLoading(false);
        return;
      }
      router.push("/lecturer/questions");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 card">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Topik</label>
          <select
            className="input"
            value={data.topic}
            onChange={(e) => setData({ ...data, topic: e.target.value })}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tingkat Kesulitan</label>
          <select
            className="input"
            value={data.difficulty}
            onChange={(e) =>
              setData({ ...data, difficulty: e.target.value as Initial["difficulty"] })
            }
          >
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Pertanyaan</label>
        <textarea
          className="input min-h-[80px]"
          required
          minLength={5}
          value={data.text}
          onChange={(e) => setData({ ...data, text: e.target.value })}
          placeholder="Contoh: Pasal 27 ayat (1) UUD 1945 menegaskan bahwa..."
        />
      </div>

      <div>
        <label className="label">Opsi Jawaban (klik radio untuk menandai jawaban benar)</label>
        <div className="space-y-2">
          {data.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={data.correctIndex === i}
                onChange={() => setData({ ...data, correctIndex: i })}
                className="h-4 w-4 text-brand-600"
              />
              <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}.</span>
              <input
                type="text"
                className="input flex-1"
                required
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
              />
              {data.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-rose-600 text-sm hover:underline"
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
          {data.options.length < 6 && (
            <button type="button" onClick={addOption} className="btn-ghost text-sm">
              + Tambah Opsi
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="label">Penjelasan Jawaban</label>
        <textarea
          className="input min-h-[60px]"
          value={data.explanation}
          onChange={(e) => setData({ ...data, explanation: e.target.value })}
          placeholder="Penjelasan akan ditampilkan ke mahasiswa setelah menjawab."
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Rujukan Sumber</label>
          <input
            className="input"
            value={data.sourceRef}
            onChange={(e) => setData({ ...data, sourceRef: e.target.value })}
            placeholder="Mis. UUD 1945 Pasal 27"
          />
        </div>
        <div>
          <label className="label">Batas Waktu (detik)</label>
          <input
            type="number"
            min={5}
            max={180}
            className="input"
            value={data.timeLimit}
            onChange={(e) => setData({ ...data, timeLimit: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Skor Maksimum</label>
          <input
            type="number"
            min={100}
            max={2000}
            step={100}
            className="input"
            value={data.maxPoints}
            onChange={(e) => setData({ ...data, maxPoints: Number(e.target.value) })}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : data.id ? "Simpan Perubahan" : "Simpan Soal"}
        </button>
      </div>
    </form>
  );
}
