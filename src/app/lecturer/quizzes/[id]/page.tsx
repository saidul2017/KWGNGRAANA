import { notFound } from "next/navigation";
import Link from "next/link";
import { all, get } from "@/lib/db";
import {
  rowToQuiz,
  rowToQuestion,
  type QuizRow,
  type QuestionRow,
  type Question,
} from "@/lib/types";
import QuizBuilder from "../QuizBuilder";
import HostLiveButton from "./HostLiveButton";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const row = await get<QuizRow>(`SELECT * FROM quizzes WHERE id = ?`, [id]);
  if (!row) return notFound();
  const quiz = rowToQuiz(row);

  const allQs = await all<QuestionRow>(`SELECT * FROM questions ORDER BY topic, id DESC`);
  const allQuestions: Question[] = allQs.map(rowToQuestion);

  const selected = await all<{ question_id: number }>(
    `SELECT question_id FROM quiz_questions WHERE quiz_id = ? ORDER BY position ASC`,
    [id]
  );
  const selectedIds = selected.map((s) => s.question_id);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/lecturer/quizzes" className="text-xs text-slate-500 hover:underline">
            ← Kembali ke daftar
          </Link>
          <h1 className="text-2xl font-bold mt-1">{quiz.title}</h1>
          <p className="text-sm text-slate-600">
            {quiz.kind.toUpperCase()} ·{" "}
            {quiz.mode === "group" ? "Mode Kelompok" : "Mode Individu"} · Status:{" "}
            <span className="font-semibold">{quiz.status}</span>
          </p>
        </div>
        <HostLiveButton quizId={quiz.id} disabled={selectedIds.length === 0} />
      </header>

      <QuizBuilder
        questions={allQuestions}
        initial={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description ?? "",
          kind: quiz.kind,
          mode: quiz.mode,
          shuffle: quiz.shuffle,
          selectedIds,
          status: quiz.status,
        }}
      />
    </div>
  );
}
