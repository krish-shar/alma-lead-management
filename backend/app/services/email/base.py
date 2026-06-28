"""Email abstraction: one message shape, one interface, many backends."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str


class EmailClient(Protocol):
    """Any backend (SMTP/Mailpit, Resend, Fake) implements this single method."""

    def send(self, message: EmailMessage) -> None: ...
