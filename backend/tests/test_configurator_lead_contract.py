from configurator_premium import ConfiguredLeadPayload


def test_configured_lead_contract_rejects_negative_price():
    try:
        ConfiguredLeadPayload(variant_id='v1', configuration={}, estimated_on_road=-1)
    except ValueError:
        return
    raise AssertionError('negative configured price must be rejected')


def test_configured_lead_contract_defaults_source():
    payload = ConfiguredLeadPayload(variant_id='v1', configuration={})
    assert payload.source == 'configurator'
