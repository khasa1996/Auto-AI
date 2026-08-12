"""Unit tests for the pure helpers in server.py (no HTTP, no network)."""
import asyncio

import pytest
from fastapi import HTTPException


def test_extract_json_from_plain_object(server_module):
    assert server_module.extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_ignores_surrounding_prose_and_fences(server_module):
    text = 'Sure! ```json\n{"winner": "Tata Nexon", "scores": {"value": {"a": 8}}}\n``` Hope that helps.'
    assert server_module.extract_json(text) == {
        "winner": "Tata Nexon",
        "scores": {"value": {"a": 8}},
    }


@pytest.mark.parametrize("text", ["no json here", "", "{not: valid json,}"])
def test_extract_json_returns_none_when_unparseable(server_module, text):
    assert server_module.extract_json(text) is None


def test_format_booking_context_without_bookings(server_module):
    assert server_module._format_booking_context([]) == "(no bookings linked to this phone)"


def _booking_dict(bid, **over):
    base = {
        "id": bid,
        "car_name": "Tata Nexon",
        "city": "Mumbai",
        "dealer": "Auto-AI Partner — Andheri Hub",
        "status": "Confirmed",
        "eta_call_minutes": 15,
        "test_drive": True,
        "needs_loan": False,
        "needs_insurance": True,
    }
    base.update(over)
    return base


def test_format_booking_context_uses_uppercase_id_prefix(server_module):
    out = server_module._format_booking_context([_booking_dict("abcdef12-3456-7890-aaaa-bbbbbbbbbbbb")])
    assert "Booking #ABCDEF12" in out
    assert "Tata Nexon" in out and "Andheri Hub" in out
    assert "ETA call: 15 min" in out


def test_format_booking_context_caps_at_five_bookings(server_module):
    bookings = [_booking_dict(f"{i:08d}-0000-0000-0000-000000000000") for i in range(9)]
    out = server_module._format_booking_context(bookings)
    assert len(out.splitlines()) == 5


def test_check_admin_accepts_configured_pin(server_module):
    assert server_module._check_admin(server_module.ADMIN_PIN) is None


def test_check_admin_rejects_wrong_pin(server_module):
    with pytest.raises(HTTPException) as exc:
        server_module._check_admin("000000")
    assert exc.value.status_code == 401


def _booking(server_module, **over):
    fields = {
        "id": "b-1",
        "car_id": "tata-nexon",
        "car_name": "Tata Nexon",
        "name": "Asha",
        "phone": "9876543210",
        "city": "Pune",
        "test_drive": True,
        "needs_loan": False,
        "needs_insurance": False,
        "status": "Confirmed",
        "dealer": "Auto-AI Partner — Koregaon Park",
        "eta_call_minutes": 15,
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    fields.update(over)
    return server_module.Booking(**fields)


def test_assign_partners_returns_nothing_when_no_addons_requested(server_module):
    leads = server_module._assign_partners_to_booking(
        _booking(server_module), {"price_on_road": 1265000}
    )
    assert leads == []


def test_assign_partners_creates_loan_lead_with_85_percent_ltv(server_module):
    partner = server_module.LOAN_PARTNERS[0]
    leads = server_module._assign_partners_to_booking(
        _booking(server_module, needs_loan=True), {"price_on_road": 1000000}
    )
    assert len(leads) == 1
    lead = leads[0]
    assert lead["partner_type"] == "loan"
    assert lead["partner_id"] == partner["id"]
    assert lead["loan_amount"] == pytest.approx(850000)
    assert lead["expected_commission"] == pytest.approx(round(850000 * partner["commission_pct"] / 100, 2))
    assert lead["status"] == "assigned"
    assert lead["booking_id"] == "b-1"


def test_assign_partners_creates_insurance_lead_from_premium_percentage(server_module):
    partner = server_module.INSURANCE_PARTNERS[0]
    leads = server_module._assign_partners_to_booking(
        _booking(server_module, needs_insurance=True), {"price_on_road": 1000000}
    )
    assert len(leads) == 1
    lead = leads[0]
    assert lead["partner_type"] == "insurance"
    premium = 1000000 * partner["avg_premium_pct"] / 100
    assert lead["annual_premium"] == pytest.approx(round(premium, 2))
    assert lead["expected_commission"] == pytest.approx(round(premium * partner["commission_pct"] / 100, 2))


def test_assign_partners_creates_both_leads(server_module):
    leads = server_module._assign_partners_to_booking(
        _booking(server_module, needs_loan=True, needs_insurance=True), {"price_on_road": 1000000}
    )
    assert [lead["partner_type"] for lead in leads] == ["loan", "insurance"]


def test_assign_partners_falls_back_to_ex_showroom_price(server_module):
    leads = server_module._assign_partners_to_booking(
        _booking(server_module, needs_loan=True), {"price_ex_showroom": 800000}
    )
    assert leads[0]["loan_amount"] == pytest.approx(680000)


def test_assign_partners_tolerates_car_without_price(server_module):
    leads = server_module._assign_partners_to_booking(
        _booking(server_module, needs_loan=True, needs_insurance=True), {}
    )
    assert all(lead["expected_commission"] == 0 for lead in leads)


def test_get_chat_defaults_to_claude(server_module):
    chat = asyncio.run(server_module.get_chat("s-1", "system"))
    assert chat.model == server_module.CLAUDE_MODEL
    assert chat.session_id == "s-1"
    assert chat.system_message == "system"


@pytest.mark.parametrize("model_key", ["gemini-flash", "gpt-mini", "claude-opus"])
def test_get_chat_pins_requested_model(server_module, model_key):
    entry = server_module.AI_MODELS[model_key]
    chat = asyncio.run(server_module.get_chat("s-2", "system", model_key))
    assert chat.model == (entry["provider"], entry["model"])


def test_get_chat_falls_back_for_unknown_model(server_module):
    chat = asyncio.run(server_module.get_chat("s-3", "system", "not-a-model"))
    assert chat.model == server_module.CLAUDE_MODEL


@pytest.mark.parametrize(
    "query,expected_id",
    [
        ("Tata Nexon", "tata-nexon"),
        ("  tata nexon  ", "tata-nexon"),
        ("Creta", "hyundai-creta"),
        ("I want the hyundai creta please", "hyundai-creta"),
    ],
)
def test_find_car_by_name_matches(client, server_module, query, expected_id):
    found = asyncio.run(server_module.find_car_by_name(query))
    assert found is not None and found["id"] == expected_id


def test_find_car_by_name_returns_none_for_unknown(client, server_module):
    assert asyncio.run(server_module.find_car_by_name("zzzz nonexistent zzzz")) is None
