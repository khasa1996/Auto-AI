"""Unit tests for the shared backend helpers."""
import pytest
from fastapi import HTTPException

from utils import build_query, ensure_allowed_host, extract_json, new_id, proxy_headers, top_counts, utc_now_iso

ALLOWED = ("upload.wikimedia.org", "images.pexels.com")


def test_new_id_is_unique_uuid_string():
    ids = {new_id() for _ in range(100)}
    assert len(ids) == 100
    assert all(len(i) == 36 for i in ids)


def test_utc_now_iso_has_timezone():
    assert utc_now_iso().endswith("+00:00")


def test_extract_json_reads_first_object():
    assert extract_json('noise {"a": 1} tail') == {"a": 1}
    assert extract_json("no json here") is None
    assert extract_json("{broken") is None


def test_build_query_drops_empty_and_any():
    assert build_query(segment="SUV", fuel="Any", city=None, phone="") == {"segment": "SUV"}


def test_top_counts_orders_by_frequency():
    items = [{"city": "Pune"}, {"city": "Pune"}, {"city": "Delhi"}, {}]
    assert top_counts(items, "city", limit=2) == [("Pune", 2), ("Delhi", 1)]


def test_ensure_allowed_host_accepts_allowlisted():
    ensure_allowed_host("https://images.pexels.com/photo.jpg", ALLOWED)


def test_ensure_allowed_host_rejects_others():
    with pytest.raises(HTTPException) as exc:
        ensure_allowed_host("https://evil.example.com/photo.jpg", ALLOWED)
    assert exc.value.status_code == 400


def test_proxy_headers_merges_extras():
    headers = proxy_headers(3600, **{"Accept-Ranges": "bytes"})
    assert headers["Cache-Control"] == "public, max-age=3600"
    assert headers["Cross-Origin-Resource-Policy"] == "cross-origin"
    assert headers["Accept-Ranges"] == "bytes"
