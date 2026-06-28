"""A small in-memory, per-IP sliding-window rate limiter, exposed as a FastAPI dependency.

Used to throttle the public lead form (anti-spam). Implemented as a dependency rather than a
decorator because slowapi's decorator mis-handles multipart/UploadFile routes. For a
multi-instance production deploy this would move to a shared store (Redis); in-memory is fine
for a single instance and keeps the demo dependency-free.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from app.core.config import settings

_UNITS = {"second": 1, "minute": 60, "hour": 3600}
_hits: dict[str, deque[float]] = defaultdict(deque)


def _parse_limit(spec: str) -> tuple[int, int]:
    """'20/minute' -> (20, 60)."""
    count, _, unit = spec.partition("/")
    return int(count), _UNITS.get(unit.strip().rstrip("s"), 60)


def reset() -> None:
    """Clear all counters (used by tests)."""
    _hits.clear()


def rate_limit_public(request: Request) -> None:
    """Raise 429 if this client IP has exceeded the configured public-form limit."""
    if not settings.rate_limit_enabled:
        return
    limit, window = _parse_limit(settings.rate_limit_public)
    ip = request.client.host if request.client else "unknown"
    now = time.time()

    bucket = _hits[ip]
    while bucket and bucket[0] <= now - window:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many submissions. Please try again in a moment.",
        )
    bucket.append(now)
