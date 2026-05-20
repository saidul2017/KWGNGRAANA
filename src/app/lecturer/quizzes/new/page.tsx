import { all } from "@/lib/db";
import { rowToQuestion, type QuestionRow } from "@/lib/types";
import QuizBuilder from "../QuizBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  const rows = await all<QuestionRow>(`SELECT * FROM questions ORDER BY topic, id DESC`);
  const questions = rows.map(rowToQuestion);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Buat Kuis / UAS / Latihan Baru</h1>
      <p className="text-sm text-slate-600">
        Pilih jenis (Latihan Mandiri tanpa nilai · Kuis dinilai · UAS ujian akhir),
        mode (Individu / Kelompok), dan soal-soal yang akan dimasukkan.
      </p>
      <QuizBuilder questions={questions} />
    </div>
  );
}
