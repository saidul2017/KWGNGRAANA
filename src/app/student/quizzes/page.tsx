import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentQuizzesPage() {
  const user = await requireUser("student");

  const list = await all<{
    id: number;
    title: string;
    description: string | null;
    kind: string;
    mode: string;
    status: string;
    question_count: number;
    attempt_status: string | null;
    total_score: number | null;
    total_correct: number | null;
    total_questions: number | null;
    attempt_id: number | null;
  }>(
    `SELECT q.id, q.title, q.description, q.kind, q.mode, q.status,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
            a.status AS attempt_status, a.total_score, a.total_correct, a.total_questions, a.id AS attempt_id
     FROM quizzes q
     LEFT JOIN attempts a ON a.quiz_id = q.id AND a.user_id = ?
     WHERE q.kind IN ('quiz','uas')
     ORDER BY q.created_at DESC`,
    [user.id]
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">🏆 Kuis &amp; UAS</h1>
        <p className="text-sm text-slate-600">
          Hanya kuis berstatus <strong>aktif</strong> yang dapat dikerjakan. Tiap kuis hanya boleh
          dikerjakan satu kali per mahasiswa.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">Belum ada kuis dari dosen.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((q) => {
            const finished = q.attempt_status === "completed";
            const inProgress = q.attempt_status === "in_progress";
            const canPlay = q.status === "open" && !finished;
            return (
              <div key={q.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{q.title}</h3>
                  <span
                    className={`badge ${
                      q.kind === "uas"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {q.kind.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{q.description || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="badge bg-slate-100">{q.question_count} soal</span>
                  <span className="badge bg-slate-100">
                    {q.mode === "group" ? "👥 Kelompok" : "🧑 Individu"}
                  </span>
                  <span
                    className={`badge ${
                      q.status === "open"
                        ? "bg-emerald-100 text-emerald-800"
                        : q.status === "draft"
                        ? "bg-slate-100"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {q.status === "open" ? "Aktif" : q.status === "draft" ? "Belum dibuka" : "Ditutup"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {finished ? (
                    <div className="text-sm">
                      <span className="text-emerald-700 font-semibold">✅ Selesai —</span>{" "}
                      <strong>{q.total_score}</strong> poin ({q.total_correct}/{q.total_questions})
                    </div>
                  ) : inProgress ? (
                    <span className="text-amber-700 text-sm font-medium">⏳ Dalam pengerjaan</span>
                  ) : (
                    <span className="text-slate-500 text-sm">Belum dikerjakan</span>
                  )}
                  {canPlay ? (
                    <Link href={`/student/play/${q.id}`} className="btn-primary text-sm">
                      {inProgress ? "Lanjutkan →" : "Mulai →"}
                    </Link>
                  ) : finished ? (
                    <Link
                      href={`/student/results?focus=${q.attempt_id}`}
                      className="btn-ghost text-sm"
                    >
                      Lihat Detail
                    </Link>
                  ) : (
                    <button disabled className="btn-ghost text-sm opacity-50">Belum dibuka</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
