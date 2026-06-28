"""Lead API routes. The POST is public (the prospect form); GET/PATCH are gated by auth
in Phase 2 (the `require_attorney` dependency is added there)."""

from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.files import ResumeError, sniff_resume, validate_resume
from app.core.ratelimit import rate_limit_public
from app.core.security import require_attorney
from app.db.session import get_db
from app.models.lead import LeadState
from app.schemas.lead import LeadCreate, LeadList, LeadRead, LeadUpdate
from app.services.email import send_new_lead_notifications
from app.services.exceptions import InvalidStateTransition, LeadNotFound
from app.services.lead_service import LeadService
from app.services.storage import StorageClient, get_storage

router = APIRouter(prefix="/api/leads", tags=["leads"])

# Map a resume validation failure to the appropriate HTTP status.
_RESUME_ERROR_STATUS = {
    ResumeError.EMPTY: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ResumeError.TOO_LARGE: status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
    ResumeError.BAD_EXTENSION: status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    ResumeError.BAD_TYPE: status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    ResumeError.BAD_CONTENT: status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
}


def get_storage_dep() -> StorageClient:
    return get_storage()


def get_lead_service(
    db: Session = Depends(get_db),
    storage: StorageClient = Depends(get_storage_dep),
) -> LeadService:
    return LeadService(db, storage)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LeadRead)
def create_lead(
    background_tasks: BackgroundTasks,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    resume: UploadFile = File(...),
    service: LeadService = Depends(get_lead_service),
    _rate_limit: None = Depends(rate_limit_public),
) -> LeadRead:
    """Public endpoint: validate, store the resume, persist the lead, and email both
    the prospect and the attorney (in the background)."""
    try:
        data = LeadCreate(first_name=first_name, last_name=last_name, email=email)
    except ValidationError as exc:
        # exclude_context/url: Pydantic's raw errors() embed the original exception object,
        # which is not JSON-serializable. Keep just loc/msg/type for a clean 422 response.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(include_url=False, include_context=False, include_input=False),
        ) from exc

    # Read at most max+1 bytes so an oversized upload can't exhaust memory before we reject it.
    content = resume.file.read(settings.max_resume_bytes + 1)
    error = validate_resume(
        resume.filename or "resume",
        resume.content_type or "",
        len(content),
        settings.max_resume_bytes,
    )
    if error is not None:
        raise HTTPException(status_code=_RESUME_ERROR_STATUS[error.reason], detail=error.message)

    content_error = sniff_resume(content)
    if content_error is not None:
        raise HTTPException(
            status_code=_RESUME_ERROR_STATUS[content_error.reason], detail=content_error.message
        )

    lead = service.create_lead(
        first_name=data.first_name,
        last_name=data.last_name,
        email=str(data.email),
        resume_bytes=content,
        resume_filename=resume.filename or "resume",
        resume_content_type=resume.content_type or "application/octet-stream",
    )

    # Best-effort, non-blocking: the prospect never waits on email I/O (DESIGN.md 5.1).
    background_tasks.add_task(
        send_new_lead_notifications,
        lead_id=str(lead.id),
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
    )
    return LeadRead.model_validate(lead)


@router.get("", response_model=LeadList)
def list_leads(
    state: LeadState | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: LeadService = Depends(get_lead_service),
    _attorney: dict = Depends(require_attorney),
) -> LeadList:
    items, total = service.list_leads(state, limit, offset)
    return LeadList(items=[LeadRead.model_validate(i) for i in items], total=total)


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(
    lead_id: uuid.UUID,
    service: LeadService = Depends(get_lead_service),
    _attorney: dict = Depends(require_attorney),
) -> LeadRead:
    try:
        return LeadRead.model_validate(service.get_lead(lead_id))
    except LeadNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found") from exc


@router.get("/{lead_id}/resume")
def get_lead_resume(
    lead_id: uuid.UUID,
    inline: bool = Query(default=False),
    service: LeadService = Depends(get_lead_service),
    _attorney: dict = Depends(require_attorney),
) -> dict:
    try:
        return {"url": service.resume_download_url(lead_id, inline=inline)}
    except LeadNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found") from exc


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    service: LeadService = Depends(get_lead_service),
    _attorney: dict = Depends(require_attorney),
) -> LeadRead:
    try:
        lead = service.get_lead(lead_id)
        if payload.notes is not None:
            lead = service.update_notes(lead_id, payload.notes)
        if payload.state is not None:
            lead = service.transition(lead_id, payload.state)
        return LeadRead.model_validate(lead)
    except LeadNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found") from exc
    except InvalidStateTransition as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
