import Link from "next/link";
import { all, get } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AttemptRow = {
  id: number;
  user_id: number;
  user_name: string;
  user_nim: string;
  group_name: string | null;
  quiz_id: number;
  quiz_title: string;
  quiz_kind: string;
  total_score: number;
  total_correct: number;
  total_questions: number;
  finished_at: string | null;
};

export default async function LecturerResultsPage({
  searchParams,
}: {
  searchParams?: { quizId?: string };
}) {
  await requireUser("lecturer");

  const quizzes = await all<{ id: number; title: string; kind: string }>(
    `SELECT id, title, kind FROM quizzes ORDER BY created_at DESC`
  );

  const focusQuizId = searchParams?.quizId ? Number(searchParams.quizId) : null;
  const filterSql = focusQuizId ? `AND a.quiz_id = ?` : "";
  const params: unknown[] = focusQuizId ? [focusQuizId] : [];

  const attempts = await all<AttemptRow>(
    `SELECT a.id, a.user_id, u.name AS user_name, u.nim AS user_nim,
            g.name AS group_name,
            a.quiz_id, q.title AS quiz_title, q.kind AS quiz_kind,
            a.total_score, a.total_correct, a.total_questions, a.finished_at
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     JOIN quizzes q ON q.id = a.quiz_id
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE a.status = 'completed' ${filterSql}
     ORDER BY a.total_score DESC, a.finished_at ASC`,
    params
  );

  const totalAttempts = attempts.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(attempts.reduce((s, a) => s + a.total_score, 0) / totalAttempts)
      : 0;
  const topScore = attempts[0]?.total_score ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📈 Nilai Kelas</h1>
          <p className="text-sm text-slate-600">Leaderboard &amp; rekap pengerjaan mahasiswa.</p>
        </div>
        <form className="flex gap-2">
          <select
            name="quizId"
            defaultValue={searchParams?.quizId ?? ""}
            className="input max-w-[300px]"
          >
            <option value="">Semua Kuis</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                [{q.kind.toUpperCase()}] {q.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Filter</button>
        </form>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Total Pengerjaan" value={totalAttempts} icon="✅" color="text-emerald-700" />
        <Stat label="Skor Rata-rata" value={avgScore} icon="📊" color="text-brand-700" />
        <Stat label="Skor Tertinggi" value={topScore} icon="🏆" color="text-amber-700" />
      </section>

      {attempts.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          Belum ada pengerjaan yang selesai.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-3 py-2">Peringkat</th>
                <th className="text-left px-3 py-2">Mahasiswa</th>
                <th className="text-left px-3 py-2">Kelompok</th>
                <th className="text-left px-3 py-2">Kuis</th>
                <th className="text-right px-3 py-2">Benar</th>
                <th className="text-right px-3 py-2">Skor</th>
                <th className="text-right px-3 py-2">Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a, i) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-slate-500">#{i + 1}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.user_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{a.user_nim}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{a.group_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/lecturer/results?quizId=${a.quiz_id}`}
                      className="hover:underline"
                    >
                      {a.quiz_title}
                    </Link>
                    <div className="text-xs text-slate-500">{a.quiz_kind.toUpperCase()}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.total_correct}/{a.total_questions}
                  </td>
                  <td className="px-3 py-2 text-right font-extrabold text-brand-700">
                    {a.total_score}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-slate-500">
                    {a.finished_at ? new Date(a.finished_at).toLocaleString("id-ID") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="card">
      <div className="text-2xl">{icon}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}
