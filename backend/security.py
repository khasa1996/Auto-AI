"""Auth primitives: secret hashing, OTP generation, session tokens, rate limiting."""
import hashlib
import hmac
import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent / ".env")

OTP_LENGTH = 6
OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 5
USER_SESSION_TTL_HOURS = 72
ADMIN_SESSION_TTL_HOURS = 8

DEMO_OTP = "123456"


def _load_secret_key() -> str:
    key = os.environ.get("SECRET_KEY", "").strip()
    if key:
        return key
    # Ephemeral key: the app stays usable in dev, but tokens/OTPs issued before a
    # restart stop validating. Production must set SECRET_KEY.
    logger.warning("SECRET_KEY is not set — generating an ephemeral key; sessions will not survive a restart.")
    return secrets.token_urlsafe(48)


SECRET_KEY_CONFIGURED = bool(os.environ.get("SECRET_KEY", "").strip())
SECRET_KEY = _load_secret_key()

# Demo OTP mode returns a fixed OTP in the API response so the MVP is usable
# without an SMS provider. It is refused in production.
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
OTP_DEMO_MODE = os.environ.get("OTP_DEMO_MODE", "true").strip().lower() in ("1", "true", "yes") and APP_ENV != "production"


def hash_secret(value: str) -> str:
    """Keyed digest used for anything we store but never need to read back."""
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


def generate_otp() -> str:
    if OTP_DEMO_MODE:
        return DEMO_OTP
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def expiry_iso(hours: Optional[float] = None, seconds: Optional[float] = None) -> str:
    delta = timedelta(hours=hours or 0, seconds=seconds or 0)
    return (utcnow() + delta).isoformat()


def is_expired(expires_at: Optional[str]) -> bool:
    if not expires_at:
        return True
    try:
        return datetime.fromisoformat(expires_at) <= utcnow()
    except ValueError:
        return True


class RateLimiter:
    """Fixed-window in-process rate limiter.

    Good enough to blunt credential brute force on a single instance; a shared
    store (Redis) is needed once the API runs multi-replica.
    """

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        window_start = now - self.window_seconds
        hits = [t for t in self._hits.get(key, []) if t > window_start]
        if len(hits) >= self.limit:
            self._hits[key] = hits
            return False
        hits.append(now)
        self._hits[key] = hits
        if len(self._hits) > 10000:
            self._hits = {k: v for k, v in self._hits.items() if any(t > window_start for t in v)}
        return True


def host_allowed(url: str, allowed_hosts: tuple) -> bool:
    """Allow only https URLs whose host exactly matches (or is a subdomain of) an allowed host."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.username or parsed.password:
        return False
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    return any(host == h or host.endswith("." + h) for h in allowed_hosts)
