"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  answer_id: number;
  attempt_id: number;
  user_name: string;
  user_nim: string;
  group_name: string | null;
  question_id: number;
  question_topic: string;
  question_text: string;
  question_max: number;
  question_key_points: string | null;
  question_source_ref: string | null;
  essay_text: string | null;
  ai_feedback: string | null;
  score_awarded: number;
  original_score: number | null;
  lecturer_note: string | null;
  reviewed_at: string | null;
  quiz_id: number;
  quiz_title: string;
  finished_at: string | null;
};

type AiFeedback = {
  feedback?: string;
  matchedPoints?: string[];
  missingPoints?: string[];
  scorePct?: number;
  needsReview?: boolean;
};

function safeParseStringArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseAi(s: string | null): AiFeedback | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as AiFeedback;
  } catch {
    return null;
  }
}

export default function EssayReviewer({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<Record<number, number>>({});
  const [editNote, setEditNote] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  async function override(id: number, max: number) {
    const score = editScore[id] ?? 0;
    if (score < 0 || score > max) {
      alert(`Skor harus 0-${max}`);
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/answers/${id}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, note: editNote[id] ?? "" }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Gagal override");
        return;
      }
      setRows((rs) =>
        rs.map((r) =>
          r.answer_id === id
            ? {
                ...r,
                score_awarded: score,
                original_score: r.original_score ?? r.score_awarded,
                lecturer_note: editNote[id] ?? "",
                reviewed_at: new Date().toISOString(),
              }
            : r
        )
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const ai = parseAi(r.ai_feedback);
        const keyPoints = safeParseStringArray(r.question_key_points);
        const isReviewed = !!r.reviewed_at;
        const isOpen = openId === r.answer_id;
        const pct = Math.round((r.score_awarded / r.question_max) * 100);

        return (
          <div key={r.answer_id} className="card p-0 overflow-hidden">
            <div
              className={`p-4 cursor-pointer flex items-center gap-3 ${isOpen ? "bg-slate-50" : ""}`}
              onClick={() => setOpenId(isOpen ? null : r.answer_id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{r.user_name}</span>
                  <span className="text-xs text-slate-500 font-mono">{r.user_nim}</span>
                  {r.group_name && (
                    <span className="badge bg-slate-100 text-xs">{r.group_name}</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1 truncate">
                  📚 {r.question_topic} · {r.question_text}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-slate-500">Skor</div>
                <div className={`font-bold ${pct >= 70 ? "text-emerald-700" : pct >= 40 ? "text-amber-700" : "text-rose-700"}`}>
                  {r.score_awarded}/{r.question_max} ({pct}%)
                </div>
                {isReviewed ? (
                  <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                    ✓ Ditinjau
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                    Belum ditinjau
                  </span>
                )}
              </div>
              <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div className="p-4 border-t border-slate-100 grid lg:grid-cols-2 gap-5">
                {/* Kiri: jawaban + AI feedback */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">Pertanyaan</h4>
                    <p className="text-sm text-slate-700">{r.question_text}</p>
                    {r.question_source_ref && (
                      <p className="text-xs text-slate-500 mt-1">📖 {r.question_source_ref}</p>
                    )}
                  </div>
                  {keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm">Rubrik Poin Kunci</h4>
                      <ul className="text-xs text-slate-700 list-decimal list-inside mt-1 space-y-0.5">
                        {keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm">Jawaban Mahasiswa</h4>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-800 whitespace-pre-wrap mt-1">
                      {r.essay_text || <em className="text-slate-400">(kosong)</em>}
                    </div>
                  </div>
                  {ai && (
                    <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm">
                      <div className="font-semibold text-violet-900 flex items-center gap-2">
                        🤖 Penilaian AI: {ai.scorePct ?? "—"}%
                        {ai.needsReview && (
                          <span className="badge bg-rose-100 text-rose-700 text-[10px]">
                            perlu review
                          </span>
                        )}
                      </div>
                      {ai.feedback && <p className="mt-1 text-slate-700">{ai.feedback}</p>}
                      {ai.matchedPoints && ai.matchedPoints.length > 0 && (
                        <div className="mt-2 text-xs">
                          <strong className="text-emerald-800">✓ Tertangkap:</strong>
                          <ul className="ml-4 list-disc">
                            {ai.matchedPoints.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {ai.missingPoints && ai.missingPoints.length > 0 && (
                        <div className="mt-2 text-xs">
                          <strong className="text-rose-800">○ Belum tertangkap:</strong>
                          <ul className="ml-4 list-disc">
                            {ai.missingPoints.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kanan: form override */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Override Skor</h4>
                  {r.original_score !== null && (
                    <p className="text-xs text-slate-500">
                      Skor AI awal: <strong>{r.original_score}</strong>/{r.question_max}
                    </p>
                  )}
                  <div>
                    <label className="label text-xs">Skor (0–{r.question_max})</label>
                    <input
                      type="number"
                      min={0}
                      max={r.question_max}
                      step={50}
                      defaultValue={r.score_awarded}
                      onChange={(e) =>
                        setEditScore((s) => ({ ...s, [r.answer_id]: Number(e.target.value) }))
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Catatan (opsional, terlihat dosen)</label>
                    <textarea
                      className="input min-h-[80px] text-sm"
                      defaultValue={r.lecturer_note ?? ""}
                      onChange={(e) =>
                        setEditNote((s) => ({ ...s, [r.answer_id]: e.target.value }))
                      }
                      placeholder="Mis. 'Argumen baik tapi kurang sumber UU.'"
                    />
                  </div>
                  <button
                    onClick={() => override(r.answer_id, r.question_max)}
                    disabled={busy === r.answer_id}
                    className="btn-primary w-full"
                  >
                    {busy === r.answer_id ? "Menyimpan..." : "💾 Simpan Override"}
                  </button>
                  {r.lecturer_note && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                      <strong>Catatan tersimpan:</strong> {r.lecturer_note}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
