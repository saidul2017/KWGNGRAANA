"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Group = { id: number; name: string; member_count: number };
type Student = { id: number; nim: string; name: string; group_id: number | null };

export default function GroupsManager({
  initialGroups,
  initialStudents,
}: {
  initialGroups: Group[];
  initialStudents: Student[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Gagal membuat kelompok");
        return;
      }
      setGroups([...groups, { id: j.id, name: newName.trim(), member_count: 0 }]);
      setNewName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(id: number) {
    if (!confirm("Hapus kelompok ini? Anggota akan dilepas dari kelompok.")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Gagal menghapus");
      return;
    }
    setGroups(groups.filter((g) => g.id !== id));
    setStudents(students.map((s) => (s.group_id === id ? { ...s, group_id: null } : s)));
    router.refresh();
  }

  async function assignStudent(studentId: number, groupId: number | null) {
    const res = await fetch(`/api/students/${studentId}/group`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    if (!res.ok) {
      alert("Gagal mengubah kelompok");
      return;
    }
    setStudents(students.map((s) => (s.id === studentId ? { ...s, group_id: groupId } : s)));
    setGroups(
      groups.map((g) => {
        const before = students.find((s) => s.id === studentId)?.group_id;
        let count = g.member_count;
        if (before === g.id) count--;
        if (groupId === g.id) count++;
        return { ...g, member_count: count };
      })
    );
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card space-y-4">
        <h2 className="font-semibold">Daftar Kelompok</h2>
        <form onSubmit={createGroup} className="flex gap-2">
          <input
            className="input"
            placeholder="Nama kelompok (mis. Kelompok 1 - Pancasila)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-primary">
            + Tambah
          </button>
        </form>
        {error && <div className="text-rose-600 text-sm">{error}</div>}
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada kelompok.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groups.map((g) => (
              <li key={g.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {g.member_count} anggota
                  </span>
                </div>
                <button
                  onClick={() => deleteGroup(g.id)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Penugasan Mahasiswa</h2>
        <p className="text-xs text-slate-500">Pilih kelompok dari dropdown di samping nama mahasiswa.</p>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
          {students.map((s) => (
            <div key={s.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-500 font-mono">{s.nim}</div>
              </div>
              <select
                value={s.group_id ?? ""}
                onChange={(e) =>
                  assignStudent(s.id, e.target.value ? Number(e.target.value) : null)
                }
                className="input text-xs max-w-[160px]"
              >
                <option value="">— Tanpa kelompok —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
