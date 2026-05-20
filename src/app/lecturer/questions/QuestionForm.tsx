"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TOPICS } from "@/lib/types";

type Initial = {
  id?: number;
  topic: string;
  text: string;
  type: "mcq" | "essay";
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRef: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  maxPoints: number;
  essayKeyPoints: string[];
  essayMinWords: number;
};

const EMPTY: Initial = {
  topic: "Pancasila",
  text: "",
  type: "mcq",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  sourceRef: "",
  difficulty: "medium",
  timeLimit: 20,
  maxPoints: 1000,
  essayKeyPoints: [""],
  essayMinWords: 30,
};

export default function QuestionForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setOpt(i: number, v: string) {
    const opts = [...data.options];
    opts[i] = v;
    setData({ ...data, options: opts });
  }
  function setKp(i: number, v: string) {
    const kp = [...data.essayKeyPoints];
    kp[i] = v;
    setData({ ...data, essayKeyPoints: kp });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = data.id ? `/api/questions/${data.id}` : `/api/questions`;
      const method = data.id ? "PUT" : "POST";
      const payload =
        data.type === "mcq"
          ? {
              topic: data.topic,
              text: data.text,
              type: "mcq",
              options: data.options.filter((o) => o.trim()),
              correctIndex: data.correctIndex,
              explanation: data.explanation,
              sourceRef: data.sourceRef,
              difficulty: data.difficulty,
              timeLimit: data.timeLimit,
              maxPoints: data.maxPoints,
            }
          : {
              topic: data.topic,
              text: data.text,
              type: "essay",
              explanation: data.explanation,
              sourceRef: data.sourceRef,
              difficulty: data.difficulty,
              timeLimit: data.timeLimit,
              maxPoints: data.maxPoints,
              essayKeyPoints: data.essayKeyPoints.filter((k) => k.trim()),
              essayMinWords: data.essayMinWords,
            };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Tipe Soal</label>
          <select
            className="input"
            value={data.type}
            onChange={(e) => {
              const t = e.target.value as "mcq" | "essay";
              setData({
                ...data,
                type: t,
                timeLimit: t === "essay" && data.timeLimit < 60 ? 180 : data.timeLimit,
              });
            }}
          >
            <option value="mcq">📝 Pilihan Ganda</option>
            <option value="essay">✍️ Esai (auto-grading AI)</option>
          </select>
        </div>
        <div>
          <label className="label">Topik</label>
          <select
            className="input"
            value={data.topic}
            onChange={(e) => setData({ ...data, topic: e.target.value })}
          >
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tingkat Kesulitan</label>
          <select
            className="input"
            value={data.difficulty}
            onChange={(e) => setData({ ...data, difficulty: e.target.value as Initial["difficulty"] })}
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
          placeholder={
            data.type === "essay"
              ? "Contoh: Jelaskan makna Pasal 27 UUD 1945 ayat (1) bagi calon guru MI."
              : "Contoh: Pasal 27 ayat (1) UUD 1945 menegaskan bahwa..."
          }
        />
      </div>

      {data.type === "mcq" ? (
        <div>
          <label className="label">
            Opsi Jawaban (klik radio untuk menandai jawaban benar)
          </label>
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
                  onChange={(e) => setOpt(i, e.target.value)}
                  placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                />
                {data.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const opts = data.options.filter((_, idx) => idx !== i);
                      let c = data.correctIndex;
                      if (c === i) c = 0;
                      else if (c > i) c--;
                      setData({ ...data, options: opts, correctIndex: c });
                    }}
                    className="text-rose-600 text-sm hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
            {data.options.length < 6 && (
              <button
                type="button"
                onClick={() => setData({ ...data, options: [...data.options, ""] })}
                className="btn-ghost text-sm"
              >
                + Tambah Opsi
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800">
            🤖 <strong>Auto-grading AI</strong> — saat mahasiswa menjawab, jawaban
            akan dinilai otomatis oleh Gemini berdasarkan poin kunci di bawah.
            Skor 0–100% dari max poin, plus feedback konstruktif.
          </div>
          <div>
            <label className="label">Poin Kunci Rubrik (yang harus muncul dalam jawaban)</label>
            <div className="space-y-2">
              {data.essayKeyPoints.map((kp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-6">{i + 1}.</span>
                  <input
                    type="text"
                    className="input flex-1"
                    value={kp}
                    onChange={(e) => setKp(i, e.target.value)}
                    placeholder={`Mis. "Mengaitkan Pasal 27 dengan praktik HAM dalam pembelajaran"`}
                  />
                  {data.essayKeyPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setData({ ...data, essayKeyPoints: data.essayKeyPoints.filter((_, idx) => idx !== i) })}
                      className="text-rose-600 text-sm hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
              {data.essayKeyPoints.length < 8 && (
                <button
                  type="button"
                  onClick={() => setData({ ...data, essayKeyPoints: [...data.essayKeyPoints, ""] })}
                  className="btn-ghost text-sm"
                >
                  + Tambah Poin
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Minimal Kata Jawaban (0 = bebas)</label>
            <input
              type="number"
              min={0}
              max={2000}
              className="input max-w-[160px]"
              value={data.essayMinWords}
              onChange={(e) => setData({ ...data, essayMinWords: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div>
        <label className="label">Penjelasan / Kunci Jawaban Ringkas</label>
        <textarea
          className="input min-h-[60px]"
          value={data.explanation}
          onChange={(e) => setData({ ...data, explanation: e.target.value })}
          placeholder="Akan ditampilkan ke mahasiswa setelah menjawab."
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
          <label className="label">
            Batas Waktu (detik) {data.type === "essay" && "— direkomendasikan ≥120"}
          </label>
          <input
            type="number"
            min={5}
            max={600}
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
