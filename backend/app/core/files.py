"""Resume upload validation + filename sanitization.

The filename arrives from the client and is used to build the storage key, so it must be
sanitized (DESIGN.md 5.1 / 13): strip any path components, restrict to a safe charset, and
bound the length. Content-type/extension/size are validated; magic-byte sniffing and virus
scanning are deferred and documented (DESIGN.md 13), not silently skipped.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_RESUME_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    # Some browsers send a generic type; accept it and rely on the extension check.
    "application/octet-stream",
}


def sanitize_filename(name: str) -> str:
    """Reduce an arbitrary client filename to a safe storage-key component."""
    # Strip any directory components (handles both / and \ separators).
    name = name.replace("\\", "/").split("/")[-1]
    name = name.replace("\x00", "").strip()
    # Restrict to a conservative charset; collapse everything else to underscores.
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    # Avoid leading dots (hidden files) and empties; bound the length.
    name = name.lstrip(".") or "resume"
    return name[:200]


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""


class ResumeError(str, Enum):
    EMPTY = "empty"
    TOO_LARGE = "too_large"
    BAD_EXTENSION = "bad_extension"
    BAD_TYPE = "bad_type"


@dataclass(frozen=True)
class ResumeValidation:
    reason: ResumeError
    message: str


def validate_resume(
    filename: str, content_type: str, size: int, max_size: int
) -> ResumeValidation | None:
    """Return a structured validation error, or None if the upload is acceptable.

    Returning a `reason` (rather than just a message) lets the router map to the correct
    HTTP status without brittle string matching.
    """
    if size <= 0:
        return ResumeValidation(ResumeError.EMPTY, "Resume file is empty.")
    if size > max_size:
        mb = max_size / (1024 * 1024)
        return ResumeValidation(
            ResumeError.TOO_LARGE, f"Resume exceeds the maximum size of {mb:.0f} MB."
        )
    if _extension(filename) not in ALLOWED_RESUME_EXTENSIONS:
        return ResumeValidation(
            ResumeError.BAD_EXTENSION, "Resume must be a PDF, DOC, or DOCX file."
        )
    if content_type not in ALLOWED_RESUME_CONTENT_TYPES:
        return ResumeValidation(
            ResumeError.BAD_TYPE, f"Unsupported content type: {content_type}."
        )
    return None
