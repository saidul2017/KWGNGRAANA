export type Question = {
  id: number;
  topic: string;
  text: string;
  type: "mcq" | "tf" | "essay";
  options: string[];
  correctIndex: number;
  explanation: string | null;
  sourceRef: string | null;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  maxPoints: number;
  essayKeyPoints: string[] | null;
  essayMinWords: number | null;
  createdBy: number | null;
  createdAt: string;
};

export type QuestionRow = {
  id: number;
  topic: string;
  text: string;
  type: "mcq" | "tf" | "essay";
  options_json: string;
  correct_index: number;
  explanation: string | null;
  source_ref: string | null;
  difficulty: "easy" | "medium" | "hard";
  time_limit: number;
  max_points: number;
  essay_key_points: string | null;
  essay_min_words: number | null;
  created_by: number | null;
  created_at: string;
};

export function rowToQuestion(r: QuestionRow): Question {
  let kp: string[] | null = null;
  if (r.essay_key_points) {
    try {
      const parsed = JSON.parse(r.essay_key_points);
      kp = Array.isArray(parsed) ? parsed : null;
    } catch {
      kp = null;
    }
  }
  let options: string[] = [];
  try {
    const parsed = JSON.parse(r.options_json || "[]");
    options = Array.isArray(parsed) ? parsed : [];
  } catch {
    options = [];
  }
  return {
    id: r.id,
    topic: r.topic,
    text: r.text,
    type: r.type,
    options,
    correctIndex: r.correct_index,
    explanation: r.explanation,
    sourceRef: r.source_ref,
    difficulty: r.difficulty,
    timeLimit: r.time_limit,
    maxPoints: r.max_points,
    essayKeyPoints: kp,
    essayMinWords: r.essay_min_words,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export type Quiz = {
  id: number;
  title: string;
  description: string | null;
  kind: "practice" | "quiz" | "uas";
  mode: "individual" | "group";
  status: "draft" | "open" | "closed";
  shuffle: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: number | null;
  createdAt: string;
  questionCount?: number;
};

export type QuizRow = {
  id: number;
  title: string;
  description: string | null;
  kind: "practice" | "quiz" | "uas";
  mode: "individual" | "group";
  status: "draft" | "open" | "closed";
  shuffle: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: number | null;
  created_at: string;
  question_count?: number;
};

export function rowToQuiz(r: QuizRow): Quiz {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind,
    mode: r.mode,
    status: r.status,
    shuffle: !!r.shuffle,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    questionCount: r.question_count,
  };
}

export type Group = {
  id: number;
  name: string;
  memberCount?: number;
};

export const TOPICS = [
  "Pancasila",
  "Identitas Nasional",
  "Integrasi Nasional",
  "UUD 1945",
  "Konstitusi",
  "Kewarganegaraan",
  "Hak & Kewajiban",
  "Demokrasi Pancasila",
  "Partisipasi Politik",
  "Penegakan Hukum",
  "Antikorupsi",
  "Wawasan Nusantara",
  "Hubungan Internasional",
  "Ketahanan Nasional",
  "Bela Negara",
  "Refleksi Pendidik",
] as const;
