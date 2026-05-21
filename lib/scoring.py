"""Algoritma penilaian gaya Kahoot."""
from __future__ import annotations

import random
from typing import TypeVar

T = TypeVar("T")


def calculate_score(*, is_correct: bool, response_ms: int, time_limit_sec: int, max_points: int) -> int:
    """
    Skor:
      - Salah / timeout : 0
      - Benar           : max_points * (1 - 0.5 * t/T)
      Jawab tercepat ≈ max_points; di detik terakhir ≈ 50%.
    """
    if not is_correct:
        return 0
    limit_ms = max(1, time_limit_sec * 1000)
    t = max(0, min(response_ms, limit_ms))
    factor = 1.0 - 0.5 * (t / limit_ms)
    return round(max_points * factor)


def shuffle_with_seed(items: list[T], seed: int | None = None) -> list[T]:
    """Acak in-place copy. Bila seed disediakan, acakan deterministik."""
    arr = list(items)
    rng = random.Random(seed) if seed is not None else random
    rng.shuffle(arr)
    return arr
