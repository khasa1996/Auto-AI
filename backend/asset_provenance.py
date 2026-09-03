from enum import Enum
from urllib.parse import urlparse


class AssetProvenance(str, Enum):
    AUTO_AI_LICENSED = "AUTO_AI_LICENSED"
    OEM_AUTHORIZED = "OEM_AUTHORIZED"
    LICENSED_THIRD_PARTY = "LICENSED_THIRD_PARTY"
    AI_GENERATED_CONCEPT = "AI_GENERATED_CONCEPT"
    UNKNOWN = "UNKNOWN"


_ALLOWED_MODEL_SUFFIXES = (".glb", ".gltf")


def validate_asset_url(url: str, provenance: AssetProvenance) -> bool:
    parsed = urlparse(url.strip()) if isinstance(url, str) else None
    if not parsed or parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Asset URL must be an absolute HTTP(S) URL")

    if provenance in {AssetProvenance.UNKNOWN, AssetProvenance.AI_GENERATED_CONCEPT}:
        return False

    path = parsed.path.lower()
    return path.endswith(_ALLOWED_MODEL_SUFFIXES)
