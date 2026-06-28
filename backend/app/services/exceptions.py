"""Domain exceptions raised by the service layer and mapped to HTTP status in the routers.

Keeping these framework-agnostic means the service layer doesn't import FastAPI, so it stays
unit-testable in isolation.
"""

from __future__ import annotations

from app.models.lead import LeadState


class LeadNotFound(Exception):
    def __init__(self, lead_id: object) -> None:
        super().__init__(f"Lead {lead_id} not found")


class InvalidStateTransition(Exception):
    def __init__(self, current: LeadState, target: LeadState) -> None:
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition lead from {current.value} to {target.value}")
