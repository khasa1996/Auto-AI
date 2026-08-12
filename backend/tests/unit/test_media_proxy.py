"""Unit tests for the image/video proxies (host allow-list, caching, error mapping).

Upstream fetches are stubbed — these tests never touch the network.
"""
import types

import httpx
import pytest


class FakeUpstream:
    def __init__(self, status_code=200, content=b"\x89PNG-bytes", content_type="image/png"):
        self.status_code = status_code
        self.content = content
        self.headers = {"content-type": content_type} if content_type else {}


@pytest.fixture(autouse=True)
def clear_image_cache(server_module):
    server_module._IMAGE_CACHE.clear()
    yield
    server_module._IMAGE_CACHE.clear()


@pytest.fixture
def upstream(server_module, monkeypatch):
    """Patch `_fetch_image` and record the URLs requested."""
    state = types.SimpleNamespace(calls=[], response=FakeUpstream(), error=None)

    async def fake_fetch(url):
        state.calls.append(url)
        if state.error:
            raise state.error
        return state.response

    monkeypatch.setattr(server_module, "_fetch_image", fake_fetch)
    return state


@pytest.fixture
def fake_video_upstream(server_module, monkeypatch):
    """Replace httpx.AsyncClient with a stub streaming two chunks."""
    state = types.SimpleNamespace(
        status_code=200,
        headers={"content-type": "video/mp4", "content-length": "14"},
        chunks=[b"chunk-1", b"chunk-2"],
        error=None,
        method=None,
        request_headers=None,
        closed=False,
    )

    class FakeStreamResponse:
        status_code = property(lambda self: state.status_code)

        @property
        def headers(self):
            return state.headers

        async def aiter_bytes(self, chunk_size=None):
            for chunk in state.chunks:
                yield chunk

        async def aclose(self):
            state.closed = True

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        def build_request(self, method, url, headers=None):
            state.method = method
            state.request_headers = headers or {}
            return types.SimpleNamespace(method=method, url=url)

        async def send(self, request, stream=False):
            if state.error:
                raise state.error
            return FakeStreamResponse()

        async def aclose(self):
            pass

    monkeypatch.setattr(server_module.httpx, "AsyncClient", FakeAsyncClient)
    return state


ALLOWED_URL = "https://imgd.aeplcdn.com/664x374/car.png"


def test_image_proxy_returns_upstream_bytes_and_cache_headers(client, upstream):
    r = client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert r.status_code == 200
    assert r.content == b"\x89PNG-bytes"
    assert r.headers["content-type"] == "image/png"
    assert r.headers["cache-control"] == "public, max-age=604800"
    assert r.headers["cross-origin-resource-policy"] == "cross-origin"


def test_image_proxy_serves_second_request_from_cache(client, upstream, server_module):
    client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert upstream.calls == [ALLOWED_URL]
    assert ALLOWED_URL in server_module._IMAGE_CACHE


def test_image_proxy_defaults_missing_content_type_to_jpeg(client, upstream):
    upstream.response = FakeUpstream(content_type=None)
    r = client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert r.headers["content-type"] == "image/jpeg"


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.example.com/car.png",
        "https://imgd.aeplcdn.com.evil.test/car.png",
        "https://localhost:8000/internal.png",
    ],
)
def test_image_proxy_rejects_hosts_outside_allow_list(client, upstream, url):
    r = client.get("/api/image-proxy", params={"url": url})
    assert r.status_code == 400
    assert r.json()["detail"] == "Host not allowed"
    assert upstream.calls == []


@pytest.mark.parametrize("host", ["upload.wikimedia.org", "images.unsplash.com", "stimg.cardekho.com"])
def test_image_proxy_allows_every_configured_host(client, upstream, host):
    assert client.get("/api/image-proxy", params={"url": f"https://{host}/pic.png"}).status_code == 200


def test_image_proxy_propagates_upstream_error_status(client, upstream):
    upstream.response = FakeUpstream(status_code=404)
    r = client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert r.status_code == 404
    assert r.json()["detail"] == "Upstream fetch failed"


