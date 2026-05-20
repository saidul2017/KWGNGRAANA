import Link from "next/link";
import { all } from "@/lib/db";
import { rowToQuestion, type QuestionRow } from "@/lib/types";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const rows = await all<QuestionRow>(
    `SELECT * FROM questions ORDER BY topic ASC, id DESC`
  );
  const questions = rows.map(rowToQuestion);

  // Group by topic
  const byTopic = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
    byTopic.get(q.topic)!.push(q);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bank Soal</h1>
          <p className="text-sm text-slate-600">
            Total <strong>{questions.length}</strong> soal dalam <strong>{byTopic.size}</strong> topik.
          </p>
        </div>
        <Link href="/lecturer/questions/new" className="btn-primary">+ Tambah Soal</Link>
      </header>

      {questions.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          Belum ada soal. <Link href="/lecturer/questions/new" className="text-brand-600 hover:underline">Tambah soal pertama</Link>.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byTopic.entries()).map(([topic, list]) => (
            <section key={topic}>
              <h2 className="font-semibold mb-2 text-slate-800">
                📚 {topic} <span className="text-xs font-normal text-slate-500">({list.length})</span>
              </h2>
              <div className="card divide-y divide-slate-100 p-0">
                {list.map((q) => (
                  <div key={q.id} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{q.text}</p>
                      <ul className="mt-1 text-xs text-slate-600 space-y-0.5">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={i === q.correctIndex ? "text-emerald-700 font-semibold" : ""}
                          >
                            {String.fromCharCode(65 + i)}. {opt}{i === q.correctIndex && " ✓"}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="badge bg-slate-100">{q.difficulty}</span>
                        <span className="badge bg-slate-100">⏱️ {q.timeLimit}s</span>
                        <span className="badge bg-slate-100">🏅 {q.maxPoints} pts</span>
                        {q.sourceRef && (
                          <span className="badge bg-amber-50 text-amber-800">📖 {q.sourceRef}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Link href={`/lecturer/questions/${q.id}/edit`} className="btn-ghost text-xs">Ubah</Link>
                      <DeleteButton id={q.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
