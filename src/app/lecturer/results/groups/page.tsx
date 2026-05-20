import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type GroupRow = {
  group_id: number | null;
  group_name: string | null;
  member_count: number;
  active_members: number;
  total_score: number;
  total_correct: number;
  total_attempts: number;
  avg_score: number;
};

export default async function GroupResultsPage({
  searchParams,
}: {
  searchParams?: { quizId?: string };
}) {
  await requireUser("lecturer");

  const quizzes = await all<{ id: number; title: string; kind: string }>(
    `SELECT id, title, kind FROM quizzes ORDER BY created_at DESC`
  );

  const focusQuizId = searchParams?.quizId ? Number(searchParams.quizId) : null;
  const filter = focusQuizId ? `AND a.quiz_id = ${focusQuizId}` : "";

  const rows = await all<GroupRow>(
    `SELECT g.id AS group_id, g.name AS group_name,
            (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role='student') AS member_count,
            COUNT(DISTINCT a.user_id) AS active_members,
            COALESCE(SUM(a.total_score), 0) AS total_score,
            COALESCE(SUM(a.total_correct), 0) AS total_correct,
            COUNT(a.id) AS total_attempts,
            COALESCE(ROUND(AVG(a.total_score), 0), 0) AS avg_score
     FROM groups g
     LEFT JOIN attempts a ON a.group_id = g.id AND a.status='completed' ${filter}
     GROUP BY g.id, g.name
     ORDER BY avg_score DESC, total_score DESC`
  );

  const ungrouped = await all<{
    member_count: number;
    active_members: number;
    total_score: number;
    total_attempts: number;
    avg_score: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM users u WHERE u.group_id IS NULL AND u.role='student') AS member_count,
       COUNT(DISTINCT a.user_id) AS active_members,
       COALESCE(SUM(a.total_score), 0) AS total_score,
       COUNT(a.id) AS total_attempts,
       COALESCE(ROUND(AVG(a.total_score), 0), 0) AS avg_score
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     WHERE u.role='student' AND u.group_id IS NULL AND a.status='completed' ${filter}`
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/lecturer/results" className="text-xs text-slate-500 hover:underline">
            ← Kembali ke nilai individu
          </Link>
          <h1 className="text-2xl font-bold mt-1">👥 Leaderboard Kelompok</h1>
          <p className="text-sm text-slate-600">
            Diurutkan berdasarkan <strong>skor rata-rata anggota</strong> (lebih adil
            daripada total, karena anggota tiap kelompok bisa berbeda jumlah).
          </p>
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

      {rows.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          Belum ada kelompok.{" "}
          <Link href="/lecturer/groups" className="text-brand-600 hover:underline">
            Buat kelompok pertama
          </Link>
          .
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Kelompok</th>
                <th className="text-right px-3 py-2">Anggota Aktif</th>
                <th className="text-right px-3 py-2">Pengerjaan</th>
                <th className="text-right px-3 py-2">Total Skor</th>
                <th className="text-right px-3 py-2">Rata-rata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.group_id ?? "x"} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.group_name}</td>
                  <td className="px-3 py-2 text-right">
                    {r.active_members}/{r.member_count}
                  </td>
                  <td className="px-3 py-2 text-right">{r.total_attempts}</td>
                  <td className="px-3 py-2 text-right">{r.total_score}</td>
                  <td className="px-3 py-2 text-right font-extrabold text-brand-700">
                    {r.avg_score}
                  </td>
                </tr>
              ))}
              {ungrouped[0] && ungrouped[0].member_count > 0 && (
                <tr className="bg-slate-50/50 italic">
                  <td className="px-3 py-2 text-slate-500">—</td>
                  <td className="px-3 py-2 text-slate-600">Mahasiswa tanpa kelompok</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {ungrouped[0].active_members}/{ungrouped[0].member_count}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {ungrouped[0].total_attempts}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {ungrouped[0].total_score}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 font-semibold">
                    {ungrouped[0].avg_score}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <a
          href={`/api/lecturer/export${searchParams?.quizId ? `?quizId=${searchParams.quizId}` : ""}`}
          className="btn-primary bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
        >
          📥 Ekspor Excel (termasuk sheet kelompok)
        </a>
      </div>
    </div>
  );
}