def test_image_proxy_maps_network_error_to_502(client, upstream):
    upstream.error = httpx.ConnectTimeout("timed out")
    r = client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert r.status_code == 502
    assert "Upstream error" in r.json()["detail"]


def test_image_proxy_stops_caching_past_the_limit(client, upstream, server_module):
    server_module._IMAGE_CACHE.update({f"https://imgd.aeplcdn.com/{i}.png": (b"x", "image/png") for i in range(1000)})
    client.get("/api/image-proxy", params={"url": ALLOWED_URL})
    assert ALLOWED_URL not in server_module._IMAGE_CACHE


def test_image_proxy_requires_url_param(client):
    assert client.get("/api/image-proxy").status_code == 422


@pytest.mark.parametrize("method", ["get", "head"])
def test_video_proxy_rejects_hosts_outside_allow_list(client, method):
    r = getattr(client, method)("/api/video-proxy", params={"url": "https://evil.example.com/v.mp4"})
    assert r.status_code == 400


def test_video_proxy_requires_url_param(client):
    assert client.get("/api/video-proxy").status_code == 422


def test_video_proxy_streams_upstream_body(client, fake_video_upstream):
    r = client.get(
        "/api/video-proxy", params={"url": "https://videos.pexels.com/clip.mp4"}
    )
    assert r.status_code == 200
    assert r.content == b"chunk-1chunk-2"
    assert r.headers["accept-ranges"] == "bytes"
    assert r.headers["content-type"] == "video/mp4"
    assert fake_video_upstream.closed


def test_video_proxy_forwards_range_header_and_206(client, fake_video_upstream):
    fake_video_upstream.status_code = 206
    fake_video_upstream.headers["content-range"] = "bytes 0-99/1000"
    r = client.get(
        "/api/video-proxy",
        params={"url": "https://videos.pexels.com/clip.mp4"},
        headers={"Range": "bytes=0-99"},
    )
    assert r.status_code == 206
    assert r.headers["content-range"] == "bytes 0-99/1000"
    assert fake_video_upstream.request_headers["Range"] == "bytes=0-99"


def test_video_proxy_head_returns_headers_without_body(client, fake_video_upstream):
    r = client.head("/api/video-proxy", params={"url": "https://videos.pexels.com/clip.mp4"})
    assert r.status_code == 200
    assert r.content == b""
    assert fake_video_upstream.method == "HEAD"
    assert fake_video_upstream.closed


def test_video_proxy_propagates_upstream_error_status(client, fake_video_upstream):
    fake_video_upstream.status_code = 403
    r = client.get("/api/video-proxy", params={"url": "https://videos.pexels.com/clip.mp4"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Upstream fetch failed"
    assert fake_video_upstream.closed


def test_video_proxy_maps_network_error_to_502(client, fake_video_upstream):
    fake_video_upstream.error = httpx.ConnectError("no route")
    r = client.get("/api/video-proxy", params={"url": "https://videos.pexels.com/clip.mp4"})
    assert r.status_code == 502
    assert "Upstream error" in r.json()["detail"]


def test_prewarm_images_fills_the_cache(server_module, monkeypatch):
    """`_prewarm_images` is stubbed for other tests; exercise the real coroutine here."""
    import asyncio

    calls = []

    async def fake_fetch(url):
        calls.append(url)
        return FakeUpstream(content=b"warm", content_type="image/jpeg")

    monkeypatch.setattr(server_module, "_fetch_image", fake_fetch)
    asyncio.run(server_module.real_prewarm_images())
    assert calls
    assert all(server_module._IMAGE_CACHE[u] == (b"warm", "image/jpeg") for u in calls)


def test_prewarm_images_skips_cached_urls_and_swallows_errors(server_module, monkeypatch):
    import asyncio

    calls = []

    async def fake_fetch(url):
        calls.append(url)
        raise httpx.ConnectTimeout("slow")

    monkeypatch.setattr(server_module, "_fetch_image", fake_fetch)
    asyncio.run(server_module.real_prewarm_images())
    assert calls
    first_round = list(calls)

    for url in first_round:
        server_module._IMAGE_CACHE[url] = (b"cached", "image/jpeg")
    calls.clear()
    asyncio.run(server_module.real_prewarm_images())
    assert calls == []
