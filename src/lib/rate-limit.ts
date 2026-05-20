/**
 * Rate limiter sliding window in-memory.
 *
 * Pakai untuk endpoint yang memanggil API berbayar (chatbot, essay grading).
 * In-memory cocok untuk single-server deployment; untuk multi-instance,
 * ganti dengan Redis.
 */
type Bucket = { times: number[] };
const STORE_KEY = "__kwgn_rate_buckets__";
const g = globalThis as unknown as { [STORE_KEY]?: Map<string, Bucket> };
if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, Bucket>();
const buckets = g[STORE_KEY]!;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number; limit: number };

/**
 * Cek apakah `key` masih boleh request.
 *
 * @param key       — identifier unik (mis. `chatbot:user:42`)
 * @param limit     — maksimum request dalam window
 * @param windowMs  — panjang window (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { times: [] };
    buckets.set(key, bucket);
  }
  // Buang entri di luar window
  bucket.times = bucket.times.filter((t) => t > cutoff);
  if (bucket.times.length >= limit) {
    const oldest = bucket.times[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return { ok: false, retryAfterMs, limit };
  }
  bucket.times.push(now);
  return { ok: true };
}

/** Bersihkan bucket lama (panggil periodik kalau perlu). */
export function gcRateLimits(maxAgeMs: number = 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [k, b] of buckets.entries()) {
    if (b.times.length === 0 || b.times[b.times.length - 1] < cutoff) {
      buckets.delete(k);
    }
  }
}
