"""Data-access layer for leads. The only place that issues SQLAlchemy queries for leads,
so the service layer stays free of ORM/query details."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadState


class LeadRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, lead: Lead) -> Lead:
        self.db.add(lead)
        return lead

    def get(self, lead_id: uuid.UUID) -> Lead | None:
        return self.db.get(Lead, lead_id)

    def list(self, state: LeadState | None, limit: int, offset: int) -> tuple[list[Lead], int]:
        filters = [Lead.state == state] if state is not None else []

        total = self.db.scalar(select(func.count()).select_from(Lead).where(*filters))
        items = self.db.scalars(
            select(Lead)
            .where(*filters)
            .order_by(Lead.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        return list(items), int(total or 0)
