from configurator_premium import compare_purchasable_configurations


def test_comparison_ignores_interaction_state_and_accessory_order():
    result = compare_purchasable_configurations(
        {"paint_id": "p1", "wheel_id": "w1", "interior_id": "i1", "roof_id": "r1", "accessory_ids": ["a1", "a2"]},
        {"paint_id": "p1", "wheel_id": "w2", "interior_id": "i1", "roof_id": "r1", "accessory_ids": ["a2", "a1"]},
    )
    assert result.differences == ["wheel_id"]
