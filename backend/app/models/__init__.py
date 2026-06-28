"""ORM models. Importing them here ensures they're registered on `Base.metadata`
so Alembic autogenerate and `create_all` can see them."""

from app.models.lead import Lead, LeadState

__all__ = ["Lead", "LeadState"]
