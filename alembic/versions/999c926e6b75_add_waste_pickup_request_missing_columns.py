"""add waste_pickup_request missing columns

Revision ID: 999c926e6b75
Revises: 
Create Date: 2026-08-21 18:37:27.303687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '999c926e6b75'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add missing nullable columns to waste_pickup_requests."""
    op.add_column('waste_pickup_requests', sa.Column('credits_awarded', sa.FLOAT(), nullable=True))
    op.add_column('waste_pickup_requests', sa.Column('dismissed_by_citizen', sa.BOOLEAN(), nullable=True))


def downgrade() -> None:
    """Downgrade schema: remove the columns added in upgrade."""
    op.drop_column('waste_pickup_requests', 'dismissed_by_citizen')
    op.drop_column('waste_pickup_requests', 'credits_awarded')
