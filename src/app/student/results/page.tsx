import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AttemptRow = {
  id: number;
  quiz_id: number;
  total_score: number;
  total_correct: number;
  total_questions: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  quiz_title: string;
  quiz_kind: string;
};

export default async function StudentResultsPage({
  searchParams,
}: {
  searchParams?: { focus?: string };
}) {
  const user = await requireUser("student");

  const attempts = await all<AttemptRow>(
    `SELECT a.id, a.quiz_id, a.total_score, a.total_correct, a.total_questions, a.status,
            a.started_at, a.finished_at,
            q.title AS quiz_title, q.kind AS quiz_kind
     FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.user_id = ?
     ORDER BY a.started_at DESC`,
    [user.id]
  );

  const focus = searchParams?.focus ? Number(searchParams.focus) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">📊 Riwayat Nilai Saya</h1>
        <p className="text-sm text-slate-600">
          Daftar semua pengerjaan kuis, latihan, dan UAS yang Anda ikuti.
        </p>
      </header>

      {attempts.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          Belum ada riwayat. Mulai dari{" "}
          <Link href="/student/practice" className="text-brand-600 hover:underline">
            latihan mandiri
          </Link>
          .
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {attempts.map((a) => {
            const max = 0; // tidak diketahui tanpa join, dihitung kasar dari ratio benar
            const pct =
              a.total_questions > 0
                ? Math.round((a.total_correct / a.total_questions) * 100)
                : 0;
            const isFocus = focus === a.id;
            return (
              <div
                key={a.id}
                className={`p-4 flex items-center justify-between gap-3 ${
                  isFocus ? "bg-amber-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold">{a.quiz_title}</div>
                  <div className="text-xs text-slate-500">
                    {a.quiz_kind.toUpperCase()} ·{" "}
                    {a.finished_at
                      ? new Date(a.finished_at).toLocaleString("id-ID")
                      : `Dimulai ${new Date(a.started_at).toLocaleString("id-ID")}`}{" "}
                    · {a.status === "completed" ? "Selesai" : "Belum selesai"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Poin</div>
                    <div className="text-xl font-extrabold text-brand-700">{a.total_score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Benar</div>
                    <div className="font-semibold">
                      {a.total_correct}/{a.total_questions} ({pct}%)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
