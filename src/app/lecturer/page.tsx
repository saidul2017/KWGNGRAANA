import Link from "next/link";
import { all, get } from "@/lib/db";

export default async function LecturerHome() {
  const [studentCount, questionCount, quizCount, attemptCount] = await Promise.all([
    get<{ c: number }>(`SELECT COUNT(*) as c FROM users WHERE role='student'`),
    get<{ c: number }>(`SELECT COUNT(*) as c FROM questions`),
    get<{ c: number }>(`SELECT COUNT(*) as c FROM quizzes`),
    get<{ c: number }>(`SELECT COUNT(*) as c FROM attempts WHERE status='completed'`),
  ]);

  const recentQuizzes = await all<{
    id: number;
    title: string;
    kind: string;
    status: string;
    created_at: string;
  }>(
    `SELECT id, title, kind, status, created_at FROM quizzes ORDER BY created_at DESC LIMIT 5`
  );

  const stats = [
    { label: "Mahasiswa", value: studentCount?.c ?? 0, icon: "🎓", color: "text-brand-600" },
    { label: "Bank Soal", value: questionCount?.c ?? 0, icon: "📝", color: "text-emerald-600" },
    { label: "Kuis & UAS", value: quizCount?.c ?? 0, icon: "🏆", color: "text-amber-600" },
    { label: "Pengerjaan Selesai", value: attemptCount?.c ?? 0, icon: "✅", color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Selamat datang, Dosen 👋</h1>
          <p className="text-sm text-slate-600">Ringkasan kelas mata kuliah Kewarganegaraan PGMI.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/lecturer/questions/new" className="btn-primary">+ Soal Baru</Link>
          <Link href="/lecturer/quizzes/new" className="btn-primary bg-amber-600 hover:bg-amber-700 focus:ring-amber-500">+ Kuis Baru</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-600">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Kuis &amp; UAS Terbaru</h2>
          <Link href="/lecturer/quizzes" className="text-sm text-brand-600 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {recentQuizzes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 text-center py-8">
            Belum ada kuis. <Link href="/lecturer/quizzes/new" className="text-brand-600 hover:underline">Buat kuis pertama Anda</Link>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentQuizzes.map((q) => (
              <li key={q.id} className="py-2 flex items-center justify-between">
                <div>
                  <Link href={`/lecturer/quizzes/${q.id}`} className="font-medium hover:underline">
                    {q.title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {q.kind.toUpperCase()} · {new Date(q.created_at).toLocaleDateString("id-ID")}
                  </div>
                </div>
                <StatusBadge status={q.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/lecturer/results" className="card hover:shadow-md transition">
          <div className="text-2xl">📈</div>
          <h3 className="mt-2 font-semibold">Rekap Nilai Kelas</h3>
          <p className="text-sm text-slate-600">Lihat distribusi skor, leaderboard, dan ekspor data.</p>
        </Link>
        <Link href="/lecturer/groups" className="card hover:shadow-md transition">
          <div className="text-2xl">👥</div>
          <h3 className="mt-2 font-semibold">Atur Kelompok</h3>
          <p className="text-sm text-slate-600">Bagi mahasiswa ke dalam kelompok untuk kuis kolaboratif.</p>
        </Link>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    open: "bg-emerald-100 text-emerald-700",
    closed: "bg-rose-100 text-rose-700",
  };
  return <span className={`badge ${map[status] ?? "bg-slate-100"}`}>{status}</span>;
}
