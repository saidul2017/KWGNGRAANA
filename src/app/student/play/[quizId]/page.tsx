import { notFound, redirect } from "next/navigation";
import QuizPlayer from "@/components/QuizPlayer";
import { all, get, run } from "@/lib/db";
import { rowToQuiz, rowToQuestion, type QuizRow, type QuestionRow } from "@/lib/types";
import { requireUser } from "@/lib/session";
import { shuffle } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: { quizId: string };
}) {
  const user = await requireUser("student");
  const quizId = Number(params.quizId);
  const quizRow = await get<QuizRow>(`SELECT * FROM quizzes WHERE id = ?`, [quizId]);
  if (!quizRow) return notFound();
  const quiz = rowToQuiz(quizRow);

  if (quiz.kind !== "practice" && quiz.status !== "open") {
    redirect(
      `/student?error=${encodeURIComponent(
        `Kuis "${quiz.title}" belum dibuka oleh dosen.`
      )}`
    );
  }

  if (quiz.kind !== "practice") {
    const done = await get<{ id: number }>(
      `SELECT id FROM attempts WHERE quiz_id = ? AND user_id = ? AND status='completed' LIMIT 1`,
      [quizId, user.id]
    );
    if (done) {
      redirect(`/student/results?focus=${done.id}`);
    }
  }

  let attempt = await get<{ id: number }>(
    `SELECT id FROM attempts WHERE quiz_id = ? AND user_id = ? AND status='in_progress' LIMIT 1`,
    [quizId, user.id]
  );

  const questions = await all<QuestionRow & { position: number }>(
    `SELECT q.*, qq.position FROM questions q
     JOIN quiz_questions qq ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
     ORDER BY qq.position ASC`,
    [quizId]
  );
  if (questions.length === 0) {
    return (
      <div className="card text-center text-slate-600">
        Kuis ini belum berisi soal. Hubungi dosen Anda.
      </div>
    );
  }

  let ordered = questions.map(rowToQuestion);
  if (quiz.shuffle) {
    const seed = (user.id * 1009 + quizId * 31 + (attempt?.id ?? Date.now())) | 0;
    ordered = shuffle(ordered, seed);
  }

  if (!attempt) {
    const r = await run(
      `INSERT INTO attempts (quiz_id, user_id, group_id, total_questions, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
      [quizId, user.id, user.groupId ?? null, ordered.length]
    );
    attempt = { id: r.lastInsertRowid };
  }

  const safeQuestions = ordered.map((q) => ({
    id: q.id,
    topic: q.topic,
    text: q.text,
    type: (q.type === "essay" ? "essay" : "mcq") as "mcq" | "essay",
    options: q.options,
    timeLimit: q.timeLimit,
    maxPoints: q.maxPoints,
    sourceRef: q.sourceRef,
    essayMinWords: q.essayMinWords,
  }));

  return (
    <div className="space-y-4">
      <QuizPlayer
        attemptId={attempt.id}
        quizTitle={quiz.title}
        quizKind={quiz.kind}
        questions={safeQuestions}
      />
    </div>
  );
}
