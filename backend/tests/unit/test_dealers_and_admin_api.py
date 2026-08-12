"""Unit tests for dealer self-onboarding and the PIN-gated admin endpoints."""
import pytest

PIN = "108108"


def _application(**over):
    payload = {
        "business_name": "Sunrise Motors",
        "owner_name": "Rakesh Sharma",
        "phone": "9812345678",
        "city": "Pune",
        "brands": ["Tata", "Hyundai"],
    }
    payload.update(over)
    return payload


def _apply(client, **over):
    r = client.post("/api/dealers/apply", json=_application(**over))
    assert r.status_code == 200, r.text
    return r.json()


def test_dealer_apply_starts_unverified_with_default_bid(client):
    d = _apply(client)
    assert d["status"] == "pending_verification"
    assert d["verified"] is False
    assert d["bid_per_lead"] == 500.0
    assert d["email"] == ""
    assert d["id"] and d["created_at"]


def test_dealer_apply_keeps_custom_bid_and_email(client):
    d = _apply(client, bid_per_lead=1250.5, email="sales@sunrise.test")
    assert d["bid_per_lead"] == 1250.5
    assert d["email"] == "sales@sunrise.test"


def test_dealer_apply_requires_core_fields(client):
    assert client.post("/api/dealers/apply", json={"business_name": "X"}).status_code == 422


def test_list_dealers_sorted_by_bid_desc(client):
    _apply(client, business_name="Low", bid_per_lead=300)
    _apply(client, business_name="High", bid_per_lead=2000)
    _apply(client, business_name="Mid", bid_per_lead=900)
    names = [d["business_name"] for d in client.get("/api/dealers").json()]
    assert names == ["High", "Mid", "Low"]


def test_list_dealers_filters_by_city(client):
    _apply(client, city="Pune")
    _apply(client, business_name="Delhi Motors", city="Delhi")
    dealers = client.get("/api/dealers", params={"city": "Delhi"}).json()
    assert [d["business_name"] for d in dealers] == ["Delhi Motors"]


def test_admin_verify_accepts_correct_pin(client):
    body = client.post("/api/admin/verify", json={"pin": PIN}).json()
    assert body["ok"] is True and body["token"].startswith("admin_")


def test_admin_verify_rejects_wrong_pin(client):
    r = client.post("/api/admin/verify", json={"pin": "999999"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid admin PIN"


def test_admin_list_dealers_requires_pin(client):
    assert client.get("/api/admin/dealers", params={"pin": "nope"}).status_code == 401


def test_admin_list_dealers_reports_stats(client):
    _apply(client, bid_per_lead=1000)
    approved = _apply(client, business_name="Approved Motors", bid_per_lead=2000)
    client.post(f"/api/admin/dealers/{approved['id']}/approve", json={"pin": PIN})

    body = client.get("/api/admin/dealers", params={"pin": PIN}).json()
    assert body["stats"] == {
        "total": 2,
        "pending": 1,
        "approved": 1,
        "rejected": 0,
        "avg_bid": 1500.0,
    }
    assert len(body["dealers"]) == 2


def test_admin_list_dealers_filters_by_status(client):
    _apply(client)
    rejected = _apply(client, business_name="Shady Motors")
    client.post(f"/api/admin/dealers/{rejected['id']}/reject", json={"pin": PIN})

    body = client.get(
        "/api/admin/dealers", params={"pin": PIN, "status": "rejected"}
    ).json()
    assert [d["business_name"] for d in body["dealers"]] == ["Shady Motors"]
    assert body["stats"]["rejected"] == 1


def test_admin_stats_avg_bid_with_no_dealers(client):
    body = client.get("/api/admin/dealers", params={"pin": PIN}).json()
    assert body["stats"] == {"total": 0, "pending": 0, "approved": 0, "rejected": 0, "avg_bid": 0.0}


def test_admin_approve_marks_dealer_verified_with_note(client):
    dealer = _apply(client)
    updated = client.post(
        f"/api/admin/dealers/{dealer['id']}/approve",
        json={"pin": PIN, "note": "docs verified"},
    ).json()
    assert updated["status"] == "approved"
    assert updated["verified"] is True
    assert updated["admin_note"] == "docs verified"
    assert updated["approved_at"]


def test_admin_reject_marks_dealer_rejected(client):
    dealer = _apply(client)
    updated = client.post(
        f"/api/admin/dealers/{dealer['id']}/reject", json={"pin": PIN, "note": "no GST"}
    ).json()
    assert updated["status"] == "rejected"
    assert updated["verified"] is False
    assert updated["admin_note"] == "no GST"
    assert updated["rejected_at"]


@pytest.mark.parametrize("action", ["approve", "reject"])
def test_admin_actions_require_pin(client, action):
    dealer = _apply(client)
    r = client.post(f"/api/admin/dealers/{dealer['id']}/{action}", json={"pin": "000000"})
    assert r.status_code == 401


@pytest.mark.parametrize("action", ["approve", "reject"])
def test_admin_actions_on_unknown_dealer_are_404(client, action):
    r = client.post(f"/api/admin/dealers/ghost-dealer/{action}", json={"pin": PIN})
    assert r.status_code == 404
    assert r.json()["detail"] == "Dealer not found"
