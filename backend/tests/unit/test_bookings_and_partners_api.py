"""Unit tests for bookings, partner leads, OTP auth and the dealer dashboard."""
import pytest


def _payload(**over):
    payload = {
        "car_id": "tata-nexon",
        "name": "Asha Rao",
        "phone": "9876543210",
        "city": "Mumbai",
    }
    payload.update(over)
    return payload


def test_create_booking_returns_confirmed_booking(client):
    b = client.post("/api/bookings", json=_payload(email="asha@example.com")).json()
    assert b["car_name"].lower().startswith("tata")
    assert b["status"].startswith("Confirmed")
    assert b["eta_call_minutes"] == 15
    assert b["email"] == "asha@example.com"
    assert b["id"]


def test_create_booking_maps_known_city_to_partner_dealer(client, server_module):
    b = client.post("/api/bookings", json=_payload(city="bengaluru")).json()
    assert b["dealer"] == server_module.DEALERS_BY_CITY["Bengaluru"]


def test_create_booking_generates_dealer_name_for_unknown_city(client):
    b = client.post("/api/bookings", json=_payload(city="Nashik")).json()
    assert b["dealer"] == "Auto-AI Partner — Nashik"


def test_create_booking_defaults_optional_fields_to_blank(client):
    b = client.post("/api/bookings", json=_payload()).json()
    assert b["email"] == "" and b["notes"] == "" and b["exchange_car"] == ""
    assert b["preferred_date"] == ""
    assert b["test_drive"] is True
    assert b["needs_loan"] is False and b["needs_insurance"] is False


def test_create_booking_unknown_car_is_404(client):
    r = client.post("/api/bookings", json=_payload(car_id="ghost-car"))
    assert r.status_code == 404
    assert r.json()["detail"] == "Car not found"


def test_create_booking_requires_mandatory_fields(client):
    assert client.post("/api/bookings", json={"car_id": "tata-nexon"}).status_code == 422


def test_get_booking_roundtrip(client):
    created = client.post("/api/bookings", json=_payload()).json()
    fetched = client.get(f"/api/bookings/{created['id']}").json()
    assert fetched == created


def test_get_booking_unknown_id_is_404(client):
    r = client.get("/api/bookings/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
    assert r.json()["detail"] == "Booking not found"


def test_list_bookings_filters_by_phone(client):
    client.post("/api/bookings", json=_payload(phone="9000000001")).json()
    client.post("/api/bookings", json=_payload(phone="9000000002")).json()
    client.post("/api/bookings", json=_payload(phone="9000000002")).json()

    assert len(client.get("/api/bookings").json()) == 3
    mine = client.get("/api/bookings", params={"phone": "9000000002"}).json()
    assert len(mine) == 2 and {b["phone"] for b in mine} == {"9000000002"}


def test_my_bookings_returns_only_that_phone(client):
    client.post("/api/bookings", json=_payload(phone="9111111111")).json()
    client.post("/api/bookings", json=_payload(phone="9222222222")).json()
    mine = client.get("/api/me/bookings", params={"phone": "9111111111"}).json()
    assert [b["phone"] for b in mine] == ["9111111111"]


def test_booking_without_addons_creates_no_partner_leads(client):
    client.post("/api/bookings", json=_payload())
    assert client.get("/api/partners/leads").json()["leads"] == []


def test_booking_with_addons_creates_loan_and_insurance_leads(client, server_module):
    booking = client.post(
        "/api/bookings", json=_payload(needs_loan=True, needs_insurance=True)
    ).json()
    body = client.get("/api/partners/leads").json()
    leads = body["leads"]
    assert {lead["partner_type"] for lead in leads} == {"loan", "insurance"}
    assert all(lead["booking_id"] == booking["id"] for lead in leads)
    assert body["total_commission"] == pytest.approx(
        round(sum(lead["expected_commission"] for lead in leads), 2)
    )
    assert set(body["by_partner"]) == {
        server_module.LOAN_PARTNERS[0]["name"],
        server_module.INSURANCE_PARTNERS[0]["name"],
    }
    assert all(entry["count"] == 1 for entry in body["by_partner"].values())


def test_partner_leads_aggregates_repeat_partners(client, server_module):
    for _ in range(3):
        client.post("/api/bookings", json=_payload(needs_loan=True))
    body = client.get("/api/partners/leads").json()
    loan_partner = server_module.LOAN_PARTNERS[0]["name"]
    assert body["by_partner"][loan_partner]["count"] == 3
    assert body["by_partner"][loan_partner]["commission"] == pytest.approx(
        body["total_commission"]
    )


def test_list_partners_returns_loan_and_insurance(client, server_module):
    all_p = client.get("/api/partners").json()
    assert len(all_p) == len(server_module.LOAN_PARTNERS) + len(server_module.INSURANCE_PARTNERS)


@pytest.mark.parametrize("ptype", ["loan", "insurance"])
def test_list_partners_filters_by_type(client, ptype):
    partners = client.get("/api/partners", params={"type": ptype}).json()
    assert partners and {p["type"] for p in partners} == {ptype}


def test_list_partners_unknown_type_is_empty(client):
    assert client.get("/api/partners", params={"type": "warranty"}).json() == []


def test_send_otp_returns_demo_code(client):
    body = client.post("/api/auth/send-otp", json={"phone": "9876543210"}).json()
    assert body["sent"] is True and body["demo_otp"] == "123456"


def test_verify_otp_issues_token_for_correct_code(client):
    body = client.post(
        "/api/auth/verify-otp", json={"phone": "9876543210", "otp": "123456"}
    ).json()
    assert body["phone"] == "9876543210"
    assert body["token"].startswith("autoai_9876543210_")


def test_verify_otp_rejects_wrong_code(client):
    r = client.post("/api/auth/verify-otp", json={"phone": "9876543210", "otp": "000000"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid OTP"


def test_dealer_leads_dashboard_aggregates_counts(client):
    client.post("/api/bookings", json=_payload(city="Mumbai", needs_loan=True))
    client.post("/api/bookings", json=_payload(city="Mumbai", needs_insurance=True))
    client.post(
        "/api/bookings",
        json=_payload(car_id="hyundai-creta", city="Pune", test_drive=False),
    )

    body = client.get("/api/dealer/leads").json()
    assert body["total_leads"] == 3
    assert body["test_drive_requests"] == 2
    assert body["loan_interest"] == 1
    assert body["insurance_interest"] == 1
    assert body["top_cars"][0]["count"] == 2
    assert {c["city"]: c["count"] for c in body["top_cities"]} == {"Mumbai": 2, "Pune": 1}
    assert len(body["recent"]) == 3


def test_dealer_leads_filters_by_city(client):
    client.post("/api/bookings", json=_payload(city="Mumbai"))
    client.post("/api/bookings", json=_payload(city="Pune"))
    body = client.get("/api/dealer/leads", params={"city": "Pune"}).json()
    assert body["total_leads"] == 1
    assert body["top_cities"] == [{"city": "Pune", "count": 1}]


def test_dealer_leads_empty_dashboard(client):
    body = client.get("/api/dealer/leads").json()
    assert body["total_leads"] == 0
    assert body["top_cars"] == [] and body["recent"] == []


def test_dealer_leads_top_lists_are_capped_at_ten(client):
    cars = [c["id"] for c in client.get("/api/cars").json()[:12]]
    for car_id in cars:
        client.post("/api/bookings", json=_payload(car_id=car_id))
    body = client.get("/api/dealer/leads").json()
    assert len(body["top_cars"]) == 10
