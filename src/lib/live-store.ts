/**
 * Penyimpanan in-memory untuk sesi Live Kahoot.
 *
 * Catatan: state hanya bertahan selama proses Node hidup. Cocok untuk
 * deployment tunggal (1 server). Untuk skala besar, ganti dengan Redis.
 */
import type { Question } from "./types";
import { calculateScore, shuffle } from "./scoring";

export type LiveAnswerEntry = {
  selectedIndex: number; // -1 = tidak menjawab / timeout
  responseMs: number;
  isCorrect: boolean;
  points: number;
};

export type LivePlayer = {
  userId: number;
  name: string;
  nim?: string;
  groupId?: number | null;
  groupName?: string | null;
  joinedAt: number;
  score: number;
  answers: Record<number, LiveAnswerEntry>;
};

export type LiveStatus = "lobby" | "question" | "reveal" | "final";

export type LiveSession = {
  pin: string;
  quizId: number;
  quizTitle: string;
  quizMode: "individual" | "group";
  hostId: number;
  hostName: string;
  status: LiveStatus;
  currentIndex: number; // -1 di lobby
  startedAt: number | null; // ms saat soal saat ini dimulai
  questions: Question[];
  players: Record<number, LivePlayer>;
  finishedAt?: number;
  saved?: boolean;
  createdAt: number;
};

const STORE_KEY = "__kwgn_live_sessions__";
type Globals = { [STORE_KEY]?: Map<string, LiveSession> };
const g = globalThis as unknown as Globals;
if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, LiveSession>();
export const sessions: Map<string, LiveSession> = g[STORE_KEY]!;

/** Bersihkan sesi tua (>24 jam) untuk hemat memori. */
function gc() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [pin, s] of sessions.entries()) {
    if (s.createdAt < cutoff) sessions.delete(pin);
  }
}

export function generatePin(): string {
  gc();
  let pin: string;
  let tries = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    tries++;
  } while (sessions.has(pin) && tries < 50);
  return pin;
}

export function createSession(args: {
  quizId: number;
  quizTitle: string;
  quizMode: "individual" | "group";
  hostId: number;
  hostName: string;
  questions: Question[];
  shuffleQuestions: boolean;
}): LiveSession {
  const pin = generatePin();
  const qs = args.shuffleQuestions ? shuffle(args.questions) : [...args.questions];
  const session: LiveSession = {
    pin,
    quizId: args.quizId,
    quizTitle: args.quizTitle,
    quizMode: args.quizMode,
    hostId: args.hostId,
    hostName: args.hostName,
    status: "lobby",
    currentIndex: -1,
    startedAt: null,
    questions: qs,
    players: {},
    createdAt: Date.now(),
  };
  sessions.set(pin, session);
  return session;
}

export function getSession(pin: string): LiveSession | undefined {
  return sessions.get(pin);
}

/** Lazy auto-reveal: jika status 'question' dan timer habis, flip ke 'reveal'. */
export function tickSession(s: LiveSession): LiveSession {
  if (s.status === "question" && s.startedAt) {
    const q = s.questions[s.currentIndex];
    if (q && Date.now() - s.startedAt > q.timeLimit * 1000) {
      s.status = "reveal";
    }
  }
  return s;
}

export function joinSession(
  pin: string,
  user: { id: number; name: string; nim?: string; groupId?: number | null; groupName?: string | null }
): LiveSession | null {
  const s = sessions.get(pin);
  if (!s) return null;
  if (s.status === "final") return null;
  if (!s.players[user.id]) {
    s.players[user.id] = {
      userId: user.id,
      name: user.name,
      nim: user.nim,
      groupId: user.groupId,
      groupName: user.groupName,
      joinedAt: Date.now(),
      score: 0,
      answers: {},
    };
  }
  return s;
}

/**
 * Host advance state machine:
 * - lobby → question (currentIndex 0)
 * - question → reveal
 * - reveal → question (next) atau final (jika sudah soal terakhir)
 */
export function hostAdvance(pin: string, hostId: number): LiveSession | null {
  const s = sessions.get(pin);
  if (!s || s.hostId !== hostId) return null;
  tickSession(s);

  if (s.status === "lobby") {
    if (s.questions.length === 0) {
      s.status = "final";
      s.finishedAt = Date.now();
      return s;
    }
    s.currentIndex = 0;
    s.status = "question";
    s.startedAt = Date.now();
  } else if (s.status === "question") {
    s.status = "reveal";
  } else if (s.status === "reveal") {
    if (s.currentIndex < s.questions.length - 1) {
      s.currentIndex++;
      s.status = "question";
      s.startedAt = Date.now();
    } else {
      s.status = "final";
      s.finishedAt = Date.now();
    }
  }
  return s;
}

