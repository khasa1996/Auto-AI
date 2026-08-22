import os
import pytest
from datetime import timedelta

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "autoai_test")

from security import DistributedRateLimiter, expiry_datetime, is_expired, validate_public_url
from ai_utils import extract_json


def test_extract_json_handles_markdown_and_nested_objects():
    value = extract_json(
        '```json\n{"scores":{"a":8,"b":7},"winner":"A"}\n```'
    )
    assert value == {
        "scores": {"a": 8, "b": 7},
        "winner": "A",
    }


def test_expiry_accepts_datetime_values():
    assert is_expired(
        expiry_datetime(seconds=-1)
    )
    assert not is_expired(
        expiry_datetime(seconds=60)
    )


def test_ssrf_rejects_credentials_and_non_https():
    allowed = ("example.com",)

    try:
        validate_public_url(
            "http://example.com/image.jpg",
            allowed,
        )
    except ValueError:
        pass
    else:
        raise AssertionError("HTTP URL was accepted")

    try:
        validate_public_url(
            "https://user:pass@example.com/image.jpg",
            allowed,
        )
    except ValueError:
        pass
    else:
        raise AssertionError("credential-bearing URL was accepted")


@pytest.mark.asyncio
async def test_distributed_rate_limiter_has_bounded_fallback():
    limiter = DistributedRateLimiter()
    assert await limiter.allow("test", "same", 2, 60)
    assert await limiter.allow("test", "same", 2, 60)
    assert not await limiter.allow("test", "same", 2, 60)
