"""Sliding-window rate limiter in-memory (per-process).
Cocok untuk single-server deployment Streamlit.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(key: str, limit: int, window_sec: float) -> tuple[bool, float]:
    """
    Cek apakah request ke `key` masih boleh dijalankan.
    Returns: (ok, retry_after_seconds)
    """
    now = time.time()
    cutoff = now - window_sec
    bucket = _BUCKETS[key]
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= limit:
        retry = bucket[0] + window_sec - now
        return False, max(0.0, retry)
    bucket.append(now)
    return True, 0.0
