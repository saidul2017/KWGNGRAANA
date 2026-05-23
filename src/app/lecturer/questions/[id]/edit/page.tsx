import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import { rowToQuestion, type QuestionRow } from "@/lib/types";
import QuestionForm from "../../QuestionForm";

// Membaca DB untuk soal spesifik → wajib dievaluasi saat request, bukan build.
export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const row = await get<QuestionRow>(`SELECT * FROM questions WHERE id = ?`, [id]);
  if (!row) return notFound();
  const q = rowToQuestion(row);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ubah Soal #{q.id}</h1>
      <QuestionForm
        initial={{
          id: q.id,
          topic: q.topic,
          text: q.text,
          type: q.type === "essay" ? "essay" : "mcq",
          options: q.options.length > 0 ? q.options : ["", "", "", ""],
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? "",
          sourceRef: q.sourceRef ?? "",
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          maxPoints: q.maxPoints,
          essayKeyPoints:
            q.essayKeyPoints && q.essayKeyPoints.length > 0 ? q.essayKeyPoints : [""],
          essayMinWords: q.essayMinWords ?? 30,
        }}
      />
    </div>
  );
}