export function submitAnswer(args: {
  pin: string;
  userId: number;
  questionId: number;
  selectedIndex: number;
  responseMs: number;
}): { ok: true; isCorrect: boolean; points: number; runningScore: number } | { ok: false; error: string } {
  const s = sessions.get(args.pin);
  if (!s) return { ok: false, error: "Sesi tidak ditemukan" };
  tickSession(s);
  if (s.status !== "question") return { ok: false, error: "Belum waktunya menjawab" };

  const q = s.questions[s.currentIndex];
  if (!q || q.id !== args.questionId) return { ok: false, error: "Soal tidak sesuai" };

  const player = s.players[args.userId];
  if (!player) return { ok: false, error: "Anda belum bergabung ke sesi" };
  if (player.answers[args.questionId]) return { ok: false, error: "Sudah dijawab" };

  const isCorrect = args.selectedIndex === q.correctIndex;
  const points = calculateScore({
    isCorrect,
    responseMs: args.responseMs,
    timeLimitSec: q.timeLimit,
    maxPoints: q.maxPoints,
  });
  player.answers[args.questionId] = {
    selectedIndex: args.selectedIndex,
    responseMs: args.responseMs,
    isCorrect,
    points,
  };
  player.score += points;
  return { ok: true, isCorrect, points, runningScore: player.score };
}

/**
 * Bentuk view publik tergantung peran pengamat.
 * - Host melihat correctIndex selalu.
 * - Player tidak melihat correctIndex saat status 'question'.
 */
export function publicView(
  pin: string,
  viewer: { role: "host" | "player"; userId: number }
) {
  const s = sessions.get(pin);
  if (!s) return null;
  tickSession(s);

  const players = Object.values(s.players);
  const currentQ = s.currentIndex >= 0 ? s.questions[s.currentIndex] : null;
  const me = s.players[viewer.userId];

  let timeLeftMs = 0;
  if (s.status === "question" && s.startedAt && currentQ) {
    timeLeftMs = Math.max(0, currentQ.timeLimit * 1000 - (Date.now() - s.startedAt));
  }

  const base = {
    pin: s.pin,
    quizId: s.quizId,
    quizTitle: s.quizTitle,
    quizMode: s.quizMode,
    status: s.status,
    currentIndex: s.currentIndex,
    totalQuestions: s.questions.length,
    playerCount: players.length,
    timeLeftMs,
    myScore: me?.score ?? 0,
    hostName: s.hostName,
  };

  if (s.status === "lobby") {
    return {
      ...base,
      players: players
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((p) => ({ id: p.userId, name: p.name, nim: p.nim, groupName: p.groupName })),
    };
  }

  if (s.status === "question" && currentQ) {
    const myAnswered = !!me?.answers[currentQ.id];
    const answeredCount = players.filter((p) => p.answers[currentQ.id]).length;
    const playerQuestion = {
      id: currentQ.id,
      topic: currentQ.topic,
      text: currentQ.text,
      options: currentQ.options,
      timeLimit: currentQ.timeLimit,
      maxPoints: currentQ.maxPoints,
      sourceRef: currentQ.sourceRef,
    };
    return {
      ...base,
      myAnswered,
      answeredCount,
      question: viewer.role === "host"
        ? { ...playerQuestion, correctIndex: currentQ.correctIndex, explanation: currentQ.explanation }
        : playerQuestion,
    };
  }

  if (s.status === "reveal" && currentQ) {
    const myAnswer = me?.answers[currentQ.id];
    const optionCounts = currentQ.options.map(
      (_, i) => players.filter((p) => p.answers[currentQ.id]?.selectedIndex === i).length
    );
    const top = [...players].sort((a, b) => b.score - a.score).slice(0, 5);
    return {
      ...base,
      question: {
        ...currentQ,
        // explicit untuk klien
      },
      myAnswer: myAnswer ?? null,
      optionCounts,
      topPlayers: top.map((p) => ({ id: p.userId, name: p.name, score: p.score })),
    };
  }

  // final
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const myRank = ranked.findIndex((p) => p.userId === viewer.userId);
  return {
    ...base,
    leaderboard: ranked.map((p, idx) => ({
      rank: idx + 1,
      id: p.userId,
      name: p.name,
      nim: p.nim,
      groupName: p.groupName,
      score: p.score,
      correct: Object.values(p.answers).filter((a) => a.isCorrect).length,
    })),
    myRank: myRank >= 0 ? myRank + 1 : null,
  };
}

export function killSession(pin: string, hostId: number): boolean {
  const s = sessions.get(pin);
  if (!s || s.hostId !== hostId) return false;
  sessions.delete(pin);
  return true;
}
