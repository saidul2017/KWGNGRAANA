import Link from "next/link";
import { all } from "@/lib/db";
import { rowToQuiz, type QuizRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuizzesIndex() {
  const rows = await all<QuizRow>(
    `SELECT q.*, (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
     FROM quizzes q
     ORDER BY q.created_at DESC`
  );
  const quizzes = rows.map(rowToQuiz);

  const groups: Record<string, typeof quizzes> = { practice: [], quiz: [], uas: [] };
  for (const q of quizzes) groups[q.kind].push(q);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kuis &amp; UAS</h1>
          <p className="text-sm text-slate-600">Kelola latihan mandiri, kuis, dan ujian akhir.</p>
        </div>
        <Link href="/lecturer/quizzes/new" className="btn-primary">+ Buat Baru</Link>
      </header>

      {(["practice", "quiz", "uas"] as const).map((kind) => (
        <Section key={kind} kind={kind} list={groups[kind]} />
      ))}
    </div>
  );
}

function Section({
  kind,
  list,
}: {
  kind: "practice" | "quiz" | "uas";
  list: ReturnType<typeof rowToQuiz>[];
}) {
  const meta: Record<string, { label: string; emoji: string; color: string }> = {
    practice: { label: "Latihan Mandiri", emoji: "🎯", color: "text-emerald-700" },
    quiz: { label: "Kuis", emoji: "🏆", color: "text-amber-700" },
    uas: { label: "UAS", emoji: "🎓", color: "text-rose-700" },
  };
  const m = meta[kind];
  return (
    <section>
      <h2 className={`font-semibold mb-2 ${m.color}`}>
        {m.emoji} {m.label} <span className="text-xs text-slate-500">({list.length})</span>
      </h2>
      {list.length === 0 ? (
        <div className="card text-sm text-slate-500 text-center">Belum ada {m.label.toLowerCase()}.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((q) => (
            <Link
              href={`/lecturer/quizzes/${q.id}`}
              key={q.id}
              className="card hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{q.title}</h3>
                <StatusBadge status={q.status} />
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {q.description || "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="badge bg-slate-100">{q.questionCount ?? 0} soal</span>
                <span className="badge bg-slate-100">
                  {q.mode === "group" ? "👥 Kelompok" : "🧑 Individu"}
                </span>
                <span className="badge bg-slate-100">
                  {q.shuffle ? "🔀 Acak" : "📑 Urut"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    open: "bg-emerald-100 text-emerald-700",
    closed: "bg-rose-100 text-rose-700",
  };
  const label: Record<string, string> = { draft: "Draft", open: "Aktif", closed: "Ditutup" };
  return <span className={`badge ${map[status] ?? "bg-slate-100"}`}>{label[status] ?? status}</span>;
}
