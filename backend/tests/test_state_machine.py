import uuid

import pytest

from app.models.lead import Lead, LeadState
from app.services.exceptions import LeadNotFound
from app.services.lead_service import LeadService
from tests.fakes import FakeStorageClient


def _make_lead(db, state=LeadState.PENDING) -> Lead:
    lead = Lead(
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        resume_key="resumes/x/cv.pdf",
        resume_filename="cv.pdf",
        resume_content_type="application/pdf",
        state=state,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def _service(db) -> LeadService:
    return LeadService(db, FakeStorageClient())


def test_pending_advances_to_reached_out(db_session):
    lead = _make_lead(db_session)
    out = _service(db_session).transition(lead.id, LeadState.REACHED_OUT)
    assert out.state == LeadState.REACHED_OUT
    assert out.reached_out_at is not None


def test_remarking_reached_out_is_idempotent(db_session):
    lead = _make_lead(db_session, LeadState.REACHED_OUT)
    out = _service(db_session).transition(lead.id, LeadState.REACHED_OUT)
    assert out.state == LeadState.REACHED_OUT


def test_undo_reached_out_back_to_pending_clears_timestamp(db_session):
    svc = _service(db_session)
    lead = _make_lead(db_session)
    svc.transition(lead.id, LeadState.REACHED_OUT)

    out = svc.transition(lead.id, LeadState.PENDING)  # explicit undo

    assert out.state == LeadState.PENDING
    assert out.reached_out_at is None  # the undo clears the stamp so the timeline stays honest


def test_unknown_lead_raises_not_found(db_session):
    with pytest.raises(LeadNotFound):
        _service(db_session).transition(uuid.uuid4(), LeadState.REACHED_OUT)


def test_soft_delete_hides_lead_but_keeps_row_and_resume(db_session):
    storage = FakeStorageClient()
    svc = LeadService(db_session, storage)
    lead = _make_lead(db_session)
    storage.objects[lead.resume_key] = (b"%PDF-1.4", "application/pdf")

    svc.delete_lead(lead.id)

    # Hidden from the service surface (every read/update now treats it as 404)...
    with pytest.raises(LeadNotFound):
        svc.get_lead(lead.id)
    # ...but the row is retained with a deleted_at stamp, and the resume is NOT removed.
    row = db_session.get(Lead, lead.id)
    assert row is not None and row.deleted_at is not None
    assert lead.resume_key in storage.objects


def test_delete_unknown_lead_raises_not_found(db_session):
    with pytest.raises(LeadNotFound):
        _service(db_session).delete_lead(uuid.uuid4())
