import { requireUser } from "@/lib/session";
import ImportForm from "./ImportForm";

// requireUser membaca cookie session → harus dynamic.
export const dynamic = "force-dynamic";

export default async function ImportQuestionsPage() {
  await requireUser("lecturer");
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">📥 Import Soal dari Excel</h1>
        <p className="text-sm text-slate-600">
          Unggah file <strong>.xlsx</strong> berisi bank soal. Soal yang sama (topic + text)
          tidak akan diduplikasi (idempoten).
        </p>
      </header>

      <div className="card">
        <h2 className="font-semibold mb-2">1. Unduh template terlebih dahulu</h2>
        <p className="text-sm text-slate-600 mb-3">
          Kolom wajib: <code className="text-xs bg-slate-100 px-1">type</code>{" "}
          (mcq/essay), <code className="text-xs bg-slate-100 px-1">topic</code>,{" "}
          <code className="text-xs bg-slate-100 px-1">text</code>.
          <br />
          MCQ: <code className="text-xs bg-slate-100 px-1">optionA..F</code> +{" "}
          <code className="text-xs bg-slate-100 px-1">correct</code> (A..F).
          <br />
          Essay: <code className="text-xs bg-slate-100 px-1">keyPoints</code>{" "}
          (poin dipisah <code className="bg-slate-100 px-1">|</code>) +{" "}
          <code className="text-xs bg-slate-100 px-1">minWords</code>.
          <br />
          Opsional: <code className="text-xs bg-slate-100 px-1">explanation</code>,{" "}
          <code className="text-xs bg-slate-100 px-1">sourceRef</code>,{" "}
          <code className="text-xs bg-slate-100 px-1">difficulty</code>,{" "}
          <code className="text-xs bg-slate-100 px-1">timeLimit</code>,{" "}
          <code className="text-xs bg-slate-100 px-1">maxPoints</code>.
        </p>
        <a
          href="/api/questions/template"
          className="btn-primary bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
        >
          📄 Unduh Template Excel
        </a>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">2. Unggah file yang sudah diisi</h2>
        <ImportForm />
      </div>
    </div>
  );
}
