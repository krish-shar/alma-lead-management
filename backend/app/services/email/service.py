"""Email client factory + the new-lead notification orchestration.

`send_new_lead_notifications` is what the API schedules as a background task after a lead is
persisted. It sends both emails best-effort: a failure is logged but never raised, so a flaky
mail provider can't fail a submission that's already committed (DESIGN.md 5.1).
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.services.email.base import EmailClient
from app.services.email.resend import ResendEmailClient
from app.services.email.smtp import SMTPEmailClient
from app.services.email.templates import build_attorney_email, build_prospect_email

logger = logging.getLogger(__name__)


def get_email_client() -> EmailClient:
    """Select the backend from configuration (smtp→Mailpit locally, resend hosted)."""
    if settings.email_provider == "resend":
        return ResendEmailClient(settings.resend_api_key, settings.email_from)
    return SMTPEmailClient(settings.smtp_host, settings.smtp_port, settings.email_from)


def send_new_lead_notifications(
    *,
    lead_id: str,
    first_name: str,
    last_name: str,
    email: str,
    client: EmailClient | None = None,
) -> None:
    """Send the prospect confirmation and the attorney notification."""
    client = client or get_email_client()
    dashboard_url = f"{settings.public_app_url}/dashboard/{lead_id}"

    messages = [
        build_prospect_email(first_name, email),
        build_attorney_email(
            first_name, last_name, email, settings.attorney_email, dashboard_url
        ),
    ]
    for message in messages:
        try:
            client.send(message)
            logger.info("Sent '%s' to %s", message.subject, message.to)
        except Exception as exc:  # noqa: BLE001 - email is best-effort, never fatal
            logger.error("Failed to send '%s' to %s: %s", message.subject, message.to, exc)
