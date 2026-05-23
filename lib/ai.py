"""Integrasi Gemini untuk chatbot PKn dan grading esai otomatis.

Desain:
- Kalau GEMINI_API_KEY tidak di-set di st.secrets / env, semua fungsi
  fallback ke mode rule-based / KB lookup (tetap berfungsi, kualitas
  lebih rendah).
- Timeout per request 30 detik supaya tidak hang.
"""

from __future__ import annotations

import json
import os
from typing import Optional

import streamlit as st

from .kb import search_kb
from .scoring import essay_rule_based_score


def _get_api_key() -> Optional[str]:
    """Cari API key dari st.secrets atau env. Return None kalau kosong."""
    try:
        # st.secrets bisa raise kalau secrets.toml tidak ada
        key = st.secrets.get("GEMINI_API_KEY", "")
    except Exception:
        key = ""
    if not key:
        key = os.environ.get("GEMINI_API_KEY", "")
    return key.strip() or None


def _get_model_name() -> str:
    try:
        m = st.secrets.get("GEMINI_MODEL", "")
    except Exception:
        m = ""
    return m or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


def _gemini_client():
    """Lazy import google.generativeai supaya app tetap jalan kalau lib belum install."""
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError:
        return None
    key = _get_api_key()
    if not key:
        return None
    try:
        genai.configure(api_key=key)
        return genai
    except Exception:
        return None


SYSTEM_PROMPT_CHATBOT = """Anda adalah asisten pembelajaran mata kuliah Kewarganegaraan
untuk mahasiswa S1 PGMI di Indonesia. Jawab pertanyaan TENTANG MATERI PKn:
Pancasila, UUD 1945, demokrasi, HAM, bela negara, wawasan nusantara,
kewarganegaraan, lembaga negara, dan topik PKn lainnya.

ATURAN:
- Jawaban ringkas (3-6 kalimat) dengan bahasa formal Indonesia.
- WAJIB sebutkan rujukan resmi (mis. "Pasal 28 UUD 1945", "UU No. 12/2006").
- Kalau pertanyaan di luar PKn (matematika, gosip, dll.), tolak dengan halus
  dan arahkan kembali ke topik PKn.
- Jangan berikan opini politik partisan atau menyerang kelompok.
- Jangan mengarang pasal/UU yang tidak Anda yakini benar.
"""


def chatbot_reply(question: str) -> tuple[str, str]:
    """Balas pertanyaan mahasiswa.

    Return (jawaban, source) di mana source ∈ {'ai', 'kb', 'fallback'}.
    """
    q = (question or "").strip()
    if not q:
        return ("Silakan ketik pertanyaan Anda.", "fallback")
    if len(q) > 1000:
        return ("Pertanyaan terlalu panjang (max 1000 karakter).", "fallback")

    client = _gemini_client()
    if client is not None:
        try:
            model = client.GenerativeModel(
                _get_model_name(),
                system_instruction=SYSTEM_PROMPT_CHATBOT,
            )
            resp = model.generate_content(
                q,
                request_options={"timeout": 30},
                generation_config={"temperature": 0.4, "max_output_tokens": 600},
            )
            txt = (resp.text or "").strip()
            if txt:
                return (txt, "ai")
        except Exception as e:  # noqa: BLE001
            # Logged via Streamlit; UI akan tetap dapat fallback.
            print(f"[chatbot] Gemini error: {e}")

    # Fallback 1: cari di KB
    kb = search_kb(q)
    if kb:
        return (
            f"**{kb['topic']}**\n\n{kb['answer']}\n\n_Rujukan: {kb['ref']}_\n\n"
            "_(Mode offline — chatbot AI tidak tersedia / API key belum di-set.)_",
            "kb",
        )

    # Fallback 2: balasan generik
    return (
        "Maaf, saya belum punya jawaban yang akurat untuk pertanyaan itu. "
        "Coba tanyakan tentang Pancasila, UUD 1945, HAM, demokrasi, bela negara, "
        "wawasan nusantara, atau lembaga negara.\n\n"
        "_(Mode offline — chatbot AI tidak tersedia / API key belum di-set.)_",
        "fallback",
    )


ESSAY_GRADING_PROMPT = """Anda adalah dosen mata kuliah Kewarganegaraan yang sedang
menilai jawaban esai mahasiswa S1 PGMI.

PERTANYAAN: {question}

POIN-POIN KUNCI yang harus muncul (setiap poin punya bobot setara):
{key_points}

JAWABAN MAHASISWA:
\"\"\"{answer}\"\"\"

TUGAS Anda:
1. Tentukan score_pct (0-100) berdasarkan seberapa banyak poin kunci yang
   benar-benar dibahas dengan tepat (bukan sekadar disinggung).
2. Daftar matched_points: poin kunci yang Anda anggap sudah dibahas dengan baik.
3. Daftar missing_points: poin kunci yang belum / kurang dibahas.
4. Tulis feedback formatif 2-4 kalimat — apresiasi yang sudah benar, lalu
   saran perbaikan yang spesifik. Tidak menyerang pribadi.

Balas HANYA dalam JSON dengan format persis:
{{
  "score_pct": <integer 0-100>,
  "matched_points": ["poin lengkap yang sudah dibahas", ...],
  "missing_points": ["poin lengkap yang masih kurang", ...],
  "feedback": "..."
}}
"""


def grade_essay(
    question: str,
    answer: str,
    key_points: list[str],
    min_words: int = 30,
) -> dict:
    """Nilai esai mahasiswa.

    Return dict dengan keys: score_pct, matched_points, missing_points,
    feedback, source ('ai' | 'rule_based').
    """
    answer = (answer or "").strip()
    word_count = len([w for w in answer.split() if w])

    # Validasi awal: terlalu pendek → langsung 0 tanpa konsumsi token AI.
    if word_count < min_words:
        return {
            **essay_rule_based_score(answer, key_points, min_words),
            "source": "rule_based",
        }

    client = _gemini_client()
    if client is not None and key_points:
        try:
            kp_text = "\n".join(f"- {p}" for p in key_points)
            prompt = ESSAY_GRADING_PROMPT.format(
                question=question, key_points=kp_text, answer=answer
            )
            model = client.GenerativeModel(
                _get_model_name(),
                generation_config={
                    "temperature": 0.2,
                    "response_mime_type": "application/json",
                    "max_output_tokens": 800,
                },
            )
            resp = model.generate_content(prompt, request_options={"timeout": 30})
            data = json.loads(resp.text)
            return {
                "score_pct": max(0, min(100, int(data.get("score_pct", 0)))),
                "matched_points": list(data.get("matched_points", []))[:10],
                "missing_points": list(data.get("missing_points", []))[:10],
                "feedback": str(data.get("feedback", "")).strip()[:1000],
                "source": "ai",
            }
        except Exception as e:  # noqa: BLE001
            print(f"[essay-grading] Gemini error, fallback ke rule-based: {e}")

    # Fallback rule-based
    return {
        **essay_rule_based_score(answer, key_points, min_words),
        "source": "rule_based",
    }
