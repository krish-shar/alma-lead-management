"""API integration tests through an ASGI TestClient against the (transactional) DB,
with a fake storage backend and the email notification stubbed out."""

import io
import uuid
from unittest.mock import Mock

from app.models.lead import Lead, LeadState


def _pdf():
    return {"resume": ("cv.pdf", io.BytesIO(b"%PDF-1.4 minimal"), "application/pdf")}


def _fields(**over):
    data = {"first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com"}
    data.update(over)
    return data


def test_post_lead_persists_uploads_and_schedules_both_emails(
    client, db_session, storage, monkeypatch
):
    import app.api.routes_leads as routes

    notify = Mock()
    monkeypatch.setattr(routes, "send_new_lead_notifications", notify)

    res = client.post("/api/leads", data=_fields(), files=_pdf())
    assert res.status_code == 201
    body = res.json()
    assert body["state"] == "PENDING"
    assert body["email"] == "ada@example.com"

    # Persisted as PENDING
    lead = db_session.get(Lead, uuid.UUID(body["id"]))
    assert lead is not None and lead.state == LeadState.PENDING

    # Resume uploaded to (fake) storage under the lead's key
    assert any(k.startswith(f"resumes/{body['id']}/") for k in storage.objects)

    # Both notification emails scheduled with the right recipient/name
    notify.assert_called_once()
    kwargs = notify.call_args.kwargs
    assert kwargs["email"] == "ada@example.com"
    assert kwargs["first_name"] == "Ada"


def test_post_lead_rejects_bad_file_type(client):
    res = client.post(
        "/api/leads",
        data=_fields(),
        files={"resume": ("cv.exe", io.BytesIO(b"x"), "application/x-msdownload")},
    )
    assert res.status_code == 415


def test_post_lead_validation_error(client, monkeypatch):
    import app.api.routes_leads as routes

    monkeypatch.setattr(routes, "send_new_lead_notifications", Mock())
    res = client.post("/api/leads", data=_fields(first_name="", email="not-an-email"), files=_pdf())
    assert res.status_code == 422


def test_list_requires_authentication(unauth_client):
    assert unauth_client.get("/api/leads").status_code == 401
    assert (
        unauth_client.patch(f"/api/leads/{uuid.uuid4()}", json={"state": "REACHED_OUT"}).status_code
        == 401
    )


def test_list_patch_idempotent_and_illegal_transition(client, monkeypatch):
    import app.api.routes_leads as routes

    monkeypatch.setattr(routes, "send_new_lead_notifications", Mock())
    created = client.post(
        "/api/leads", data=_fields(email="grace@example.com"), files=_pdf()
    ).json()
    lead_id = created["id"]

    listing = client.get("/api/leads").json()
    assert listing["total"] >= 1
    assert any(item["id"] == lead_id for item in listing["items"])

    # PENDING -> REACHED_OUT
    res = client.patch(f"/api/leads/{lead_id}", json={"state": "REACHED_OUT"})
    assert res.status_code == 200 and res.json()["state"] == "REACHED_OUT"

    # Re-mark is an idempotent no-op
    assert client.patch(f"/api/leads/{lead_id}", json={"state": "REACHED_OUT"}).status_code == 200

    # Illegal backwards transition
    assert client.patch(f"/api/leads/{lead_id}", json={"state": "PENDING"}).status_code == 409


def test_get_unknown_lead_returns_404(client):
    assert client.get(f"/api/leads/{uuid.uuid4()}").status_code == 404


def test_post_rejects_spoofed_pdf_by_magic_bytes(client, monkeypatch):
    """A file named cv.pdf with a pdf content-type but non-PDF bytes is rejected (415)."""
    import app.api.routes_leads as routes

    monkeypatch.setattr(routes, "send_new_lead_notifications", Mock())
    files = {"resume": ("cv.pdf", io.BytesIO(b"<html>totally not a pdf</html>"), "application/pdf")}
    assert client.post("/api/leads", data=_fields(), files=files).status_code == 415


def test_patch_notes_updates_without_changing_state(client, monkeypatch):
    import app.api.routes_leads as routes

    monkeypatch.setattr(routes, "send_new_lead_notifications", Mock())
    lead_id = client.post("/api/leads", data=_fields(email="n@x.com"), files=_pdf()).json()["id"]

    res = client.patch(f"/api/leads/{lead_id}", json={"notes": "Left a voicemail Tuesday."})
    assert res.status_code == 200
    body = res.json()
    assert body["notes"] == "Left a voicemail Tuesday."
    assert body["state"] == "PENDING"  # notes-only update doesn't advance state

    assert client.get(f"/api/leads/{lead_id}").json()["notes"] == "Left a voicemail Tuesday."


def test_public_form_is_rate_limited(client, monkeypatch):
    import app.api.routes_leads as routes
    from app.core import ratelimit
    from app.core.config import settings

    monkeypatch.setattr(routes, "send_new_lead_notifications", Mock())
    monkeypatch.setattr(settings, "rate_limit_public", "3/minute")
    ratelimit.reset()

    codes = [
        client.post("/api/leads", data=_fields(email=f"u{i}@x.com"), files=_pdf()).status_code
        for i in range(4)
    ]
    assert codes == [201, 201, 201, 429]
