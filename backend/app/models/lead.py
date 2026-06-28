"""The Lead ORM model and its state machine enum."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LeadState(str, enum.Enum):
    """A lead starts PENDING and moves one-way to REACHED_OUT (DESIGN.md 9)."""

    PENDING = "PENDING"
    REACHED_OUT = "REACHED_OUT"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)

    # Resume lives in object storage; we keep the key + display metadata here.
    resume_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    resume_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    resume_content_type: Mapped[str] = mapped_column(String(255), nullable=False)

    state: Mapped[LeadState] = mapped_column(
        Enum(LeadState, name="lead_state"),
        nullable=False,
        default=LeadState.PENDING,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    reached_out_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Private attorney notes (internal; never shown to the prospect).
    notes: Mapped[str] = mapped_column(String(5000), nullable=False, server_default="")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Lead {self.id} {self.email} {self.state.value}>"
