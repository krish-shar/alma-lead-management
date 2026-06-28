"""Resend backend — used in the hosted (stretch) deploy for real delivery.

NOTE (DESIGN.md 7): Resend's free tier only delivers to arbitrary recipients once a
sending domain is verified; otherwise it restricts to the account owner's address.
"""

from __future__ import annotations

import httpx

from app.services.email.base import EmailMessage

RESEND_ENDPOINT = "https://api.resend.com/emails"


class ResendEmailClient:
    def __init__(self, api_key: str, default_from: str) -> None:
        if not api_key:
            raise ValueError("RESEND_API_KEY is required when EMAIL_PROVIDER=resend")
        self.api_key = api_key
        self.default_from = default_from

    def send(self, message: EmailMessage) -> None:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "from": self.default_from,
                "to": [message.to],
                "subject": message.subject,
                "html": message.html,
                "text": message.text,
            },
            timeout=15,
        )
        response.raise_for_status()
