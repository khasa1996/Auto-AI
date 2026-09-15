"""Persistence freshness checks for saved configurator snapshots."""

from __future__ import annotations

from typing import Dict, Optional, Tuple


def assess_saved_configuration_freshness(
    saved_document: Dict[str, object],
    current_price_snapshot: Dict[str, object],
    current_asset: Optional[Dict[str, object]],
) -> Tuple[bool, Optional[str]]:
    """Compare persisted authoritative context with the current verified context."""
    if int(saved_document.get("price_snapshot", 0)) != int(current_price_snapshot.get("estimated_on_road", 0)):
        return True, "Authoritative configurator price has changed"
    if current_asset is None:
        return True, "Published verified configurator asset is unavailable"
    if (
        saved_document.get("asset_id") != current_asset.get("asset_id")
        or saved_document.get("asset_version") != current_asset.get("version")
    ):
        return True, "Published verified configurator asset has changed"
    return False, None
