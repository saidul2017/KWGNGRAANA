/**
 * Auto-grading soal esai menggunakan Gemini.
 *
 * Strategi: prompt Gemini dengan rubrik (key points) lalu paksa output JSON
 * dengan responseSchema. Jika gagal, fallback ke score 0 dengan feedback
 * "memerlukan penilaian manual".
 */
import { generateContent, isLlmEnabled } from "./llm";

export type EssayGradingArgs = {
  questionText: string;
  questionTopic: string;
  sourceRef?: string | null;
  keyPoints: string[]; // poin kunci yang harus muncul
  studentAnswer: string;
  maxPoints: number;
};

export type EssayGradingResult = {
  scorePct: number; // 0..100
  scoreAwarded: number; // dibulatkan ke 0..maxPoints
  feedback: string;
  matchedPoints: string[];
  missingPoints: string[];
  needsReview: boolean; // true jika fallback / Gemini ragu
};

const SYSTEM = `
Anda adalah penilai mata kuliah Kewarganegaraan PGMI yang adil, ringkas, dan
berbasis rubrik. Tugas Anda menilai jawaban esai mahasiswa terhadap satu soal.

ATURAN KETAT:
1. Skor adalah ANGKA INTEGER 0–100 (persentase) yang mencerminkan SEBERAPA
   LENGKAP poin kunci pada rubrik tertangkap dalam jawaban mahasiswa
   (boleh diparafrase, tidak harus persis kata demi kata).
2. Skor 0 jika jawaban kosong / tidak nyambung dengan soal.
3. Skor 100 hanya jika seluruh poin kunci tertangkap dengan benar &
   menggunakan istilah Kewarganegaraan yang tepat.
4. Pertimbangkan juga: relevansi, akurasi (tidak ngarang Pasal/UU), dan
   penggunaan istilah PKn (Pancasila, demokrasi konstitusional, HAM, dsb.).
5. Feedback: Bahasa Indonesia santun, 2–3 kalimat, konstruktif, sebut poin
   yang sudah benar dan poin yang masih kurang. Akhiri dengan saran
   perbaikan yang spesifik.
6. JANGAN beri kebijakan partisan atau opini politik pribadi.
7. Output WAJIB JSON sesuai schema yang diminta. Tanpa pembungkus markdown.
`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    scorePct: { type: "INTEGER", minimum: 0, maximum: 100 },
    feedback: { type: "STRING" },
    matchedPoints: { type: "ARRAY", items: { type: "STRING" } },
    missingPoints: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["scorePct", "feedback", "matchedPoints", "missingPoints"],
};

export async function gradeEssay(args: EssayGradingArgs): Promise<EssayGradingResult> {
  const trimmed = args.studentAnswer.trim();
  if (trimmed.length === 0) {
    return {
      scorePct: 0,
      scoreAwarded: 0,
      feedback:
        "Jawaban kosong. Tuliskan minimal 1 paragraf yang menjawab pertanyaan dengan menyertakan poin-poin kunci yang dibahas di kelas.",
      matchedPoints: [],
      missingPoints: args.keyPoints,
      needsReview: false,
    };
  }
  if (!isLlmEnabled()) {
    return {
      scorePct: 0,
      scoreAwarded: 0,
      feedback:
        "Mode AI grading belum aktif. Jawaban Anda akan dinilai manual oleh dosen.",
      matchedPoints: [],
      missingPoints: args.keyPoints,
      needsReview: true,
    };
  }

  const userMsg = [
    `Topik: ${args.questionTopic}`,
    args.sourceRef ? `Rujukan resmi: ${args.sourceRef}` : "",
    "",
    `Soal: ${args.questionText}`,
    "",
    "Poin kunci (rubrik) yang harus muncul dalam jawaban:",
    ...args.keyPoints.map((p, i) => `${i + 1}. ${p}`),
    "",
    "Jawaban mahasiswa:",
    `"""${trimmed}"""`,
    "",
    "Tolong nilai jawaban di atas dan berikan skor + feedback dalam format JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await generateContent({
      systemInstruction: SYSTEM,
      userMessage: userMsg,
      temperature: 0.2,
      maxOutputTokens: 1024,
      disableThinking: true,
      responseSchema: SCHEMA,
    });

    const j = res.json as
      | {
          scorePct?: number;
          feedback?: string;
          matchedPoints?: string[];
          missingPoints?: string[];
        }
      | undefined;
    if (!j || typeof j.scorePct !== "number") {
      throw new Error("LLM mengembalikan format tidak terduga");
    }
    const pct = Math.max(0, Math.min(100, Math.round(j.scorePct)));
    return {
      scorePct: pct,
      scoreAwarded: Math.round((pct / 100) * args.maxPoints),
      feedback: j.feedback ?? "(tanpa feedback)",
      matchedPoints: Array.isArray(j.matchedPoints) ? j.matchedPoints : [],
      missingPoints: Array.isArray(j.missingPoints) ? j.missingPoints : [],
      needsReview: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      scorePct: 0,
      scoreAwarded: 0,
      feedback: `Gagal menilai otomatis (${msg}). Jawaban akan ditandai untuk ditinjau dosen.`,
      matchedPoints: [],
      missingPoints: args.keyPoints,
      needsReview: true,
    };
  }
}
