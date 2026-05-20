/**
 * Penilaian gaya Kahoot:
 * - Jawaban salah     : 0 poin
 * - Jawaban benar     : maxPoints * (1 - 0.5 * t/T)
 *                        di mana t = waktu respon, T = batas waktu (ms)
 *   Artinya: jawaban tercepat ≈ maxPoints, jawaban di detik terakhir ≈ 50% maxPoints.
 * - Jika t > T (timeout), 0 poin.
 */
export function calculateScore(args: {
  isCorrect: boolean;
  responseMs: number;
  timeLimitSec: number;
  maxPoints: number;
}): number {
  if (!args.isCorrect) return 0;
  const limitMs = args.timeLimitSec * 1000;
  const t = Math.max(0, Math.min(args.responseMs, limitMs));
  const factor = 1 - 0.5 * (t / limitMs);
  return Math.round(args.maxPoints * factor);
}

/** Acak in-place (Fisher–Yates). Stable seed opsional. */
export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let rnd = seed ?? Math.random() * 0xffffffff;
  function next() {
    if (seed === undefined) return Math.random();
    // mulberry32
    rnd |= 0;
    rnd = (rnd + 0x6d2b79f5) | 0;
    let t = rnd;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
