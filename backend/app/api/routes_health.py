"""Health endpoint: reports liveness plus DB and storage connectivity.

Returns 200 with per-component status so a reviewer (or an uptime check / load balancer)
can see at a glance whether the API and its dependencies are wired up correctly.
"""

import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import engine
from app.services.storage import get_storage

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


def _check_db() -> str:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as exc:  # noqa: BLE001 - report any failure, don't crash the probe
        logger.warning("DB health check failed: %s", exc)
        return "error"


def _check_storage() -> str:
    try:
        get_storage().ping()
        return "ok"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Storage health check failed: %s", exc)
        return "error"


@router.get("/api/health")
def health() -> dict:
    db = _check_db()
    storage = _check_storage()
    overall = "ok" if db == "ok" and storage == "ok" else "degraded"
    return {"status": overall, "db": db, "storage": storage}
