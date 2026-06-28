"""SMTP backend — used locally against Mailpit (no auth/TLS), which captures every
message in a web inbox at http://localhost:8025. Mailpit accepts ANY recipient, which is
why it's the canonical demo for the 'email both prospect and attorney' requirement."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage as MimeMessage

from app.services.email.base import EmailMessage


class SMTPEmailClient:
    def __init__(self, host: str, port: int, default_from: str) -> None:
        self.host = host
        self.port = port
        self.default_from = default_from

    def send(self, message: EmailMessage) -> None:
        mime = MimeMessage()
        mime["From"] = self.default_from
        mime["To"] = message.to
        mime["Subject"] = message.subject
        mime.set_content(message.text)
        mime.add_alternative(message.html, subtype="html")
        with smtplib.SMTP(self.host, self.port, timeout=10) as server:
            server.send_message(mime)
