"""add lead deleted_at (soft delete)

Revision ID: 7f3a9c2b1e44
Revises: 657d44f4b30c
Create Date: 2026-06-28 21:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f3a9c2b1e44'
down_revision: Union[str, None] = '657d44f4b30c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Soft delete: a non-null deleted_at hides the lead from every listing/detail while the
    # row (and its resume) are retained. Indexed because the list query filters on it.
    op.add_column('leads', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_leads_deleted_at'), 'leads', ['deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_leads_deleted_at'), table_name='leads')
    op.drop_column('leads', 'deleted_at')
