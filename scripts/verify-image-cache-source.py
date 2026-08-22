from pathlib import Path

source = Path("backend/server.py").read_text()

assert "_IMAGE_CACHE: dict" in source
assert source.index("_IMAGE_CACHE: dict") < source.index('@app.on_event("startup")')
assert "name="auto-ai-image-prewarm"" in source
assert "Image prewarm failed" in source

print("Image cache/prewarm source check: PASS")
