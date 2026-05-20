import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  nim: string;
  name: string;
  group_name: string | null;
  attempts_done: number;
  total_score: number;
};

export default async function LecturerStudentsPage() {
  await requireUser("lecturer");
  const rows = await all<Row>(
    `SELECT u.id, u.nim, u.name, g.name AS group_name,
            (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id AND a.status='completed') AS attempts_done,
            COALESCE((SELECT SUM(total_score) FROM attempts a WHERE a.user_id = u.id AND a.status='completed'), 0) AS total_score
     FROM users u
     LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.role = 'student'
     ORDER BY u.nim ASC`
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">🎓 Daftar Mahasiswa</h1>
        <p className="text-sm text-slate-600">
          Total <strong>{rows.length}</strong> mahasiswa terdaftar.
        </p>
      </header>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-3 py-2">No.</th>
              <th className="text-left px-3 py-2">NIM</th>
              <th className="text-left px-3 py-2">Nama</th>
              <th className="text-left px-3 py-2">Kelompok</th>
              <th className="text-right px-3 py-2">Selesai</th>
              <th className="text-right px-3 py-2">Total Poin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.nim}</td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-slate-600">{r.group_name ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.attempts_done}</td>
                <td className="px-3 py-2 text-right font-semibold text-brand-700">{r.total_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
