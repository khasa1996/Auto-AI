from configurator_premium import ConfiguredLeadPayload


def test_configured_lead_payload_defaults_to_configurator_source():
    payload = ConfiguredLeadPayload(variant_id='variant-1', configuration={})
    assert payload.source == 'configurator'
    assert payload.city is None
    assert payload.estimated_on_road is None
