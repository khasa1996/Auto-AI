from configurator_ai import _extract_json, _safe_selection, build_interaction_state, build_ai_prompt
from configurator_schemas import AIConfiguratorIntent


def catalog():
    return {
        "colors": [{"color_id": "red", "display_name": "Passion Red"}],
        "wheels": [{"wheel_id": "w1", "name": "18 inch Alloy"}],
        "interiors": [{"interior_id": "i1", "name": "Black Leather"}],
        "roofs": [{"option_id": "r1", "display_name": "Panoramic Roof"}],
        "accessories": [{"option_id": "a1", "display_name": "Floor Mats"}],
    }


def test_extract_json_accepts_markdown_fenced_json():
    assert _extract_json('```json\n{"paint_id":"red"}\n```')["paint_id"] == "red"


def test_safe_selection_rejects_ai_invented_ids():
    selected = _safe_selection(
        {
            "variant_id": "v1",
            "paint_id": "red",
            "wheel_id": "invented-wheel",
            "accessory_ids": ["a1", "invented-accessory"],
        },
        catalog(),
    )
    assert selected.variant_id == "v1"
    assert selected.paint_id == "red"
    assert selected.wheel_id is None
    assert selected.accessory_ids == ["a1"]


def test_interaction_intent_is_non_purchasable():
    state = build_interaction_state(
        AIConfiguratorIntent(
            variant_id="v1",
            raw_request="open the hood and doors",
            open_hood=True,
            open_doors=True,
            lights_on=True,
            camera_preset="interior",
        )
    )
    assert state.hood_open is True
    assert state.doors.front_left is True
    assert state.doors.front_right is True
    assert state.lighting.headlights is True
    assert state.camera_preset == "interior"


def test_ai_prompt_contains_only_catalog_option_ids():
    intent = AIConfiguratorIntent(variant_id="v1", raw_request="red with alloy wheels")
    prompt = build_ai_prompt(intent, catalog())
    assert "invented" not in prompt
    assert '"id":"red"' in prompt
    assert '"id":"w1"' in prompt
