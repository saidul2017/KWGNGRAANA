"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PlayerQuestion = {
  id: number;
  topic: string;
  text: string;
  type: "mcq" | "essay";
  options: string[];
  timeLimit: number;
  maxPoints: number;
  sourceRef: string | null;
  essayMinWords?: number | null;
};

type AnswerResult = {
  isCorrect: boolean;
  correctIndex?: number;
  scoreAwarded: number;
  explanation: string | null;
  sourceRef: string | null;
  runningTotal: number;
  // Esai
  scorePct?: number;
  feedback?: string | null;
  matchedPoints?: string[];
  missingPoints?: string[];
};

const KAHOOT_COLORS = [
  "bg-kahoot-red hover:bg-rose-700",
  "bg-kahoot-blue hover:bg-blue-700",
  "bg-kahoot-yellow hover:bg-amber-600",
  "bg-kahoot-green hover:bg-emerald-700",
  "bg-kahoot-purple hover:bg-purple-800",
  "bg-pink-600 hover:bg-pink-700",
];
const KAHOOT_SHAPES = ["▲", "◆", "●", "■", "★", "♦"];

export default function QuizPlayer({
  attemptId,
  quizTitle,
  quizKind,
  questions,
}: {
  attemptId: number;
  quizTitle: string;
  quizKind: "practice" | "quiz" | "uas";
  questions: PlayerQuestion[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "feedback" | "done">("playing");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [essayText, setEssayText] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];
  const startedAtRef = useRef<number>(Date.now());
  const [remaining, setRemaining] = useState<number>(current?.timeLimit ?? 20);
  const isEssay = current?.type === "essay";

  // Timer
  useEffect(() => {
    if (phase !== "playing" || !current) return;
    startedAtRef.current = Date.now();
    setRemaining(current.timeLimit);
    setEssayText("");
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      const left = Math.max(0, current.timeLimit - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        // Timeout: untuk esai kirim teks yang sudah diketik (jika ada), untuk MCQ kirim -1
        if (current.type === "essay") {
          submit(null, current.timeLimit * 1000);
        } else {
          submit(-1, current.timeLimit * 1000);
        }
      }
    }, 100);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, current?.id]);

  const wordCount = useMemo(
    () => essayText.trim().split(/\s+/).filter(Boolean).length,
    [essayText]
  );

  async function submit(idx: number | null, ms?: number) {
    if (!current || submitting) return;
    if (current.type === "essay" && idx === null) {
      // ok, submit current essay text
    } else if (current.type !== "essay" && idx === null) {
      idx = -1;
    }
    if (current.type === "mcq" && idx !== null) setSelectedIdx(idx);
    setSubmitting(true);
    const responseMs = ms ?? Date.now() - startedAtRef.current;
    try {
      const body = current.type === "essay"
        ? {
            questionId: current.id,
            essayText: essayText,
            responseMs,
          }
        : {
            questionId: current.id,
            selectedIndex: idx,
            responseMs,
          };
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mengirim jawaban");
        setSubmitting(false);
        return;
      }
      setResult(data);
      setTotalScore(data.runningTotal ?? 0);
      if (data.isCorrect) setTotalCorrect((c) => c + 1);
      setPhase("feedback");
    } catch {
      alert("Kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setSelectedIdx(null);
      setEssayText("");
      setResult(null);
      setPhase("playing");
    } else {
      setPhase("done");
      await fetch(`/api/attempts/${attemptId}/finish`, { method: "POST" })
        .then((r) => r.json())
        .catch(() => null);
    }
  }

  const progressPct = useMemo(
    () => Math.round(((index + (phase === "feedback" ? 1 : 0)) / questions.length) * 100),
    [index, phase, questions.length]
  );

  if (questions.length === 0) {
    return (
      <div className="card text-center text-slate-600">
        Kuis ini belum berisi soal. Hubungi dosen Anda.
      </div>
    );
  }

  if (phase === "done") {
    const max = questions.reduce((s, q) => s + q.maxPoints, 0);
    const pct = max > 0 ? Math.round((totalScore / max) * 100) : 0;
    return (
      <div className="card text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold">Selesai!</h2>
        <p className="text-slate-600">
          {quizKind === "practice"
            ? "Latihan mandiri selesai. Skor di bawah hanya untuk umpan balik."
            : "Jawaban Anda telah direkam dan dinilai otomatis."}
        </p>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <div className="p-3 rounded-lg bg-brand-50">
            <div className="text-xs text-slate-600">Skor</div>
            <div className="text-2xl font-extrabold text-brand-700">{totalScore}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50">
            <div className="text-xs text-slate-600">Benar</div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {totalCorrect}/{questions.length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50">
            <div className="text-xs text-slate-600">Persen</div>
            <div className="text-2xl font-extrabold text-amber-700">{pct}%</div>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => {
              router.push(quizKind === "practice" ? "/student/practice" : "/student/quizzes");
              router.refresh();
            }}
            className="btn-primary"
          >
            Kembali ke Daftar
          </button>
          <button
            onClick={() => {
              router.push("/student/results");
              router.refresh();
            }}
            className="btn-ghost"
          >
            Lihat Riwayat Nilai
          </button>
        </div>
      </div>
    );
  }

  const pctTime = (remaining / current.timeLimit) * 100;
  const timerColor =
    pctTime > 50 ? "bg-emerald-500" : pctTime > 20 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{quizTitle}</span>
        <span className="text-slate-500">
          Soal {index + 1} dari {questions.length} · Skor: <strong>{totalScore}</strong>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>📚 {current.topic}{isEssay && " · ✍️ Esai (auto-grading AI)"}</span>
          {current.sourceRef && <span>📖 {current.sourceRef}</span>}
        </div>
        <h2 className="text-xl md:text-2xl font-bold leading-snug">{current.text}</h2>

        {phase === "playing" && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${timerColor} transition-[width] duration-100`}
                style={{ width: `${pctTime}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-12 text-right">
              {remaining.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* MCQ */}
      {!isEssay && (
        <div className="grid gap-3 md:grid-cols-2">
          {current.options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const isCorrect = result && i === result.correctIndex;
            const isWrongPick = result && isSelected && !result.isCorrect;
            let extra = "";
            if (phase === "feedback") {
              if (isCorrect) extra = "ring-4 ring-emerald-400 scale-[1.02]";
              else if (isWrongPick) extra = "ring-4 ring-rose-400 opacity-90";
              else extra = "opacity-50";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={phase !== "playing" || submitting}
                onClick={() => submit(i)}
                className={`text-left text-white font-semibold rounded-2xl p-5 transition-all
                  ${KAHOOT_COLORS[i % KAHOOT_COLORS.length]} ${extra}
                  disabled:cursor-not-allowed`}
              >
                <div className="text-2xl">{KAHOOT_SHAPES[i % KAHOOT_SHAPES.length]}</div>
                <div className="mt-1 text-base md:text-lg leading-snug">
                  <span className="opacity-75 mr-1">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Essay */}
      {isEssay && phase === "playing" && (
        <div className="card space-y-3">
          <textarea
            className="input min-h-[180px]"
            disabled={submitting}
            placeholder="Tuliskan jawaban Anda di sini. Sebutkan rujukan resmi (UUD/UU) bila relevan."
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {wordCount} kata
              {current.essayMinWords && current.essayMinWords > 0 && (
                <> · minimal {current.essayMinWords} kata</>
              )}
            </span>
            <button
              type="button"
              onClick={() => submit(null)}
              disabled={
                submitting ||
                (current.essayMinWords ? wordCount < current.essayMinWords : false)
              }
              className="btn-primary"
            >
              {submitting ? "Mengirim..." : "Kirim Jawaban →"}
            </button>
          </div>
        </div>
      )}

      {phase === "feedback" && result && (
        <div
          className={`card ${
            result.isCorrect
              ? "bg-emerald-50 border-emerald-200"
              : "bg-rose-50 border-rose-200"
          }`}
        >
          <div className="font-semibold flex items-center gap-2">
            {isEssay ? (
              <>
                {(result.scorePct ?? 0) >= 70
                  ? "✅ Bagus!"
                  : (result.scorePct ?? 0) >= 40
                  ? "🟡 Cukup"
                  : "🔴 Perlu diperbaiki"}{" "}
                <span className="text-base">
                  {result.scorePct ?? 0}% · +{result.scoreAwarded} poin
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  🤖 AI Grading
                </span>
              </>
            ) : result.isCorrect ? (
              `✅ Benar! +${result.scoreAwarded} poin`
            ) : selectedIdx === -1 ? (
              `⏰ Waktu habis — 0 poin`
            ) : (
              `❌ Belum tepat — 0 poin`
            )}
          </div>

          {isEssay && result.feedback && (
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              <strong>Feedback AI:</strong> {result.feedback}
            </p>
          )}

          {isEssay && result.matchedPoints && result.matchedPoints.length > 0 && (
            <div className="mt-2 text-xs">
              <div className="font-semibold text-emerald-700">✓ Poin yang sudah Anda sentuh:</div>
              <ul className="ml-4 list-disc text-slate-700">
                {result.matchedPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {isEssay && result.missingPoints && result.missingPoints.length > 0 && (
            <div className="mt-2 text-xs">
              <div className="font-semibold text-rose-700">○ Poin yang masih kurang:</div>
              <ul className="ml-4 list-disc text-slate-700">
                {result.missingPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {!isEssay && result.explanation && (
            <p className="mt-2 text-sm text-slate-700">
              <strong>Penjelasan:</strong> {result.explanation}
            </p>
          )}

          {result.sourceRef && (
            <p className="mt-1 text-xs text-slate-500">📖 {result.sourceRef}</p>
          )}

          <button onClick={next} className="btn-primary mt-3 w-full">
            {index < questions.length - 1 ? "Lanjut →" : "Lihat Hasil Akhir"}
          </button>
        </div>
      )}
    </div>
  );
}
