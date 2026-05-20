import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";
import GroupsManager from "./GroupsManager";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireUser("lecturer");
  const groups = await all<{ id: number; name: string; member_count: number }>(
    `SELECT g.id, g.name,
            (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id) AS member_count
     FROM groups g ORDER BY g.name ASC`
  );
  const students = await all<{ id: number; nim: string; name: string; group_id: number | null }>(
    `SELECT id, nim, name, group_id FROM users WHERE role='student' ORDER BY nim ASC`
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">👥 Kelompok</h1>
        <p className="text-sm text-slate-600">
          Bagi mahasiswa ke dalam kelompok untuk kuis kolaboratif. Skor kelompok = rata-rata skor anggota.
        </p>
      </header>
      <GroupsManager initialGroups={groups} initialStudents={students} />
    </div>
  );
}
