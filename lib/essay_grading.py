"""Auto-grading soal esai menggunakan Gemini dengan rubrik (poin kunci)."""
from __future__ import annotations

from .llm import generate_content, is_llm_enabled

SYSTEM = """\
Anda adalah penilai mata kuliah Kewarganegaraan PGMI yang adil, ringkas, berbasis rubrik.

ATURAN KETAT:
1. Skor 0–100 (integer) yang mencerminkan SEBERAPA LENGKAP poin kunci tertangkap
   dalam jawaban (boleh diparafrase).
2. Skor 0 jika kosong / tidak nyambung.
3. Skor 100 hanya jika semua poin tertangkap dengan istilah PKn yang tepat.
4. Pertimbangkan: relevansi, akurasi, istilah PKn yang tepat.
5. Feedback Bahasa Indonesia santun, 2-3 kalimat, konstruktif, sebut yang sudah
   benar dan yang masih kurang. Akhiri saran perbaikan spesifik.
6. JANGAN beri opini partisan.
7. Output WAJIB JSON sesuai schema.
"""

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "scorePct": {"type": "INTEGER", "minimum": 0, "maximum": 100},
        "feedback": {"type": "STRING"},
        "matchedPoints": {"type": "ARRAY", "items": {"type": "STRING"}},
        "missingPoints": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": ["scorePct", "feedback", "matchedPoints", "missingPoints"],
}


def grade_essay(
    *,
    question_text: str,
    question_topic: str,
    source_ref: str | None,
    key_points: list[str],
    student_answer: str,
    max_points: int,
) -> dict:
    """
    Returns dict:
      score_pct, score_awarded, feedback, matched_points, missing_points, needs_review
    """
    trimmed = student_answer.strip()
    if not trimmed:
        return {
            "score_pct": 0,
            "score_awarded": 0,
            "feedback": "Jawaban kosong. Tuliskan minimal 1 paragraf dengan poin-poin kunci.",
            "matched_points": [],
            "missing_points": list(key_points),
            "needs_review": False,
        }
    if not is_llm_enabled():
        return {
            "score_pct": 0,
            "score_awarded": 0,
            "feedback": "Mode AI grading belum aktif. Jawaban akan dinilai manual oleh dosen.",
            "matched_points": [],
            "missing_points": list(key_points),
            "needs_review": True,
        }

    user_msg_parts = [
        f"Topik: {question_topic}",
        f"Rujukan resmi: {source_ref}" if source_ref else "",
        "",
        f"Soal: {question_text}",
        "",
        "Poin kunci (rubrik) yang harus muncul:",
        *[f"{i + 1}. {p}" for i, p in enumerate(key_points)],
        "",
        "Jawaban mahasiswa:",
        f'"""{trimmed}"""',
        "",
        "Tolong nilai dan kembalikan dalam format JSON.",
    ]
    user_msg = "\n".join(p for p in user_msg_parts if p != "")

    try:
        res = generate_content(
            system_instruction=SYSTEM,
            user_message=user_msg,
            temperature=0.2,
            max_output_tokens=1024,
            response_schema=SCHEMA,
            disable_thinking=True,
        )
    except RuntimeError as e:
        return {
            "score_pct": 0,
            "score_awarded": 0,
            "feedback": f"Gagal menilai otomatis ({e}). Akan ditinjau dosen.",
            "matched_points": [],
            "missing_points": list(key_points),
            "needs_review": True,
        }

    j = res.get("json")
    if not j or not isinstance(j.get("scorePct"), (int, float)):
        return {
            "score_pct": 0,
            "score_awarded": 0,
            "feedback": "AI mengembalikan format tidak terduga. Akan ditinjau dosen.",
            "matched_points": [],
            "missing_points": list(key_points),
            "needs_review": True,
        }

    pct = max(0, min(100, int(j["scorePct"])))
    return {
        "score_pct": pct,
        "score_awarded": round((pct / 100) * max_points),
        "feedback": j.get("feedback") or "(tanpa feedback)",
        "matched_points": j.get("matchedPoints") or [],
        "missing_points": j.get("missingPoints") or [],
        "needs_review": False,
    }
