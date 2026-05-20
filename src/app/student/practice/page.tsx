import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticeListPage() {
  await requireUser("student");
  const list = await all<{
    id: number;
    title: string;
    description: string | null;
    question_count: number;
  }>(
    `SELECT q.id, q.title, q.description,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
     FROM quizzes q
     WHERE q.kind = 'practice'
     ORDER BY q.created_at DESC`
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">🎯 Latihan Mandiri</h1>
        <p className="text-sm text-slate-600">
          Berlatih sebanyak Anda mau — tanpa nilai, dengan umpan balik langsung.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          Belum ada latihan. Tunggu dosen membuat latihan baru.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className="card">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description || "—"}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="badge bg-slate-100">{p.question_count} soal</span>
                <Link href={`/student/play/${p.id}`} className="btn-primary text-sm">
                  Mulai Berlatih →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
