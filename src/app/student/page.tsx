import Link from "next/link";
import { all, get } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentHome({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const user = await requireUser("student");

  const [practiceCount, quizCount, attempts] = await Promise.all([
    get<{ c: number }>(`SELECT COUNT(*) AS c FROM quizzes WHERE kind='practice'`),
    get<{ c: number }>(`SELECT COUNT(*) AS c FROM quizzes WHERE kind IN ('quiz','uas') AND status='open'`),
    all<{ id: number; quiz_id: number; total_score: number; total_correct: number; total_questions: number; finished_at: string | null; quiz_title: string; quiz_kind: string }>(
      `SELECT a.id, a.quiz_id, a.total_score, a.total_correct, a.total_questions, a.finished_at,
              q.title AS quiz_title, q.kind AS quiz_kind
       FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = ? AND a.status = 'completed'
       ORDER BY a.finished_at DESC
       LIMIT 5`,
      [user.id]
    ),
  ]);

  const totalPoints = await get<{ s: number | null }>(
    `SELECT SUM(total_score) AS s FROM attempts WHERE user_id = ? AND status='completed'`,
    [user.id]
  );

  return (
    <div className="space-y-6">
      {searchParams?.error && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {searchParams.error}
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold">Halo, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-600">
          NIM <strong>{user.nim}</strong> · Selamat belajar Pancasila &amp; Kewarganegaraan!
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/student/live" className="card border-2 border-rose-200 hover:shadow-lg transition group bg-gradient-to-br from-rose-50 to-amber-50">
          <div className="text-3xl">🎮</div>
          <h2 className="mt-2 font-semibold group-hover:text-rose-700">Gabung Sesi Live Kahoot</h2>
          <p className="text-sm text-slate-600">Masukkan PIN dari layar dosen dan ikut bermain langsung di kelas.</p>
        </Link>
        <Link href="/student/chatbot" className="card hover:shadow-md transition group">
          <div className="text-3xl">💬</div>
          <h2 className="mt-2 font-semibold group-hover:text-brand-700">Chatbot PKn</h2>
          <p className="text-sm text-slate-600">Tanya seputar Pancasila, UUD 1945, Demokrasi.</p>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/student/practice" className="card hover:shadow-md transition group">
          <div className="text-3xl">🎯</div>
          <h2 className="mt-2 font-semibold group-hover:text-brand-700">Latihan Mandiri</h2>
          <p className="text-sm text-slate-600">{practiceCount?.c ?? 0} latihan tersedia.</p>
        </Link>
        <Link href="/student/quizzes" className="card hover:shadow-md transition group">
          <div className="text-3xl">🏆</div>
          <h2 className="mt-2 font-semibold group-hover:text-brand-700">Kuis &amp; UAS</h2>
          <p className="text-sm text-slate-600">{quizCount?.c ?? 0} kuis sedang aktif.</p>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">📊 Ringkasan Skor</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Total Poin" value={totalPoints?.s ?? 0} />
            <Stat label="Pengerjaan Selesai" value={attempts.length} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold">🕘 Riwayat Terbaru</h3>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Belum ada pengerjaan.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {attempts.map((a) => (
                <li key={a.id} className="py-2 flex justify-between items-center text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.quiz_title}</div>
                    <div className="text-xs text-slate-500">
                      {a.quiz_kind} · {a.total_correct}/{a.total_questions} benar
                    </div>
                  </div>
                  <span className="font-bold text-brand-700">{a.total_score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-brand-50 p-3">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-2xl font-extrabold text-brand-700">{value}</div>
    </div>
  );
}
