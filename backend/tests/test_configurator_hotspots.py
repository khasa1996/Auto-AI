import pytest
from pydantic import ValidationError

from configurator_hotspots import ConfiguratorHotspot, validate_hotspots


def test_hotspot_accepts_normalized_coordinates():
    hotspot = ConfiguratorHotspot(id="driver-door", label="Driver door", x=42.5, y=61)
    assert hotspot.x == 42.5
    assert hotspot.y == 61


def test_hotspot_rejects_coordinates_outside_canvas():
    with pytest.raises(ValidationError):
        ConfiguratorHotspot(id="bad", label="Bad", x=101, y=20)


def test_hotspot_rejects_duplicate_ids():
    hotspots = [
        ConfiguratorHotspot(id="door", label="Door", x=20, y=30),
        ConfiguratorHotspot(id="door", label="Door again", x=40, y=50),
    ]
    errors = validate_hotspots(hotspots)
    assert errors == ["Duplicate hotspot IDs: door"]
