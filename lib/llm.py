"""Wrapper minimal untuk Gemini API (REST). Kompatibel dengan free tier.
Aktif jika GEMINI_API_KEY terisi di st.secrets atau env.
"""
from __future__ import annotations

import os
from typing import Any

import requests
import streamlit as st

API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _secret(key: str, default: str = "") -> str:
    if hasattr(st, "secrets"):
        try:
            v = st.secrets.get(key, None)
            if v:
                return str(v)
        except (FileNotFoundError, AttributeError, Exception):
            pass
    return os.environ.get(key, default)


def is_llm_enabled() -> bool:
    return bool(_secret("GEMINI_API_KEY"))


def llm_model() -> str:
    return _secret("GEMINI_MODEL") or "gemini-2.5-flash"


def _timeout_sec() -> float:
    try:
        return float(_secret("GEMINI_TIMEOUT_SEC") or 30)
    except (TypeError, ValueError):
        return 30.0


def generate_content(
    *,
    system_instruction: str,
    user_message: str,
    temperature: float = 0.4,
    max_output_tokens: int = 2048,
    response_schema: dict | None = None,
    disable_thinking: bool = False,
) -> dict[str, Any]:
    """
    Returns: {"text": str, "blocked": bool, "json": dict|None}
    Raises: RuntimeError on network/HTTP/timeout error.
    """
    key = _secret("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY belum diset")

    gen_config: dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }
    if response_schema:
        gen_config["responseMimeType"] = "application/json"
        gen_config["responseSchema"] = response_schema
    if disable_thinking:
        gen_config["thinkingConfig"] = {"thinkingBudget": 0}

    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": gen_config,
    }
    url = f"{API_BASE}/models/{llm_model()}:generateContent?key={key}"

    try:
        res = requests.post(
            url,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=_timeout_sec(),
        )
    except requests.exceptions.Timeout as e:
        raise RuntimeError(f"Gemini API timeout ({_timeout_sec()}s)") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Gemini API jaringan error: {e}") from e

    if not res.ok:
        raise RuntimeError(f"Gemini API {res.status_code}: {res.text[:300]}")

    data = res.json()
    if data.get("promptFeedback", {}).get("blockReason"):
        return {"text": "[Diblokir oleh filter keamanan]", "blocked": True, "json": None}

    cand = (data.get("candidates") or [{}])[0]
    if cand.get("finishReason") == "SAFETY":
        return {"text": "Maaf, tidak dapat menjawab pertanyaan ini.", "blocked": True, "json": None}

    parts = (cand.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts)

    if cand.get("finishReason") == "MAX_TOKENS" and len(text) < 10:
        return {"text": "[Respons terpotong oleh batas token]", "blocked": True, "json": None}

    json_data = None
    if response_schema:
        try:
            import json as _json
            json_data = _json.loads(text)
        except (ValueError, TypeError):
            json_data = None

    return {"text": text, "blocked": False, "json": json_data}
