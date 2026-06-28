"""In-memory backend for tests — captures sent messages instead of delivering them."""

from __future__ import annotations

from app.services.email.base import EmailMessage


class FakeEmailClient:
    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []

    def send(self, message: EmailMessage) -> None:
        self.sent.append(message)
