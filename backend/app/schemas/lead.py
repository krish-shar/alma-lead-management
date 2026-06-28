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
    created_at: datetime
    updated_at: datetime
    reached_out_at: datetime | None


class LeadList(BaseModel):
    items: list[LeadRead]
    total: int


class LeadUpdate(BaseModel):
    """Only the state may be updated, and only forward (DESIGN.md 1.3 / 9)."""

    state: LeadState
