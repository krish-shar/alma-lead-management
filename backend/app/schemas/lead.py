"""Pydantic schemas: request validation and response serialization for leads."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.lead import LeadState


class LeadCreate(BaseModel):
    """Validates the text fields of the public submission (the file is handled separately).

    Used to leverage Pydantic's EmailStr + non-empty checks on multipart form fields.
    """

    first_name: str
    last_name: str
    email: EmailStr

    @field_validator("first_name", "last_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    resume_filename: str
    state: LeadState
    notes: str
    created_at: datetime
    updated_at: datetime
    reached_out_at: datetime | None


class LeadList(BaseModel):
    items: list[LeadRead]
    total: int


class LeadUpdate(BaseModel):
    """An attorney may change the state (advance to reached-out, or undo back to pending)
    and/or edit the private notes. Both fields are optional so the dashboard can patch them
    independently."""

    state: LeadState | None = None
    notes: str | None = None

    @field_validator("notes")
    @classmethod
    def notes_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 5000:
            raise ValueError("notes must be 5000 characters or fewer")
        return v
