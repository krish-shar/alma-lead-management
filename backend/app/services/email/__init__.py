from app.services.email.base import EmailClient, EmailMessage
from app.services.email.service import get_email_client, send_new_lead_notifications

__all__ = [
    "EmailClient",
    "EmailMessage",
    "get_email_client",
    "send_new_lead_notifications",
]
