"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PQuestion = {
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
  myScore: number;
  question?: PQuestion;
  myAnswered?: boolean;
  myAnswer?: { selectedIndex: number; isCorrect: boolean; points: number } | null;
  topPlayers?: { id: number; name: string; score: number }[];
  leaderboard?: { rank: number; id: number; name: string; score: number }[];
  myRank?: number | null;
};

const COLORS = [
  "bg-kahoot-red hover:bg-rose-700",
  "bg-kahoot-blue hover:bg-blue-700",
  "bg-kahoot-yellow hover:bg-amber-600",
  "bg-kahoot-green hover:bg-emerald-700",
  "bg-kahoot-purple hover:bg-purple-800",
  "bg-pink-600 hover:bg-pink-700",
];
const SHAPES = ["▲", "◆", "●", "■", "★", "♦"];


export default function PlayerUI({ pin, userName }: { pin: string; userName: string }) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastQuestionRef = useRef<number | null>(null);
  const questionStartLocalRef = useRef<number>(Date.now());

  // Polling 1s
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
        const v = data.view as View;
        // Reset timer lokal saat soal berganti
        if (v.status === "question" && v.question) {
          if (lastQuestionRef.current !== v.question.id) {
            lastQuestionRef.current = v.question.id;
            questionStartLocalRef.current = Date.now();
          }
        }
        setView(v);
      } catch {
        /* ignore */
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pin]);


  async function answer(idx: number) {
    if (!view?.question || submitting || view.myAnswered) return;
    setSubmitting(true);
    const responseMs = Date.now() - questionStartLocalRef.current;
    try {
      await fetch(`/api/live/${pin}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: view.question.id,
          selectedIndex: idx,
          responseMs,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!view) {
    return (
      <div className="card text-center py-10 text-slate-500">
        Memuat sesi... PIN <strong className="font-mono">{pin}</strong>.
      </div>
    );
  }


  if (view.status === "lobby") {
    return (
      <div className="card text-center space-y-3 bg-gradient-to-br from-brand-50 to-indigo-50 py-10">
        <div className="text-5xl animate-bounce">🎮</div>
        <h2 className="text-xl font-bold">Halo, {userName}!</h2>
        <p className="text-slate-600">
          Anda berhasil bergabung. Tunggu dosen memulai sesi...
        </p>
        <div className="text-sm text-slate-500">
          PIN: <strong className="font-mono">{pin}</strong> · {view.playerCount} pemain bergabung
        </div>
      </div>
    );
  }

  if (view.status === "final" && view.leaderboard) {
    const top10 = view.leaderboard.slice(0, 10);
    return (
      <div className="space-y-4">
        <div className="card text-center bg-gradient-to-br from-amber-50 to-rose-50 py-8">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold mt-2">Sesi Selesai!</h1>
          <div className="mt-3 text-sm text-slate-600">
            Skor Anda: <strong className="text-2xl text-brand-700">{view.myScore}</strong>
          </div>
          {view.myRank && (
            <div className="text-sm">
              Peringkat: <strong>#{view.myRank}</strong> dari {view.leaderboard.length}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">🏆 Top 10</h3>
          <ol className="space-y-1">
            {top10.map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between text-sm rounded px-3 py-1 ${
                  p.rank <= 3 ? "bg-amber-50" : "bg-slate-50"
                }`}
              >
                <span>
                  {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`}{" "}
                  <strong>{p.name}</strong>
                </span>
                <span className="font-bold text-brand-700">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex justify-center gap-2">
          <button onClick={() => router.push("/student/results")} className="btn-primary">
            Lihat Riwayat Nilai
          </button>
          <button onClick={() => router.push("/student")} className="btn-ghost">
            Kembali
          </button>
        </div>
      </div>
    );
  }


  // Question / Reveal
  const q = view.question;
  if (!q) return null;
  const timePct = Math.max(0, (view.timeLeftMs / (q.timeLimit * 1000)) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Soal {view.currentIndex + 1} / {view.totalQuestions}
        </span>
        <span>
          Skor: <strong className="text-brand-700">{view.myScore}</strong>
        </span>
      </div>

      <div className="card">
        <div className="text-xs text-slate-500 mb-1">📚 {q.topic}</div>
        <h2 className="text-xl md:text-2xl font-bold leading-snug">{q.text}</h2>
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
          const isMyPick = view.myAnswer?.selectedIndex === i;
          const isCorrect = view.status === "reveal" && i === q.correctIndex;
          const isWrong = view.status === "reveal" && i !== q.correctIndex;
          const disabled =
            view.status !== "question" || view.myAnswered || submitting;
          let extra = "";
          if (view.status === "reveal") {
            if (isCorrect) extra = "ring-4 ring-emerald-300 scale-[1.02]";
            else if (isMyPick) extra = "ring-4 ring-rose-300";
            else if (isWrong) extra = "opacity-50";
          } else if (view.myAnswered && isMyPick) {
            extra = "ring-4 ring-white scale-[1.02]";
          } else if (view.myAnswered) {
            extra = "opacity-60";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => answer(i)}
              className={`text-left text-white font-semibold rounded-2xl p-5 transition-all
                ${COLORS[i % COLORS.length]} ${extra}
                disabled:cursor-not-allowed`}
            >
              <div className="text-2xl">{SHAPES[i % SHAPES.length]}</div>
              <div className="mt-1 text-base md:text-lg leading-snug">
                <span className="opacity-75 mr-1">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </div>
            </button>
          );
        })}
      </div>

      {view.status === "question" && view.myAnswered && (
        <div className="card bg-amber-50 border-amber-200 text-center">
          ✅ Jawaban Anda terkirim. Tunggu peserta lain & layar dosen.
        </div>
      )}

      {view.status === "reveal" && (
        <div
          className={`card ${
            view.myAnswer?.isCorrect
              ? "bg-emerald-50 border-emerald-200"
              : "bg-rose-50 border-rose-200"
          }`}
        >
          <div className="font-semibold">
            {view.myAnswer?.isCorrect
              ? `✅ Benar! +${view.myAnswer.points} poin`
              : view.myAnswer
              ? `❌ Belum tepat`
              : `⏰ Tidak menjawab`}
          </div>
          {q.explanation && (
            <p className="mt-1 text-sm text-slate-700">
              <strong>Penjelasan:</strong> {q.explanation}
            </p>
          )}
          {q.sourceRef && <p className="text-xs text-slate-500 mt-1">📖 {q.sourceRef}</p>}
        </div>
      )}
    </div>
  );
}
