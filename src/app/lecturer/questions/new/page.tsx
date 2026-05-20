import QuestionForm from "../QuestionForm";

export default function NewQuestionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tambah Soal Baru</h1>
      <p className="text-sm text-slate-600">
        Soal pilihan ganda dengan 2–6 opsi. Pastikan menyertakan rujukan resmi (UUD,
        UU, atau materi RPS) agar mahasiswa terbiasa berpikir konstitusional.
      </p>
      <QuestionForm />
    </div>
  );
}
