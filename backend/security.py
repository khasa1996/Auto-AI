"""Security primitives for Auto-AI India.

The module deliberately keeps secrets server-side, uses keyed hashes for
stored credentials/tokens, validates outbound URLs, and provides a bounded
rate limiter. Production deployments should set REDIS_URL so rate limiting is
shared across Render instances.
"""
from __future__ import annotations

import hashlib
import hmac
import ipaddress
import logging
import os
import secrets
import socket
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

APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
SECRET_KEY_CONFIGURED = bool(os.environ.get("SECRET_KEY", "").strip())
if APP_ENV == "production" and not SECRET_KEY_CONFIGURED:
    raise RuntimeError(
        "SECRET_KEY must be configured when APP_ENV=production"
    )

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
if APP_ENV == "production" and not REDIS_URL:
    raise RuntimeError(
        "REDIS_URL must be configured when APP_ENV=production"
    )


def _load_secret_key() -> str:
    key = os.environ.get("SECRET_KEY", "").strip()
    if key:
        return key

    logger.warning(
        "SECRET_KEY is not set — generating an ephemeral key; "
        "sessions will not survive a restart."
    )
    return secrets.token_urlsafe(48)


SECRET_KEY = _load_secret_key()

OTP_DEMO_MODE = (
    os.environ.get("OTP_DEMO_MODE", "true").strip().lower()
    in ("1", "true", "yes")
    and APP_ENV != "production"
)


def hash_secret(value: str) -> str:
    """Return a keyed digest for values that must never be stored in plaintext."""
    return hmac.new(
        SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def generate_otp() -> str:
    if OTP_DEMO_MODE:
        return DEMO_OTP
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def expiry_datetime(
    *,
    hours: Optional[float] = None,
    seconds: Optional[float] = None,
) -> datetime:
    return utcnow() + timedelta(
        hours=hours or 0,
        seconds=seconds or 0,
    )


def expiry_iso(
    hours: Optional[float] = None,
    seconds: Optional[float] = None,
) -> str:
    return expiry_datetime(
        hours=hours,
        seconds=seconds,
    ).isoformat()


def is_expired(expires_at: object) -> bool:
    if not expires_at:
        return True

    if isinstance(expires_at, datetime):
        value = expires_at
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value <= utcnow()

    if isinstance(expires_at, str):
        try:
            value = datetime.fromisoformat(expires_at)
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value <= utcnow()
        except ValueError:
            return True

    return True


class RateLimiter:
    """Bounded fixed-window in-process fallback limiter.

    Production requires REDIS_URL at startup. This class remains useful for
    unit tests and development where Redis is intentionally unavailable.
    """

    def __init__(self, limit: int, window_seconds: int):
        if limit <= 0 or window_seconds <= 0:
            raise ValueError("limit and window_seconds must be positive")
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        window_start = now - self.window_seconds
        hits = [
            timestamp
            for timestamp in self._hits.get(key, [])
            if timestamp > window_start
        ]

        if len(hits) >= self.limit:
            self._hits[key] = hits
            return False

        hits.append(now)
        self._hits[key] = hits

        if len(self._hits) > 10_000:
            self._hits = {
                candidate: values
                for candidate, values in self._hits.items()
                if any(value > window_start for value in values)
            }

        return True


def host_allowed(
    url: str,
    allowed_hosts: tuple[str, ...],
) -> bool:
    """Allow only HTTPS URLs with an exact allowed host or subdomain."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False

    if (
        parsed.scheme.lower() != "https"
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        return False

    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        return False

    return any(
        host == allowed
        or host.endswith("." + allowed)
        for allowed in allowed_hosts
    )


def _is_public_ip(value: str) -> bool:
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return False

    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    )


def validate_public_url(
    url: str,
    allowed_hosts: tuple[str, ...],
) -> str:
    """Validate scheme, credentials, host and resolved IPs against SSRF."""
    if not host_allowed(url, allowed_hosts):
        raise ValueError("Host not allowed")

    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Hostname required")

    port = parsed.port or 443

    try:
        addresses = socket.getaddrinfo(
            hostname,
            port,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise ValueError("Unable to resolve host") from exc

    resolved_ips = {
        result[4][0]
        for result in addresses
        if result[4]
    }

    if not resolved_ips or not all(
        _is_public_ip(address)
        for address in resolved_ips
    ):
        raise ValueError("Resolved host is not public")

    return url


class DistributedRateLimiter:
    """Redis-backed fixed-window limiter shared by all API replicas."""

    def __init__(self) -> None:
        self._redis = None
        self._fallbacks: dict[tuple[str, int, int], RateLimiter] = {}

    async def connect(self) -> None:
        if not REDIS_URL:
            return
        from redis.asyncio import Redis
        self._redis = Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        await self._redis.ping()

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def allow(
        self,
        namespace: str,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> bool:
        if self._redis is None:
            fallback_key = (namespace, limit, window_seconds)
            limiter = self._fallbacks.setdefault(
                fallback_key,
                RateLimiter(limit, window_seconds),
            )
            return limiter.allow(key)

        bucket = int(time.time()) // window_seconds
        redis_key = (
            f"autoai:rate:{namespace}:"
            f"{bucket}:{hashlib.sha256(key.encode('utf-8')).hexdigest()}"
        )

        count = await self._redis.incr(redis_key)
        if count == 1:
            await self._redis.expire(
                redis_key,
                window_seconds + 1,
            )

        return count <= limit
