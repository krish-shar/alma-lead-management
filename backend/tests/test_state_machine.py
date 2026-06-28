import uuid

import pytest

from app.models.lead import Lead, LeadState
from app.services.exceptions import InvalidStateTransition, LeadNotFound
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


def test_cannot_go_back_to_pending(db_session):
    lead = _make_lead(db_session, LeadState.REACHED_OUT)
    with pytest.raises(InvalidStateTransition):
        _service(db_session).transition(lead.id, LeadState.PENDING)


def test_unknown_lead_raises_not_found(db_session):
    with pytest.raises(LeadNotFound):
        _service(db_session).transition(uuid.uuid4(), LeadState.REACHED_OUT)
