import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";
import EssayReviewer from "./EssayReviewer";

export const dynamic = "force-dynamic";

type Row = {
  answer_id: number;
  attempt_id: number;
  user_id: number;
  user_name: string;
  user_nim: string;
  group_name: string | null;
  question_id: number;
  question_topic: string;
  question_text: string;
  question_max: number;
  question_key_points: string | null;
  question_source_ref: string | null;
  essay_text: string | null;
  ai_feedback: string | null;
  score_awarded: number;
  original_score: number | null;
  lecturer_note: string | null;
  reviewed_at: string | null;
  quiz_id: number;
  quiz_title: string;
  finished_at: string | null;
};

export default async function EssaysReviewPage({
  searchParams,
}: {
  searchParams?: { quizId?: string; filter?: string };
}) {
  await requireUser("lecturer");
  const quizFilter = searchParams?.quizId ? Number(searchParams.quizId) : null;
  const onlyUnreviewed = searchParams?.filter === "unreviewed";

  const quizzes = await all<{ id: number; title: string; n_essay: number }>(
    `SELECT q.id, q.title,
            (SELECT COUNT(*) FROM quiz_questions qq
              JOIN questions qn ON qn.id = qq.question_id
              WHERE qq.quiz_id = q.id AND qn.type='essay') AS n_essay
     FROM quizzes q
     ORDER BY q.created_at DESC`
  );
  const quizzesWithEssay = quizzes.filter((q) => q.n_essay > 0);

  const params: unknown[] = [];
  let whereExtra = "";
  if (quizFilter) {
    whereExtra += " AND a.quiz_id = ?";
    params.push(quizFilter);
  }
  if (onlyUnreviewed) {
    whereExtra += " AND ans.reviewed_at IS NULL";
  }

  const rows = await all<Row>(
    `SELECT
       ans.id AS answer_id, ans.attempt_id, ans.essay_text, ans.ai_feedback,
       ans.score_awarded, ans.original_score, ans.lecturer_note, ans.reviewed_at,
       u.id AS user_id, u.name AS user_name, u.nim AS user_nim,
       g.name AS group_name,
       qn.id AS question_id, qn.topic AS question_topic, qn.text AS question_text,
       qn.max_points AS question_max, qn.essay_key_points AS question_key_points,
       qn.source_ref AS question_source_ref,
       qz.id AS quiz_id, qz.title AS quiz_title,
       a.finished_at
     FROM answers ans
     JOIN attempts a ON a.id = ans.attempt_id
     JOIN questions qn ON qn.id = ans.question_id AND qn.type='essay'
     JOIN users u ON u.id = a.user_id
     LEFT JOIN groups g ON g.id = u.group_id
     JOIN quizzes qz ON qz.id = a.quiz_id
     WHERE 1=1 ${whereExtra}
     ORDER BY ans.reviewed_at IS NULL DESC, a.finished_at DESC`,
    params
  );

  const reviewed = rows.filter((r) => r.reviewed_at).length;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📝 Tinjauan Esai</h1>
          <p className="text-sm text-slate-600">
            Skor AI bisa Anda override jika perlu. Total <strong>{rows.length}</strong> jawaban
            esai · sudah ditinjau <strong>{reviewed}</strong>.
          </p>
        </div>
        <form className="flex flex-wrap gap-2 items-end">
          <select
            name="quizId"
            defaultValue={searchParams?.quizId ?? ""}
            className="input max-w-[260px]"
          >
            <option value="">Semua kuis dengan esai</option>
            {quizzesWithEssay.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.n_essay} esai)
              </option>
            ))}
          </select>
          <select
            name="filter"
            defaultValue={searchParams?.filter ?? ""}
            className="input max-w-[200px]"
          >
            <option value="">Semua status</option>
            <option value="unreviewed">Belum ditinjau</option>
          </select>
          <button type="submit" className="btn-primary">Filter</button>
        </form>
      </header>

      {rows.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          {quizzesWithEssay.length === 0 ? (
            <>
              Belum ada kuis berisi soal esai. Buat soal esai di{" "}
              <Link href="/lecturer/questions/new" className="text-brand-600 hover:underline">
                Bank Soal
              </Link>.
            </>
          ) : (
            <>Tidak ada jawaban esai untuk filter saat ini.</>
          )}
        </div>
      ) : (
        <EssayReviewer rows={rows} />
      )}
    </div>
  );
}
