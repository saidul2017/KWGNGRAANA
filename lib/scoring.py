"""Skoring Kahoot-style + helper esai sederhana.

Formula MCQ Kahoot:
- Jawaban benar: poin = max_points * (1 - 0.5 * (waktu_jawab / waktu_limit))
- Jawaban salah / timeout: 0
- Floor minimum: 50% dari max_points (supaya yang lambat tetap dapat poin)
"""

from __future__ import annotations


def kahoot_score(max_points: int, response_ms: int, time_limit_s: int, is_correct: bool) -> int:
    if not is_correct:
        return 0
    if time_limit_s <= 0:
        return max_points
    ratio = min(max(response_ms / 1000.0 / time_limit_s, 0.0), 1.0)
    score = max_points * (1.0 - 0.5 * ratio)
    return max(int(round(score)), max_points // 2)


def essay_rule_based_score(answer: str, key_points: list[str], min_words: int = 30) -> dict:
    """Fallback grading esai tanpa AI: cek keyword + min words.

    Sederhana banget — dipakai kalau GEMINI_API_KEY tidak di-set.
    Tidak presisi seperti AI, tapi cukup untuk kelas ringan.
    """
    text = (answer or "").strip()
    word_count = len([w for w in text.split() if w])
    if word_count < min_words:
        return {
            "score_pct": 0,
            "feedback": (
                f"Jawaban terlalu pendek ({word_count} kata, minimal {min_words}). "
                "Kembangkan dengan rujukan dan contoh."
            ),
            "matched_points": [],
            "missing_points": list(key_points),
        }

    text_low = text.lower()
    matched: list[str] = []
    missing: list[str] = []
    for kp in key_points:
        kp_low = kp.lower().strip()
        if not kp_low:
            continue
        # Cek apakah ada kata kunci dari kp yang muncul di jawaban.
        # Pakai split kata dari kp yang panjangnya >= 4 char.
        keywords = [w for w in kp_low.split() if len(w) >= 4]
        hit = any(kw in text_low for kw in keywords) if keywords else (kp_low in text_low)
        (matched if hit else missing).append(kp)

    pct = int(round(100 * len(matched) / max(len(key_points), 1)))
    feedback_parts = []
    if matched:
        feedback_parts.append(f"Anda menyentuh {len(matched)} dari {len(key_points)} poin kunci.")
    if missing:
        feedback_parts.append(f"Belum membahas: {', '.join(missing[:3])}.")
    feedback_parts.append(
        "(Penilaian otomatis berbasis keyword — dosen dapat meninjau ulang.)"
    )
    return {
        "score_pct": pct,
        "feedback": " ".join(feedback_parts),
        "matched_points": matched,
        "missing_points": missing,
    }
