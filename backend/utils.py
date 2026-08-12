"""Shared helpers used across the Auto-AI backend."""
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, Optional, Sequence
from urllib.parse import urlparse

from fastapi import HTTPException

# Values that mean "no filter" when they arrive from query params / request bodies.
_EMPTY_FILTER_VALUES = (None, "", "Any")


def new_id() -> str:
    """Fresh uuid4 as a string — used for every document id we generate."""
    return str(uuid.uuid4())


def random_hex(length: int = 32) -> str:
    """Random hex string for opaque tokens."""
    return uuid.uuid4().hex[:length]


def utc_now_iso() -> str:
    """Current UTC timestamp in ISO-8601, the format every document stores."""
    return datetime.now(timezone.utc).isoformat()


def extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from an LLM text response."""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def build_query(**filters: Any) -> dict:
    """Mongo filter from optional params, dropping unset/'Any'/'All' values."""
    return {k: v for k, v in filters.items() if v not in _EMPTY_FILTER_VALUES}


def top_counts(items: Iterable[dict], key: str, limit: int = 10, default: str = "Unknown") -> list:
    """Count documents by a field and return the `limit` most frequent as (value, count)."""
    counts: dict = {}
    for item in items:
        value = item.get(key, default)
        counts[value] = counts.get(value, 0) + 1
    return sorted(counts.items(), key=lambda pair: -pair[1])[:limit]


def ensure_allowed_host(url: str, allowed_hosts: Sequence[str]) -> None:
    """Reject proxy requests for hosts outside the allowlist."""
    host = urlparse(url).netloc
    if not any(host.endswith(h) for h in allowed_hosts):
        raise HTTPException(status_code=400, detail="Host not allowed")


def proxy_headers(max_age: int, **extra: str) -> dict:
    """Cache + CORP headers every proxied asset response needs."""
    headers = {
        "Cache-Control": f"public, max-age={max_age}",
        "Cross-Origin-Resource-Policy": "cross-origin",
    }
    headers.update(extra)
    return headers
