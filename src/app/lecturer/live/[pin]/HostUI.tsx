"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: number;
  topic: string;
  text: string;
  options: string[];
  timeLimit: number;
  maxPoints: number;
  sourceRef: string | null;
  correctIndex?: number;
  explanation?: string | null;
};

type View = {
  pin: string;
  quizTitle: string;
  status: "lobby" | "question" | "reveal" | "final";
  currentIndex: number;
  totalQuestions: number;
  playerCount: number;
  timeLeftMs: number;
  question?: Question;
  players?: { id: number; name: string; nim?: string; groupName?: string | null }[];
  answeredCount?: number;
  optionCounts?: number[];
  topPlayers?: { id: number; name: string; score: number }[];
  leaderboard?: {
    rank: number;
    id: number;
    name: string;
    nim?: string;
    groupName?: string | null;
    score: number;
    correct: number;
  }[];
};

const COLORS = [
  "bg-kahoot-red",
  "bg-kahoot-blue",
  "bg-kahoot-yellow",
  "bg-kahoot-green",
  "bg-kahoot-purple",
  "bg-pink-600",
];
const SHAPES = ["▲", "◆", "●", "■", "★", "♦"];

export default function HostUI({
  pin,
  quizTitle,
  totalQuestions,
}: {
  pin: string;
  quizTitle: string;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedFinal, setSavedFinal] = useState(false);
  const lastStatus = useRef<string | null>(null);

  // Polling state setiap 1 detik
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/live/${pin}`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) {
          setView(null);
          return;
        }
        const data = await res.json();
        setView(data.view as View);
      } catch {
        /* ignore network blip */
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pin]);

  // Auto-save saat masuk final
  useEffect(() => {
    if (view?.status === "final" && lastStatus.current !== "final" && !savedFinal) {
      saveFinal();
    }
    if (view) lastStatus.current = view.status;
  }, [view?.status]); // eslint-disable-line

  async function saveFinal() {
    if (savedFinal) return;
    setSavedFinal(true);
    await fetch(`/api/live/${pin}/finish`, { method: "POST" }).catch(() => null);
    router.refresh();
  }

  async function advance() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/live/${pin}/next`, { method: "POST" });
    setBusy(false);
  }

  if (!view) {
    return (
      <div className="card text-center py-10 text-slate-500">
        Memuat sesi... Pastikan PIN <strong className="font-mono">{pin}</strong> masih aktif.
      </div>
    );
  }

  if (view.status === "lobby") {
    return (
      <div className="space-y-6">
        <div className="card text-center bg-gradient-to-br from-brand-50 to-indigo-50">
          <p className="text-slate-600 text-sm">Bagikan PIN ini ke mahasiswa</p>
          <div className="my-3 text-7xl md:text-8xl font-extrabold tracking-widest text-brand-700 font-mono">
            {pin}
          </div>
          <p className="text-sm text-slate-600">
            Mahasiswa dapat bergabung dari menu{" "}
            <strong>Beranda → Gabung Sesi Live</strong>, lalu masukkan PIN di atas.
          </p>
          <p className="mt-2 text-xs text-slate-500">Kuis: {quizTitle}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              👥 Pemain bergabung ({view.playerCount})
            </h2>
            <button
              onClick={advance}
              disabled={busy || view.playerCount === 0}
              className="btn-primary"
            >
              {view.playerCount === 0 ? "Menunggu pemain..." : "🚀 Mulai Kuis"}
            </button>
          </div>
          {view.players && view.players.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {view.players.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm animate-pulse-slow"
                >
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{p.nim}</div>
                  {p.groupName && (
                    <div className="text-xs text-emerald-700">{p.groupName}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">
              Menunggu mahasiswa bergabung...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view.status === "final" && view.leaderboard) {
    return (
      <div className="space-y-4">
        <div className="card text-center bg-gradient-to-br from-amber-50 to-rose-50">
          <h1 className="text-3xl font-extrabold">🏆 Hasil Akhir</h1>
          <p className="text-sm text-slate-600">{quizTitle}</p>
          {savedFinal && (
            <p className="mt-2 text-xs text-emerald-700">
              ✅ Hasil telah disimpan ke riwayat nilai mahasiswa.
            </p>
          )}
        </div>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Nama</th>
                <th className="text-left px-3 py-2">NIM</th>
                <th className="text-left px-3 py-2">Kelompok</th>
                <th className="text-right px-3 py-2">Benar</th>
                <th className="text-right px-3 py-2">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.leaderboard.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`}
                  </td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.nim}</td>
                  <td className="px-3 py-2 text-slate-600">{p.groupName ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {p.correct}/{view.totalQuestions}
                  </td>
                  <td className="px-3 py-2 text-right font-extrabold text-brand-700">
                    {p.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => router.push("/lecturer/results")}
            className="btn-primary"
          >
            Lihat Rekap Nilai
          </button>
          <button
            onClick={() => router.push("/lecturer/quizzes")}
            className="btn-ghost"
          >
            Selesai
          </button>
        </div>
      </div>
    );
  }

  // Question / Reveal
  const q = view.question!;
  const totalAnswers = (view.optionCounts ?? []).reduce((s, n) => s + n, 0) || 1;
  const timePct = q ? Math.max(0, (view.timeLeftMs / (q.timeLimit * 1000)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Soal {view.currentIndex + 1} / {view.totalQuestions}
        </span>
        <span>
          PIN <strong className="font-mono">{pin}</strong> · {view.playerCount} pemain
          {view.status === "question" && (
            <>
              {" "}· {view.answeredCount}/{view.playerCount} menjawab
            </>
          )}
        </span>
      </div>

      <div className="card">
        <div className="text-xs text-slate-500 mb-1">📚 {q.topic}</div>
        <h2 className="text-2xl font-bold leading-snug">{q.text}</h2>
        {view.status === "question" && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-[width] duration-200 ${
                  timePct > 50 ? "bg-emerald-500" : timePct > 20 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${timePct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-14 text-right">
              {(view.timeLeftMs / 1000).toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {q.options.map((opt, i) => {
          const isCorrect = view.status === "reveal" && i === q.correctIndex;
          const isWrong = view.status === "reveal" && i !== q.correctIndex;
          const count = view.optionCounts?.[i] ?? 0;
          return (
            <div
              key={i}
              className={`text-white font-semibold rounded-2xl p-5 ${COLORS[i % COLORS.length]} ${
                isWrong ? "opacity-50" : ""
              } ${isCorrect ? "ring-4 ring-emerald-300 scale-[1.02]" : ""} transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{SHAPES[i % SHAPES.length]}</span>
                {view.status === "reveal" && (
                  <span className="text-sm bg-white/30 px-2 py-1 rounded">
                    {count} ({Math.round((count / totalAnswers) * 100)}%)
                  </span>
                )}
              </div>
              <div className="mt-2 text-base md:text-lg leading-snug">
                <span className="opacity-75 mr-1">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </div>
            </div>
          );
        })}
      </div>

      {view.status === "reveal" && q.explanation && (
        <div className="card bg-emerald-50 border-emerald-200">
          <div className="text-sm text-slate-700">
            <strong>Penjelasan:</strong> {q.explanation}
          </div>
          {q.sourceRef && (
            <div className="text-xs text-slate-500 mt-1">📖 {q.sourceRef}</div>
          )}
        </div>
      )}

      {view.status === "reveal" && view.topPlayers && view.topPlayers.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-2">🏅 Top 5 Sementara</h3>
          <ol className="space-y-1">
            {view.topPlayers.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1"
              >
                <span>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}{" "}
                  <strong>{p.name}</strong>
                </span>
                <span className="font-bold text-brand-700">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={advance} disabled={busy} className="btn-primary">
          {view.status === "question"
            ? "⏭ Akhiri & Tampilkan Jawaban"
            : view.currentIndex < view.totalQuestions - 1
            ? "Soal Berikutnya →"
            : "🏁 Tampilkan Hasil Akhir"}
        </button>
      </div>
    </div>
  );
}
