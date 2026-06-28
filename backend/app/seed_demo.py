"""Seed a realistic set of demo leads (for local demos / the Loom).

Reads resume files from a directory (default /tmp/sample-resumes), clears any existing leads
and stored resumes, then creates a diverse, lived-in dataset: mixed states, backdated
submission dates, attorney notes, and one re-application (same email) to exercise the
duplicate-detection flag.

Run:  docker compose exec backend python -m app.seed_demo /tmp/sample-resumes
(or just `make demo`, which copies the fixtures in and clears Mailpit too).
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

from app.core.files import sanitize_filename
from app.db.session import SessionLocal
from app.models.lead import Lead, LeadState
from app.services.storage import get_storage

PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# (first, last, email, file, content_type, state, created_days_ago, hour, reached_days_ago, notes)
PERSONAS = [
    ("Ada", "Chen", "ada.chen@example.com", "Ada_Chen_Resume.pdf", PDF, "PENDING", 0, 9, None, ""),
    (
        "Mateo",
        "Rossi",
        "m.rossi@example.com",
        "Mateo_Rossi_CV.pdf",
        PDF,
        "PENDING",
        1,
        11,
        None,
        "",
    ),
    (
        "Yuki",
        "Tanaka",
        "yuki.tanaka@example.com",
        "Yuki_Tanaka_Resume.docx",
        DOCX,
        "PENDING",
        2,
        14,
        None,
        "",
    ),
    ("Liang", "Wei", "liang.wei@example.com", "Liang_Wei_CV.pdf", PDF, "PENDING", 4, 16, None, ""),
    (
        "Priya",
        "Nair",
        "priya.nair@example.com",
        "Priya_Nair_Resume.pdf",
        PDF,
        "REACHED_OUT",
        3,
        9,
        2,
        "Initial call done — gathering H-1B transfer docs. Strong candidate; following up Friday.",
    ),
    (
        "Sofia",
        "Ramírez",
        "sofia.ramirez@example.com",
        "Sofia_Ramirez_Resume.pdf",
        PDF,
        "REACHED_OUT",
        5,
        10,
        4,
        "Left a voicemail + intro email. Awaiting reply; TN visa likely the fastest path.",
    ),
    (
        "Amara",
        "Okeke",
        "amara.okeke@example.com",
        "Amara_Okeke_Resume.docx",
        DOCX,
        "REACHED_OUT",
        7,
        13,
        6,
        "Referred to an associate — strong EB-2 NIW profile. Scheduling a deeper consult.",
    ),
    # Re-application: same email as Ada, submitted later today -> flagged as a duplicate.
    ("Ada", "Chen", "ada.chen@example.com", "Ada_Chen_Resume.pdf", PDF, "PENDING", 0, 15, None, ""),
]


def main() -> None:
    resume_dir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/sample-resumes"
    storage = get_storage()
    storage.ensure_bucket()
    db = SessionLocal()

    # Clean slate: drop existing leads + their stored resumes.
    db.query(Lead).delete()
    db.commit()
    try:
        storage.delete_prefix("resumes/")
    except Exception as exc:  # noqa: BLE001 - best-effort cleanup
        print("warn: could not clear storage:", exc)

    now = datetime.now(UTC)
    for first, last, email, fname, ctype, state, days, hour, reached_days, notes in PERSONAS:
        with open(os.path.join(resume_dir, fname), "rb") as fh:
            data = fh.read()
        lead_id = uuid.uuid4()
        key = f"resumes/{lead_id}/{sanitize_filename(fname)}"
        storage.upload(key, data, ctype)

        created = (now - timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
        updated, reached = created, None
        if state == "REACHED_OUT" and reached_days is not None:
            reached = (now - timedelta(days=reached_days)).replace(
                hour=hour + 1, minute=30, second=0, microsecond=0
            )
            updated = reached

        db.add(
            Lead(
                id=lead_id,
                first_name=first,
                last_name=last,
                email=email,
                resume_key=key,
                resume_filename=fname,
                resume_content_type=ctype,
                state=LeadState(state),
                notes=notes,
                created_at=created,
                updated_at=updated,
                reached_out_at=reached,
            )
        )
    db.commit()
    print(f"Seeded {len(PERSONAS)} demo leads from {resume_dir}.")


if __name__ == "__main__":
    main()
