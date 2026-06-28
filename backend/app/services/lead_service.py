"""Business logic for leads: create (with storage + orphan safety), list, get,
presigned resume URL, and the state-machine transition guard."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.files import sanitize_filename
from app.models.lead import Lead, LeadState
from app.repositories.lead_repository import LeadRepository
from app.services.exceptions import InvalidStateTransition, LeadNotFound
from app.services.storage import StorageClient

logger = logging.getLogger(__name__)


class LeadService:
    def __init__(self, db: Session, storage: StorageClient) -> None:
        self.db = db
        self.repo = LeadRepository(db)
        self.storage = storage

    def create_lead(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        resume_bytes: bytes,
        resume_filename: str,
        resume_content_type: str,
    ) -> Lead:
        lead_id = uuid.uuid4()
        key = f"resumes/{lead_id}/{sanitize_filename(resume_filename)}"

        # Upload first, then commit the DB row (the source of truth). If the commit fails,
        # delete the just-uploaded object so we don't leak an orphan (DESIGN.md 5.1).
        self.storage.upload(key, resume_bytes, resume_content_type)
        lead = Lead(
            id=lead_id,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email,
            resume_key=key,
            resume_filename=resume_filename,
            resume_content_type=resume_content_type,
            state=LeadState.PENDING,
        )
        try:
            self.repo.add(lead)
            self.db.commit()
            self.db.refresh(lead)
        except Exception:
            self.db.rollback()
            try:
                self.storage.delete(key)
            except Exception:  # noqa: BLE001
                logger.warning("Failed to clean up orphaned object %s", key)
            raise
        return lead

    def list_leads(
        self, state: LeadState | None, limit: int, offset: int
    ) -> tuple[list[Lead], int]:
        return self.repo.list(state, limit, offset)

    def get_lead(self, lead_id: uuid.UUID) -> Lead:
        lead = self.repo.get(lead_id)
        if lead is None:
            raise LeadNotFound(lead_id)
        return lead

    def resume_download_url(self, lead_id: uuid.UUID, *, inline: bool = False) -> str:
        lead = self.get_lead(lead_id)
        return self.storage.presigned_get_url(
            lead.resume_key,
            lead.resume_filename,
            settings.resume_url_ttl_seconds,
            content_type=lead.resume_content_type,
            inline=inline,
        )

    def update_notes(self, lead_id: uuid.UUID, notes: str) -> Lead:
        """Replace the private attorney notes on a lead."""
        lead = self.get_lead(lead_id)
        lead.notes = notes
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def transition(self, lead_id: uuid.UUID, target: LeadState) -> Lead:
        """Apply the one-way state machine.

        PENDING → REACHED_OUT advances and stamps reached_out_at. Re-marking the same state
        is an idempotent no-op. Any other transition (e.g. REACHED_OUT → PENDING) is illegal.
        """
        lead = self.get_lead(lead_id)

        if lead.state == target:
            return lead  # idempotent: a repeat "Mark Reached Out" is a no-op, not an error

        if lead.state == LeadState.PENDING and target == LeadState.REACHED_OUT:
            lead.state = LeadState.REACHED_OUT
            lead.reached_out_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(lead)
            return lead

        raise InvalidStateTransition(lead.state, target)
